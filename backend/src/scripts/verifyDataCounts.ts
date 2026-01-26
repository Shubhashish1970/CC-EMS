/**
 * Data Verification Script
 * Run before and after optimizations to ensure data consistency
 * 
 * Usage: npx ts-node src/scripts/verifyDataCounts.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { CallTask } from '../models/CallTask.js';
import { Activity } from '../models/Activity.js';
import { Farmer } from '../models/Farmer.js';
import { User } from '../models/User.js';
import { InboundQuery } from '../models/InboundQuery.js';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined');
  process.exit(1);
}

interface DataSnapshot {
  timestamp: string;
  collections: {
    activities: {
      total: number;
      byLifecycleStatus: Record<string, number>;
    };
    callTasks: {
      total: number;
      byStatus: Record<string, number>;
      assignedCount: number;
      unassignedCount: number;
      callbackCount: number;
    };
    farmers: {
      total: number;
      byLanguage: Record<string, number>;
    };
    users: {
      total: number;
      activeAgents: number;
      activeTeamLeads: number;
      activeAdmins: number;
    };
    inboundQueries: {
      total: number;
      byStatus: Record<string, number>;
    };
  };
  indexes: {
    activities: string[];
    callTasks: string[];
    farmers: string[];
    users: string[];
  };
}

async function getDataSnapshot(): Promise<DataSnapshot> {
  // Activities
  const activitiesTotal = await Activity.countDocuments();
  const activitiesByStatus = await Activity.aggregate([
    { $group: { _id: '$lifecycleStatus', count: { $sum: 1 } } }
  ]);
  const activityStatusMap: Record<string, number> = {};
  activitiesByStatus.forEach(s => { activityStatusMap[s._id || 'null'] = s.count; });

  // CallTasks
  const callTasksTotal = await CallTask.countDocuments();
  const callTasksByStatus = await CallTask.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const taskStatusMap: Record<string, number> = {};
  callTasksByStatus.forEach(s => { taskStatusMap[s._id || 'null'] = s.count; });
  
  const assignedCount = await CallTask.countDocuments({ assignedAgentId: { $ne: null } });
  const unassignedCount = await CallTask.countDocuments({ assignedAgentId: null });
  const callbackCount = await CallTask.countDocuments({ isCallback: true });

  // Farmers
  const farmersTotal = await Farmer.countDocuments();
  const farmersByLanguage = await Farmer.aggregate([
    { $group: { _id: '$preferredLanguage', count: { $sum: 1 } } }
  ]);
  const languageMap: Record<string, number> = {};
  farmersByLanguage.forEach(l => { languageMap[l._id || 'null'] = l.count; });

  // Users
  const usersTotal = await User.countDocuments();
  const activeAgents = await User.countDocuments({ role: 'cc_agent', isActive: true });
  const activeTeamLeads = await User.countDocuments({ role: 'team_lead', isActive: true });
  const activeAdmins = await User.countDocuments({ role: 'mis_admin', isActive: true });

  // InboundQueries
  const inboundTotal = await InboundQuery.countDocuments();
  const inboundByStatus = await InboundQuery.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  const inboundStatusMap: Record<string, number> = {};
  inboundByStatus.forEach(s => { inboundStatusMap[s._id || 'null'] = s.count; });

  // Get indexes
  const activityIndexes = await mongoose.connection.collection('activities').indexes();
  const callTaskIndexes = await mongoose.connection.collection('calltasks').indexes();
  const farmerIndexes = await mongoose.connection.collection('farmers').indexes();
  const userIndexes = await mongoose.connection.collection('users').indexes();

  return {
    timestamp: new Date().toISOString(),
    collections: {
      activities: {
        total: activitiesTotal,
        byLifecycleStatus: activityStatusMap,
      },
      callTasks: {
        total: callTasksTotal,
        byStatus: taskStatusMap,
        assignedCount,
        unassignedCount,
        callbackCount,
      },
      farmers: {
        total: farmersTotal,
        byLanguage: languageMap,
      },
      users: {
        total: usersTotal,
        activeAgents,
        activeTeamLeads,
        activeAdmins,
      },
      inboundQueries: {
        total: inboundTotal,
        byStatus: inboundStatusMap,
      },
    },
    indexes: {
      activities: activityIndexes.map(i => JSON.stringify(i.key)),
      callTasks: callTaskIndexes.map(i => JSON.stringify(i.key)),
      farmers: farmerIndexes.map(i => JSON.stringify(i.key)),
      users: userIndexes.map(i => JSON.stringify(i.key)),
    },
  };
}

async function main() {
  console.log('🔍 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI as string);
  console.log('✅ Connected\n');

  console.log('📊 Gathering data snapshot...\n');
  const snapshot = await getDataSnapshot();

  console.log('=' .repeat(60));
  console.log('DATA VERIFICATION SNAPSHOT');
  console.log('Timestamp:', snapshot.timestamp);
  console.log('=' .repeat(60));

  console.log('\n📁 ACTIVITIES');
  console.log(`   Total: ${snapshot.collections.activities.total}`);
  console.log('   By Lifecycle Status:');
  Object.entries(snapshot.collections.activities.byLifecycleStatus).forEach(([k, v]) => {
    console.log(`     - ${k}: ${v}`);
  });

  console.log('\n📞 CALL TASKS');
  console.log(`   Total: ${snapshot.collections.callTasks.total}`);
  console.log(`   Assigned: ${snapshot.collections.callTasks.assignedCount}`);
  console.log(`   Unassigned: ${snapshot.collections.callTasks.unassignedCount}`);
  console.log(`   Callbacks: ${snapshot.collections.callTasks.callbackCount}`);
  console.log('   By Status:');
  Object.entries(snapshot.collections.callTasks.byStatus).forEach(([k, v]) => {
    console.log(`     - ${k}: ${v}`);
  });

  console.log('\n👨‍🌾 FARMERS');
  console.log(`   Total: ${snapshot.collections.farmers.total}`);
  console.log('   By Language:');
  Object.entries(snapshot.collections.farmers.byLanguage).forEach(([k, v]) => {
    console.log(`     - ${k}: ${v}`);
  });

  console.log('\n👥 USERS');
  console.log(`   Total: ${snapshot.collections.users.total}`);
  console.log(`   Active Agents: ${snapshot.collections.users.activeAgents}`);
  console.log(`   Active Team Leads: ${snapshot.collections.users.activeTeamLeads}`);
  console.log(`   Active Admins: ${snapshot.collections.users.activeAdmins}`);

  console.log('\n📥 INBOUND QUERIES');
  console.log(`   Total: ${snapshot.collections.inboundQueries.total}`);
  console.log('   By Status:');
  Object.entries(snapshot.collections.inboundQueries.byStatus).forEach(([k, v]) => {
    console.log(`     - ${k}: ${v}`);
  });

  console.log('\n🗂️  INDEXES');
  console.log('   Activities:', snapshot.indexes.activities.length, 'indexes');
  snapshot.indexes.activities.forEach(i => console.log(`     ${i}`));
  console.log('   CallTasks:', snapshot.indexes.callTasks.length, 'indexes');
  snapshot.indexes.callTasks.forEach(i => console.log(`     ${i}`));
  console.log('   Farmers:', snapshot.indexes.farmers.length, 'indexes');
  snapshot.indexes.farmers.forEach(i => console.log(`     ${i}`));
  console.log('   Users:', snapshot.indexes.users.length, 'indexes');
  snapshot.indexes.users.forEach(i => console.log(`     ${i}`));

  console.log('\n' + '=' .repeat(60));
  console.log('✅ Snapshot complete');
  console.log('=' .repeat(60));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
