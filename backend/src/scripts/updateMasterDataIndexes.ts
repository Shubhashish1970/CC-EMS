import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { MasterCrop, MasterProduct, NonPurchaseReason, Sentiment, MasterLanguage } from '../models/MasterData.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set in environment variables');
  process.exit(1);
}

async function updateIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI as string, { w: 'majority' as const });
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not available');
    }

    // Drop old unique indexes
    console.log('\nDropping old unique indexes...');
    
    try {
      await db.collection('mastercrops').dropIndex('name_1');
      console.log('✓ Dropped old index: mastercrops.name_1');
    } catch (err: any) {
      if (err.code !== 27) { // 27 = IndexNotFound
        console.log('⚠ Could not drop mastercrops.name_1:', err.message);
      } else {
        console.log('ℹ Index mastercrops.name_1 does not exist (already dropped)');
      }
    }

    try {
      await db.collection('masterproducts').dropIndex('name_1');
      console.log('✓ Dropped old index: masterproducts.name_1');
    } catch (err: any) {
      if (err.code !== 27) {
        console.log('⚠ Could not drop masterproducts.name_1:', err.message);
      } else {
        console.log('ℹ Index masterproducts.name_1 does not exist');
      }
    }

    try {
      await db.collection('nonpurchasereasons').dropIndex('name_1');
      console.log('✓ Dropped old index: nonpurchasereasons.name_1');
    } catch (err: any) {
      if (err.code !== 27) {
        console.log('⚠ Could not drop nonpurchasereasons.name_1:', err.message);
      } else {
        console.log('ℹ Index nonpurchasereasons.name_1 does not exist');
      }
    }

    try {
      await db.collection('sentiments').dropIndex('name_1');
      console.log('✓ Dropped old index: sentiments.name_1');
    } catch (err: any) {
      if (err.code !== 27) {
        console.log('⚠ Could not drop sentiments.name_1:', err.message);
      } else {
        console.log('ℹ Index sentiments.name_1 does not exist');
      }
    }

    try {
      await db.collection('masterlanguages').dropIndex('name_1');
      console.log('✓ Dropped old index: masterlanguages.name_1');
    } catch (err: any) {
      if (err.code !== 27) {
        console.log('⚠ Could not drop masterlanguages.name_1:', err.message);
      } else {
        console.log('ℹ Index masterlanguages.name_1 does not exist');
      }
    }

    try {
      await db.collection('masterlanguages').dropIndex('code_1');
      console.log('✓ Dropped old index: masterlanguages.code_1');
    } catch (err: any) {
      if (err.code !== 27) {
        console.log('⚠ Could not drop masterlanguages.code_1:', err.message);
      } else {
        console.log('ℹ Index masterlanguages.code_1 does not exist');
      }
    }

    console.log('\nCreating new partial unique indexes...');
    
    // Create partial unique indexes (only unique when isActive: true)
    await db.collection('mastercrops').createIndex(
      { name: 1 },
      { unique: true, partialFilterExpression: { isActive: true } }
    );
    console.log('✓ Created partial index: mastercrops.name_1 (unique when isActive: true)');

    await db.collection('masterproducts').createIndex(
      { name: 1 },
      { unique: true, partialFilterExpression: { isActive: true } }
    );
    console.log('✓ Created partial index: masterproducts.name_1 (unique when isActive: true)');

    await db.collection('nonpurchasereasons').createIndex(
      { name: 1 },
      { unique: true, partialFilterExpression: { isActive: true } }
    );
    console.log('✓ Created partial index: nonpurchasereasons.name_1 (unique when isActive: true)');

    await db.collection('sentiments').createIndex(
      { name: 1 },
      { unique: true, partialFilterExpression: { isActive: true } }
    );
    console.log('✓ Created partial index: sentiments.name_1 (unique when isActive: true)');

    await db.collection('masterlanguages').createIndex(
      { name: 1 },
      { unique: true, partialFilterExpression: { isActive: true } }
    );
    console.log('✓ Created partial index: masterlanguages.name_1 (unique when isActive: true)');

    await db.collection('masterlanguages').createIndex(
      { code: 1 },
      { unique: true, partialFilterExpression: { isActive: true } }
    );
    console.log('✓ Created partial index: masterlanguages.code_1 (unique when isActive: true)');

    console.log('\n✅ Index migration completed successfully!');
    console.log('\nNote: The new partial indexes allow inactive records to have duplicate names,');
    console.log('but active records must still be unique. This enables importing new records');
    console.log('even when inactive duplicates exist.');

  } catch (error) {
    console.error('❌ Error updating indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

updateIndexes();
