import mongoose from 'mongoose';
import { sampleAllActivities } from '../services/samplingService.js';
import { User } from '../models/User.js';
import logger from '../config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const triggerSampling = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Check if agents exist
    const agents = await User.find({ role: 'cc_agent', isActive: true });
    console.log(`\n📊 Found ${agents.length} active CC agents`);
    
    if (agents.length === 0) {
      console.log('\n⚠️  WARNING: No active CC agents found!');
      console.log('   Tasks cannot be assigned without agents.');
      console.log('   Please create at least one CC agent user first.');
      console.log('   You can use the seed script or create via API.\n');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log('   Agents:', agents.map(a => `${a.name} (${a.email})`).join(', '));

    console.log('\n🔄 Triggering sampling to create tasks from activities...\n');
    
    const result = await sampleAllActivities();

    console.log('\n✅ Sampling completed successfully!');
    console.log(`   - ${result.activitiesProcessed} activities processed`);
    console.log(`   - ${result.totalTasksCreated} tasks created`);
    if (result.errors.length > 0) {
      console.log(`   - ${result.errors.length} errors occurred`);
      result.errors.forEach(err => console.log(`     • ${err}`));
    }
    console.log('\n💡 You can now load tasks in the frontend!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error triggering sampling:', error);
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

triggerSampling();


