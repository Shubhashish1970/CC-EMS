import { CallTask, ICallTask, TaskStatus } from '../models/CallTask.js';
import { User } from '../models/User.js';
import { Farmer } from '../models/Farmer.js';
import { Activity } from '../models/Activity.js';
import mongoose from 'mongoose';
import logger from '../config/logger.js';

export interface TaskAssignmentOptions {
  agentId?: string;
  language?: string;
  territory?: string;
}

/**
 * Get all available tasks for an agent (sampled_in_queue and in_progress)
 * Returns list of tasks sorted by scheduledDate (earliest first)
 */
export const getAvailableTasksForAgent = async (agentId: string): Promise<ICallTask[]> => {
  try {
    // Get agent to check language capabilities
    const agent = await User.findById(agentId);
    if (!agent || !agent.isActive || agent.role !== 'cc_agent') {
      throw new Error('Invalid or inactive agent');
    }

    // Get tasks assigned to agent with correct status
    // Note: Removed scheduledDate filter to show all tasks regardless of due date
    // Agents should be able to see and work on tasks immediately after sampling
    const tasks = await CallTask.find({
      assignedAgentId: new mongoose.Types.ObjectId(agentId),
      status: { $in: ['sampled_in_queue', 'in_progress'] },
    })
      .populate('farmerId', 'name location preferredLanguage mobileNumber photoUrl')
      .populate('activityId', 'type date officerName location territory crops products')
      .sort({ scheduledDate: 1 }) // Earliest first
      .limit(50); // Reasonable limit

    // Filter tasks by agent's language capabilities
    const languageFilteredTasks = tasks.filter((task) => {
      const farmer = task.farmerId as any;
      if (!farmer || !farmer.preferredLanguage) {
        logger.warn(`Task ${task._id} has no farmer or preferredLanguage`);
        return false; // Skip tasks without farmer language info
      }
      const hasLanguageMatch = agent.languageCapabilities.includes(farmer.preferredLanguage);
      if (!hasLanguageMatch) {
        logger.warn(`Agent ${agent.email} does not have language capability ${farmer.preferredLanguage} for task ${task._id}`);
      }
      return hasLanguageMatch;
    });

    return languageFilteredTasks;
  } catch (error) {
    logger.error('Error fetching available tasks for agent:', error);
    throw error;
  }
};

/**
 * Get the next pending task for an agent
 * Prioritizes tasks by scheduledDate (earliest first)
 * Also returns in_progress tasks if agent is already working on them
 */
export const getNextTaskForAgent = async (agentId: string): Promise<ICallTask | null> => {
  try {
    // First, try to get a sampled_in_queue task
    let task = await CallTask.findOne({
      assignedAgentId: new mongoose.Types.ObjectId(agentId),
      status: 'sampled_in_queue',
      scheduledDate: { $lte: new Date() }, // Only tasks that are due
    })
      .populate('farmerId', 'name location preferredLanguage mobileNumber photoUrl')
      .populate('activityId', 'type date officerName location territory crops products')
      .sort({ scheduledDate: 1 }) // Earliest first
      .limit(1);

    // If no pending task, check for in_progress tasks (agent might be continuing work)
    if (!task) {
      task = await CallTask.findOne({
        assignedAgentId: new mongoose.Types.ObjectId(agentId),
        status: 'in_progress',
        scheduledDate: { $lte: new Date() },
      })
      .populate('farmerId', 'name location preferredLanguage mobileNumber photoUrl')
      .populate('activityId', 'type date officerName location territory crops products')
      .sort({ scheduledDate: 1 })
      .limit(1);
    }

    return task;
  } catch (error) {
    logger.error('Error fetching next task for agent:', error);
    throw error;
  }
};

/**
 * Get pending tasks (for Team Leads and Admins)
 */
export const getPendingTasks = async (filters?: {
  agentId?: string;
  territory?: string;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  page?: number;
  limit?: number;
}) => {
  try {
    const { agentId, territory, dateFrom, dateTo, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const query: any = {
      status: { $in: ['sampled_in_queue', 'in_progress'] },
    };

    if (agentId) {
      query.assignedAgentId = new mongoose.Types.ObjectId(agentId);
    }

    // Filter by territory through activity
    if (territory) {
      const activities = await Activity.find({ territory }).select('_id');
      query.activityId = { $in: activities.map(a => a._id) };
    }

    // Filter by scheduled date range
    if (dateFrom || dateTo) {
      query.scheduledDate = {};
      if (dateFrom) {
        const fromDate = typeof dateFrom === 'string' ? new Date(dateFrom) : dateFrom;
        fromDate.setHours(0, 0, 0, 0);
        query.scheduledDate.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = typeof dateTo === 'string' ? new Date(dateTo) : dateTo;
        toDate.setHours(23, 59, 59, 999);
        query.scheduledDate.$lte = toDate;
      }
    }

    const tasks = await CallTask.find(query)
      .populate('farmerId', 'name location preferredLanguage mobileNumber photoUrl')
      .populate('activityId', 'type date officerName location territory crops products')
      .populate('assignedAgentId', 'name email employeeId')
      .sort({ scheduledDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await CallTask.countDocuments(query);

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Error fetching pending tasks:', error);
    throw error;
  }
};

/**
 * Get team tasks (for Team Lead)
 */
export const getTeamTasks = async (teamLeadId: string, filters?: {
  status?: TaskStatus;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  page?: number;
  limit?: number;
}) => {
  try {
    // Find all agents assigned to this team lead
    const teamAgents = await User.find({
      teamLeadId: new mongoose.Types.ObjectId(teamLeadId),
      role: 'cc_agent',
      isActive: true,
    }).select('_id');

    const agentIds = teamAgents.map(agent => agent._id);

    const { status, dateFrom, dateTo, page = 1, limit = 20 } = filters || {};
    const skip = (page - 1) * limit;

    const query: any = {
      assignedAgentId: { $in: agentIds },
    };

    // CRITICAL: Apply status filter if provided (check for truthy AND not empty string)
    if (status && status.trim() !== '') {
      query.status = status.trim();
      logger.info('✅ Filtering team tasks by status', { 
        teamLeadId, 
        status, 
        statusType: typeof status,
        statusTrimmed: status.trim(),
        queryStatus: query.status 
      });
    } else {
      logger.info('⚠️ No status filter applied', { 
        teamLeadId, 
        status, 
        statusType: typeof status,
        filters 
      });
    }

    // Filter by scheduled date range
    if (dateFrom || dateTo) {
      query.scheduledDate = {};
      if (dateFrom) {
        const fromDate = typeof dateFrom === 'string' ? new Date(dateFrom) : dateFrom;
        fromDate.setHours(0, 0, 0, 0);
        query.scheduledDate.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = typeof dateTo === 'string' ? new Date(dateTo) : dateTo;
        toDate.setHours(23, 59, 59, 999);
        query.scheduledDate.$lte = toDate;
      }
    }

    logger.info('🔍 Team tasks query being executed', { 
      teamLeadId, 
      agentIdsCount: agentIds.length, 
      query: JSON.stringify(query), 
      page, 
      limit,
      skip
    });

    const tasks = await CallTask.find(query)
      .populate('farmerId', 'name location preferredLanguage mobileNumber photoUrl')
      .populate('activityId', 'type date officerName location territory crops products')
      .populate('assignedAgentId', 'name email employeeId')
      .sort({ scheduledDate: 1 })
      .skip(skip)
      .limit(limit);

    const total = await CallTask.countDocuments(query);

    return {
      tasks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Error fetching team tasks:', error);
    throw error;
  }
};

/**
 * Assign task to agent based on language capabilities
 */
export const assignTaskToAgent = async (
  taskId: string,
  agentId: string
): Promise<ICallTask> => {
  try {
    const task = await CallTask.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    // Verify agent exists and is active
    const agent = await User.findById(agentId);
    if (!agent || !agent.isActive || agent.role !== 'cc_agent') {
      throw new Error('Invalid agent');
    }

    // Get farmer to check language
    const farmer = await Farmer.findById(task.farmerId);
    if (farmer && !agent.languageCapabilities.includes(farmer.preferredLanguage)) {
      logger.warn(`Agent ${agent.email} does not have language capability for farmer ${farmer.preferredLanguage}`);
    }

    task.assignedAgentId = new mongoose.Types.ObjectId(agentId);
    task.status = 'sampled_in_queue';
    await task.save();

    logger.info(`Task ${taskId} assigned to agent ${agent.email}`);

    return task;
  } catch (error) {
    logger.error('Error assigning task:', error);
    throw error;
  }
};

/**
 * Auto-assign tasks based on language capabilities
 */
export const autoAssignTask = async (taskId: string): Promise<ICallTask | null> => {
  try {
    const task = await CallTask.findById(taskId).populate('farmerId');
    if (!task) {
      throw new Error('Task not found');
    }

    const farmer = task.farmerId as any;
    if (!farmer) {
      throw new Error('Farmer not found');
    }

    // Find agents with matching language capability
    const agents = await User.find({
      role: 'cc_agent',
      isActive: true,
      languageCapabilities: farmer.preferredLanguage,
    });

    if (agents.length === 0) {
      logger.warn(`No agents found with language capability: ${farmer.preferredLanguage}`);
      return null;
    }

    // Find agent with least pending tasks
    const agentTaskCounts = await Promise.all(
      agents.map(async (agent) => {
        const count = await CallTask.countDocuments({
          assignedAgentId: agent._id,
          status: { $in: ['sampled_in_queue', 'in_progress'] },
        });
        return { agent, count };
      })
    );

    // Sort by task count (ascending) and pick the first one
    agentTaskCounts.sort((a, b) => a.count - b.count);
    const selectedAgent = agentTaskCounts[0].agent;

    task.assignedAgentId = selectedAgent._id;
    task.status = 'sampled_in_queue';
    await task.save();

    logger.info(`Task ${taskId} auto-assigned to agent ${selectedAgent.email}`);

    return task;
  } catch (error) {
    logger.error('Error auto-assigning task:', error);
    throw error;
  }
};

/**
 * Update task status
 */
export const updateTaskStatus = async (
  taskId: string,
  status: TaskStatus,
  notes?: string
): Promise<ICallTask> => {
  try {
    // Validate taskId is a valid MongoDB ObjectId format
    // This prevents "bulk" or other invalid strings from being passed to findById
    if (!taskId || !/^[0-9a-fA-F]{24}$/.test(taskId)) {
      logger.error('Invalid taskId provided to updateTaskStatus', { taskId, status });
      throw new Error(`Invalid task ID format: ${taskId}`);
    }

    const task = await CallTask.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const previousStatus = task.status;
    task.status = status;

    // Add to interaction history
    if (notes || previousStatus !== status) {
      task.interactionHistory.push({
        timestamp: new Date(),
        status: task.status,
        notes: notes || `Status changed from ${previousStatus} to ${status}`,
      });
    }

    await task.save();

    logger.info(`Task ${taskId} status updated to ${status}`);

    return task;
  } catch (error) {
    logger.error('Error updating task status:', error);
    throw error;
  }
};
