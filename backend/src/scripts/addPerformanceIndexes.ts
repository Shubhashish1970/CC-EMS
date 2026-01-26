/**
 * Performance Index Migration Script
 * Adds optimized indexes for high-volume operations
 * 
 * Usage: npx ts-node src/scripts/addPerformanceIndexes.ts
 * 
 * This script adds indexes in the background (non-blocking) and is idempotent.
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
  process.exit(1);
}

interface IndexDefinition {
  collection: string;
  index: Record<string, 1 | -1>;
  options?: { background?: boolean; sparse?: boolean; unique?: boolean };
  description: string;
}

// Performance-critical indexes to add
const INDEXES: IndexDefinition[] = [
  // CallTask indexes for agent queue and stats queries
  {
    collection: 'calltasks',
    index: { status: 1, scheduledDate: 1, assignedAgentId: 1 },
    options: { background: true },
    description: 'Compound index for pending tasks stats aggregation',
  },
  {
    collection: 'calltasks',
    index: { status: 1, callbackNumber: 1, createdAt: -1 },
    options: { background: true },
    description: 'Compound index for callback candidate queries',
  },
  {
    collection: 'calltasks',
    index: { 'callLog.sentiment': 1, status: 1 },
    options: { background: true, sparse: true },
    description: 'Index for sentiment-based analytics',
  },
  {
    collection: 'calltasks',
    index: { updatedAt: -1 },
    options: { background: true },
    description: 'Index for recent updates tracking',
  },

  // Activity indexes for territory/zone filtering with lifecycle
  {
    collection: 'activities',
    index: { lifecycleStatus: 1, territoryName: 1, date: -1 },
    options: { background: true },
    description: 'Compound index for sampling control with territory filter',
  },
  {
    collection: 'activities',
    index: { lifecycleStatus: 1, zoneName: 1, date: -1 },
    options: { background: true },
    description: 'Compound index for sampling control with zone filter',
  },
  {
    collection: 'activities',
    index: { lifecycleStatus: 1, buName: 1, date: -1 },
    options: { background: true },
    description: 'Compound index for sampling control with BU filter',
  },

  // Farmer indexes for language-based task assignment
  {
    collection: 'farmers',
    index: { preferredLanguage: 1, territory: 1 },
    options: { background: true },
    description: 'Compound index for language-based agent matching',
  },

  // User indexes for team queries
  {
    collection: 'users',
    index: { teamLeadId: 1, role: 1, isActive: 1 },
    options: { background: true },
    description: 'Compound index for team member lookups',
  },
  {
    collection: 'users',
    index: { languageCapabilities: 1, role: 1, isActive: 1 },
    options: { background: true },
    description: 'Compound index for agent language matching',
  },

  // InboundQuery indexes for support dashboard
  {
    collection: 'inboundqueries',
    index: { status: 1, assignedTo: 1, createdAt: -1 },
    options: { background: true },
    description: 'Compound index for support queue queries',
  },
  {
    collection: 'inboundqueries',
    index: { escalationLevel: 1, status: 1, createdAt: -1 },
    options: { background: true },
    description: 'Compound index for escalation tracking',
  },
];

async function getExistingIndexes(collection: string): Promise<Set<string>> {
  try {
    const indexes = await mongoose.connection.collection(collection).indexes();
    return new Set(indexes.map(idx => JSON.stringify(idx.key)));
  } catch (err) {
    // Collection might not exist yet
    return new Set();
  }
}

async function createIndex(def: IndexDefinition): Promise<{ success: boolean; message: string }> {
  const { collection, index, options, description } = def;
  const indexKey = JSON.stringify(index);

  try {
    // Check if index already exists
    const existing = await getExistingIndexes(collection);
    if (existing.has(indexKey)) {
      return { success: true, message: `Index already exists: ${indexKey}` };
    }

    // Create index
    await mongoose.connection.collection(collection).createIndex(index, options || {});
    return { success: true, message: `Created index: ${indexKey} - ${description}` };
  } catch (err: any) {
    // Index might already exist with different options
    if (err.code === 85 || err.code === 86) {
      return { success: true, message: `Index equivalent exists: ${indexKey}` };
    }
    return { success: false, message: `Failed to create index ${indexKey}: ${err.message}` };
  }
}

async function main() {
  console.log('🚀 Performance Index Migration');
  console.log('=' .repeat(60));
  console.log('');

  console.log('🔌 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI as string);
  console.log('✅ Connected\n');

  // Get before counts
  console.log('📊 Current index counts:');
  const collections = [...new Set(INDEXES.map(i => i.collection))];
  const beforeCounts: Record<string, number> = {};
  for (const col of collections) {
    const indexes = await getExistingIndexes(col);
    beforeCounts[col] = indexes.size;
    console.log(`   ${col}: ${indexes.size} indexes`);
  }
  console.log('');

  // Create indexes
  console.log('🔧 Creating performance indexes...\n');
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const def of INDEXES) {
    const result = await createIndex(def);
    if (result.success) {
      if (result.message.includes('Created')) {
        console.log(`   ✅ ${result.message}`);
        created++;
      } else {
        console.log(`   ⏭️  ${result.message}`);
        skipped++;
      }
    } else {
      console.log(`   ❌ ${result.message}`);
      failed++;
    }
  }

  console.log('');
  console.log('📊 After index counts:');
  for (const col of collections) {
    const indexes = await getExistingIndexes(col);
    const added = indexes.size - beforeCounts[col];
    console.log(`   ${col}: ${indexes.size} indexes (${added >= 0 ? '+' : ''}${added})`);
  }

  console.log('');
  console.log('=' .repeat(60));
  console.log('📈 Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Skipped (already exist): ${skipped}`);
  console.log(`   Failed: ${failed}`);
  console.log('=' .repeat(60));

  if (failed > 0) {
    console.log('\n⚠️  Some indexes failed to create. Review errors above.');
  } else {
    console.log('\n✅ All indexes processed successfully!');
  }

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
