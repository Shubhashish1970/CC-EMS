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

// Check if fetch is available (Node.js 18+ has it built-in)
if (typeof fetch === 'undefined') {
  logger.error('fetch API is not available. This requires Node.js 18+ or a fetch polyfill.');
  throw new Error('fetch API is not available. Please upgrade to Node.js 18+ or add a fetch polyfill.');
}

/**
 * Fetch activities from FFA API with timeout and better error handling
 */
const fetchFFAActivities = async (): Promise<FFAActivity[]> => {
  // Validate FFA_API_URL is set
  if (!process.env.FFA_API_URL) {
    logger.warn('FFA_API_URL environment variable is not set, using default: http://localhost:4000/api');
  }

  const url = `${FFA_API_URL}/activities?limit=100`;
  logger.info(`Fetching activities from FFA API: ${url}`);

  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    let response: Response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('FFA API request timed out after 30 seconds');
      }
      if (fetchError.code === 'ECONNREFUSED' || fetchError.code === 'ENOTFOUND') {
        throw new Error(`Cannot connect to FFA API at ${FFA_API_URL}. Please check if the FFA API is running and FFA_API_URL is configured correctly.`);
      }
      throw new Error(`Network error connecting to FFA API: ${fetchError.message}`);
    }
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      logger.error(`FFA API returned error status ${response.status}: ${errorText}`);
      throw new Error(`FFA API error (${response.status}): ${response.statusText}. ${errorText}`);
    }

    let data: any;
    try {
      data = await response.json();
    } catch (parseError) {
      logger.error('Failed to parse FFA API response as JSON');
      throw new Error('FFA API returned invalid JSON response');
    }
    
    if (!data || typeof data !== 'object') {
      throw new Error('FFA API returned invalid response format');
    }

    if (!data.success) {
      logger.error('FFA API returned success: false', data);
      throw new Error(data.message || 'FFA API returned an error response');
    }

    if (!data.data || !Array.isArray(data.data.activities)) {
      logger.error('FFA API response missing activities array', data);
      throw new Error('FFA API response does not contain activities array');
    }

    logger.info(`Successfully fetched ${data.data.activities.length} activities from FFA API`);
    return data.data.activities;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching activities from FFA API:', {
      error: errorMessage,
      url,
      ffaApiUrl: FFA_API_URL,
    });
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
    logger.info('Starting FFA data sync...', {
      ffaApiUrl: FFA_API_URL,
      hasEnvVar: !!process.env.FFA_API_URL,
    });

    let ffaActivities: FFAActivity[];
    try {
      ffaActivities = await fetchFFAActivities();
      logger.info(`Fetched ${ffaActivities.length} activities from FFA API`);
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Failed to fetch activities from FFA API';
      logger.error('Failed to fetch activities from FFA API:', errorMsg);
      throw new Error(`Failed to fetch activities from FFA API: ${errorMsg}`);
    }

    if (!ffaActivities || ffaActivities.length === 0) {
      logger.warn('No activities returned from FFA API');
      return {
        activitiesSynced: 0,
        farmersSynced: 0,
        errors: ['No activities found in FFA API response'],
      };
    }

    for (const ffaActivity of ffaActivities) {
      try {
        if (!ffaActivity.activityId) {
          errors.push('Skipped activity: missing activityId');
          logger.warn('Skipped activity with missing activityId');
          continue;
        }

        const activity = await syncActivity(ffaActivity);
        activitiesSynced++;
        farmersSynced += activity.farmerIds.length;
      } catch (error) {
        const errorMsg = `Failed to sync activity ${ffaActivity.activityId || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        logger.error(errorMsg, error);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`FFA sync completed in ${duration}s: ${activitiesSynced} activities, ${farmersSynced} farmers, ${errors.length} errors`);

    return {
      activitiesSynced,
      farmersSynced,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('FFA sync failed:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
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

