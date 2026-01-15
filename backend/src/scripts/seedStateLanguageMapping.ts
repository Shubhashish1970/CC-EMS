import mongoose from 'mongoose';
import { StateLanguageMapping } from '../models/StateLanguageMapping.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems_call_centre';

// Comprehensive Indian state and UT to language mapping
const STATE_LANGUAGE_MAPPINGS = [
  // ===== STATES =====
  { state: 'Andhra Pradesh', primaryLanguage: 'Telugu' },
  { state: 'Arunachal Pradesh', primaryLanguage: 'English' },
  { state: 'Assam', primaryLanguage: 'Hindi' },
  { state: 'Bihar', primaryLanguage: 'Hindi' },
  { state: 'Chhattisgarh', primaryLanguage: 'Hindi' },
  { state: 'Goa', primaryLanguage: 'Marathi', secondaryLanguages: ['English'] },
  { state: 'Gujarat', primaryLanguage: 'Hindi' },
  { state: 'Haryana', primaryLanguage: 'Hindi' },
  { state: 'Himachal Pradesh', primaryLanguage: 'Hindi' },
  { state: 'Jharkhand', primaryLanguage: 'Hindi' },
  { state: 'Karnataka', primaryLanguage: 'Kannada', secondaryLanguages: ['English'] },
  { state: 'Kerala', primaryLanguage: 'Malayalam', secondaryLanguages: ['English'] },
  { state: 'Madhya Pradesh', primaryLanguage: 'Hindi' },
  { state: 'Maharashtra', primaryLanguage: 'Marathi' },
  { state: 'Manipur', primaryLanguage: 'English' },
  { state: 'Meghalaya', primaryLanguage: 'English' },
  { state: 'Mizoram', primaryLanguage: 'English' },
  { state: 'Nagaland', primaryLanguage: 'English' },
  { state: 'Odisha', primaryLanguage: 'Oriya' },
  { state: 'Punjab', primaryLanguage: 'Hindi' },
  { state: 'Rajasthan', primaryLanguage: 'Hindi' },
  { state: 'Sikkim', primaryLanguage: 'English' },
  { state: 'Tamil Nadu', primaryLanguage: 'Tamil', secondaryLanguages: ['English'] },
  { state: 'Telangana', primaryLanguage: 'Telugu' },
  { state: 'Tripura', primaryLanguage: 'Bengali' },
  { state: 'Uttar Pradesh', primaryLanguage: 'Hindi' },
  { state: 'Uttarakhand', primaryLanguage: 'Hindi' },
  { state: 'West Bengal', primaryLanguage: 'Bengali' },
  
  // ===== UNION TERRITORIES =====
  { state: 'Andaman and Nicobar Islands', primaryLanguage: 'Hindi', secondaryLanguages: ['English'] },
  { state: 'Chandigarh', primaryLanguage: 'Hindi', secondaryLanguages: ['English'] },
  { state: 'Dadra and Nagar Haveli and Daman and Diu', primaryLanguage: 'Hindi', secondaryLanguages: ['English'] },
  { state: 'Delhi', primaryLanguage: 'Hindi', secondaryLanguages: ['English'] },
  { state: 'Jammu and Kashmir', primaryLanguage: 'Hindi', secondaryLanguages: ['English'] },
  { state: 'Ladakh', primaryLanguage: 'Hindi', secondaryLanguages: ['English'] },
  { state: 'Lakshadweep', primaryLanguage: 'Malayalam', secondaryLanguages: ['English'] },
  { state: 'Puducherry', primaryLanguage: 'Tamil', secondaryLanguages: ['English'] },
];

async function seedStateLanguageMapping() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    let created = 0;
    let updated = 0;

    for (const mapping of STATE_LANGUAGE_MAPPINGS) {
      const result = await StateLanguageMapping.findOneAndUpdate(
        { state: mapping.state },
        {
          state: mapping.state,
          primaryLanguage: mapping.primaryLanguage,
          secondaryLanguages: mapping.secondaryLanguages || [],
          isActive: true,
        },
        { upsert: true, new: true }
      );

      if (result.isNew) {
        created++;
        console.log(`✅ Created: ${mapping.state} → ${mapping.primaryLanguage}`);
      } else {
        updated++;
        console.log(`🔄 Updated: ${mapping.state} → ${mapping.primaryLanguage}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Total: ${STATE_LANGUAGE_MAPPINGS.length}`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedStateLanguageMapping();
