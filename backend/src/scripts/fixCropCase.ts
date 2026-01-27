import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { MasterCrop } from '../models/MasterData.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

/**
 * Fix crop names that are all uppercase to proper case
 * This script converts names like "APPLE" to "Apple" (title case)
 */
async function fixCropCase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string, {
      w: 'majority' as const,
    });
    console.log('Connected to MongoDB');

    // Find all crops
    const crops = await MasterCrop.find({});
    console.log(`Found ${crops.length} crops`);

    let updatedCount = 0;
    const updates: Array<{ old: string; new: string }> = [];

    for (const crop of crops) {
      const originalName = crop.name;
      
      // Check if name is all uppercase (and not all same character)
      if (originalName === originalName.toUpperCase() && originalName !== originalName.toLowerCase()) {
        // Convert to title case (first letter uppercase, rest lowercase)
        const titleCase = originalName.charAt(0).toUpperCase() + originalName.slice(1).toLowerCase();
        
        // Check if title case version already exists (case-insensitive)
        const existing = await MasterCrop.findOne({
          name: { $regex: new RegExp(`^${titleCase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          _id: { $ne: crop._id }
        });

        if (!existing) {
          crop.name = titleCase;
          await crop.save();
          updatedCount++;
          updates.push({ old: originalName, new: titleCase });
          console.log(`Updated: "${originalName}" → "${titleCase}"`);
        } else {
          console.log(`Skipped: "${originalName}" (title case "${titleCase}" already exists)`);
        }
      }
    }

    console.log(`\nSummary:`);
    console.log(`- Total crops: ${crops.length}`);
    console.log(`- Updated: ${updatedCount}`);
    console.log(`- Skipped: ${crops.length - updatedCount}`);

    if (updates.length > 0) {
      console.log(`\nUpdated crops:`);
      updates.forEach(({ old, new: newName }) => {
        console.log(`  "${old}" → "${newName}"`);
      });
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error fixing crop case:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

fixCropCase();
