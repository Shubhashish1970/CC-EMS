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

    // Update tasks with future scheduled dates to today
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
    
    // Also update any tasks scheduled in the past to today
    const pastResult = await CallTask.updateMany(
      {
        assignedAgentId: agent._id,
        status: 'pending',
        scheduledDate: { $lt: today }
      },
      {
        $set: { scheduledDate: today }
      }
    );

    console.log(`✅ Updated ${pastResult.modifiedCount} past tasks to today`);
    
    const availableTasks = await CallTask.countDocuments({
      assignedAgentId: agent._id,
      status: 'pending',
      scheduledDate: { $lte: today }
    });

    console.log(`✅ Available tasks for agent: ${availableTasks}`);
    
    const totalTasks = await CallTask.countDocuments({
      assignedAgentId: agent._id,
    });

    console.log(`✅ Total tasks for agent: ${totalTasks}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error updating task dates:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

updateTaskDates();
