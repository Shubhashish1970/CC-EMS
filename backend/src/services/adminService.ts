import { Activity, IActivity } from '../models/Activity.js';
import { CallTask, TaskStatus } from '../models/CallTask.js';
import { SamplingAudit } from '../models/SamplingAudit.js';
import { User } from '../models/User.js';
import { Farmer } from '../models/Farmer.js';
import mongoose from 'mongoose';
import logger from '../config/logger.js';

export interface ActivitySamplingStatus {
  activity: IActivity;
  samplingStatus: 'sampled' | 'not_sampled' | 'partial';
  samplingAudit?: {
    samplingPercentage: number;
    totalFarmers: number;
    sampledCount: number;
    createdAt: Date;
  };
  tasksCount: number;
  assignedAgents: Array<{
    agentId: string;
    agentName: string;
    agentEmail: string;
    tasksCount: number;
  }>;
  statusBreakdown: {
    pending: number;
    in_progress: number;
    completed: number;
    not_reachable: number;
    invalid_number: number;
  };
}

export interface AgentQueueSummary {
  agentId: string;
  agentName: string;
  agentEmail: string;
  employeeId: string;
  languageCapabilities: string[];
  statusBreakdown: {
    pending: number;
    in_progress: number;
    completed: number;
    not_reachable: number;
    invalid_number: number;
    total: number;
  };
}

export interface AgentQueueDetail {
  agent: {
    agentId: string;
    agentName: string;
    agentEmail: string;
    employeeId: string;
    languageCapabilities: string[];
  };
  statusBreakdown: {
    pending: number;
    in_progress: number;
    completed: number;
    not_reachable: number;
    invalid_number: number;
    total: number;
  };
  tasks: Array<{
    taskId: string;
    farmer: {
      name: string;
      mobileNumber: string;
      preferredLanguage: string;
      location: string;
    };
    activity: {
      type: string;
      date: Date;
      officerName: string;
      territory: string;
    };
    status: TaskStatus;
    scheduledDate: Date;
    createdAt: Date;
  }>;
}

/**
 * Get all activities with sampling status and assigned agents
 * Returns activities with their sampling audit info, task counts, and assigned agents
 */
export const getActivitiesWithSampling = async (filters?: {
  activityType?: string;
  territory?: string;
  samplingStatus?: 'sampled' | 'not_sampled' | 'partial';
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}): Promise<{
  activities: ActivitySamplingStatus[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}> => {
  try {
    const {
      activityType,
      territory,
      samplingStatus,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
    } = filters || {};

    const skip = (page - 1) * limit;

    // Build query for activities
    const activityQuery: any = {};
    if (activityType) {
      activityQuery.type = activityType;
    }
    if (territory) {
      activityQuery.territory = territory;
    }
    if (dateFrom || dateTo) {
      activityQuery.date = {};
      if (dateFrom) {
        activityQuery.date.$gte = dateFrom;
      }
      if (dateTo) {
        activityQuery.date.$lte = dateTo;
      }
    }

    // Get all activities matching filters
    const activities = await Activity.find(activityQuery)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit);

    const totalActivities = await Activity.countDocuments(activityQuery);

    // Get all sampling audits for these activities
    const activityIds = activities.map((a) => a._id);
    const samplingAudits = await SamplingAudit.find({
      activityId: { $in: activityIds },
    });

    // Create a map of activityId -> sampling audit
    const auditMap = new Map(
      samplingAudits.map((audit) => [audit.activityId.toString(), audit])
    );

    // Get all tasks for these activities
    const tasks = await CallTask.find({
      activityId: { $in: activityIds },
    })
      .populate('assignedAgentId', 'name email employeeId')
      .populate('farmerId', 'name mobileNumber preferredLanguage location');

    // Group tasks by activityId
    const tasksByActivity = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const activityId = task.activityId.toString();
      if (!tasksByActivity.has(activityId)) {
        tasksByActivity.set(activityId, []);
      }
      tasksByActivity.get(activityId)!.push(task);
    }

    // Build result array
    const result: ActivitySamplingStatus[] = [];

    for (const activity of activities) {
      const activityId = activity._id.toString();
      const audit = auditMap.get(activityId);
      const activityTasks = tasksByActivity.get(activityId) || [];

      // Determine sampling status
      let status: 'sampled' | 'not_sampled' | 'partial' = 'not_sampled';
      if (audit) {
        // Check if all sampled farmers have tasks
        if (activityTasks.length >= audit.sampledCount) {
          status = 'sampled';
        } else if (activityTasks.length > 0) {
          status = 'partial';
        } else {
          status = 'partial'; // Audit exists but no tasks created
        }
      }

      // Apply sampling status filter if provided
      if (samplingStatus && status !== samplingStatus) {
        continue;
      }

      // Calculate status breakdown
      const statusBreakdown = {
        pending: 0,
        in_progress: 0,
        completed: 0,
        not_reachable: 0,
        invalid_number: 0,
      };

      // Group tasks by agent
      const agentMap = new Map<
        string,
        { agentId: string; agentName: string; agentEmail: string; tasksCount: number }
      >();

      for (const task of activityTasks) {
        // Update status breakdown
        statusBreakdown[task.status]++;

        // Group by agent
        const agent = task.assignedAgentId as any;
        if (agent && agent._id) {
          const agentId = agent._id.toString();
          if (!agentMap.has(agentId)) {
            agentMap.set(agentId, {
              agentId,
              agentName: agent.name || 'Unknown',
              agentEmail: agent.email || 'Unknown',
              tasksCount: 0,
            });
          }
          agentMap.get(agentId)!.tasksCount++;
        }
      }

      result.push({
        activity: activity.toObject(),
        samplingStatus: status,
        samplingAudit: audit
          ? {
              samplingPercentage: audit.samplingPercentage,
              totalFarmers: audit.totalFarmers,
              sampledCount: audit.sampledCount,
              createdAt: audit.createdAt,
            }
          : undefined,
        tasksCount: activityTasks.length,
        assignedAgents: Array.from(agentMap.values()),
        statusBreakdown,
      });
    }

    return {
      activities: result,
      pagination: {
        page,
        limit,
        total: totalActivities,
        pages: Math.ceil(totalActivities / limit),
      },
    };
  } catch (error) {
    logger.error('Error fetching activities with sampling:', error);
    throw error;
  }
};

/**
 * Get task queues for all agents with status breakdown
 * Returns summary of all agents with their task counts by status
 */
export const getAgentQueues = async (filters?: {
  agentId?: string;
  isActive?: boolean;
}): Promise<AgentQueueSummary[]> => {
  try {
    const { agentId, isActive = true } = filters || {};

    // Build query for agents
    const agentQuery: any = {
      role: 'cc_agent',
    };
    if (isActive !== undefined) {
      agentQuery.isActive = isActive;
    }
    if (agentId) {
      agentQuery._id = new mongoose.Types.ObjectId(agentId);
    }

    // Get all CC agents
    const agents = await User.find(agentQuery).select(
      'name email employeeId languageCapabilities isActive'
    );

    // Get all tasks for these agents
    const agentIds = agents.map((a) => a._id);
    const tasks = await CallTask.find({
      assignedAgentId: { $in: agentIds },
    });

    // Group tasks by agent and status
    const tasksByAgent = new Map<
      string,
      { pending: number; in_progress: number; completed: number; not_reachable: number; invalid_number: number }
    >();

    for (const task of tasks) {
      const agentIdStr = task.assignedAgentId.toString();
      if (!tasksByAgent.has(agentIdStr)) {
        tasksByAgent.set(agentIdStr, {
          pending: 0,
          in_progress: 0,
          completed: 0,
          not_reachable: 0,
          invalid_number: 0,
        });
      }
      const breakdown = tasksByAgent.get(agentIdStr)!;
      breakdown[task.status]++;
    }

    // Build result array
    const result: AgentQueueSummary[] = [];

    for (const agent of agents) {
      const agentIdStr = agent._id.toString();
      const breakdown = tasksByAgent.get(agentIdStr) || {
        pending: 0,
        in_progress: 0,
        completed: 0,
        not_reachable: 0,
        invalid_number: 0,
      };

      const total =
        breakdown.pending +
        breakdown.in_progress +
        breakdown.completed +
        breakdown.not_reachable +
        breakdown.invalid_number;

      result.push({
        agentId: agentIdStr,
        agentName: agent.name,
        agentEmail: agent.email,
        employeeId: agent.employeeId,
        languageCapabilities: agent.languageCapabilities || [],
        statusBreakdown: {
          ...breakdown,
          total,
        },
      });
    }

    // Sort by total tasks (descending)
    result.sort((a, b) => b.statusBreakdown.total - a.statusBreakdown.total);

    return result;
  } catch (error) {
    logger.error('Error fetching agent queues:', error);
    throw error;
  }
};

/**
 * Get detailed queue for a specific agent
 * Returns agent info, status breakdown, and chronologically ordered task list
 */
export const getAgentQueue = async (
  agentId: string
): Promise<AgentQueueDetail> => {
  try {
    // Validate agentId
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      throw new Error('Invalid agent ID');
    }

    // Get agent
    const agent = await User.findById(agentId).select(
      'name email employeeId languageCapabilities role isActive'
    );

    if (!agent) {
      throw new Error('Agent not found');
    }

    if (agent.role !== 'cc_agent') {
      throw new Error('User is not a CC agent');
    }

    // Get all tasks for this agent, ordered by scheduledDate
    const tasks = await CallTask.find({
      assignedAgentId: new mongoose.Types.ObjectId(agentId),
    })
      .populate('farmerId', 'name mobileNumber preferredLanguage location')
      .populate('activityId', 'type date officerName territory')
      .sort({ scheduledDate: 1 }); // Chronologically ordered

    // Calculate status breakdown
    const statusBreakdown = {
      pending: 0,
      in_progress: 0,
      completed: 0,
      not_reachable: 0,
      invalid_number: 0,
      total: tasks.length,
    };

    for (const task of tasks) {
      statusBreakdown[task.status]++;
    }

    // Build task details array
    const taskDetails = tasks.map((task) => {
      const farmer = task.farmerId as any;
      const activity = task.activityId as any;

      return {
        taskId: task._id.toString(),
        farmer: {
          name: farmer?.name || 'Unknown',
          mobileNumber: farmer?.mobileNumber || 'Unknown',
          preferredLanguage: farmer?.preferredLanguage || 'Unknown',
          location: farmer?.location || 'Unknown',
        },
        activity: {
          type: activity?.type || 'Unknown',
          date: activity?.date || task.createdAt,
          officerName: activity?.officerName || 'Unknown',
          territory: activity?.territory || 'Unknown',
        },
        status: task.status,
        scheduledDate: task.scheduledDate,
        createdAt: task.createdAt,
      };
    });

    return {
      agent: {
        agentId: agent._id.toString(),
        agentName: agent.name,
        agentEmail: agent.email,
        employeeId: agent.employeeId,
        languageCapabilities: agent.languageCapabilities || [],
      },
      statusBreakdown,
      tasks: taskDetails,
    };
  } catch (error) {
    logger.error(`Error fetching agent queue for ${agentId}:`, error);
    throw error;
  }
};

