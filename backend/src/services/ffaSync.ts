import { Activity, IActivity } from '../models/Activity.js';
import { Farmer, IFarmer } from '../models/Farmer.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';

interface FFAActivity {
  activityId: string;
  type: string;
  date: string;
  officerId: string;
  officerName: string;
  location: string;
  territory: string;
  crops?: string[];
  products?: string[];
  farmers: FFAFarmer[];
}

interface FFAFarmer {
  farmerId: string;
  name: string;
  mobileNumber: string;
  location: string;
  preferredLanguage: string;
  territory: string;
  crops?: string[];
  photoUrl?: string;
}

const FFA_API_URL = process.env.FFA_API_URL || 'http://localhost:4000/api';

/**
 * Fetch activities from FFA API
 */
const fetchFFAActivities = async (): Promise<FFAActivity[]> => {
  try {
    const response = await fetch(`${FFA_API_URL}/activities?limit=100`);
    
    if (!response.ok) {
      throw new Error(`FFA API error: ${response.statusText}`);
    }

    const data = await response.json() as { success: boolean; data?: { activities?: FFAActivity[] } };
    
    if (!data.success || !data.data?.activities) {
      throw new Error('Invalid response from FFA API');
    }

    return data.data.activities;
  } catch (error) {
    logger.error('Error fetching activities from FFA API:', error);
    throw error;
  }
};

/**
 * Sync a single activity from FFA
 */
const syncActivity = async (ffaActivity: FFAActivity): Promise<IActivity> => {
  try {
    // Upsert activity
    const activity = await Activity.findOneAndUpdate(
      { activityId: ffaActivity.activityId },
      {
        activityId: ffaActivity.activityId,
        type: ffaActivity.type,
        date: new Date(ffaActivity.date),
        officerId: ffaActivity.officerId,
        officerName: ffaActivity.officerName,
        location: ffaActivity.location,
        territory: ffaActivity.territory,
        crops: ffaActivity.crops || [],
        products: ffaActivity.products || [],
        syncedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Sync farmers for this activity
    const farmerIds: mongoose.Types.ObjectId[] = [];
    
    for (const ffaFarmer of ffaActivity.farmers) {
      // Upsert farmer
      const farmer = await Farmer.findOneAndUpdate(
        { mobileNumber: ffaFarmer.mobileNumber },
        {
          name: ffaFarmer.name,
          mobileNumber: ffaFarmer.mobileNumber,
          location: ffaFarmer.location,
          preferredLanguage: ffaFarmer.preferredLanguage,
          territory: ffaFarmer.territory,
          photoUrl: ffaFarmer.photoUrl,
        },
        { upsert: true, new: true }
      );

      farmerIds.push(farmer._id);
    }

    // Update activity with farmer IDs
    activity.farmerIds = farmerIds;
    await activity.save();

    logger.info(`Synced activity: ${ffaActivity.activityId} with ${farmerIds.length} farmers`);

    return activity;
  } catch (error) {
    logger.error(`Error syncing activity ${ffaActivity.activityId}:`, error);
    throw error;
  }
};

/**
 * Sync all activities from FFA API
 */
export const syncFFAData = async (): Promise<{
  activitiesSynced: number;
  farmersSynced: number;
  errors: string[];
}> => {
  const startTime = Date.now();
  const errors: string[] = [];
  let activitiesSynced = 0;
  let farmersSynced = 0;

  try {
    logger.info('Starting FFA data sync...');

    const ffaActivities = await fetchFFAActivities();
    logger.info(`Fetched ${ffaActivities.length} activities from FFA API`);

    for (const ffaActivity of ffaActivities) {
      try {
        const activity = await syncActivity(ffaActivity);
        activitiesSynced++;
        farmersSynced += activity.farmerIds.length;
      } catch (error) {
        const errorMsg = `Failed to sync activity ${ffaActivity.activityId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        logger.error(errorMsg);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`FFA sync completed in ${duration}s: ${activitiesSynced} activities, ${farmersSynced} farmers`);

    return {
      activitiesSynced,
      farmersSynced,
      errors,
    };
  } catch (error) {
    logger.error('FFA sync failed:', error);
    throw error;
  }
};

/**
 * Get sync status
 */
export const getSyncStatus = async () => {
  try {
    const lastActivity = await Activity.findOne().sort({ syncedAt: -1 });
    const totalActivities = await Activity.countDocuments();
    const totalFarmers = await Farmer.countDocuments();

    return {
      lastSyncAt: lastActivity?.syncedAt || null,
      totalActivities,
      totalFarmers,
    };
  } catch (error) {
    logger.error('Error getting sync status:', error);
    throw error;
  }
};

