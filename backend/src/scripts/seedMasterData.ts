import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { MasterCrop, MasterProduct } from '../models/MasterData.js';

dotenv.config();

const defaultCrops = [
  'Paddy',
  'Cotton',
  'Chilli',
  'Soybean',
  'Maize',
  'Wheat',
  'Sugarcane',
  'Groundnut',
  'Sunflower',
  'Mustard',
  'Jowar',
  'Bajra',
  'Ragi',
  'Turmeric',
  'Onion',
  'Tomato',
  'Potato',
  'Brinjal',
  'Okra',
  'Cucumber',
];

const defaultProducts = [
  'Nagarjuna Urea',
  'Specialty Fungicide',
  'Bio-Stimulant X',
  'Insecticide Pro',
  'Root Booster',
  'Growth Enhancer',
  'Foliar Spray',
  'Seed Treatment',
  'Soil Conditioner',
  'Micronutrient Mix',
];

const seedMasterData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('✅ Connected to MongoDB');

    // Seed Crops (using proper case)
    console.log('🌾 Seeding crops...');
    let cropsCreated = 0;
    for (const cropName of defaultCrops) {
      // Check both uppercase and proper case to handle existing data
      const existingUpper = await MasterCrop.findOne({ name: cropName.toUpperCase() });
      const existingProper = await MasterCrop.findOne({ name: cropName });
      if (!existingUpper && !existingProper) {
        await MasterCrop.create({
          name: cropName, // Store in proper case
          isActive: true,
        });
        cropsCreated++;
      } else if (existingUpper && !existingProper) {
        // Update existing uppercase entry to proper case
        await MasterCrop.updateOne(
          { name: cropName.toUpperCase() },
          { name: cropName }
        );
        console.log(`  ↻ Updated "${cropName.toUpperCase()}" to "${cropName}"`);
      }
    }
    console.log(`✅ Created ${cropsCreated} new crops (${defaultCrops.length - cropsCreated} already existed)`);

    // Seed Products
    console.log('📦 Seeding products...');
    let productsCreated = 0;
    for (const productName of defaultProducts) {
      const existing = await MasterProduct.findOne({ name: productName });
      if (!existing) {
        await MasterProduct.create({
          name: productName,
          isActive: true,
        });
        productsCreated++;
      }
    }
    console.log(`✅ Created ${productsCreated} new products (${defaultProducts.length - productsCreated} already existed)`);

    console.log('✅ Master data seeding completed!');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding master data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedMasterData();

