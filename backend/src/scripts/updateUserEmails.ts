import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import logger from '../config/logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems_call_centre';

const updateUserEmails = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('✅ Connected to MongoDB');

    // Email mappings
    const emailMappings = [
      { oldEmail: 'admin@nacl.com', newEmail: 'shubhashish@kweka.ai', role: 'mis_admin' },
      { oldEmail: 'agent@nacl.com', newEmail: 'shubhashish@intelliagri.in', role: 'cc_agent' },
    ];

    logger.info('📧 Starting email updates...');

    for (const mapping of emailMappings) {
      // Find user by old email
      const user = await User.findOne({ email: mapping.oldEmail });

      if (!user) {
        logger.warn(`⚠️  User not found with email: ${mapping.oldEmail}`);
        continue;
      }

      // Check if new email already exists
      const existingUser = await User.findOne({ email: mapping.newEmail });
      if (existingUser) {
        logger.error(`❌ Email ${mapping.newEmail} already exists for user: ${existingUser.name} (${existingUser.employeeId})`);
        continue;
      }

      // Update email
      const oldEmail = user.email;
      user.email = mapping.newEmail;
      await user.save();

      logger.info(`✅ Updated email for ${user.name} (${user.employeeId}):`);
      logger.info(`   Old: ${oldEmail}`);
      logger.info(`   New: ${mapping.newEmail}`);
      logger.info(`   Role: ${user.role}`);
    }

    // Verify updates
    logger.info('\n📋 Verification:');
    for (const mapping of emailMappings) {
      const oldUser = await User.findOne({ email: mapping.oldEmail });
      const newUser = await User.findOne({ email: mapping.newEmail });

      if (oldUser) {
        logger.warn(`⚠️  Old email still exists: ${mapping.oldEmail}`);
      } else if (newUser) {
        logger.info(`✅ New email confirmed: ${mapping.newEmail} → ${newUser.name} (${newUser.role})`);
      } else {
        logger.warn(`⚠️  Neither old nor new email found for: ${mapping.oldEmail}`);
      }
    }

    await mongoose.disconnect();
    logger.info('\n✅ Email update completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error updating user emails:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

updateUserEmails();
