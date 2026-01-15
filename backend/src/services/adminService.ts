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
    sampled_in_queue: number;
    in_progress: number;
    completed: number;
    not_reachable: number;
    invalid_number: number;
  };
  farmers: Array<{
    farmerId: string;
    name: string;
    mobileNumber: string;
    preferredLanguage: string;
    location: string;
    photoUrl?: string;
    isSampled: boolean;
    taskId?: string;
    assignedAgentId?: string;
    assignedAgentName?: string;
    taskStatus?: TaskStatus;
  }>;
}

export interface AgentQueueSummary {
  agentId: string;
  agentName: string;
  agentEmail: string;
  employeeId: string;
  languageCapabilities: string[];
  statusBreakdown: {
    sampled_in_queue: number;
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
    sampled_in_queue: number;
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
      zone?: string;
      bu?: string;
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
  zone?: string;
  bu?: string;
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
      zone,
      bu,
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
      // Prefer territoryName (v2) but support legacy territory
      activityQuery.$or = [
        { territoryName: territory },
        { territory: territory },
      ];
    }
    if (zone) {
      activityQuery.zoneName = zone;
    }
    if (bu) {
      activityQuery.buName = bu;
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

    // Get all tasks for these activities (with indexes for performance)
    const tasks = await CallTask.find({
      activityId: { $in: activityIds },
    })
      .populate('assignedAgentId', 'name email employeeId')
      .populate('farmerId', 'name mobileNumber preferredLanguage location photoUrl')
      .lean(); // Use lean() for better performance with large datasets

    // Group tasks by activityId and create farmer-to-task mapping
    const tasksByActivity = new Map<string, typeof tasks>();
    // Create a map of activityId -> Map<farmerId -> task info> for quick lookup
    const farmerTaskMapByActivity = new Map<string, Map<string, {
      taskId: string;
      assignedAgentId: string;
      assignedAgentName: string;
      taskStatus: TaskStatus;
    }>>();

    for (const task of tasks) {
      const activityId = (task.activityId as any)?._id?.toString() || (task.activityId as any)?.toString();
      if (!activityId) continue;

      if (!tasksByActivity.has(activityId)) {
        tasksByActivity.set(activityId, []);
      }
      tasksByActivity.get(activityId)!.push(task);

      // Initialize farmer task map for this activity if needed
      if (!farmerTaskMapByActivity.has(activityId)) {
        farmerTaskMapByActivity.set(activityId, new Map());
      }

      // Map farmer to task for quick lookup
      const farmerId = (task.farmerId as any)?._id?.toString() || (task.farmerId as any)?.toString();
      if (farmerId) {
        const agent = task.assignedAgentId as any;
        const activityFarmerMap = farmerTaskMapByActivity.get(activityId)!;
        activityFarmerMap.set(farmerId, {
          taskId: task._id.toString(),
          assignedAgentId: agent?._id?.toString() || agent?.toString() || '',
          assignedAgentName: agent?.name || 'Unknown',
          taskStatus: task.status,
        });
      }
    }

    // Collect all farmer IDs across all activities for batch fetching
    const allFarmerIds = new Set<string>();
    for (const activity of activities) {
      if (activity.farmerIds && Array.isArray(activity.farmerIds)) {
        for (const farmerId of activity.farmerIds) {
          // Handle different formats: ObjectId, populated object, or string
          let farmerIdStr: string | null = null;
          if (mongoose.Types.ObjectId.isValid(farmerId)) {
            if (typeof farmerId === 'string') {
              farmerIdStr = farmerId;
            } else if (farmerId instanceof mongoose.Types.ObjectId) {
              farmerIdStr = farmerId.toString();
            } else if ((farmerId as any)?._id) {
              farmerIdStr = (farmerId as any)._id.toString();
            } else if ((farmerId as any)?.toString) {
              farmerIdStr = (farmerId as any).toString();
            }
          }
          if (farmerIdStr && mongoose.Types.ObjectId.isValid(farmerIdStr)) {
            allFarmerIds.add(farmerIdStr);
          }
        }
      }
    }
    
    logger.info(`Collected ${allFarmerIds.size} unique farmer IDs from ${activities.length} activities`);
    
    // Log sample of farmer IDs for debugging
    if (allFarmerIds.size === 0 && activities.length > 0) {
      logger.warn('No farmer IDs found in activities. Sample activity:', {
        activityId: activities[0]._id,
        farmerIds: activities[0].farmerIds,
        farmerIdsType: Array.isArray(activities[0].farmerIds) ? 'array' : typeof activities[0].farmerIds,
        farmerIdsLength: Array.isArray(activities[0].farmerIds) ? activities[0].farmerIds.length : 'N/A',
      });
    }

    // Batch fetch all farmers for all activities (optimized for large datasets)
    const farmersMap = new Map<string, any>();
    if (allFarmerIds.size > 0) {
      const farmers = await Farmer.find({
        _id: { $in: Array.from(allFarmerIds).map(id => new mongoose.Types.ObjectId(id)) },
      })
        .select('name mobileNumber preferredLanguage location photoUrl')
        .lean();

      for (const farmer of farmers) {
        farmersMap.set(farmer._id.toString(), farmer);
      }
      
      logger.info(`Fetched ${farmers.length} farmer documents out of ${allFarmerIds.size} requested`);
      
      if (farmers.length < allFarmerIds.size) {
        const missingCount = allFarmerIds.size - farmers.length;
        logger.warn(`${missingCount} farmer documents not found in database - will include with minimal data`);
      }
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
        sampled_in_queue: 0,
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
        // Update status breakdown - ensure all tasks are counted
        const taskStatus = task.status || 'sampled_in_queue'; // Default to sampled_in_queue if missing
        const statusKey = taskStatus === 'sampled_in_queue' ? 'sampled_in_queue' : taskStatus;
        
        if (statusBreakdown.hasOwnProperty(statusKey)) {
          statusBreakdown[statusKey as keyof typeof statusBreakdown]++;
        } else {
          // If status is not in breakdown, log warning and count as sampled_in_queue
          logger.warn(`Task ${task._id} has unknown status: ${taskStatus}, counting as sampled_in_queue`);
          statusBreakdown.sampled_in_queue++;
        }

        // Group by agent
        const agent = task.assignedAgentId as any;
        if (agent && (agent._id || agent)) {
          const agentId = agent._id?.toString() || agent.toString();
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

      // Build farmers list for this activity with sampling status
      const farmersList: Array<{
        farmerId: string;
        name: string;
        mobileNumber: string;
        preferredLanguage: string;
        location: string;
        photoUrl?: string;
        isSampled: boolean;
        taskId?: string;
        assignedAgentId?: string;
        assignedAgentName?: string;
        taskStatus?: TaskStatus;
      }> = [];

      // Get farmer task map for this activity
      const activityFarmerMap = farmerTaskMapByActivity.get(activityId) || new Map();

      if (activity.farmerIds && Array.isArray(activity.farmerIds) && activity.farmerIds.length > 0) {
        logger.debug(`Processing ${activity.farmerIds.length} farmer IDs for activity ${activityId}`);
        
        for (const farmerRef of activity.farmerIds) {
          // Extract farmer ID from reference - handle different formats
          let farmerId: string | null = null;
          
          // Try different methods to extract farmer ID
          if (typeof farmerRef === 'string' && mongoose.Types.ObjectId.isValid(farmerRef)) {
            farmerId = farmerRef;
          } else if (farmerRef instanceof mongoose.Types.ObjectId) {
            farmerId = farmerRef.toString();
          } else if ((farmerRef as any)?._id) {
            // Populated farmer object
            const id = (farmerRef as any)._id;
            farmerId = id instanceof mongoose.Types.ObjectId ? id.toString() : String(id);
          } else if ((farmerRef as any)?.toString && mongoose.Types.ObjectId.isValid((farmerRef as any).toString())) {
            farmerId = (farmerRef as any).toString();
          } else if (mongoose.Types.ObjectId.isValid(farmerRef)) {
            // Try to convert directly
            try {
              const objId = new mongoose.Types.ObjectId(farmerRef);
              farmerId = objId.toString();
            } catch (e) {
              logger.warn(`Could not convert farmer ID in activity ${activityId}:`, farmerRef);
            }
          }
          
          if (!farmerId || !mongoose.Types.ObjectId.isValid(farmerId)) {
            logger.warn(`Invalid farmer ID in activity ${activityId}:`, {
              farmerRef,
              type: typeof farmerRef,
              isObjectId: farmerRef instanceof mongoose.Types.ObjectId,
            });
            continue;
          }

          // Get farmer data from batch-fetched map
          const farmerData = farmersMap.get(farmerId);
          
          // Get task info if this farmer was sampled
          const farmerTask = activityFarmerMap.get(farmerId);

          // Always include farmer in list, even if document doesn't exist
          // This ensures all farmers in the activity are visible
          farmersList.push({
            farmerId: farmerId,
            name: farmerData?.name || 'Unknown Farmer',
            mobileNumber: farmerData?.mobileNumber || 'Unknown',
            preferredLanguage: farmerData?.preferredLanguage || 'Unknown',
            location: farmerData?.location || 'Unknown',
            photoUrl: farmerData?.photoUrl,
            isSampled: !!farmerTask,
            taskId: farmerTask?.taskId,
            assignedAgentId: farmerTask?.assignedAgentId,
            assignedAgentName: farmerTask?.assignedAgentName,
            taskStatus: farmerTask?.taskStatus,
          });
          
          // Log warning if farmer data not found
          if (!farmerData) {
            logger.debug(`Farmer document not found for ID: ${farmerId} in activity ${activityId} - including with minimal data`);
          }
        }
      } else {
        logger.warn(`Activity ${activityId} has no farmerIds or empty array. Activity data:`, {
          hasFarmerIds: !!activity.farmerIds,
          farmerIdsType: typeof activity.farmerIds,
          farmerIdsIsArray: Array.isArray(activity.farmerIds),
          farmerIdsLength: Array.isArray(activity.farmerIds) ? activity.farmerIds.length : 'N/A',
        });
      }
      
      logger.info(`Activity ${activityId}: ${farmersList.length} farmers processed (activity has ${activity.farmerIds?.length || 0} farmer IDs)`);
      
      // Convert activity to object and ensure farmerIds are preserved
      const activityObj = activity.toObject();
      
      // Ensure farmerIds is always an array in the response (even if empty)
      if (!activityObj.farmerIds || !Array.isArray(activityObj.farmerIds)) {
        activityObj.farmerIds = [];
        logger.warn(`Activity ${activityId}: farmerIds was not an array, setting to empty array`);
      }
      
      // Ensure farmers array is always included (even if empty)
      // This helps frontend debug and display proper messages
      const farmersArray = farmersList || [];
      
      logger.debug(`Activity ${activityId} response: ${farmersArray.length} farmers in array, ${activityObj.farmerIds?.length || 0} farmerIds in activity`);

      // Ensure farmers array is always present and is an array
      const finalFarmersArray = Array.isArray(farmersArray) ? farmersArray : [];
      
      result.push({
        activity: activityObj,
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
        farmers: finalFarmersArray, // Always include farmers array (may be empty)
      });
      
      logger.debug(`Activity ${activityId} final response: ${finalFarmersArray.length} farmers in array`);
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
      { sampled_in_queue: number; in_progress: number; completed: number; not_reachable: number; invalid_number: number }
    >();

    for (const task of tasks) {
      const agentIdStr = task.assignedAgentId.toString();
      if (!tasksByAgent.has(agentIdStr)) {
        tasksByAgent.set(agentIdStr, {
          sampled_in_queue: 0,
          in_progress: 0,
          completed: 0,
          not_reachable: 0,
          invalid_number: 0,
        });
      }
      const breakdown = tasksByAgent.get(agentIdStr)!;
      const statusKey = task.status === 'sampled_in_queue' ? 'sampled_in_queue' : task.status;
      if (breakdown.hasOwnProperty(statusKey)) {
        breakdown[statusKey as keyof typeof breakdown]++;
      }
    }

    // Build result array
    const result: AgentQueueSummary[] = [];

    for (const agent of agents) {
      const agentIdStr = agent._id.toString();
      const breakdown = tasksByAgent.get(agentIdStr) || {
        sampled_in_queue: 0,
        in_progress: 0,
        completed: 0,
        not_reachable: 0,
        invalid_number: 0,
      };

      const total =
        breakdown.sampled_in_queue +
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
      .populate('activityId', 'type date officerName territory territoryName zoneName buName')
      .sort({ scheduledDate: 1 }); // Chronologically ordered

    // Calculate status breakdown
    const statusBreakdown = {
      sampled_in_queue: 0,
      in_progress: 0,
      completed: 0,
      not_reachable: 0,
      invalid_number: 0,
      total: tasks.length,
    };

    for (const task of tasks) {
      const statusKey = task.status === 'sampled_in_queue' ? 'sampled_in_queue' : task.status;
      if (statusBreakdown.hasOwnProperty(statusKey)) {
        statusBreakdown[statusKey as keyof typeof statusBreakdown]++;
      }
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
          territory: activity?.territoryName || activity?.territory || 'Unknown',
          zone: activity?.zoneName || '',
          bu: activity?.buName || '',
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

