/**
 * MongoDB Shell Script to Generate Indian Data
 * Run with: mongosh "mongodb+srv://..." < generateIndianData.mongosh.js
 */

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

const ZONES = {
  North: ['Punjab', 'Haryana', 'Uttar Pradesh', 'Delhi', 'Himachal Pradesh'],
  East: ['West Bengal', 'Odisha', 'Bihar', 'Jharkhand', 'Assam'],
  West: ['Maharashtra', 'Gujarat', 'Rajasthan', 'Madhya Pradesh'],
  South: ['Karnataka', 'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Kerala'],
};

const STATE_TO_LANGUAGE = {
  'Punjab': 'Hindi',
  'Haryana': 'Hindi',
  'Uttar Pradesh': 'Hindi',
  'Delhi': 'Hindi',
  'Himachal Pradesh': 'Hindi',
  'West Bengal': 'Bengali',
  'Odisha': 'Oriya',
  'Bihar': 'Hindi',
  'Jharkhand': 'Hindi',
  'Assam': 'Bengali',
  'Maharashtra': 'Marathi',
  'Gujarat': 'Hindi',
  'Rajasthan': 'Hindi',
  'Madhya Pradesh': 'Hindi',
  'Karnataka': 'Kannada',
  'Tamil Nadu': 'Tamil',
  'Andhra Pradesh': 'Telugu',
  'Telangana': 'Telugu',
  'Kerala': 'Malayalam',
};

const ACTIVITY_TYPES = ['Field Day', 'Group Meeting', 'Demo Visit', 'OFM', 'Other'];
const INDIAN_FIRST_NAMES = ['Rajesh', 'Amit', 'Suresh', 'Ramesh', 'Kumar', 'Vikash', 'Anil', 'Sunil', 'Manoj', 'Deepak', 'Arjun', 'Rahul', 'Vishal', 'Sachin', 'Rohit', 'Kiran', 'Naveen', 'Pradeep', 'Sandeep', 'Akhil', 'Gopal', 'Aman', 'Dilip', 'Ravi', 'Nikhil', 'Pankaj', 'Vijay', 'Mahesh', 'Naresh', 'Dinesh', 'Priya', 'Anita', 'Sunita', 'Kavita', 'Rekha', 'Meera', 'Sneha', 'Pooja', 'Neha', 'Divya', 'Anjali', 'Swati', 'Ritu', 'Jyoti', 'Shilpa', 'Deepika', 'Manisha', 'Rashmi', 'Sapna', 'Madhu', 'Sarita'];
const INDIAN_LAST_NAMES = ['Kumar', 'Singh', 'Yadav', 'Sharma', 'Patel', 'Reddy', 'Rao', 'Naik', 'Pawar', 'Desai', 'Mehta', 'Gupta', 'Verma', 'Jain', 'Agarwal', 'Malhotra', 'Chopra', 'Kapoor', 'Shah', 'Joshi', 'Pandey', 'Mishra', 'Tiwari', 'Dubey', 'Srivastava', 'Trivedi', 'Dwivedi', 'Upadhyay', 'Bhatt', 'Nair', 'Iyer', 'Menon', 'Krishnan', 'Raman', 'Subramanian', 'Venkatesh', 'Murthy', 'Naidu'];
const OFFICER_NAMES = ['Rajesh Kumar', 'Amit Singh', 'Suresh Yadav', 'Ramesh Sharma', 'Kumar Patel', 'Vikash Reddy', 'Anil Rao', 'Sunil Naik', 'Manoj Pawar', 'Deepak Desai', 'Arjun Mehta', 'Rahul Gupta', 'Vishal Verma', 'Sachin Jain', 'Rohit Agarwal', 'Kiran Malhotra', 'Naveen Chopra', 'Pradeep Kapoor', 'Sandeep Shah', 'Akhil Joshi'];
// Align with backend seedMasterData so activities match crop/product master
const CROPS = ['Paddy', 'Cotton', 'Chilli', 'Soybean', 'Maize', 'Wheat', 'Sugarcane', 'Groundnut', 'Sunflower', 'Mustard', 'Jowar', 'Bajra', 'Ragi', 'Turmeric', 'Onion', 'Tomato', 'Potato', 'Brinjal', 'Okra', 'Cucumber'];
const PRODUCTS = ['Nagarjuna Urea', 'Specialty Fungicide', 'Bio-Stimulant X', 'Insecticide Pro', 'Root Booster', 'Growth Enhancer', 'Foliar Spray', 'Seed Treatment', 'Soil Conditioner', 'Micronutrient Mix'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateMobileNumber() {
  const firstDigit = Math.floor(Math.random() * 4) + 6;
  const rest = String(Math.floor(Math.random() * 100000000)).padStart(9, '0');
  return `${firstDigit}${rest}`;
}

function generateIndianName() {
  const firstName = randomElement(INDIAN_FIRST_NAMES);
  const lastName = randomElement(INDIAN_LAST_NAMES);
  return `${firstName} ${lastName}`;
}

function getLanguageForTerritory(district, bu) {
  const zones = ZONES[bu] || [];
  for (const zone of zones) {
    if (STATE_TO_LANGUAGE[zone]) {
      return STATE_TO_LANGUAGE[zone];
    }
  }
  return 'Hindi';
}

function getStateForTerritory(district, bu) {
  const zones = ZONES[bu] || [];
  return zones[0] || 'Unknown';
}

function getRegionForTerritory(district, bu) {
  const regions = {
    North: ['Punjab-Haryana Region', 'Uttar Pradesh Central Region', 'Uttar Pradesh Eastern Region', 'Delhi-NCR Region'],
    East: ['West Bengal Central Region', 'West Bengal Northern Region', 'Odisha Coastal Region', 'Odisha Inland Region', 'Bihar Central Region', 'Bihar Eastern Region', 'Jharkhand Region'],
    West: ['Maharashtra Western Region', 'Maharashtra Central Region', 'Gujarat Northern Region', 'Gujarat Southern Region', 'Rajasthan Northern Region', 'Rajasthan Southern Region'],
    South: ['Karnataka Northern Region', 'Karnataka Southern Region', 'Tamil Nadu Northern Region', 'Tamil Nadu Southern Region', 'Andhra Pradesh Coastal Region', 'Andhra Pradesh Rayalaseema Region', 'Telangana Region', 'Kerala Northern Region', 'Kerala Southern Region'],
  };
  const regs = regions[bu] || [];
  return randomElement(regs);
}

function getZoneForTerritory(district, bu) {
  const zones = ZONES[bu] || [];
  return randomElement(zones);
}

// Main execution
print('🚀 Starting Indian Data Generation...');
print('');

// Clear operational data
print('🗑️  Clearing operational data...');
db.calltasks.deleteMany({});
db.activities.deleteMany({});
db.farmers.deleteMany({});
db.coolingperiods.deleteMany({});
db.samplingruns.deleteMany({});
db.samplingaudits.deleteMany({});
db.allocationruns.deleteMany({});
db.inboundqueries.deleteMany({});
print('✅ Operational data cleared');
print('');

// Generate 500 farmers
print('👨‍🌾 Generating 500 farmers...');
const farmers = [];
const mobileNumbers = new Set();
const allDistricts = [].concat(...Object.values(INDIAN_DISTRICTS));

for (let i = 0; i < 500; i++) {
  const bus = Object.keys(INDIAN_DISTRICTS);
  const bu = randomElement(bus);
  const districts = INDIAN_DISTRICTS[bu];
  const district = randomElement(districts);
  
  let mobileNumber = generateMobileNumber();
  while (mobileNumbers.has(mobileNumber)) {
    mobileNumber = generateMobileNumber();
  }
  mobileNumbers.add(mobileNumber);
  
  const name = generateIndianName();
  const language = getLanguageForTerritory(district, bu);
  const state = getStateForTerritory(district, bu);
  const location = `${district}, ${state}`;
  
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

db.farmers.insertMany(farmers);
print(`✅ Generated ${farmers.length} farmers`);
print('');

// Generate 100 activities
print('📋 Generating 100 activities...');
const activities = [];
const startDate = new Date();
startDate.setDate(startDate.getDate() - 90);

// Get farmer IDs by territory
const farmersByTerritory = {};
farmers.forEach(f => {
  if (!farmersByTerritory[f.territory]) {
    farmersByTerritory[f.territory] = [];
  }
  const farmerDoc = db.farmers.findOne({ mobileNumber: f.mobileNumber });
  if (farmerDoc) {
    farmersByTerritory[f.territory].push(farmerDoc._id);
  }
});

for (let i = 0; i < 100; i++) {
  const bus = Object.keys(INDIAN_DISTRICTS);
  const bu = randomElement(bus);
  const districts = INDIAN_DISTRICTS[bu];
  const district = randomElement(districts);
  
  const activityType = randomElement(ACTIVITY_TYPES);
  const officerName = randomElement(OFFICER_NAMES);
  const officerId = `FDA${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;
  const activityId = `ACT${String(i + 1).padStart(8, '0')}`;
  
  const daysAgo = Math.floor(Math.random() * 90);
  const activityDate = new Date(startDate);
  activityDate.setDate(activityDate.getDate() + daysAgo);
  
  const territoryFarmers = farmersByTerritory[district] || [];
  const numFarmers = Math.min(Math.floor(Math.random() * 10) + 5, territoryFarmers.length);
  const selectedFarmers = territoryFarmers.slice(0, numFarmers);
  
  const state = getStateForTerritory(district, bu);
  const region = getRegionForTerritory(district, bu);
  const zone = getZoneForTerritory(district, bu);
  
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

db.activities.insertMany(activities);
print(`✅ Generated ${activities.length} activities`);
print('');

// Generate/Update 4 agents
print('👥 Generating/Updating 4 agents...');
const allLanguages = ['Hindi', 'Telugu', 'Marathi', 'Kannada', 'Tamil', 'Bengali', 'Oriya', 'English', 'Malayalam'];
const agentNames = ['Rajesh Kumar', 'Priya Sharma', 'Amit Singh', 'Anjali Patel'];

// Get or create team lead
let teamLead = db.users.findOne({ role: 'team_lead' });
if (!teamLead) {
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('Admin@123', 12);
  teamLead = db.users.insertOne({
    name: 'Team Lead Manager',
    email: 'teamlead@nacl.com',
    password: hashedPassword,
    role: 'team_lead',
    employeeId: 'TL001',
    languageCapabilities: allLanguages,
    assignedTerritories: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  teamLead = db.users.findOne({ email: 'teamlead@nacl.com' });
}

for (let i = 0; i < 4; i++) {
  const name = agentNames[i];
  const email = `agent${i + 1}@nacl.com`;
  const employeeId = `AG${String(i + 1).padStart(3, '0')}`;
  
  const existing = db.users.findOne({ email });
  if (existing) {
    db.users.updateOne(
      { email },
      {
        $set: {
          name,
          languageCapabilities: allLanguages,
          assignedTerritories: [],
          teamLeadId: teamLead._id,
          isActive: true,
          updatedAt: new Date(),
        }
      }
    );
  } else {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('Admin@123', 12);
    db.users.insertOne({
      name,
      email,
      password: hashedPassword,
      role: 'cc_agent',
      employeeId,
      languageCapabilities: allLanguages,
      assignedTerritories: [],
      teamLeadId: teamLead._id,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

print('✅ Generated/Updated 4 agents');
print('');

print('========================================');
print('✅ Data Generation Complete!');
print('========================================');
print(`Farmers: ${farmers.length}`);
print(`Activities: ${activities.length}`);
print(`Agents: 4`);
print('');
