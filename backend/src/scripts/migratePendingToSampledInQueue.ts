/**
 * Migration script to update all 'pending' task statuses to 'sampled_in_queue'
 * Run this once after deploying the status enum change
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CallTask } from '../models/CallTask.js';
import logger from '../config/logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Kweka_Call_Centre';

const migratePendingToSampledInQueue = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('✅ Connected to MongoDB');

    // Update all tasks with status 'pending' to 'sampled_in_queue'
    // Using direct MongoDB update to handle enum change
    const result = await CallTask.updateMany(
      { status: 'pending' },
      { $set: { status: 'sampled_in_queue' } }
    );

    logger.info(`✅ Migration completed:`);
    logger.info(`   - Tasks updated: ${result.modifiedCount}`);
    logger.info(`   - Tasks matched: ${result.matchedCount}`);

    // Verify migration
    const pendingCount = await CallTask.countDocuments({ status: 'pending' });
    const sampledCount = await CallTask.countDocuments({ status: 'sampled_in_queue' });

    logger.info(`\n📊 Verification:`);
    logger.info(`   - Remaining 'pending' tasks: ${pendingCount} (should be 0)`);
    logger.info(`   - 'sampled_in_queue' tasks: ${sampledCount}`);

    if (pendingCount > 0) {
      logger.warn(`⚠️  Warning: ${pendingCount} tasks still have 'pending' status`);
    } else {
      logger.info(`✅ All tasks successfully migrated!`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during migration:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

migratePendingToSampledInQueue();
