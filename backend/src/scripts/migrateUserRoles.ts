/**
 * Migration script to add 'roles' array field to existing users
 * 
 * For each user without a 'roles' array, this script will:
 * 1. Create a roles array containing their current 'role' value
 * 
 * Run with: node dist/scripts/migrateUserRoles.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import logger from '../config/logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Kweka_Call_Centre';

async function migrateUserRoles() {
  try {
    // Connect to database
    await mongoose.connect(MONGODB_URI);
    logger.info(`Connected to database: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);

    // Find all users without roles array or with empty roles array
    const usersToMigrate = await User.find({
      $or: [
        { roles: { $exists: false } },
        { roles: { $size: 0 } },
        { roles: null }
      ]
    });

    logger.info(`Found ${usersToMigrate.length} users to migrate`);

    let migratedCount = 0;
    let errorCount = 0;

    for (const user of usersToMigrate) {
      try {
        // Set roles array to contain the user's current role
        user.roles = [user.role];
        await user.save();
        migratedCount++;
        logger.info(`Migrated user: ${user.email} (role: ${user.role})`);
      } catch (error) {
        errorCount++;
        logger.error(`Failed to migrate user ${user.email}:`, error);
      }
    }

    logger.info('Migration completed');
    logger.info(`Successfully migrated: ${migratedCount} users`);
    logger.info(`Errors: ${errorCount} users`);

    // Verify migration
    const totalUsers = await User.countDocuments();
    const usersWithRoles = await User.countDocuments({ 
      roles: { $exists: true, $not: { $size: 0 } } 
    });
    
    logger.info(`Verification: ${usersWithRoles}/${totalUsers} users have roles array`);

  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

// Run migration
migrateUserRoles();
