import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../config/logger.js';

import { Activity } from '../models/Activity.js';
import { Farmer } from '../models/Farmer.js';
import { CallTask } from '../models/CallTask.js';
import { SamplingAudit } from '../models/SamplingAudit.js';
import { CoolingPeriod } from '../models/CoolingPeriod.js';
import { SamplingConfig } from '../models/SamplingConfig.js';
import { SamplingRun } from '../models/SamplingRun.js';
import { AllocationRun } from '../models/AllocationRun.js';
import { InboundQuery } from '../models/InboundQuery.js';

dotenv.config();

/**
 * DEV SAFE RESET – clear operational/synced data for a fresh FFA refill.
 * Deletes:
 *   call_tasks, sampling_audits, cooling_periods, sampling_configs,
 *   activities, farmers, sampling_runs, allocation_runs, inbound_queries
 * Preserves:
 *   users, master data (crops, products, languages, etc.), state-language mappings
 *
 * After running: start mock FFA API (or point FFA_API_URL at it), trigger Full FFA Sync,
 * then use Sampling Control.
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
    const samplingRunResult = await SamplingRun.deleteMany({});
    const allocationRunResult = await AllocationRun.deleteMany({});
    const inboundResult = await InboundQuery.deleteMany({});
    const activityResult = await Activity.deleteMany({});
    const farmerResult = await Farmer.deleteMany({});

    console.log('\n✅ Dev operational data reset completed');
    console.log(`   - call_tasks deleted: ${taskResult.deletedCount}`);
    console.log(`   - sampling_audits deleted: ${auditResult.deletedCount}`);
    console.log(`   - cooling_periods deleted: ${coolingResult.deletedCount}`);
    console.log(`   - sampling_configs deleted: ${samplingConfigResult.deletedCount}`);
    console.log(`   - sampling_runs deleted: ${samplingRunResult.deletedCount}`);
    console.log(`   - allocation_runs deleted: ${allocationRunResult.deletedCount}`);
    console.log(`   - inbound_queries deleted: ${inboundResult.deletedCount}`);
    console.log(`   - activities deleted: ${activityResult.deletedCount}`);
    console.log(`   - farmers deleted: ${farmerResult.deletedCount}`);
    console.log('\nPreserved: users, crop/product/language master data, state-language mappings.');
    console.log('Next: Start mock FFA API, trigger Full FFA Sync, then run Sampling Control.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error resetting dev operational data:', error);
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();

