/**
 * MongoDB Shell Script to Generate Indian Data
 * Run with: mongosh "mongodb+srv://..." < generateIndianData.mongosh.js
 */

// Hierarchy: BU (North/South/East/West) → Zone (state combos) → Region (district combos) → Territory (tehsils)
const BUS = ['North', 'South', 'East', 'West'];

const ZONES_BY_BU = {
  North: ['Uttarakhand + Uttar Pradesh', 'Punjab + Haryana', 'Delhi-NCR', 'Himachal Pradesh'],
  East: ['West Bengal + Odisha', 'Bihar + Jharkhand', 'NE'],
  West: ['Maharashtra + Gujarat', 'Rajasthan', 'Madhya Pradesh'],
  South: ['Karnataka', 'Tamil Nadu + Kerala', 'Andhra Pradesh + Telangana'],
};

const REGIONS_BY_BU = {
  North: ['Dehradun + Haridwar', 'Lucknow', 'Ludhiana + Amritsar', 'Gurgaon + Faridabad', 'Shimla'],
  East: ['Kolkata + Howrah', 'Patna', 'Bhubaneswar + Cuttack', 'Guwahati + Kamrup', 'Ranchi + Dhanbad'],
  West: ['Mumbai + Thane', 'Ahmedabad', 'Pune + Nashik', 'Jaipur', 'Indore'],
  South: ['Bangalore Urban', 'Chennai + Kanchipuram', 'Hyderabad + Ranga Reddy', 'Mysore', 'Kochi'],
};

const TERRITORIES_BY_BU = {
  North: ['Dehradun Tehsil', 'Mussoorie Tehsil', 'Lucknow Tehsil', 'Sitapur + Raebareli Tehsils', 'Ludhiana Tehsil', 'Amritsar Tehsil', 'Gurgaon Tehsil', 'Faridabad Tehsil', 'Shimla Tehsil', 'Nainital Tehsil', 'Meerut Tehsil', 'Varanasi Tehsil'],
  East: ['Kolkata North Tehsil', 'Howrah Tehsil', 'Patna Tehsil', 'Gaya Tehsil', 'Bhubaneswar Tehsil', 'Guwahati Tehsil', 'Ranchi Tehsil', 'Durgapur + Asansol Tehsils', 'Siliguri Tehsil'],
  West: ['Mumbai City Tehsil', 'Thane Tehsil', 'Ahmedabad Tehsil', 'Surat Tehsil', 'Pune Tehsil', 'Jaipur Tehsil', 'Udaipur Tehsil', 'Indore Tehsil', 'Nagpur Tehsil'],
  South: ['Bangalore North Tehsil', 'Bangalore South Tehsil', 'Chennai Tehsil', 'Hyderabad Tehsil', 'Mysore Tehsil', 'Vijayawada + Guntur Tehsils', 'Kochi Tehsil', 'Coimbatore Tehsil', 'Madurai Tehsil'],
};

const ZONE_TO_STATE = {
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
  'Assam': 'Assamese',
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

function getStateForZone(zoneName) {
  return ZONE_TO_STATE[zoneName] || 'Uttar Pradesh';
}

function getLanguageForZone(zoneName) {
  const state = getStateForZone(zoneName);
  return STATE_TO_LANGUAGE[state] || 'Hindi';
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

// Generate 500 farmers (BU → Zone → Region → Territory tehsil)
print('👨‍🌾 Generating 500 farmers...');
const farmers = [];
const mobileNumbers = new Set();

for (let i = 0; i < 500; i++) {
  const bu = randomElement(BUS);
  const zone = randomElement(ZONES_BY_BU[bu]);
  const region = randomElement(REGIONS_BY_BU[bu]);
  const territory = randomElement(TERRITORIES_BY_BU[bu]);
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
  const bu = randomElement(BUS);
  const zone = randomElement(ZONES_BY_BU[bu]);
  const region = randomElement(REGIONS_BY_BU[bu]);
  const territory = randomElement(TERRITORIES_BY_BU[bu]);
  const state = getStateForZone(zone);
  
  const activityType = randomElement(ACTIVITY_TYPES);
  const officerName = randomElement(OFFICER_NAMES);
  const officerId = `FDA${String(Math.floor(Math.random() * 10000)).padStart(5, '0')}`;
  const activityId = `ACT${String(i + 1).padStart(8, '0')}`;
  
  const daysAgo = Math.floor(Math.random() * 90);
  const activityDate = new Date(startDate);
  activityDate.setDate(activityDate.getDate() + daysAgo);
  
  const territoryFarmers = farmersByTerritory[territory] || [];
  const numFarmers = Math.min(Math.floor(Math.random() * 10) + 5, territoryFarmers.length);
  const selectedFarmers = territoryFarmers.slice(0, numFarmers);
  
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
