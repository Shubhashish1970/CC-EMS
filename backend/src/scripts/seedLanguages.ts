/**
 * Seed Default Languages
 * Run: npx tsx src/scripts/seedLanguages.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { MasterLanguage } from '../models/MasterData.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
  process.exit(1);
}

const DEFAULT_LANGUAGES = [
  { name: 'Hindi', code: 'HI', displayOrder: 1 },
  { name: 'Telugu', code: 'TE', displayOrder: 2 },
  { name: 'Marathi', code: 'MR', displayOrder: 3 },
  { name: 'Kannada', code: 'KN', displayOrder: 4 },
  { name: 'Tamil', code: 'TA', displayOrder: 5 },
  { name: 'Bengali', code: 'BN', displayOrder: 6 },
  { name: 'Oriya', code: 'OR', displayOrder: 7 },
  { name: 'English', code: 'EN', displayOrder: 8 },
  { name: 'Malayalam', code: 'ML', displayOrder: 9 },
];

async function seedLanguages() {
  console.log('🌱 Seeding Languages Master...');
  console.log('=' .repeat(50));

  await mongoose.connect(MONGODB_URI as string);
  console.log('✅ Connected to MongoDB\n');

  let created = 0;
  let skipped = 0;

  for (const lang of DEFAULT_LANGUAGES) {
    const existing = await MasterLanguage.findOne({ 
      $or: [
        { name: { $regex: new RegExp(`^${lang.name}$`, 'i') } },
        { code: lang.code }
      ]
    });

    if (existing) {
      console.log(`⏭️  Skipping ${lang.name} (${lang.code}) - already exists`);
      skipped++;
    } else {
      await MasterLanguage.create({
        name: lang.name,
        code: lang.code,
        displayOrder: lang.displayOrder,
        isActive: true,
      });
      console.log(`✅ Created ${lang.name} (${lang.code})`);
      created++;
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log(`📊 Summary: ${created} created, ${skipped} skipped`);
  console.log('=' .repeat(50));

  await mongoose.disconnect();
  console.log('\n✅ Done!');
  process.exit(0);
}

seedLanguages().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
