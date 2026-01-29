/**
 * Generate Indian Data for Kweka_Call_Centre Database
 * 
 * This script:
 * 1. Clears operational data (activities, farmers, calltasks, etc.)
 * 2. Keeps users, master data, configs
 * 3. Generates 100 activities with Indian district/region/zone/BU structure
 * 4. Generates 500 farmers with Indian names and valid mobile numbers
 * 5. Creates 4 agents with all 9 language capabilities
 * 
 * Structure:
 * - Territories: Indian District Names
 * - Regions: Group of States / Part of States
 * - Zones: States / Group of States
 * - BU: North, East, West, South
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { Activity } from '../models/Activity.js';
import { Farmer } from '../models/Farmer.js';
import { CallTask } from '../models/CallTask.js';
import { User } from '../models/User.js';
import { SamplingConfig } from '../models/SamplingConfig.js';
import { CoolingPeriod } from '../models/CoolingPeriod.js';
import { SamplingRun } from '../models/SamplingRun.js';
import { SamplingAudit } from '../models/SamplingAudit.js';
import { AllocationRun } from '../models/AllocationRun.js';
import { InboundQuery } from '../models/InboundQuery.js';
import { MasterCrop, MasterProduct } from '../models/MasterData.js';
import logger from '../config/logger.js';

dotenv.config();

// Fallback crops/products aligned with seedMasterData (used if master collections are empty)
const FALLBACK_CROPS = ['Paddy', 'Cotton', 'Chilli', 'Soybean', 'Maize', 'Wheat', 'Sugarcane', 'Groundnut', 'Sunflower', 'Mustard', 'Jowar', 'Bajra', 'Ragi', 'Turmeric', 'Onion', 'Tomato', 'Potato', 'Brinjal', 'Okra', 'Cucumber'];
const FALLBACK_PRODUCTS = ['Nagarjuna Urea', 'Specialty Fungicide', 'Bio-Stimulant X', 'Insecticide Pro', 'Root Booster', 'Growth Enhancer', 'Foliar Spray', 'Seed Treatment', 'Soil Conditioner', 'Micronutrient Mix'];

// Hierarchy: BU (North/South/East/West) → Zone (state combos) → Region (district combos) → Territory (tehsils)
const BUS = ['North', 'South', 'East', 'West'] as const;

// Zone = combination of states (e.g. Uttarakhand + UP, NE)
const ZONES_BY_BU: Record<string, string[]> = {
  North: ['Uttarakhand + Uttar Pradesh', 'Punjab + Haryana', 'Delhi-NCR', 'Himachal Pradesh'],
  East: ['West Bengal + Odisha', 'Bihar + Jharkhand', 'NE'],
  West: ['Maharashtra + Gujarat', 'Rajasthan', 'Madhya Pradesh'],
  South: ['Karnataka', 'Tamil Nadu + Kerala', 'Andhra Pradesh + Telangana'],
};

// Region = combination of districts or single large district (next to BU)
const REGIONS_BY_BU: Record<string, string[]> = {
  North: ['Dehradun + Haridwar', 'Lucknow', 'Ludhiana + Amritsar', 'Gurgaon + Faridabad', 'Shimla'],
  East: ['Kolkata + Howrah', 'Patna', 'Bhubaneswar + Cuttack', 'Guwahati + Kamrup', 'Ranchi + Dhanbad'],
  West: ['Mumbai + Thane', 'Ahmedabad', 'Pune + Nashik', 'Jaipur', 'Indore'],
  South: ['Bangalore Urban', 'Chennai + Kanchipuram', 'Hyderabad + Ranga Reddy', 'Mysore', 'Kochi'],
};

// Territory = Tehsil or combination of tehsils
const TERRITORIES_BY_BU: Record<string, string[]> = {
  North: ['Dehradun Tehsil', 'Mussoorie Tehsil', 'Lucknow Tehsil', 'Sitapur + Raebareli Tehsils', 'Ludhiana Tehsil', 'Amritsar Tehsil', 'Gurgaon Tehsil', 'Faridabad Tehsil', 'Shimla Tehsil', 'Nainital Tehsil', 'Meerut Tehsil', 'Varanasi Tehsil'],
  East: ['Kolkata North Tehsil', 'Howrah Tehsil', 'Patna Tehsil', 'Gaya Tehsil', 'Bhubaneswar Tehsil', 'Guwahati Tehsil', 'Ranchi Tehsil', 'Durgapur + Asansol Tehsils', 'Siliguri Tehsil'],
  West: ['Mumbai City Tehsil', 'Thane Tehsil', 'Ahmedabad Tehsil', 'Surat Tehsil', 'Pune Tehsil', 'Jaipur Tehsil', 'Udaipur Tehsil', 'Indore Tehsil', 'Nagpur Tehsil'],
  South: ['Bangalore North Tehsil', 'Bangalore South Tehsil', 'Chennai Tehsil', 'Hyderabad Tehsil', 'Mysore Tehsil', 'Vijayawada + Guntur Tehsils', 'Kochi Tehsil', 'Coimbatore Tehsil', 'Madurai Tehsil'],
};

// Primary state per zone (for language derivation)
const ZONE_TO_STATE: Record<string, string> = {
  'Uttarakhand + Uttar Pradesh': 'Uttar Pradesh',
  'Punjab + Haryana': 'Punjab',
  'Delhi-NCR': 'Delhi',
  'Himachal Pradesh': 'Himachal Pradesh',
  'West Bengal + Odisha': 'West Bengal',
  'Bihar + Jharkhand': 'Bihar',
  'NE': 'Assam',
  'Maharashtra + Gujarat': 'Maharashtra',
  'Rajasthan': 'Rajasthan',
  'Madhya Pradesh': 'Madhya Pradesh',
  'Karnataka': 'Karnataka',
  'Tamil Nadu + Kerala': 'Tamil Nadu',
  'Andhra Pradesh + Telangana': 'Andhra Pradesh',
};

// State to Language Mapping
const STATE_TO_LANGUAGE: Record<string, string[]> = {
  'Punjab': ['Hindi', 'Punjabi'],
  'Haryana': ['Hindi'],
  'Uttar Pradesh': ['Hindi'],
  'Delhi': ['Hindi', 'English'],
  'Himachal Pradesh': ['Hindi'],
  'West Bengal': ['Bengali', 'Hindi'],
  'Odisha': ['Oriya', 'Hindi'],
  'Bihar': ['Hindi'],
  'Jharkhand': ['Hindi'],
  'Assam': ['Assamese', 'Bengali'],
  'Maharashtra': ['Marathi', 'Hindi'],
  'Gujarat': ['Gujarati', 'Hindi'],
  'Rajasthan': ['Hindi', 'Rajasthani'],
  'Madhya Pradesh': ['Hindi'],
  'Karnataka': ['Kannada', 'Hindi'],
  'Tamil Nadu': ['Tamil', 'English'],
  'Andhra Pradesh': ['Telugu', 'Hindi'],
  'Telangana': ['Telugu', 'Hindi'],
  'Kerala': ['Malayalam', 'English'],
};

// Activity Types
const ACTIVITY_TYPES = ['Field Day', 'Group Meeting', 'Demo Visit', 'OFM', 'Other'];

// Indian Names Database
const INDIAN_FIRST_NAMES = {
  Male: [
    'Rajesh', 'Amit', 'Suresh', 'Ramesh', 'Kumar', 'Vikash', 'Anil', 'Sunil', 'Manoj', 'Deepak',
    'Arjun', 'Rahul', 'Vishal', 'Sachin', 'Rohit', 'Kiran', 'Naveen', 'Pradeep', 'Sandeep', 'Akhil',
    'Gopal', 'Aman', 'Dilip', 'Suresh', 'Arjun', 'Ravi', 'Kiran', 'Nikhil', 'Pankaj', 'Vijay',
    'Mahesh', 'Naresh', 'Dinesh', 'Harish', 'Mukesh', 'Rajendra', 'Vinod', 'Yogesh', 'Ashok', 'Pramod',
  ],
  Female: [
    'Priya', 'Anita', 'Sunita', 'Kavita', 'Rekha', 'Meera', 'Sneha', 'Pooja', 'Neha', 'Divya',
    'Anjali', 'Swati', 'Ritu', 'Jyoti', 'Shilpa', 'Deepika', 'Kiran', 'Manisha', 'Rashmi', 'Sapna',
    'Madhu', 'Sarita', 'Lata', 'Geeta', 'Seema', 'Nisha', 'Poonam', 'Renu', 'Shweta', 'Aarti',
    'Kamala', 'Lakshmi', 'Sushila', 'Radha', 'Sita', 'Ganga', 'Yamuna', 'Gauri', 'Parvati', 'Durga',
  ],
};

const INDIAN_LAST_NAMES = [
  'Kumar', 'Singh', 'Yadav', 'Sharma', 'Patel', 'Reddy', 'Rao', 'Naik', 'Pawar', 'Desai',
  'Mehta', 'Gupta', 'Verma', 'Jain', 'Agarwal', 'Malhotra', 'Chopra', 'Kapoor', 'Shah', 'Joshi',
  'Pandey', 'Mishra', 'Tiwari', 'Dubey', 'Srivastava', 'Trivedi', 'Dwivedi', 'Upadhyay', 'Bhatt', 'Nair',
  'Iyer', 'Menon', 'Krishnan', 'Raman', 'Subramanian', 'Venkatesh', 'Murthy', 'Rao', 'Reddy', 'Naidu',
];

// Officer Names (Field Development Agents)
const OFFICER_NAMES = [
  'Rajesh Kumar', 'Amit Singh', 'Suresh Yadav', 'Ramesh Sharma', 'Kumar Patel',
  'Vikash Reddy', 'Anil Rao', 'Sunil Naik', 'Manoj Pawar', 'Deepak Desai',
  'Arjun Mehta', 'Rahul Gupta', 'Vishal Verma', 'Sachin Jain', 'Rohit Agarwal',
  'Kiran Malhotra', 'Naveen Chopra', 'Pradeep Kapoor', 'Sandeep Shah', 'Akhil Joshi',
];

// Crops/Products are loaded from MasterData in main(); fallbacks above
let CROPS: string[] = FALLBACK_CROPS;
let PRODUCTS: string[] = FALLBACK_PRODUCTS;

// Generate random Indian mobile number (10 digits, starting with 6-9)
function generateMobileNumber(): string {
  const firstDigit = Math.floor(Math.random() * 4) + 6; // 6, 7, 8, or 9
  const rest = Math.floor(Math.random() * 100000000).toString().padStart(9, '0');
  return `${firstDigit}${rest}`;
}

// Generate Indian name
function generateIndianName(): string {
  const gender = Math.random() > 0.5 ? 'Male' : 'Female';
  const firstName = INDIAN_FIRST_NAMES[gender][Math.floor(Math.random() * INDIAN_FIRST_NAMES[gender].length)];
  const lastName = INDIAN_LAST_NAMES[Math.floor(Math.random() * INDIAN_LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}

// Get primary state for a zone (for language)
function getStateForZone(zoneName: string): string {
  return ZONE_TO_STATE[zoneName] || 'Uttar Pradesh';
}

// Get language for a zone (via primary state)
function getLanguageForZone(zoneName: string): string {
  const state = getStateForZone(zoneName);
  return STATE_TO_LANGUAGE[state]?.[0] || 'Hindi';
}

async function loadMasterCropsProducts() {
  const masterCrops = await MasterCrop.find({ isActive: true }).select('name').lean();
  const masterProducts = await MasterProduct.find({ isActive: true }).select('name').lean();
  if (masterCrops.length > 0) {
    CROPS = masterCrops.map((c) => c.name.trim());
    logger.info(`Using ${CROPS.length} crops from master data`);
  } else {
    logger.info(`No master crops found; using fallback list (${FALLBACK_CROPS.length} crops)`);
  }
  if (masterProducts.length > 0) {
    PRODUCTS = masterProducts.map((p) => p.name.trim());
    logger.info(`Using ${PRODUCTS.length} products from master data`);
  } else {
    logger.info(`No master products found; using fallback list (${FALLBACK_PRODUCTS.length} products)`);
  }
}

async function clearOperationalData() {
  logger.info('Clearing operational data...');
  
  await CallTask.deleteMany({});
  await Activity.deleteMany({});
  await Farmer.deleteMany({});
  await CoolingPeriod.deleteMany({});
  await SamplingRun.deleteMany({});
  await SamplingAudit.deleteMany({});
  await AllocationRun.deleteMany({});
  await InboundQuery.deleteMany({});
  
  logger.info('✅ Operational data cleared');
}

async function generateFarmers(count: number = 500) {
  logger.info(`Generating ${count} farmers...`);
  
  const farmers = [];
  const mobileNumbers = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    // BU → Zone (state combo) → Region (district combo) → Territory (tehsil)
    const bu = BUS[Math.floor(Math.random() * BUS.length)];
    const zones = ZONES_BY_BU[bu] || [];
    const regions = REGIONS_BY_BU[bu] || [];
    const territories = TERRITORIES_BY_BU[bu] || [];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const territory = territories[Math.floor(Math.random() * territories.length)];
    const state = getStateForZone(zone);
    
    let mobileNumber = generateMobileNumber();
    while (mobileNumbers.has(mobileNumber)) {
      mobileNumber = generateMobileNumber();
    }
    mobileNumbers.add(mobileNumber);
    
    const name = generateIndianName();
    const language = getLanguageForZone(zone);
    const location = `${territory}, ${region}, ${state}`;
    
    farmers.push({
      name,
      mobileNumber,
      location,
      preferredLanguage: language,
      territory,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  await Farmer.insertMany(farmers);
  logger.info(`✅ Generated ${farmers.length} farmers`);
  
  return farmers;
}

async function generateActivities(count: number = 100) {
  logger.info(`Generating ${count} activities...`);
  
  const activities = [];
  const farmers = await Farmer.find({}).select('_id territory');
  
  const farmersByTerritory = new Map<string, mongoose.Types.ObjectId[]>();
  farmers.forEach(f => {
    if (!farmersByTerritory.has(f.territory)) {
      farmersByTerritory.set(f.territory, []);
    }
    farmersByTerritory.get(f.territory)!.push(f._id);
  });
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90); // Last 90 days
  
  for (let i = 0; i < count; i++) {
    // BU → Zone (state combo) → Region (district combo) → Territory (tehsil)
    const bu = BUS[Math.floor(Math.random() * BUS.length)];
    const zones = ZONES_BY_BU[bu] || [];
    const regions = REGIONS_BY_BU[bu] || [];
    const territories = TERRITORIES_BY_BU[bu] || [];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    const region = regions[Math.floor(Math.random() * regions.length)];
    const territory = territories[Math.floor(Math.random() * territories.length)];
    const state = getStateForZone(zone);
    
    const activityType = ACTIVITY_TYPES[Math.floor(Math.random() * ACTIVITY_TYPES.length)];
    const officerName = OFFICER_NAMES[Math.floor(Math.random() * OFFICER_NAMES.length)];
    const officerId = `FDA${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;
    const activityId = `ACT${String(i + 1).padStart(8, '0')}`;
    
    const daysAgo = Math.floor(Math.random() * 90);
    const activityDate = new Date(startDate);
    activityDate.setDate(activityDate.getDate() + daysAgo);
    
    const territoryFarmers = farmersByTerritory.get(territory) || [];
    const numFarmers = Math.min(Math.floor(Math.random() * 10) + 5, territoryFarmers.length);
    const selectedFarmers = territoryFarmers
      .sort(() => Math.random() - 0.5)
      .slice(0, numFarmers);
    
    const numCrops = Math.floor(Math.random() * 3) + 1;
    const numProducts = Math.floor(Math.random() * 2) + 1;
    const crops = CROPS.sort(() => Math.random() - 0.5).slice(0, numCrops);
    const products = PRODUCTS.sort(() => Math.random() - 0.5).slice(0, numProducts);
    
    activities.push({
      activityId,
      type: activityType,
      date: activityDate,
      lifecycleStatus: 'active',
      lifecycleUpdatedAt: new Date(),
      firstSampleRun: false,
      officerId,
      officerName,
      location: `${territory}, ${region}, ${state}`,
      territory,
      territoryName: territory,
      zoneName: zone,
      buName: bu,
      state,
      tmEmpCode: `TM${String(Math.floor(Math.random() * 1000)).padStart(4, '0')}`,
      tmName: generateIndianName(),
      farmerIds: selectedFarmers,
      crops,
      products,
      syncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  
  await Activity.insertMany(activities);
  logger.info(`✅ Generated ${activities.length} activities`);
  
  return activities;
}

async function generateAgents() {
  logger.info('Generating 4 agents with all 9 language capabilities...');
  
  const allLanguages = ['Hindi', 'Telugu', 'Marathi', 'Kannada', 'Tamil', 'Bengali', 'Oriya', 'English', 'Malayalam'];
  const agentNames = [
    'Rajesh Kumar',
    'Priya Sharma',
    'Amit Singh',
    'Anjali Patel',
  ];
  
  // Get team lead (keep existing or create one)
  let teamLead = await User.findOne({ role: 'team_lead' });
  if (!teamLead) {
    // Create a team lead if none exists
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    teamLead = await User.create({
      name: 'Team Lead Manager',
      email: 'teamlead@nacl.com',
      password: hashedPassword,
      role: 'team_lead',
      employeeId: 'TL001',
      languageCapabilities: allLanguages,
      assignedTerritories: [],
      isActive: true,
    });
  }
  
  const agents = [];
  for (let i = 0; i < 4; i++) {
    const name = agentNames[i];
    const email = `agent${i + 1}@nacl.com`;
    const employeeId = `AG${String(i + 1).padStart(3, '0')}`;
    
    // Check if agent already exists
    let agent = await User.findOne({ email });
    if (agent) {
      // Update existing agent
      agent.name = name;
      agent.languageCapabilities = allLanguages;
      agent.assignedTerritories = [];
      agent.teamLeadId = teamLead._id;
      agent.isActive = true;
      await agent.save();
      agents.push(agent);
    } else {
      // Create new agent
      const hashedPassword = await bcrypt.hash('Admin@123', 12);
      agent = await User.create({
        name,
        email,
        password: hashedPassword,
        role: 'cc_agent',
        employeeId,
        languageCapabilities: allLanguages,
        assignedTerritories: [],
        teamLeadId: teamLead._id,
        isActive: true,
      });
      agents.push(agent);
    }
  }
  
  logger.info(`✅ Generated/Updated ${agents.length} agents`);
  return agents;
}

async function main() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }
    
    logger.info('Connecting to MongoDB...');
    const options = {
      maxPoolSize: 50,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000, // 30 seconds
    };
    await mongoose.connect(mongoUri, options);
    logger.info('✅ Connected to MongoDB');
    
    // Load crops/products from master so generated activities satisfy master criteria
    await loadMasterCropsProducts();
    
    // Clear operational data
    await clearOperationalData();
    
    // Generate farmers first (activities need farmer IDs)
    const farmers = await generateFarmers(500);
    
    // Generate activities
    const activities = await generateActivities(100);
    
    // Generate/Update agents
    const agents = await generateAgents();
    
    logger.info('');
    logger.info('========================================');
    logger.info('✅ Data Generation Complete!');
    logger.info('========================================');
    logger.info(`Farmers: ${farmers.length}`);
    logger.info(`Activities: ${activities.length}`);
    logger.info(`Agents: ${agents.length}`);
    logger.info('');
    logger.info('Summary by BU:');
    const buCounts: Record<string, number> = {};
    activities.forEach(a => {
      buCounts[a.buName] = (buCounts[a.buName] || 0) + 1;
    });
    Object.entries(buCounts).forEach(([bu, count]) => {
      logger.info(`  ${bu}: ${count} activities`);
    });
    
    await mongoose.disconnect();
    logger.info('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error: any) {
    logger.error('❌ Error generating data:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

main();
