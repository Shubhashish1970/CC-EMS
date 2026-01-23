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
import logger from '../config/logger.js';

dotenv.config();

// Indian District Names (Territories) - Organized by BU
const INDIAN_DISTRICTS = {
  North: [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', // Punjab
    'Gurgaon', 'Faridabad', 'Karnal', 'Panipat', 'Ambala', // Haryana
    'Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad', // Uttar Pradesh
    'New Delhi', 'Central Delhi', 'East Delhi', 'West Delhi', 'South Delhi', // Delhi
  ],
  East: [
    'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', // West Bengal
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', // Odisha
    'Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', // Bihar
    'Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', // Jharkhand
  ],
  West: [
    'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', // Maharashtra
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', // Gujarat
    'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', // Rajasthan
  ],
  South: [
    'Bangalore', 'Mysore', 'Mangalore', 'Hubli', 'Belgaum', // Karnataka
    'Chennai', 'Coimbatore', 'Madurai', 'Salem', 'Tiruchirappalli', // Tamil Nadu
    'Hyderabad', 'Vijayawada', 'Visakhapatnam', 'Guntur', 'Nellore', // Andhra Pradesh/Telangana
    'Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kannur', // Kerala
  ],
};

// Regions (Group of States / Part of States) - Organized by BU
const REGIONS = {
  North: [
    'Punjab-Haryana Region',
    'Uttar Pradesh Central Region',
    'Uttar Pradesh Eastern Region',
    'Delhi-NCR Region',
  ],
  East: [
    'West Bengal Central Region',
    'West Bengal Northern Region',
    'Odisha Coastal Region',
    'Odisha Inland Region',
    'Bihar Central Region',
    'Bihar Eastern Region',
    'Jharkhand Region',
  ],
  West: [
    'Maharashtra Western Region',
    'Maharashtra Central Region',
    'Gujarat Northern Region',
    'Gujarat Southern Region',
    'Rajasthan Northern Region',
    'Rajasthan Southern Region',
  ],
  South: [
    'Karnataka Northern Region',
    'Karnataka Southern Region',
    'Tamil Nadu Northern Region',
    'Tamil Nadu Southern Region',
    'Andhra Pradesh Coastal Region',
    'Andhra Pradesh Rayalaseema Region',
    'Telangana Region',
    'Kerala Northern Region',
    'Kerala Southern Region',
  ],
};

// Zones (States / Group of States)
const ZONES = {
  North: ['Punjab', 'Haryana', 'Uttar Pradesh', 'Delhi', 'Himachal Pradesh'],
  East: ['West Bengal', 'Odisha', 'Bihar', 'Jharkhand', 'Assam'],
  West: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Madhya Pradesh'],
  South: ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Kerala'],
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

// Crops
const CROPS = [
  'Rice', 'Wheat', 'Maize', 'Sugarcane', 'Cotton', 'Soybean', 'Groundnut', 'Mustard',
  'Potato', 'Onion', 'Tomato', 'Chilli', 'Turmeric', 'Ginger', 'Brinjal', 'Okra',
];

// Products
const PRODUCTS = [
  'NACL Seeds Premium', 'NACL Crop Protection', 'NACL Fertilizers', 'NACL Bio Solutions',
  'NACL Growth Enhancer', 'NACL Soil Conditioner', 'NACL Micro Nutrients', 'NACL Organic',
];

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

// Get language for territory based on state/zone
function getLanguageForTerritory(district: string, bu: string): string {
  const zones = ZONES[bu as keyof typeof ZONES] || [];
  for (const zone of zones) {
    const languages = STATE_TO_LANGUAGE[zone] || ['Hindi'];
    // Return primary language (first one)
    return languages[0];
  }
  return 'Hindi'; // Default
}

// Get state for territory
function getStateForTerritory(district: string, bu: string): string {
  const zones = ZONES[bu as keyof typeof ZONES] || [];
  // Find which zone/state this district belongs to
  for (const zone of zones) {
    if (STATE_TO_LANGUAGE[zone]) {
      return zone;
    }
  }
  return zones[0] || 'Unknown';
}

// Get region for territory
function getRegionForTerritory(district: string, bu: string): string {
  const regions = REGIONS[bu as keyof typeof REGIONS] || [];
  return regions[Math.floor(Math.random() * regions.length)] || `${bu} Region`;
}

// Get zone for territory
function getZoneForTerritory(district: string, bu: string): string {
  const zones = ZONES[bu as keyof typeof ZONES] || [];
  return zones[Math.floor(Math.random() * zones.length)] || bu;
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
  const allDistricts = Object.values(INDIAN_DISTRICTS).flat();
  
  for (let i = 0; i < count; i++) {
    // Select random BU
    const bus = Object.keys(INDIAN_DISTRICTS);
    const bu = bus[Math.floor(Math.random() * bus.length)];
    const districts = INDIAN_DISTRICTS[bu as keyof typeof INDIAN_DISTRICTS];
    const district = districts[Math.floor(Math.random() * districts.length)];
    
    // Generate unique mobile number
    let mobileNumber = generateMobileNumber();
    while (mobileNumbers.has(mobileNumber)) {
      mobileNumber = generateMobileNumber();
    }
    mobileNumbers.add(mobileNumber);
    
    const name = generateIndianName();
    const language = getLanguageForTerritory(district, bu);
    const location = `${district}, ${getStateForTerritory(district, bu)}`;
    
    farmers.push({
      name,
      mobileNumber,
      location,
      preferredLanguage: language,
      territory: district,
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
  const allDistricts = Object.values(INDIAN_DISTRICTS).flat();
  const farmers = await Farmer.find({}).select('_id territory');
  
  // Group farmers by territory
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
    // Select random BU and district
    const bus = Object.keys(INDIAN_DISTRICTS);
    const bu = bus[Math.floor(Math.random() * bus.length)];
    const districts = INDIAN_DISTRICTS[bu as keyof typeof INDIAN_DISTRICTS];
    const district = districts[Math.floor(Math.random() * districts.length)];
    
    const activityType = ACTIVITY_TYPES[Math.floor(Math.random() * ACTIVITY_TYPES.length)];
    const officerName = OFFICER_NAMES[Math.floor(Math.random() * OFFICER_NAMES.length)];
    const officerId = `FDA${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;
    const activityId = `ACT${String(i + 1).padStart(8, '0')}`;
    
    // Random date in last 90 days
    const daysAgo = Math.floor(Math.random() * 90);
    const activityDate = new Date(startDate);
    activityDate.setDate(activityDate.getDate() + daysAgo);
    
    // Get farmers for this territory
    const territoryFarmers = farmersByTerritory.get(district) || [];
    const numFarmers = Math.min(Math.floor(Math.random() * 10) + 5, territoryFarmers.length); // 5-15 farmers
    const selectedFarmers = territoryFarmers
      .sort(() => Math.random() - 0.5)
      .slice(0, numFarmers);
    
    const state = getStateForTerritory(district, bu);
    const region = getRegionForTerritory(district, bu);
    const zone = getZoneForTerritory(district, bu);
    
    // Random crops and products
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
      officerId,
      officerName,
      location: `${district}, ${state}`,
      territory: district,
      territoryName: district,
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
