import mongoose from 'mongoose';
import { Activity } from '../models/Activity.js';
import { Farmer } from '../models/Farmer.js';
import { CallTask } from '../models/CallTask.js';
import logger from '../config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const clearFFAData = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Clear all FFA-related data
    const farmerResult = await Farmer.deleteMany({});
    const activityResult = await Activity.deleteMany({});
    const taskResult = await CallTask.deleteMany({});

    logger.info(`Cleared ${farmerResult.deletedCount} farmers`);
    logger.info(`Cleared ${activityResult.deletedCount} activities`);
    logger.info(`Cleared ${taskResult.deletedCount} tasks`);

    console.log('\n✅ FFA data cleared successfully!');
    console.log(`   - ${farmerResult.deletedCount} farmers deleted`);
    console.log(`   - ${activityResult.deletedCount} activities deleted`);
    console.log(`   - ${taskResult.deletedCount} tasks deleted`);
    console.log('\n💡 Now trigger a new FFA sync to get fresh data with authentic Indian names.');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error clearing FFA data:', error);
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

clearFFAData();


