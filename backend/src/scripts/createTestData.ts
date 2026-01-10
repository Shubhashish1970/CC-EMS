import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Farmer } from '../models/Farmer.js';
import { Activity } from '../models/Activity.js';
import { CallTask } from '../models/CallTask.js';
import { User } from '../models/User.js';
import { sampleAndCreateTasks } from '../services/samplingService.js';
import logger from '../config/logger.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ems_call_centre';

// Sample data for testing
const TERRITORIES = ['North Zone', 'South Zone', 'East Zone', 'West Zone', 'Central Zone'];
const LANGUAGES = ['Hindi', 'English', 'Telugu', 'Marathi', 'Kannada', 'Tamil'];
const ACTIVITY_TYPES = ['Field Day', 'Group Meeting', 'Demo Visit', 'OFM'];
const CROPS = ['Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Soybean', 'Maize', 'Groundnut', 'Pulses'];
const PRODUCTS = ['NACL Pro', 'NACL Gold', 'NACL Premium', 'NACL Base', 'NACL Bio'];

const generateMobileNumber = (index: number): string => {
  // Generate a unique 10-digit mobile number
  const base = 9000000000; // Start from 9000000000
  return String(base + index).padStart(10, '0');
};

const generateFarmerName = (index: number): string => {
  const names = [
    'Ram Kumar', 'Shyam Singh', 'Gopal Yadav', 'Mohan Das', 'Ramesh Patel',
    'Suresh Reddy', 'Kumar Swamy', 'Rajesh Nair', 'Anil Kumar', 'Vinod Kumar',
    'Prakash Singh', 'Amit Kumar', 'Sandeep Kumar', 'Raj Kumar', 'Deepak Singh',
    'Manish Kumar', 'Ashok Kumar', 'Sunil Kumar', 'Ravi Kumar', 'Mukesh Kumar',
    'Dinesh Kumar', 'Vijay Kumar', 'Naresh Kumar', 'Harish Kumar', 'Suresh Kumar',
    'Mahesh Kumar', 'Ramesh Kumar', 'Ganesh Kumar', 'Dilip Kumar', 'Sanjay Kumar',
    'Ajay Kumar', 'Pradeep Kumar', 'Rahul Kumar', 'Sachin Kumar', 'Nikhil Kumar',
    'Arun Kumar', 'Tarun Kumar', 'Varun Kumar', 'Karan Kumar', 'Rohan Kumar',
    'Aman Kumar', 'Rahul Singh', 'Amit Singh', 'Rohit Singh', 'Vikram Singh',
    'Aditya Singh', 'Karan Singh', 'Arjun Singh', 'Yash Singh', 'Harsh Singh'
  ];
  return names[index % names.length];
};

const createFarmers = async (count: number): Promise<mongoose.Types.ObjectId[]> => {
  logger.info(`Creating ${count} farmers...`);
  const farmerIds: mongoose.Types.ObjectId[] = [];
  
  // Check existing farmers count
  const existingCount = await Farmer.countDocuments();
  logger.info(`Existing farmers: ${existingCount}`);
  
  for (let i = 0; i < count; i++) {
    const mobileNumber = generateMobileNumber(existingCount + i);
    
    // Check if farmer already exists
    const existing = await Farmer.findOne({ mobileNumber });
    if (existing) {
      logger.info(`Farmer ${i + 1}/${count} already exists: ${mobileNumber}`);
      farmerIds.push(existing._id);
      continue;
    }
    
    const farmer = new Farmer({
      name: generateFarmerName(existingCount + i),
      mobileNumber,
      location: `Village ${i + 1}, District ${(i % 5) + 1}`,
      preferredLanguage: LANGUAGES[i % LANGUAGES.length],
      territory: TERRITORIES[i % TERRITORIES.length],
    });
    
    await farmer.save();
    farmerIds.push(farmer._id);
    logger.info(`Created farmer ${i + 1}/${count}: ${farmer.name} (${farmer.mobileNumber})`);
  }
  
  logger.info(`✅ Created ${count} farmers`);
  return farmerIds;
};

const createActivities = async (
  farmerIds: mongoose.Types.ObjectId[],
  count: number
): Promise<mongoose.Types.ObjectId[]> => {
  logger.info(`Creating ${count} activities...`);
  const activityIds: mongoose.Types.ObjectId[] = [];
  
  // Check existing activities count
  const existingCount = await Activity.countDocuments();
  logger.info(`Existing activities: ${existingCount}`);
  
  // Get unique farmer groups for activities (each activity has 5-10 farmers)
  const farmersPerActivity = 8;
  
  for (let i = 0; i < count; i++) {
    const activityId = `TEST-ACT-${Date.now()}-${i}`;
    
    // Check if activity already exists
    const existing = await Activity.findOne({ activityId });
    if (existing) {
      logger.info(`Activity ${i + 1}/${count} already exists: ${activityId}`);
      activityIds.push(existing._id);
      continue;
    }
    
    // Select random farmers for this activity
    const shuffled = [...farmerIds].sort(() => 0.5 - Math.random());
    const selectedFarmers = shuffled.slice(0, Math.min(farmersPerActivity, farmerIds.length));
    
    // Create activity
    const activity = new Activity({
      activityId,
      type: ACTIVITY_TYPES[i % ACTIVITY_TYPES.length],
      date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Activities over last N days
      officerId: `OFFICER-${(i % 10) + 1}`,
      officerName: `Officer ${(i % 10) + 1}`,
      location: `Location ${i + 1}`,
      territory: TERRITORIES[i % TERRITORIES.length],
      farmerIds: selectedFarmers,
      crops: CROPS.slice(0, (i % 3) + 1), // 1-3 crops per activity
      products: PRODUCTS.slice(0, (i % 2) + 1), // 1-2 products per activity
    });
    
    await activity.save();
    activityIds.push(activity._id);
    logger.info(`Created activity ${i + 1}/${count}: ${activity.type} at ${activity.location}`);
  }
  
  logger.info(`✅ Created ${count} activities`);
  return activityIds;
};

const createTestData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('✅ Connected to MongoDB');

    // Find or create agent user
    let agent = await User.findOne({ email: 'shubhashish@intelliagri.in' });
    if (!agent) {
      logger.error('❌ Agent user not found. Please seed the agent user first.');
      await mongoose.disconnect();
      process.exit(1);
    }
    logger.info(`✅ Found agent: ${agent.name} (${agent.email})`);

    // Create 50 farmers
    const farmerIds = await createFarmers(50);
    logger.info(`✅ Total farmers available: ${farmerIds.length}`);

    // Create 50 activities with those farmers
    const activityIds = await createActivities(farmerIds, 50);
    logger.info(`✅ Total activities created: ${activityIds.length}`);

    // Process sampling for all activities to create tasks
    logger.info('🔄 Processing activity sampling to create tasks...');
    let tasksCreated = 0;
    let totalSampled = 0;
    
    for (let i = 0; i < activityIds.length; i++) {
      const activityId = activityIds[i];
      try {
        const result = await sampleAndCreateTasks(activityId.toString());
        tasksCreated += result.tasksCreated;
        totalSampled += result.sampledCount;
        if ((i + 1) % 10 === 0) {
          logger.info(`Processed ${i + 1}/${activityIds.length} activities... (${tasksCreated} tasks created so far)`);
        }
      } catch (error) {
        logger.error(`Error processing activity ${activityId}:`, error);
      }
    }

    logger.info(`✅ Processed ${activityIds.length} activities`);
    logger.info(`   - Farmers sampled: ${totalSampled}`);
    logger.info(`   - Tasks created: ${tasksCreated}`);

    // Verify tasks assigned to agent
    const agentTaskCount = await CallTask.countDocuments({
      assignedAgentId: agent._id,
      status: { $in: ['pending', 'in_progress'] },
    });
    
    logger.info(`✅ Tasks assigned to agent: ${agentTaskCount}`);

    // Get total tasks created
    const totalTasks = await CallTask.countDocuments();
    logger.info(`✅ Total tasks in database: ${totalTasks}`);

    await mongoose.disconnect();
    logger.info('\n✅ Test data creation completed successfully!');
    logger.info(`📊 Summary:`);
    logger.info(`   - Farmers: ${farmerIds.length}`);
    logger.info(`   - Activities: ${activityIds.length}`);
    logger.info(`   - Tasks for agent: ${agentTaskCount}`);
    logger.info(`   - Total tasks: ${totalTasks}`);
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error creating test data:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

createTestData();
