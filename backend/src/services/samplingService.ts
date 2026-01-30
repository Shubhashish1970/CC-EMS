import { Activity, IActivity } from '../models/Activity.js';
import { Farmer } from '../models/Farmer.js';
import { CallTask } from '../models/CallTask.js';
import { CoolingPeriod } from '../models/CoolingPeriod.js';
import { SamplingAudit } from '../models/SamplingAudit.js';
import { SamplingConfig } from '../models/SamplingConfig.js';
import { reservoirSampling, calculateSampleSize } from '../utils/reservoirSampling.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';

const DEFAULT_CONFIG_SEED = {
  key: 'default' as const,
  isActive: true,
  activityCoolingDays: 5,
  farmerCoolingDays: 30,
  defaultPercentage: 10,
  activityTypePercentages: {
    'Field Day': 10,
    'Group Meeting': 10,
    'Demo Visit': 10,
    'OFM': 10,
    'Other': 10,
  },
  eligibleActivityTypes: [] as string[], // empty => all eligible
};

const getActiveSamplingConfig = async () => {
  const existing = await SamplingConfig.findOne({ key: 'default' });
  if (existing) {
    return existing;
  }
  const created = await SamplingConfig.create(DEFAULT_CONFIG_SEED);
  return created;
};

/**
 * Check if farmer is in cooling period
 */
const isFarmerInCoolingWindow = (lastCallDate: Date, farmerCoolingDays: number): boolean => {
  if (!lastCallDate || !(lastCallDate instanceof Date) || isNaN(lastCallDate.getTime())) {
    return false;
  }
  const expiresAt = new Date(lastCallDate);
  expiresAt.setDate(expiresAt.getDate() + farmerCoolingDays);
  return expiresAt.getTime() > Date.now();
};

const getEligibleFarmers = async (
  farmerIds: mongoose.Types.ObjectId[],
  farmerCoolingDays: number
): Promise<mongoose.Types.ObjectId[]> => {
  if (!farmerIds || farmerIds.length === 0) return [];

  const cooling = await CoolingPeriod.find({
    farmerId: { $in: farmerIds },
  }).select('farmerId lastCallDate').lean();

  const blocked = new Set<string>();
  for (const entry of cooling) {
    if (entry?.farmerId && entry?.lastCallDate) {
      const inCooling = isFarmerInCoolingWindow(new Date(entry.lastCallDate), farmerCoolingDays);
      if (inCooling) {
        blocked.add(entry.farmerId.toString());
      }
    }
  }

  return farmerIds.filter((id) => !blocked.has(id.toString()));
};

const isActivityPastCoolingGate = (activityDate: Date, activityCoolingDays: number): boolean => {
  const gate = new Date(activityDate);
  gate.setDate(gate.getDate() + activityCoolingDays);
  return Date.now() >= gate.getTime();
};

const isActivityTypeEligible = (activityType: string, eligibleTypes: string[]): boolean => {
  if (!eligibleTypes || eligibleTypes.length === 0) return true; // empty => all eligible
  return eligibleTypes.includes(activityType);
};

const createUnassignedTasksForFarmers = async (
  sampledFarmerIds: mongoose.Types.ObjectId[],
  activityId: mongoose.Types.ObjectId,
  scheduledDate: Date
): Promise<number> => {
  let created = 0;

  for (const farmerId of sampledFarmerIds) {
    const existingTask = await CallTask.findOne({ farmerId, activityId }).select('_id').lean();
    if (existingTask) {
      continue;
    }

    await CallTask.create({
      farmerId,
      activityId,
      status: 'unassigned',
      retryCount: 0,
      assignedAgentId: null,
      scheduledDate,
      interactionHistory: [],
    });
    created++;
  }

  return created;
};

/**
 * Sample farmers for an activity and create call tasks
 */
export const sampleAndCreateTasks = async (
  activityId: string,
  samplingPercentage?: number,
  options?: {
    runByUserId?: string;
    forceRun?: boolean; // ignore activityCoolingDays gate (still respects lifecycle status)
    scheduledDate?: Date; // defaults to now (Team Lead run time)
    /** When true (first-sample run), set activity.firstSampleRun = true and firstSampledAt after sampling. When false (adhoc), do not change firstSampleRun. */
    setFirstSampleRun?: boolean;
    /** Minimum farmers to sample for this activity (e.g. for FDA mandatory representation). */
    minFarmersToSample?: number;
    /** Cap on farmers to sample for this activity (e.g. for FDA proportional quota). */
    maxFarmersToSample?: number;
  }
): Promise<{
  skipped?: boolean;
  skipReason?: string;
  totalFarmers: number;
  eligibleFarmers: number;
  sampledCount: number;
  tasksCreated: number;
  activityLifecycleStatus?: string;
}> => {
  try {
    const config = await getActiveSamplingConfig();
    const activity = await Activity.findById(activityId).populate('farmerIds');
    
    if (!activity) {
      throw new Error('Activity not found');
    }

    // Only sample Active activities
    if (activity.lifecycleStatus && activity.lifecycleStatus !== 'active') {
      return {
        skipped: true,
        skipReason: `Provide only Active activities for sampling (current: ${activity.lifecycleStatus})`,
        totalFarmers: activity.farmerIds?.length || 0,
        eligibleFarmers: 0,
        sampledCount: 0,
        tasksCreated: 0,
        activityLifecycleStatus: activity.lifecycleStatus,
      };
    }

    // Type eligibility gate
    if (!isActivityTypeEligible(activity.type, config.eligibleActivityTypes || [])) {
      // Keep as active; Team Lead can apply eligibility bulk action separately to mark not_eligible.
      return {
        skipped: true,
        skipReason: `Activity type "${activity.type}" is not eligible per Sampling Control`,
        totalFarmers: activity.farmerIds?.length || 0,
        eligibleFarmers: 0,
        sampledCount: 0,
        tasksCreated: 0,
        activityLifecycleStatus: activity.lifecycleStatus || 'active',
      };
    }

    // Activity cooling gate (unless forceRun)
    const shouldCheckGate = !options?.forceRun;
    if (shouldCheckGate && !isActivityPastCoolingGate(activity.date, config.activityCoolingDays)) {
      return {
        skipped: true,
        skipReason: `Activity is within activityCoolingDays=${config.activityCoolingDays}`,
        totalFarmers: activity.farmerIds?.length || 0,
        eligibleFarmers: 0,
        sampledCount: 0,
        tasksCreated: 0,
        activityLifecycleStatus: activity.lifecycleStatus || 'active',
      };
    }

    const totalFarmers = activity.farmerIds.length;
    
    if (totalFarmers === 0) {
      logger.warn(`Activity ${activityId} has no farmers`);
      return {
        totalFarmers: 0,
        eligibleFarmers: 0,
        sampledCount: 0,
        tasksCreated: 0,
        activityLifecycleStatus: activity.lifecycleStatus || 'active',
      };
    }

    // Get sampling percentage (use activity type specific or default)
    const percentage = samplingPercentage || 
      config.activityTypePercentages[activity.type] || 
      config.defaultPercentage;

    // Get eligible farmers (not in cooling period)
    const eligibleFarmerIds = await getEligibleFarmers(
      activity.farmerIds as mongoose.Types.ObjectId[],
      config.farmerCoolingDays
    );

    if (eligibleFarmerIds.length === 0) {
      logger.warn(`No eligible farmers for activity ${activityId} (all in farmer cooling window)`);
    }

    // Calculate sample size
    let sampleSize = eligibleFarmerIds.length > 0 ? calculateSampleSize(eligibleFarmerIds.length, percentage) : 0;
    if (options?.minFarmersToSample != null && eligibleFarmerIds.length > 0) {
      sampleSize = Math.max(sampleSize, Math.min(options.minFarmersToSample, eligibleFarmerIds.length));
    }
    if (options?.maxFarmersToSample != null) {
      sampleSize = Math.min(sampleSize, options.maxFarmersToSample);
    }

    // Perform reservoir sampling
    const sampledFarmerIds = sampleSize > 0 ? reservoirSampling(eligibleFarmerIds, sampleSize) : [];

    // Scheduled date is the Team Lead run date (now) unless provided
    const scheduledDate = options?.scheduledDate ? new Date(options.scheduledDate) : new Date();

    // Create call tasks for sampled farmers
    const tasksCreated = await createUnassignedTasksForFarmers(
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
          coolingPeriodDays: config.farmerCoolingDays,
          expiresAt: new Date(Date.now() + config.farmerCoolingDays * 24 * 60 * 60 * 1000),
        },
        { upsert: true, new: true }
      );
    }

    // Update activity lifecycle status based on sampledCount
    const now = new Date();
    const newLifecycleStatus = sampledFarmerIds.length > 0 ? 'sampled' : 'inactive';
    activity.lifecycleStatus = newLifecycleStatus as any;
    activity.lifecycleUpdatedAt = now;
    activity.lastSamplingRunAt = now;
    if (options?.setFirstSampleRun === true) {
      (activity as any).firstSampleRun = true;
      (activity as any).firstSampledAt = now;
    }
    await activity.save();

    // Log sampling audit
    // We keep "latest audit per activity" to support manual resampling without schema/index migrations.
    await SamplingAudit.deleteOne({ activityId: activity._id });
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
        activityCoolingDays: config.activityCoolingDays,
        farmerCoolingDays: config.farmerCoolingDays,
        eligibleActivityTypes: config.eligibleActivityTypes,
        scheduledDate,
        runByUserId: options?.runByUserId || null,
      },
    });

    logger.info(
      `Sampling completed for activity ${activityId}: ${sampledFarmerIds.length}/${eligibleFarmerIds.length} sampled (${percentage}%), ${tasksCreated} tasks created (unassigned)`
    );

    return {
      totalFarmers,
      eligibleFarmers: eligibleFarmerIds.length,
      sampledCount: sampledFarmerIds.length,
      tasksCreated,
      activityLifecycleStatus: newLifecycleStatus,
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
    const config = await getActiveSamplingConfig();
    // Find Active activities only; Team Lead-triggered bulk sampling may still call this.
    const activeActivities = await Activity.find({
      lifecycleStatus: 'active',
      farmerIds: { $exists: true, $ne: [] },
    });

    logger.info(`Found ${activeActivities.length} active activities`);

    for (const activity of activeActivities) {
      try {
        // Skip types that are not eligible
        if (!isActivityTypeEligible(activity.type, config.eligibleActivityTypes || [])) {
          continue;
        }
        const result = await sampleAndCreateTasks(activity._id.toString());
        if (!result.skipped) {
          activitiesProcessed++;
          totalTasksCreated += result.tasksCreated;
        }
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


