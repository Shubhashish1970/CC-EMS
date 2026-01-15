import mongoose from 'mongoose';
import { CallTask } from '../models/CallTask.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems_call_centre';

async function checkTaskCounts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get total task count
    const totalTasks = await CallTask.countDocuments({});
    console.log(`📊 Total Tasks: ${totalTasks}`);

    // Get tasks by status
    const statusCounts = await CallTask.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n📋 Tasks by Status:');
    statusCounts.forEach(({ _id, count }) => {
      console.log(`  ${_id}: ${count}`);
    });

    // Get tasks with sampled_in_queue and in_progress (what dialer should show)
    const availableTasks = await CallTask.countDocuments({
      status: { $in: ['sampled_in_queue', 'in_progress'] }
    });
    console.log(`\n✅ Available Tasks (sampled_in_queue + in_progress): ${availableTasks}`);

    // Get tasks by specific status
    const sampledInQueue = await CallTask.countDocuments({ status: 'sampled_in_queue' });
    const inProgress = await CallTask.countDocuments({ status: 'in_progress' });
    const completed = await CallTask.countDocuments({ status: 'completed' });
    const notReachable = await CallTask.countDocuments({ status: 'not_reachable' });
    const invalidNumber = await CallTask.countDocuments({ status: 'invalid_number' });

    console.log('\n📊 Detailed Status Breakdown:');
    console.log(`  sampled_in_queue: ${sampledInQueue}`);
    console.log(`  in_progress: ${inProgress}`);
    console.log(`  completed: ${completed}`);
    console.log(`  not_reachable: ${notReachable}`);
    console.log(`  invalid_number: ${invalidNumber}`);

    // Get tasks by agent (to see distribution)
    const tasksByAgent = await CallTask.aggregate([
      {
        $match: {
          status: { $in: ['sampled_in_queue', 'in_progress'] }
        }
      },
      {
        $group: {
          _id: '$assignedAgentId',
          count: { $sum: 1 },
          sampledInQueue: {
            $sum: { $cond: [{ $eq: ['$status', 'sampled_in_queue'] }, 1, 0] }
          },
          inProgress: {
            $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agent'
        }
      },
      {
        $unwind: { path: '$agent', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          agentName: { $ifNull: ['$agent.name', 'Unknown'] },
          agentEmail: { $ifNull: ['$agent.email', 'Unknown'] },
          count: 1,
          sampledInQueue: 1,
          inProgress: 1
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    console.log('\n👤 Tasks by Agent (available tasks only):');
    tasksByAgent.forEach(({ agentName, agentEmail, count, sampledInQueue, inProgress }) => {
      console.log(`  ${agentName} (${agentEmail}):`);
      console.log(`    Total: ${count} (sampled_in_queue: ${sampledInQueue}, in_progress: ${inProgress})`);
    });

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTaskCounts();
