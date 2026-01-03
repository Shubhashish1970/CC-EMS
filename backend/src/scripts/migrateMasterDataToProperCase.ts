import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MasterCrop, MasterProduct } from '../models/MasterData.js';

dotenv.config();

// Mapping of uppercase to proper case for crops
const cropCaseMap: Record<string, string> = {
  'PADDY': 'Paddy',
  'COTTON': 'Cotton',
  'CHILLI': 'Chilli',
  'SOYBEAN': 'Soybean',
  'MAIZE': 'Maize',
  'WHEAT': 'Wheat',
  'SUGARCANE': 'Sugarcane',
  'GROUNDNUT': 'Groundnut',
  'SUNFLOWER': 'Sunflower',
  'MUSTARD': 'Mustard',
  'JOWAR': 'Jowar',
  'BAJRA': 'Bajra',
  'RAGI': 'Ragi',
  'TURMERIC': 'Turmeric',
  'ONION': 'Onion',
  'TOMATO': 'Tomato',
  'POTATO': 'Potato',
  'BRINJAL': 'Brinjal',
  'OKRA': 'Okra',
  'CUCUMBER': 'Cucumber',
};

const migrateToProperCase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Migrate Crops
    console.log('🌾 Migrating crops to proper case...');
    const allCrops = await MasterCrop.find({});
    let cropsUpdated = 0;
    
    for (const crop of allCrops) {
      const upperName = crop.name.toUpperCase();
      if (cropCaseMap[upperName] && crop.name !== cropCaseMap[upperName]) {
        // Check if proper case version already exists
        const existingProper = await MasterCrop.findOne({ name: cropCaseMap[upperName] });
        if (existingProper) {
          // Delete the uppercase duplicate
          await MasterCrop.deleteOne({ _id: crop._id });
          console.log(`  🗑️  Deleted duplicate: "${crop.name}" (kept "${cropCaseMap[upperName]}")`);
        } else {
          // Update to proper case
          await MasterCrop.updateOne(
            { _id: crop._id },
            { name: cropCaseMap[upperName] }
          );
          console.log(`  ↻ Updated "${crop.name}" to "${cropCaseMap[upperName]}"`);
          cropsUpdated++;
        }
      }
    }
    console.log(`✅ Migrated ${cropsUpdated} crops to proper case`);

    // Products are already in proper case, but let's verify
    console.log('📦 Verifying products are in proper case...');
    const allProducts = await MasterProduct.find({});
    console.log(`✅ Found ${allProducts.length} products (all in proper case)`);

    console.log('✅ Migration completed!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error migrating master data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

migrateToProperCase();


