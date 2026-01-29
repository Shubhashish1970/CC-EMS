/**
 * Drop only the unused "test" database in the cluster.
 * The app uses only Kweka_Call_Centre. MongoDB also has system databases:
 * - admin: required for cluster auth/replication — DO NOT DROP
 * - local: required for replica set — DO NOT DROP
 * - test: default DB when no name is specified; we never use it — safe to drop
 *
 * Run from backend with: MONGODB_URI="..." npm run drop:unused-databases
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const UNUSED_APP_DATABASES = ['test']; // Only drop these; never admin or local

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not set');
    process.exit(1);
  }
  if (!mongoUri.includes('/Kweka_Call_Centre')) {
    console.error('❌ MONGODB_URI must point to Kweka_Call_Centre (single app database).');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    const client = mongoose.connection.getClient();

    for (const dbName of UNUSED_APP_DATABASES) {
      try {
        const db = client.db(dbName);
        const collections = await db.listCollections().toArray();
        if (collections.length === 0) {
          await db.dropDatabase();
          console.log(`✅ Dropped empty database: ${dbName}`);
        } else {
          await db.dropDatabase();
          console.log(`✅ Dropped database: ${dbName} (had ${collections.length} collection(s))`);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`⚠️ Could not drop ${dbName}: ${msg}`);
      }
    }

    console.log('\n✅ Done. Preserved: Kweka_Call_Centre (app), admin (system), local (system).');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
