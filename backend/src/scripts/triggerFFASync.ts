import mongoose from 'mongoose';
import { syncFFAData } from '../services/ffaSync.js';
import logger from '../config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const triggerSync = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    console.log('🔄 Triggering FFA sync to get fresh data with authentic Indian names...\n');
    
    const result = await syncFFAData();

    console.log('\n✅ Sync completed successfully!');
    console.log(`   - ${result.activitiesSynced} activities synced`);
    console.log(`   - ${result.farmersSynced} farmers synced`);
    if (result.errors.length > 0) {
      console.log(`   - ${result.errors.length} errors occurred`);
      result.errors.forEach(err => console.log(`     • ${err}`));
    }
    console.log('\n💡 You can now load tasks in the frontend to see the new authentic Indian farmer names!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error triggering FFA sync:', error);
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

triggerSync();

