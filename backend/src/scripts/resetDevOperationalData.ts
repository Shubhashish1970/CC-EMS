import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../config/logger.js';

import { Activity } from '../models/Activity.js';
import { Farmer } from '../models/Farmer.js';
import { CallTask } from '../models/CallTask.js';
import { SamplingAudit } from '../models/SamplingAudit.js';
import { CoolingPeriod } from '../models/CoolingPeriod.js';
import { SamplingConfig } from '../models/SamplingConfig.js';

dotenv.config();

/**
 * DEV SAFE RESET (Option A)
 * Deletes operational/synced data only:
 * - activities, farmers, call tasks, sampling audit, cooling periods, sampling config
 * Preserves:
 * - users, master data, state-language mappings, etc.
 */
async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    const taskResult = await CallTask.deleteMany({});
    const auditResult = await SamplingAudit.deleteMany({});
    const coolingResult = await CoolingPeriod.deleteMany({});
    const samplingConfigResult = await SamplingConfig.deleteMany({});
    const activityResult = await Activity.deleteMany({});
    const farmerResult = await Farmer.deleteMany({});

    console.log('\n✅ Dev operational data reset completed');
    console.log(`   - call_tasks deleted: ${taskResult.deletedCount}`);
    console.log(`   - sampling_audits deleted: ${auditResult.deletedCount}`);
    console.log(`   - cooling_periods deleted: ${coolingResult.deletedCount}`);
    console.log(`   - sampling_configs deleted: ${samplingConfigResult.deletedCount}`);
    console.log(`   - activities deleted: ${activityResult.deletedCount}`);
    console.log(`   - farmers deleted: ${farmerResult.deletedCount}`);
    console.log('\nNext: Trigger Full Sync from Mock FFA API, then run Sampling Control.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error resetting dev operational data:', error);
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

