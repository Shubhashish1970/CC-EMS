import { Activity, IActivity } from '../models/Activity.js';
import { Farmer, IFarmer } from '../models/Farmer.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';
import axios, { AxiosError } from 'axios';

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
 * Fetch activities from FFA API with timeout and better error handling
 */
const fetchFFAActivities = async (): Promise<FFAActivity[]> => {
  // Validate FFA_API_URL is set
  if (!process.env.FFA_API_URL) {
    logger.warn('FFA_API_URL environment variable is not set, using default: http://localhost:4000/api');
  }

  const url = `${FFA_API_URL}/activities?limit=100`;
  logger.info(`Fetching activities from FFA API: ${url}`, {
    ffaApiUrl: FFA_API_URL,
    fullUrl: url,
    hasEnvVar: !!process.env.FFA_API_URL,
  });

  try {
    // Use axios with timeout and proper error handling
    const response = await axios.get(url, {
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
      },
      validateStatus: (status) => status < 500, // Don't throw for 4xx errors, we'll handle them
    });
    
    // Check if response is successful (2xx)
    if (response.status >= 400) {
      logger.error(`FFA API returned error status ${response.status}:`, response.data);
      throw new Error(`FFA API error (${response.status}): ${response.statusText || 'Unknown error'}`);
    }

    const data = response.data;
    
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
    let errorMessage = 'Unknown error';
    let errorDetails: any = {};
    
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      errorDetails = {
        code: axiosError.code,
        message: axiosError.message,
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        responseData: axiosError.response?.data,
        config: {
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          timeout: axiosError.config?.timeout,
        },
      };
      
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        errorMessage = `Cannot connect to FFA API at ${FFA_API_URL}. Please check if the FFA API is running and FFA_API_URL is configured correctly.`;
      } else if (axiosError.code === 'ETIMEDOUT' || axiosError.message.includes('timeout')) {
        errorMessage = 'FFA API request timed out after 30 seconds';
      } else if (axiosError.response) {
        errorMessage = `FFA API error (${axiosError.response.status}): ${axiosError.response.statusText || 'Unknown error'}`;
        if (axiosError.response.data) {
          errorMessage += ` - ${JSON.stringify(axiosError.response.data)}`;
        }
      } else {
        errorMessage = `Network error connecting to FFA API: ${axiosError.message}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = {
        name: error.name,
        stack: error.stack,
      };
    } else {
      errorDetails = { rawError: error };
    }
    
    logger.error('Error fetching activities from FFA API:', {
      error: errorMessage,
      url,
      ffaApiUrl: FFA_API_URL,
      envVarSet: !!process.env.FFA_API_URL,
      errorDetails,
    });
    
    throw new Error(errorMessage);
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

