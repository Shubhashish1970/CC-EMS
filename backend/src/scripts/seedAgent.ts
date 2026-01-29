import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import logger from '../config/logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Kweka_Call_Centre';

const seedAgent = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Check if agent already exists
    const existingAgent = await User.findOne({ email: 'shubhashish@intelliagri.in' });
    if (existingAgent) {
      logger.info('Agent user already exists. Skipping seed.');
      logger.info('Agent details:', {
        email: existingAgent.email,
        role: existingAgent.role,
        isActive: existingAgent.isActive,
        employeeId: existingAgent.employeeId,
      });
      await mongoose.disconnect();
      return;
    }

    // Create agent user
    const hashedPassword = await hashPassword('Admin@123');
    
    const agent = new User({
      name: 'Test Agent',
      email: 'shubhashish@intelliagri.in',
      password: hashedPassword,
      employeeId: 'AGENT001',
      role: 'cc_agent',
      languageCapabilities: ['Hindi', 'English', 'Telugu', 'Marathi', 'Kannada', 'Tamil'],
      assignedTerritories: [],
      isActive: true,
    });

    await agent.save();
    logger.info('✅ Agent user created successfully!');
    logger.info('📧 Email: shubhashish@intelliagri.in');
    logger.info('🔑 Password: Admin@123');
    logger.info('');
    logger.info('⚠️  Please change the password after first login!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding agent user:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAgent();
