import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { NonPurchaseReason, Sentiment } from '../models/MasterData.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in environment variables');
  process.exit(1);
}

const defaultNonPurchaseReasons = [
  { name: 'Price', displayOrder: 1 },
  { name: 'Availability', displayOrder: 2 },
  { name: 'Brand preference', displayOrder: 3 },
  { name: 'No requirement', displayOrder: 4 },
  { name: 'Not convinced', displayOrder: 5 },
  { name: 'Other', displayOrder: 6 },
];

const defaultSentiments = [
  { name: 'Positive', colorClass: 'bg-green-100 text-green-800', icon: 'smile', displayOrder: 1 },
  { name: 'Negative', colorClass: 'bg-red-100 text-red-800', icon: 'frown', displayOrder: 2 },
  { name: 'Neutral', colorClass: 'bg-slate-100 text-slate-800', icon: 'meh', displayOrder: 3 },
  { name: 'N/A', colorClass: 'bg-yellow-100 text-yellow-800', icon: 'help', displayOrder: 4 },
];

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Seed Non-Purchase Reasons
    console.log('\nSeeding Non-Purchase Reasons...');
    for (const reason of defaultNonPurchaseReasons) {
      const existing = await NonPurchaseReason.findOne({ name: { $regex: new RegExp(`^${reason.name}$`, 'i') } });
      if (existing) {
        console.log(`  - "${reason.name}" already exists, skipping`);
      } else {
        await NonPurchaseReason.create(reason);
        console.log(`  + Created "${reason.name}"`);
      }
    }

    // Seed Sentiments
    console.log('\nSeeding Sentiments...');
    for (const sentiment of defaultSentiments) {
      const existing = await Sentiment.findOne({ name: { $regex: new RegExp(`^${sentiment.name}$`, 'i') } });
      if (existing) {
        console.log(`  - "${sentiment.name}" already exists, skipping`);
      } else {
        await Sentiment.create(sentiment);
        console.log(`  + Created "${sentiment.name}"`);
      }
    }

    console.log('\nSeeding completed successfully!');
    
    // Show counts
    const reasonCount = await NonPurchaseReason.countDocuments();
    const sentimentCount = await Sentiment.countDocuments();
    console.log(`\nTotal Non-Purchase Reasons: ${reasonCount}`);
    console.log(`Total Sentiments: ${sentimentCount}`);

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

seedData();
