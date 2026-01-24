import mongoose from 'mongoose';
import { CallTask } from '../models/CallTask.js';
import { getOutcomeFromStatus } from '../utils/outcomeHelper.js';
import logger from '../config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  logger.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function backfillOutcome() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      maxPoolSize: 50,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
    });
    logger.info('Connected to MongoDB');

    logger.info('Starting outcome backfill...');
    
    // Get all tasks that don't have an outcome set
    const tasksWithoutOutcome = await CallTask.find({ 
      outcome: { $exists: false } 
    }).lean();

    logger.info(`Found ${tasksWithoutOutcome.length} tasks without outcome field`);

    let updated = 0;
    let errors = 0;

    // Process in batches to avoid memory issues
    const batchSize = 1000;
    for (let i = 0; i < tasksWithoutOutcome.length; i += batchSize) {
      const batch = tasksWithoutOutcome.slice(i, i + batchSize);
      
      for (const task of batch) {
        try {
          const outcome = getOutcomeFromStatus(task.status);
          await CallTask.updateOne(
            { _id: task._id },
            { $set: { outcome } }
          );
          updated++;
        } catch (error: any) {
          logger.error(`Error updating task ${task._id}: ${error.message}`);
          errors++;
        }
      }

      if (i % (batchSize * 10) === 0) {
        logger.info(`Processed ${Math.min(i + batchSize, tasksWithoutOutcome.length)}/${tasksWithoutOutcome.length} tasks...`);
      }
    }

    logger.info(`\n✅ Outcome backfill completed:`);
    logger.info(`   - Updated: ${updated} tasks`);
    logger.info(`   - Errors: ${errors} tasks`);

    // Also update tasks that have null outcome
    const tasksWithNullOutcome = await CallTask.countDocuments({ outcome: null });
    if (tasksWithNullOutcome > 0) {
      logger.info(`\nUpdating ${tasksWithNullOutcome} tasks with null outcome...`);
      const nullTasks = await CallTask.find({ outcome: null }).lean();
      
      for (const task of nullTasks) {
        try {
          const outcome = getOutcomeFromStatus(task.status);
          await CallTask.updateOne(
            { _id: task._id },
            { $set: { outcome } }
          );
        } catch (error: any) {
          logger.error(`Error updating task ${task._id}: ${error.message}`);
        }
      }
      logger.info(`✅ Updated ${tasksWithNullOutcome} tasks with null outcome`);
    }

    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
    process.exit(0);
  } catch (error: any) {
    logger.error(`Error during outcome backfill: ${error.message}`);
    logger.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

backfillOutcome();
