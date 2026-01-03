import cron from 'node-cron';
import { syncFFAData } from '../services/ffaSync.js';
import { sampleAllActivities } from '../services/samplingService.js';
import logger from '../config/logger.js';

/**
 * Setup cron jobs for scheduled tasks
 */
export const setupCronJobs = (): void => {
  // FFA Sync: Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    try {
      logger.info('Starting scheduled FFA sync...');
      const result = await syncFFAData();
      logger.info(`Scheduled FFA sync completed: ${result.activitiesSynced} activities, ${result.farmersSynced} farmers`);
    } catch (error) {
      logger.error('Scheduled FFA sync failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  // Sampling: Run every 2 hours at minute 30 (after FFA sync)
  cron.schedule('30 */2 * * *', async () => {
    try {
      logger.info('Starting scheduled sampling...');
      const result = await sampleAllActivities();
      logger.info(`Scheduled sampling completed: ${result.activitiesProcessed} activities, ${result.totalTasksCreated} tasks created`);
    } catch (error) {
      logger.error('Scheduled sampling failed:', error);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });

  logger.info('Cron jobs scheduled: FFA sync (hourly), Sampling (every 2 hours)');
};

