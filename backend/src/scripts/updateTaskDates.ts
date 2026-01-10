import mongoose from 'mongoose';
import { CallTask } from '../models/CallTask.js';
import { User } from '../models/User.js';
import logger from '../config/logger.js';
import dotenv from 'dotenv';

dotenv.config();

const updateTaskDates = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found');
    }

    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    const agent = await User.findOne({ role: 'cc_agent', email: 'shubhashish@intelliagri.in' });
    if (!agent) {
      console.log('Agent not found');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Update all pending tasks for this agent to be due today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await CallTask.updateMany(
      {
        assignedAgentId: agent._id,
        status: 'pending',
        scheduledDate: { $gt: today }
      },
      {
        $set: { scheduledDate: today }
      }
    );

    console.log(`\n✅ Updated ${result.modifiedCount} tasks to be due today`);
    
    const availableTasks = await CallTask.countDocuments({
      assignedAgentId: agent._id,
      status: { $in: ['pending', 'in_progress'] },
      scheduledDate: { $lte: new Date() }
    });

    console.log(`📊 Tasks available for agent: ${availableTasks}`);
    console.log('\n💡 Tasks are now ready to be loaded in the frontend!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error updating task dates:', error);
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

updateTaskDates();


