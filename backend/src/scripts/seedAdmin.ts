import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { hashPassword } from '../utils/password.js';
import logger from '../config/logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Kweka_Call_Centre';

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'shubhashish@kweka.ai' });
    if (existingAdmin) {
      logger.info('Admin user already exists. Skipping seed.');
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const hashedPassword = await hashPassword('Admin@123');
    
    const admin = new User({
      name: 'System Administrator',
      email: 'shubhashish@kweka.ai',
      password: hashedPassword,
      employeeId: 'ADMIN001',
      role: 'mis_admin',
      languageCapabilities: ['Hindi', 'English', 'Telugu', 'Marathi', 'Kannada', 'Tamil'],
      assignedTerritories: [],
      isActive: true,
    });

    await admin.save();
    logger.info('✅ Admin user created successfully!');
    logger.info('📧 Email: shubhashish@kweka.ai');
    logger.info('🔑 Password: Admin@123');
    logger.info('');
    logger.info('⚠️  Please change the password after first login!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding admin user:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();


