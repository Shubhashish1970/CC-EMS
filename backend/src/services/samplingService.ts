import { Activity, IActivity } from '../models/Activity.js';
import { Farmer } from '../models/Farmer.js';
import { CallTask } from '../models/CallTask.js';
import { CoolingPeriod } from '../models/CoolingPeriod.js';
import { SamplingAudit } from '../models/SamplingAudit.js';
import { User } from '../models/User.js';
import { reservoirSampling, calculateSampleSize } from '../utils/reservoirSampling.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';

interface SamplingConfig {
  defaultPercentage: number;
  activityTypePercentages: Record<string, number>;
  coolingPeriodDays: number;
}

const DEFAULT_SAMPLING_CONFIG: SamplingConfig = {
  defaultPercentage: 7, // 7% default (between 5-10%)
  activityTypePercentages: {
    'Field Day': 10,
    'Group Meeting': 8,
    'Demo Visit': 6,
    'OFM': 5,
  },
  coolingPeriodDays: 30,
};

/**
 * Check if farmer is in cooling period
 */
const isInCoolingPeriod = async (farmerId: mongoose.Types.ObjectId): Promise<boolean> => {
  const coolingPeriod = await CoolingPeriod.findOne({
    farmerId,
    expiresAt: { $gt: new Date() }, // Not expired
  });

  return !!coolingPeriod;
};

/**
 * Get eligible farmers for sampling (excluding those in cooling period)
 */
const getEligibleFarmers = async (
  farmerIds: mongoose.Types.ObjectId[]
): Promise<mongoose.Types.ObjectId[]> => {
  const eligibleFarmers: mongoose.Types.ObjectId[] = [];

  for (const farmerId of farmerIds) {
    const inCoolingPeriod = await isInCoolingPeriod(farmerId);
    if (!inCoolingPeriod) {
      eligibleFarmers.push(farmerId);
    }
  }

  return eligibleFarmers;
};

/**
 * Auto-assign sampled farmers to agents based on language
 */
const assignSampledFarmersToAgents = async (
  sampledFarmerIds: mongoose.Types.ObjectId[],
  activityId: mongoose.Types.ObjectId,
  scheduledDate: Date
): Promise<number> => {
  let assignedCount = 0;

  // Get all active CC agents
  const agents = await User.find({
    role: 'cc_agent',
    isActive: true,
  });

  if (agents.length === 0) {
    logger.warn('No active CC agents found for task assignment');
    return 0;
  }

  // Get farmers with their preferred languages
  const farmers = await Farmer.find({
    _id: { $in: sampledFarmerIds },
  });

  // Group farmers by language
  const farmersByLanguage: Record<string, mongoose.Types.ObjectId[]> = {};
  for (const farmer of farmers) {
    const lang = farmer.preferredLanguage;
    if (!farmersByLanguage[lang]) {
      farmersByLanguage[lang] = [];
    }
    farmersByLanguage[lang].push(farmer._id);
  }

  // Assign tasks to agents based on language capabilities
  for (const [language, farmerIds] of Object.entries(farmersByLanguage)) {
    // Find agents with this language capability
    const capableAgents = agents.filter(agent =>
      agent.languageCapabilities.includes(language)
    );

    if (capableAgents.length === 0) {
      logger.warn(`No agents found with language capability: ${language}`);
      continue;
    }

    // Distribute farmers evenly among capable agents
    for (let i = 0; i < farmerIds.length; i++) {
      const farmerId = farmerIds[i];
      const agent = capableAgents[i % capableAgents.length];

      // Create call task
      await CallTask.create({
        farmerId,
        activityId,
        status: 'pending',
        retryCount: 0,
        assignedAgentId: agent._id,
        scheduledDate,
        interactionHistory: [],
      });

      assignedCount++;
    }
  }

  return assignedCount;
};

/**
 * Sample farmers for an activity and create call tasks
 */
export const sampleAndCreateTasks = async (
  activityId: string,
  samplingPercentage?: number
): Promise<{
  totalFarmers: number;
  eligibleFarmers: number;
  sampledCount: number;
  tasksCreated: number;
}> => {
  try {
    const activity = await Activity.findById(activityId).populate('farmerIds');
    
    if (!activity) {
      throw new Error('Activity not found');
    }

    const totalFarmers = activity.farmerIds.length;
    
    if (totalFarmers === 0) {
      logger.warn(`Activity ${activityId} has no farmers`);
      return {
        totalFarmers: 0,
        eligibleFarmers: 0,
        sampledCount: 0,
        tasksCreated: 0,
      };
    }

    // Get sampling percentage (use activity type specific or default)
    const config = DEFAULT_SAMPLING_CONFIG;
    const percentage = samplingPercentage || 
      config.activityTypePercentages[activity.type] || 
      config.defaultPercentage;

    // Get eligible farmers (not in cooling period)
    const eligibleFarmerIds = await getEligibleFarmers(
      activity.farmerIds as mongoose.Types.ObjectId[]
    );

    if (eligibleFarmerIds.length === 0) {
      logger.warn(`No eligible farmers for activity ${activityId} (all in cooling period)`);
      return {
        totalFarmers,
        eligibleFarmers: 0,
        sampledCount: 0,
        tasksCreated: 0,
      };
    }

    // Calculate sample size
    const sampleSize = calculateSampleSize(eligibleFarmerIds.length, percentage);

    // Perform reservoir sampling
    const sampledFarmerIds = reservoirSampling(eligibleFarmerIds, sampleSize);

    // Calculate scheduled date (default: 5 days after activity date)
    const scheduledDate = new Date(activity.date);
    scheduledDate.setDate(scheduledDate.getDate() + 5);

    // Create call tasks for sampled farmers
    const tasksCreated = await assignSampledFarmersToAgents(
      sampledFarmerIds,
      activity._id,
      scheduledDate
    );

    // Update cooling periods for sampled farmers
    for (const farmerId of sampledFarmerIds) {
      await CoolingPeriod.findOneAndUpdate(
        { farmerId },
        {
          farmerId,
          lastCallDate: new Date(),
          coolingPeriodDays: config.coolingPeriodDays,
          expiresAt: new Date(Date.now() + config.coolingPeriodDays * 24 * 60 * 60 * 1000),
        },
        { upsert: true, new: true }
      );
    }

    // Log sampling audit
    await SamplingAudit.create({
      activityId: activity._id,
      samplingPercentage: percentage,
      totalFarmers,
      sampledCount: sampledFarmerIds.length,
      algorithm: 'Reservoir Sampling',
      metadata: {
        eligibleFarmers: eligibleFarmerIds.length,
        tasksCreated,
        activityType: activity.type,
      },
    });

    logger.info(
      `Sampling completed for activity ${activityId}: ${sampledFarmerIds.length}/${eligibleFarmerIds.length} sampled (${percentage}%), ${tasksCreated} tasks created`
    );

    return {
      totalFarmers,
      eligibleFarmers: eligibleFarmerIds.length,
      sampledCount: sampledFarmerIds.length,
      tasksCreated,
    };
  } catch (error) {
    logger.error(`Error sampling activity ${activityId}:`, error);
    throw error;
  }
};

/**
 * Sample all unsampled activities
 */
export const sampleAllActivities = async (): Promise<{
  activitiesProcessed: number;
  totalTasksCreated: number;
  errors: string[];
}> => {
  const errors: string[] = [];
  let activitiesProcessed = 0;
  let totalTasksCreated = 0;

  try {
    // Find activities that haven't been sampled yet (no sampling audit exists)
    const sampledActivityIds = await SamplingAudit.distinct('activityId');
    
    const unsampledActivities = await Activity.find({
      _id: { $nin: sampledActivityIds },
      farmerIds: { $exists: true, $ne: [] },
    });

    logger.info(`Found ${unsampledActivities.length} unsampled activities`);

    for (const activity of unsampledActivities) {
      try {
        const result = await sampleAndCreateTasks(activity._id.toString());
        activitiesProcessed++;
        totalTasksCreated += result.tasksCreated;
      } catch (error) {
        const errorMsg = `Failed to sample activity ${activity._id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    logger.info(
      `Sampling batch completed: ${activitiesProcessed} activities, ${totalTasksCreated} tasks created`
    );

    return {
      activitiesProcessed,
      totalTasksCreated,
      errors,
    };
  } catch (error) {
    logger.error('Error in batch sampling:', error);
    throw error;
  }
};


