import cron from 'node-cron';
import { syncFFAData } from '../services/ffaSync.js';
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

  logger.info('Cron jobs scheduled: FFA sync (hourly)');
};

