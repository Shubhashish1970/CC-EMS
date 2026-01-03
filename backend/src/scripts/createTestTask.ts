import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CallTask } from '../models/CallTask.js';
import { User } from '../models/User.js';
import { Farmer } from '../models/Farmer.js';
import { Activity } from '../models/Activity.js';
import logger from '../config/logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems_call_centre';

const createTestTask = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    const agent = await User.findOne({ role: 'cc_agent', isActive: true });
    const farmer = await Farmer.findOne();
    const activity = await Activity.findOne();

    if (!agent) {
      logger.error('No CC agent found. Please create a CC agent first.');
      process.exit(1);
    }

    if (!farmer) {
      logger.error('No farmers found. Please sync FFA data first.');
      process.exit(1);
    }

    if (!activity) {
      logger.error('No activities found. Please sync FFA data first.');
      process.exit(1);
    }

    // Check if task already exists
    const existingTask = await CallTask.findOne({
      farmerId: farmer._id,
      activityId: activity._id,
      assignedAgentId: agent._id,
      status: 'pending',
    });

    if (existingTask) {
      logger.info('Test task already exists:', existingTask._id);
      await mongoose.disconnect();
      process.exit(0);
    }

    const task = await CallTask.create({
      farmerId: farmer._id,
      activityId: activity._id,
      assignedAgentId: agent._id,
      status: 'pending',
      retryCount: 0,
      scheduledDate: new Date(),
      interactionHistory: [],
    });

    logger.info('✅ Test task created successfully!');
    logger.info(`Task ID: ${task._id}`);
    logger.info(`Assigned to: ${agent.name} (${agent.email})`);
    logger.info(`Farmer: ${farmer.name}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error creating test task:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

createTestTask();

