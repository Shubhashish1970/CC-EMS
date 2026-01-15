import { Activity, IActivity } from '../models/Activity.js';
import { Farmer, IFarmer } from '../models/Farmer.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';
import axios, { AxiosError } from 'axios';
import { getLanguageForState } from '../utils/stateLanguageMapper.js';

interface FFAActivity {
  activityId: string;
  type: string;
  date: string;
  officerId: string; // FDA empCode
  officerName: string; // FDA name
  location: string;
  territory: string; // legacy / fallback
  territoryName?: string; // Activity API v2 preferred
  zoneName?: string;
  buName?: string;
  tmEmpCode?: string;
  tmName?: string;
  state?: string; // NEW: State field from FFA API (optional during transition)
  crops?: string[];
  products?: string[];
  farmers: FFAFarmer[];
}

interface FFAFarmer {
  farmerId: string;
  name: string;
  mobileNumber: string;
  location: string;
  // preferredLanguage: string; // REMOVED - will be derived from state
  territory?: string; // optional; if missing we'll use activity territoryName/territory
  crops?: string[];
  photoUrl?: string;
}

const FFA_API_URL = process.env.FFA_API_URL || 'http://localhost:4000/api';

/**
 * Fetch activities from FFA API with timeout and better error handling
 * @param dateFrom - Optional date to fetch activities after (for incremental sync)
 */
const fetchFFAActivities = async (dateFrom?: Date): Promise<FFAActivity[]> => {
  // Validate FFA_API_URL is set
  if (!process.env.FFA_API_URL) {
    logger.warn('FFA_API_URL environment variable is not set, using default: http://localhost:4000/api');
  }

  // Build URL with optional dateFrom parameter for incremental sync
  // Handle trailing slash in FFA_API_URL to avoid double slashes
  const baseUrl = FFA_API_URL.endsWith('/') ? FFA_API_URL.slice(0, -1) : FFA_API_URL;
  let url = `${baseUrl}/activities?limit=100`;
  if (dateFrom) {
    const dateFromISO = dateFrom.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    url += `&dateFrom=${dateFromISO}`;
    logger.info(`[FFA SYNC] Incremental sync: fetching activities after ${dateFromISO}`);
  } else {
    logger.info(`[FFA SYNC] Full sync: fetching all activities`);
  }

  logger.info(`[FFA SYNC] Fetching activities from FFA API: ${url}`, {
    ffaApiUrl: FFA_API_URL,
    fullUrl: url,
    hasEnvVar: !!process.env.FFA_API_URL,
    incremental: !!dateFrom,
    dateFrom: dateFrom?.toISOString(),
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

    logger.info(`[FFA SYNC] Successfully fetched ${data.data.activities.length} activities from FFA API`);
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
    
    logger.error('[FFA SYNC] Error fetching activities from FFA API:', {
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
    // Determine state (prefer FFA `state`, fallback to territory parsing for backward compatibility)
    // NOTE: In steady state, Activity API v2 must always provide `state`.
    const resolvedState = (ffaActivity.state && ffaActivity.state.trim())
      ? ffaActivity.state.trim()
      : (ffaActivity.territory ? ffaActivity.territory.replace(/\s+Zone$/i, '').trim() : '');

    if (!resolvedState) {
      throw new Error(`Activity ${ffaActivity.activityId} is missing both state and territory (cannot resolve state)`);
    }

    if (!ffaActivity.state || !ffaActivity.state.trim()) {
      logger.warn(`[FFA SYNC] Activity ${ffaActivity.activityId} missing state in payload; derived state from territory as "${resolvedState}"`);
    }

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
        territoryName: (ffaActivity.territoryName || ffaActivity.territory || '').trim(),
        zoneName: (ffaActivity.zoneName || '').trim(),
        buName: (ffaActivity.buName || '').trim(),
        state: resolvedState, // Store resolved state
        tmEmpCode: (ffaActivity.tmEmpCode || '').trim(),
        tmName: (ffaActivity.tmName || '').trim(),
        crops: ffaActivity.crops || [],
        products: ffaActivity.products || [],
        syncedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // Sync farmers for this activity
    const farmerIds: mongoose.Types.ObjectId[] = [];
    
    // Get language for state (once per activity)
    const preferredLanguage = await getLanguageForState(resolvedState);
    logger.debug(`[FFA SYNC] Activity ${ffaActivity.activityId} in state "${resolvedState}" mapped to language "${preferredLanguage}"`);
    
    for (const ffaFarmer of ffaActivity.farmers) {
      const resolvedFarmerTerritory = (ffaFarmer.territory || ffaActivity.territoryName || ffaActivity.territory || '').trim();
      // Upsert farmer - preferredLanguage now derived from state
      const farmer = await Farmer.findOneAndUpdate(
        { mobileNumber: ffaFarmer.mobileNumber },
        {
          name: ffaFarmer.name,
          mobileNumber: ffaFarmer.mobileNumber,
          location: ffaFarmer.location,
          preferredLanguage: preferredLanguage, // Derived from state, not from FFA API
          territory: resolvedFarmerTerritory || 'Unknown',
          photoUrl: ffaFarmer.photoUrl,
        },
        { upsert: true, new: true }
      );

      farmerIds.push(farmer._id);
    }

    // Update activity with farmer IDs
    activity.farmerIds = farmerIds;
    await activity.save();

    logger.info(`[FFA SYNC] Synced activity: ${ffaActivity.activityId} (${resolvedState}) with ${farmerIds.length} farmers (language: ${preferredLanguage})`);

    return activity;
  } catch (error) {
    logger.error(`[FFA SYNC] Error syncing activity ${ffaActivity.activityId}:`, error);
    throw error;
  }
};

/**
 * Sync all activities from FFA API
 * @param fullSync - If true, syncs all activities. If false, only syncs activities after the last sync date (incremental)
 */
// Sync lock to prevent concurrent syncs
let isSyncing = false;
let lastSyncTime: number | null = null;

// Minimum time between syncs (in milliseconds) - default 10 minutes
const MIN_SYNC_INTERVAL = parseInt(process.env.MIN_SYNC_INTERVAL || '600000', 10); // 10 minutes default

export const syncFFAData = async (fullSync: boolean = false): Promise<{
  activitiesSynced: number;
  farmersSynced: number;
  errors: string[];
  syncType: 'full' | 'incremental';
  lastSyncDate?: Date;
  skipped?: boolean;
  skipReason?: string;
}> => {
  const startTime = Date.now();
  const errors: string[] = [];
  let activitiesSynced = 0;
  let farmersSynced = 0;
  let lastSyncDate: Date | undefined;

  try {
    // Check if sync is already in progress
    if (isSyncing) {
      const skipReason = 'Another sync is already in progress';
      logger.warn(`[FFA SYNC] ${skipReason}`);
      return {
        activitiesSynced: 0,
        farmersSynced: 0,
        errors: [skipReason],
        syncType: 'incremental',
        skipped: true,
        skipReason,
      };
    }

    // Check if sync was run recently (for incremental sync only)
    if (!fullSync && lastSyncTime && (Date.now() - lastSyncTime) < MIN_SYNC_INTERVAL) {
      const timeSinceLastSync = Math.round((Date.now() - lastSyncTime) / 1000 / 60); // minutes
      const skipReason = `Sync was completed ${timeSinceLastSync} minute(s) ago. Please wait at least ${Math.round(MIN_SYNC_INTERVAL / 1000 / 60)} minutes between syncs.`;
      logger.info(`[FFA SYNC] ${skipReason}`);
      return {
        activitiesSynced: 0,
        farmersSynced: 0,
        errors: [],
        syncType: 'incremental',
        skipped: true,
        skipReason,
      };
    }

    // Set sync lock
    isSyncing = true;

    // Determine sync type and get last sync date for incremental sync
    if (!fullSync) {
      try {
        // Get the most recently synced activity to determine the cutoff date
        const lastActivity = await Activity.findOne().sort({ syncedAt: -1 });
        if (lastActivity && lastActivity.syncedAt) {
          // Use syncedAt timestamp (when activity was last synced) instead of date
          // This is more accurate for incremental sync as it reflects actual sync time
          // Subtract 1 hour as a buffer to account for API delays and timezone differences
          lastSyncDate = new Date(lastActivity.syncedAt);
          lastSyncDate.setHours(lastSyncDate.getHours() - 1);
          logger.info(`[FFA SYNC] Incremental sync: last activity synced at ${lastActivity.syncedAt.toISOString()}, fetching activities after ${lastSyncDate.toISOString()}`);
          
          // Additional check: if last sync was very recent (within last 5 minutes), skip
          const timeSinceLastSync = Date.now() - lastActivity.syncedAt.getTime();
          if (timeSinceLastSync < 5 * 60 * 1000) { // 5 minutes
            const skipReason = `Last sync completed ${Math.round(timeSinceLastSync / 1000)} seconds ago. No new data expected.`;
            logger.info(`[FFA SYNC] ${skipReason}`);
            isSyncing = false;
            return {
              activitiesSynced: 0,
              farmersSynced: 0,
              errors: [],
              syncType: 'incremental',
              skipped: true,
              skipReason,
            };
          }
        } else {
          logger.info(`[FFA SYNC] No previous sync found, performing full sync`);
          fullSync = true; // Fall back to full sync if no previous sync exists
        }
      } catch (error) {
        logger.error('[FFA SYNC] Error determining last sync date, falling back to full sync:', error);
        fullSync = true; // Fall back to full sync on error
      }
    }

    logger.info(`[FFA SYNC] Starting FFA data sync (${fullSync ? 'full' : 'incremental'})...`, {
      ffaApiUrl: FFA_API_URL,
      hasEnvVar: !!process.env.FFA_API_URL,
      fullSync,
      lastSyncDate: lastSyncDate?.toISOString(),
    });

    let ffaActivities: FFAActivity[];
    try {
      ffaActivities = await fetchFFAActivities(fullSync ? undefined : lastSyncDate);
      logger.info(`[FFA SYNC] Fetched ${ffaActivities.length} activities from FFA API`);
    } catch (fetchError) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Failed to fetch activities from FFA API';
      logger.error('[FFA SYNC] Failed to fetch activities from FFA API:', errorMsg);
      throw new Error(`Failed to fetch activities from FFA API: ${errorMsg}`);
    }

    if (!ffaActivities || ffaActivities.length === 0) {
      logger.warn('[FFA SYNC] No activities returned from FFA API');
      isSyncing = false;
      lastSyncTime = Date.now();
      return {
        activitiesSynced: 0,
        farmersSynced: 0,
        errors: ['No activities found in FFA API response'],
        syncType: fullSync ? 'full' : 'incremental',
        lastSyncDate,
      };
    }

    // Check which activities are actually new (not already synced recently)
    // This prevents redundant processing when sync is run consecutively
    let newActivities: FFAActivity[] = [];
    if (!fullSync && ffaActivities.length > 0) {
      const existingActivityIds = await Activity.find({
        activityId: { $in: ffaActivities.map(a => a.activityId).filter(Boolean) },
        syncedAt: { $gte: lastSyncDate || new Date(0) }, // Only check activities synced after cutoff
      }).select('activityId').lean();

      const existingIds = new Set(existingActivityIds.map(a => a.activityId));
      newActivities = ffaActivities.filter(a => !existingIds.has(a.activityId));
      
      const skippedCount = ffaActivities.length - newActivities.length;
      if (skippedCount > 0) {
        logger.info(`[FFA SYNC] Skipping ${skippedCount} activities that were already synced recently`);
      }
      
      if (newActivities.length === 0) {
        logger.info(`[FFA SYNC] All ${ffaActivities.length} fetched activities were already synced. No new data to process.`);
        isSyncing = false;
        lastSyncTime = Date.now();
        return {
          activitiesSynced: 0,
          farmersSynced: 0,
          errors: [],
          syncType: 'incremental',
          lastSyncDate,
          skipped: true,
          skipReason: `All ${ffaActivities.length} activities were already synced. No new data to process.`,
        };
      }
      
      logger.info(`[FFA SYNC] Processing ${newActivities.length} new activities (${skippedCount} already synced)`);
    } else {
      newActivities = ffaActivities;
    }

    for (const ffaActivity of newActivities) {
      try {
        if (!ffaActivity.activityId) {
          errors.push('Skipped activity: missing activityId');
          logger.warn('[FFA SYNC] Skipped activity with missing activityId');
          continue;
        }

        const activity = await syncActivity(ffaActivity);
        activitiesSynced++;
        farmersSynced += activity.farmerIds.length;
      } catch (error) {
        const errorMsg = `Failed to sync activity ${ffaActivity.activityId || 'unknown'}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        logger.error(`[FFA SYNC] ${errorMsg}`, error);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info(`[FFA SYNC] FFA sync completed in ${duration}s (${fullSync ? 'full' : 'incremental'}): ${activitiesSynced} activities, ${farmersSynced} farmers, ${errors.length} errors`);

    // Release sync lock and update last sync time
    isSyncing = false;
    lastSyncTime = Date.now();

    return {
      activitiesSynced,
      farmersSynced,
      errors,
      syncType: fullSync ? 'full' : 'incremental',
      lastSyncDate,
    };
  } catch (error) {
    // Release sync lock on error
    isSyncing = false;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[FFA SYNC] FFA sync failed:', {
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

