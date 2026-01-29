import mongoose from 'mongoose';
import dotenv from 'dotenv';
import {
  getActivitiesWithSampling,
  getAgentQueues,
  getAgentQueue,
} from '../services/adminService.js';
import { User } from '../models/User.js';
import logger from '../config/logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/Kweka_Call_Centre';

const testAdminService = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('✅ Connected to MongoDB');

    logger.info('\n🧪 Testing Admin Service Functions...\n');

    // Test 1: Get Activities with Sampling
    logger.info('📊 Test 1: getActivitiesWithSampling()');
    try {
      const activitiesResult = await getActivitiesWithSampling({
        page: 1,
        limit: 10,
      });
      logger.info(`✅ Found ${activitiesResult.activities.length} activities`);
      logger.info(`   Total: ${activitiesResult.pagination.total}`);
      logger.info(`   Pages: ${activitiesResult.pagination.pages}`);
      
      if (activitiesResult.activities.length > 0) {
        const firstActivity = activitiesResult.activities[0];
        logger.info(`   Sample activity: ${firstActivity.activity.type} (${firstActivity.samplingStatus})`);
        logger.info(`   Tasks: ${firstActivity.tasksCount}, Agents: ${firstActivity.assignedAgents.length}`);
      }
    } catch (error) {
      logger.error('❌ Error in getActivitiesWithSampling:', error);
    }

    // Test 2: Get Agent Queues
    logger.info('\n👥 Test 2: getAgentQueues()');
    try {
      const agentQueues = await getAgentQueues({ isActive: true });
      logger.info(`✅ Found ${agentQueues.length} active agents`);
      
      if (agentQueues.length > 0) {
        const firstAgent = agentQueues[0];
        logger.info(`   Sample agent: ${firstAgent.agentName} (${firstAgent.agentEmail})`);
        logger.info(`   Total tasks: ${firstAgent.statusBreakdown.total}`);
        logger.info(`   Sampled - in queue: ${firstAgent.statusBreakdown.sampled_in_queue}, In Progress: ${firstAgent.statusBreakdown.in_progress}`);
      }
    } catch (error) {
      logger.error('❌ Error in getAgentQueues:', error);
    }

    // Test 3: Get Agent Queue Detail
    logger.info('\n📋 Test 3: getAgentQueue(agentId)');
    try {
      // Find first active CC agent
      const agent = await User.findOne({
        role: 'cc_agent',
        isActive: true,
      });

      if (agent) {
        const agentQueue = await getAgentQueue(agent._id.toString());
        logger.info(`✅ Found queue for agent: ${agentQueue.agent.agentName}`);
        logger.info(`   Total tasks: ${agentQueue.statusBreakdown.total}`);
        logger.info(`   Tasks in queue: ${agentQueue.tasks.length}`);
        logger.info(`   Status breakdown:`, agentQueue.statusBreakdown);
      } else {
        logger.warn('⚠️  No active CC agents found to test getAgentQueue');
      }
    } catch (error) {
      logger.error('❌ Error in getAgentQueue:', error);
    }

    // Test 4: Filter by sampling status
    logger.info('\n🔍 Test 4: Filter by sampling status');
    try {
      const sampledActivities = await getActivitiesWithSampling({
        samplingStatus: 'sampled',
        limit: 5,
      });
      logger.info(`✅ Found ${sampledActivities.activities.length} sampled activities`);

      const notSampledActivities = await getActivitiesWithSampling({
        samplingStatus: 'not_sampled',
        limit: 5,
      });
      logger.info(`✅ Found ${notSampledActivities.activities.length} not sampled activities`);
    } catch (error) {
      logger.error('❌ Error filtering by sampling status:', error);
    }

    logger.info('\n✅ All admin service tests completed!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error testing admin service:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

testAdminService();

