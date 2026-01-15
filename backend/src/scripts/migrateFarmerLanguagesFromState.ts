import mongoose from 'mongoose';
import { Farmer } from '../models/Farmer.js';
import { Activity } from '../models/Activity.js';
import { getLanguageForState, extractStateFromTerritory } from '../utils/stateLanguageMapper.js';
import logger from '../config/logger.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems_call_centre';

async function migrateFarmerLanguages() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // First, update activities that have state field
    // For existing activities without state, extract from territory
    const activitiesWithoutState = await Activity.find({ state: { $exists: false } });
    console.log(`Found ${activitiesWithoutState.length} activities without state field`);
    
    let activitiesUpdated = 0;
    for (const activity of activitiesWithoutState) {
      const state = extractStateFromTerritory(activity.territory);
      if (state) {
        activity.state = state;
        await activity.save();
        activitiesUpdated++;
      }
    }
    console.log(`✅ Updated ${activitiesUpdated} activities with state field\n`);

    // Get all farmers
    const farmers = await Farmer.find({});
    console.log(`Found ${farmers.length} farmers to migrate\n`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const farmer of farmers) {
      try {
        // Try to get state from farmer's activities
        let state: string | null = null;
        
        // Find activities where this farmer participated
        const activities = await Activity.find({ farmerIds: farmer._id });
        
        if (activities.length > 0) {
          // Get state from the most recent activity
          const latestActivity = activities.sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )[0];
          
          if (latestActivity.state) {
            state = latestActivity.state;
          } else if (latestActivity.territory) {
            // Fallback: extract from territory
            state = extractStateFromTerritory(latestActivity.territory);
          }
        }
        
        // If no state from activities, try to extract from farmer's territory
        if (!state && farmer.territory) {
          state = extractStateFromTerritory(farmer.territory);
        }
        
        if (!state) {
          console.log(`⚠️  No state found for farmer ${farmer.name} (${farmer.mobileNumber}), skipping`);
          skipped++;
          continue;
        }
        
        // Get language for state from mapping table
        const newLanguage = await getLanguageForState(state);
        
        // Only update if language changed
        if (farmer.preferredLanguage !== newLanguage) {
          farmer.preferredLanguage = newLanguage;
          await farmer.save();
          updated++;
          console.log(`✅ Updated: ${farmer.name} (${state}) → ${newLanguage}`);
        } else {
          skipped++;
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error updating ${farmer.name}:`, error);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`  Activities updated with state: ${activitiesUpdated}`);
    console.log(`  Farmers updated: ${updated}`);
    console.log(`  Farmers skipped (already correct): ${skipped}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Total farmers: ${farmers.length}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

migrateFarmerLanguages();
