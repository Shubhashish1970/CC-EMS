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

// Indian data for testing
const INDIAN_STATES = [
  'Uttar Pradesh', 'Maharashtra', 'Bihar', 'West Bengal', 'Madhya Pradesh',
  'Tamil Nadu', 'Rajasthan', 'Karnataka', 'Gujarat', 'Andhra Pradesh',
  'Odisha', 'Telangana', 'Kerala', 'Jharkhand', 'Assam', 'Punjab', 'Haryana'
];

const INDIAN_DISTRICTS: Record<string, string[]> = {
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad', 'Meerut', 'Ghaziabad'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Thane'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Arrah'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Raipur', 'Sagar'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur', 'Bhilwara'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga', 'Davangere'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar'],
  'Andhra Pradesh': ['Hyderabad', 'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Mahbubnagar', 'Adilabad'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha', 'Kannur'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Pathankot', 'Hoshiarpur'],
  'Haryana': ['Gurgaon', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Karnal', 'Rohtak']
};

// Indian territories (state-based zones)
const TERRITORIES = [
  'Uttar Pradesh Zone', 'Maharashtra Zone', 'Bihar Zone', 'West Bengal Zone', 'Madhya Pradesh Zone',
  'Tamil Nadu Zone', 'Rajasthan Zone', 'Karnataka Zone', 'Gujarat Zone', 'Andhra Pradesh Zone',
  'Odisha Zone', 'Telangana Zone', 'Kerala Zone', 'Punjab Zone', 'Haryana Zone'
];

const LANGUAGES = ['Hindi', 'English', 'Telugu', 'Marathi', 'Kannada', 'Tamil'];
const ACTIVITY_TYPES = ['Field Day', 'Group Meeting', 'Demo Visit', 'OFM'];
const CROPS = ['Rice', 'Wheat', 'Cotton', 'Sugarcane', 'Soybean', 'Maize', 'Groundnut', 'Pulses', 'Jowar', 'Bajra', 'Ragi', 'Mustard'];
const PRODUCTS = ['NACL Pro', 'NACL Gold', 'NACL Premium', 'NACL Base', 'NACL Bio'];

// Indian officer names
const INDIAN_OFFICER_NAMES = [
  'Rajesh Kumar Sharma', 'Suresh Singh Yadav', 'Amit Kumar Verma', 'Vinod Kumar Patel',
  'Manoj Kumar Singh', 'Ramesh Kumar Gupta', 'Pradeep Kumar Tiwari', 'Anil Kumar Shukla',
  'Sunil Kumar Pandey', 'Deepak Kumar Mishra', 'Vijay Kumar Dwivedi', 'Ravi Kumar Tripathi',
  'Ajay Kumar Srivastava', 'Sandeep Kumar Dubey', 'Naresh Kumar Agarwal', 'Mahesh Kumar Saxena',
  'Pankaj Kumar Ojha', 'Harish Kumar Varma', 'Dinesh Kumar Jaiswal', 'Mukesh Kumar Gaur',
  'Ashok Kumar Bhatt', 'Nikhil Kumar Joshi', 'Rahul Kumar Agarwal', 'Arun Kumar Mehra',
  'Tarun Kumar Kapoor', 'Varun Kumar Malhotra', 'Karan Kumar Sethi', 'Rohan Kumar Khurana',
  'Aman Kumar Chawla', 'Vishal Kumar Bansal', 'Naveen Kumar Goel', 'Pankaj Kumar Ahuja',
  'Rajesh Kumar Batra', 'Srinivas Kumar Reddy', 'Krishna Kumar Naidu', 'Rama Kumar Goud',
  'Lakshmi Kumar Iyer', 'Sai Kumar Reddy', 'Nagarjuna Kumar Swamy', 'Chandra Kumar Nair',
  'Surya Kumar Patil', 'Venkat Kumar Deshmukh', 'Mohan Kumar Jadhav', 'Raghu Kumar Kulkarni',
  'Siva Kumar Gaikwad', 'Shankar Kumar Pawar', 'Ganesh Kumar More', 'Dilip Kumar Salvi'
];

// Indian village names
const INDIAN_VILLAGES = [
  'Amarpur', 'Badlapur', 'Chandrapur', 'Dharampur', 'Etah', 'Faridpur', 'Gulabpur',
  'Harihar', 'Indrapur', 'Jagdishpur', 'Kalyanpur', 'Lakshmipur', 'Madhupur', 'Nagarjuna',
  'Ojhar', 'Pratapgarh', 'Rajgarh', 'Sultanpur', 'Tikapur', 'Ujjain', 'Varanasi',
  'Wardha', 'Yavatmal', 'Zirakpur', 'Akola', 'Bhandara', 'Chhindwara', 'Dewas',
  'Etawah', 'Firozabad', 'Gorakhpur', 'Hamirpur', 'Idukki', 'Jalandhar', 'Kanchipuram',
  'Latur', 'Mangalore', 'Nanded', 'Osmanabad', 'Parbhani', 'Ratnagiri', 'Sangli',
  'Thane', 'Udaipur', 'Vidisha', 'Wayanad', 'Yadgir', 'Zunheboto', 'Aizawl', 'Bhopal',
  'Chittorgarh', 'Dharwad', 'Erode', 'Fatehpur', 'Guntur', 'Hubli', 'Imphal', 'Jodhpur',
  'Kolar', 'Ludhiana', 'Mysore', 'Nagpur', 'Ooty', 'Pali', 'Raipur', 'Satara', 'Tumkur'
];

// Indian farmer names by language/region
const INDIAN_NAMES: Record<string, string[]> = {
  'Hindi': [
    'Ram Kumar Yadav', 'Shyam Singh', 'Gopal Prasad', 'Mohan Das', 'Ramesh Kumar',
    'Suresh Kumar', 'Anil Kumar', 'Vinod Kumar', 'Prakash Singh', 'Amit Kumar',
    'Sandeep Kumar', 'Raj Kumar', 'Deepak Singh', 'Manish Kumar', 'Ashok Kumar',
    'Sunil Kumar', 'Ravi Kumar', 'Mukesh Kumar', 'Dinesh Kumar', 'Vijay Kumar',
    'Naresh Kumar', 'Harish Kumar', 'Mahesh Kumar', 'Ganesh Kumar', 'Dilip Kumar',
    'Sanjay Kumar', 'Ajay Kumar', 'Pradeep Kumar', 'Rahul Kumar', 'Sachin Kumar',
    'Nikhil Kumar', 'Arun Kumar', 'Tarun Kumar', 'Varun Kumar', 'Karan Kumar',
    'Rohan Kumar', 'Aman Kumar', 'Rahul Singh', 'Amit Singh', 'Rohit Singh',
    'Vikram Singh', 'Aditya Singh', 'Karan Singh', 'Arjun Singh', 'Yash Singh',
    'Harsh Singh', 'Vishal Kumar', 'Naveen Kumar', 'Pankaj Kumar', 'Rajesh Kumar'
  ],
  'Telugu': [
    'Venkatesh Reddy', 'Ramesh Naidu', 'Suresh Goud', 'Kumar Swamy', 'Rajesh Naidu',
    'Prakash Reddy', 'Anil Naidu', 'Vinod Goud', 'Sandeep Reddy', 'Deepak Naidu',
    'Manish Reddy', 'Ashok Naidu', 'Sunil Goud', 'Ravi Naidu', 'Mukesh Reddy',
    'Dinesh Naidu', 'Vijay Goud', 'Naresh Reddy', 'Harish Naidu', 'Mahesh Goud',
    'Ganesh Reddy', 'Dilip Naidu', 'Sanjay Goud', 'Ajay Reddy', 'Pradeep Naidu',
    'Rahul Goud', 'Sachin Reddy', 'Nikhil Naidu', 'Arun Goud', 'Tarun Reddy',
    'Varun Naidu', 'Karan Goud', 'Rohan Reddy', 'Aman Naidu', 'Vishal Goud',
    'Naveen Reddy', 'Pankaj Naidu', 'Rajesh Goud', 'Srinivas Reddy', 'Krishna Naidu',
    'Rama Naidu', 'Lakshmi Reddy', 'Sai Goud', 'Nagarjuna Reddy', 'Chandra Naidu',
    'Surya Goud', 'Venkat Reddy', 'Mohan Naidu', 'Raghu Goud', 'Siva Reddy'
  ],
  'Marathi': [
    'Rajesh Patil', 'Suresh Deshmukh', 'Kumar Jadhav', 'Anil Pawar', 'Vinod Kulkarni',
    'Prakash Patil', 'Sandeep Deshmukh', 'Deepak Jadhav', 'Manish Pawar', 'Ashok Kulkarni',
    'Sunil Patil', 'Ravi Deshmukh', 'Mukesh Jadhav', 'Dinesh Pawar', 'Vijay Kulkarni',
    'Naresh Patil', 'Harish Deshmukh', 'Mahesh Jadhav', 'Ganesh Pawar', 'Dilip Kulkarni',
    'Sanjay Patil', 'Ajay Deshmukh', 'Pradeep Jadhav', 'Rahul Pawar', 'Sachin Kulkarni',
    'Nikhil Patil', 'Arun Deshmukh', 'Tarun Jadhav', 'Varun Pawar', 'Karan Kulkarni',
    'Rohan Patil', 'Aman Deshmukh', 'Vishal Jadhav', 'Naveen Pawar', 'Pankaj Kulkarni',
    'Rajesh Gaikwad', 'Srinivas Patil', 'Krishna Deshmukh', 'Rama Jadhav', 'Lakshmi Pawar',
    'Sai Kulkarni', 'Nagarjuna Patil', 'Chandra Deshmukh', 'Surya Jadhav', 'Venkat Pawar',
    'Mohan Kulkarni', 'Raghu Patil', 'Siva Deshmukh', 'Shankar Jadhav', 'Ganesh Pawar'
  ],
  'Kannada': [
    'Ramesh Gowda', 'Suresh Reddy', 'Kumar Naidu', 'Anil Gowda', 'Vinod Reddy',
    'Prakash Naidu', 'Sandeep Gowda', 'Deepak Reddy', 'Manish Naidu', 'Ashok Gowda',
    'Sunil Reddy', 'Ravi Naidu', 'Mukesh Gowda', 'Dinesh Reddy', 'Vijay Naidu',
    'Naresh Gowda', 'Harish Reddy', 'Mahesh Naidu', 'Ganesh Gowda', 'Dilip Reddy',
    'Sanjay Naidu', 'Ajay Gowda', 'Pradeep Reddy', 'Rahul Naidu', 'Sachin Gowda',
    'Nikhil Reddy', 'Arun Naidu', 'Tarun Gowda', 'Varun Reddy', 'Karan Naidu',
    'Rohan Gowda', 'Aman Reddy', 'Vishal Naidu', 'Naveen Gowda', 'Pankaj Reddy',
    'Rajesh Naidu', 'Srinivas Gowda', 'Krishna Reddy', 'Rama Naidu', 'Lakshmi Gowda',
    'Sai Reddy', 'Nagarjuna Naidu', 'Chandra Gowda', 'Surya Reddy', 'Venkat Naidu',
    'Mohan Gowda', 'Raghu Reddy', 'Siva Naidu', 'Shankar Gowda', 'Ganesh Reddy'
  ],
  'Tamil': [
    'Ramesh Nair', 'Suresh Iyer', 'Kumar Reddy', 'Anil Nair', 'Vinod Iyer',
    'Prakash Reddy', 'Sandeep Nair', 'Deepak Iyer', 'Manish Reddy', 'Ashok Nair',
    'Sunil Iyer', 'Ravi Reddy', 'Mukesh Nair', 'Dinesh Iyer', 'Vijay Reddy',
    'Naresh Nair', 'Harish Iyer', 'Mahesh Reddy', 'Ganesh Nair', 'Dilip Iyer',
    'Sanjay Reddy', 'Ajay Nair', 'Pradeep Iyer', 'Rahul Reddy', 'Sachin Nair',
    'Nikhil Iyer', 'Arun Reddy', 'Tarun Nair', 'Varun Iyer', 'Karan Reddy',
    'Rohan Nair', 'Aman Iyer', 'Vishal Reddy', 'Naveen Nair', 'Pankaj Iyer',
    'Rajesh Reddy', 'Srinivas Nair', 'Krishna Iyer', 'Rama Reddy', 'Lakshmi Nair',
    'Sai Iyer', 'Nagarjuna Reddy', 'Chandra Nair', 'Surya Iyer', 'Venkat Reddy',
    'Mohan Nair', 'Raghu Iyer', 'Siva Reddy', 'Shankar Nair', 'Ganesh Iyer'
  ],
  'English': [
    'John Kumar', 'David Singh', 'Michael Reddy', 'Robert Naidu', 'William Goud',
    'James Patil', 'Richard Deshmukh', 'Joseph Jadhav', 'Thomas Pawar', 'Charles Kulkarni',
    'Christopher Gowda', 'Daniel Iyer', 'Matthew Nair', 'Anthony Reddy', 'Mark Naidu',
    'Donald Goud', 'Steven Patil', 'Paul Deshmukh', 'Andrew Jadhav', 'Joshua Pawar',
    'Kenneth Kulkarni', 'Kevin Gowda', 'Brian Iyer', 'George Nair', 'Timothy Reddy',
    'Ronald Naidu', 'Jason Goud', 'Edward Patil', 'Jeffrey Deshmukh', 'Ryan Jadhav',
    'Jacob Pawar', 'Gary Kulkarni', 'Nicholas Gowda', 'Eric Iyer', 'Jonathan Nair',
    'Stephen Reddy', 'Larry Naidu', 'Justin Goud', 'Scott Patil', 'Brandon Deshmukh',
    'Benjamin Jadhav', 'Samuel Pawar', 'Frank Kulkarni', 'Gregory Gowda', 'Raymond Iyer',
    'Alexander Nair', 'Patrick Reddy', 'Jack Naidu', 'Dennis Goud', 'Jerry Patil'
  ]
};

const generateMobileNumber = (index: number): string => {
  // Generate a unique 10-digit Indian mobile number (starts with 7, 8, or 9)
  const prefixes = [7, 8, 9];
  const prefix = prefixes[index % prefixes.length];
  const base = prefix * 1000000000; // e.g., 7000000000, 8000000000, 9000000000
  return String(base + (index % 100000000)).padStart(10, '0');
};

const generateFarmerName = (index: number, language: string): string => {
  const names = INDIAN_NAMES[language] || INDIAN_NAMES['Hindi'];
  return names[index % names.length];
};

const generateIndianLocation = (index: number, language: string): { state: string; district: string; village: string; territory: string } => {
  // Map languages to states
  const languageStateMap: Record<string, string[]> = {
    'Hindi': ['Uttar Pradesh', 'Bihar', 'Madhya Pradesh', 'Rajasthan', 'Haryana'],
    'Telugu': ['Andhra Pradesh', 'Telangana'],
    'Marathi': ['Maharashtra'],
    'Kannada': ['Karnataka'],
    'Tamil': ['Tamil Nadu'],
    'English': ['Karnataka', 'Kerala', 'Tamil Nadu']
  };
  
  const possibleStates = languageStateMap[language] || ['Uttar Pradesh'];
  const state = possibleStates[index % possibleStates.length];
  const districts = INDIAN_DISTRICTS[state] || ['District 1'];
  const district = districts[index % districts.length];
  const village = INDIAN_VILLAGES[index % INDIAN_VILLAGES.length];
  const territory = `${state} Zone`;
  
  return { state, district, village, territory };
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
    
    const language = LANGUAGES[i % LANGUAGES.length];
    const { state, district, village, territory } = generateIndianLocation(existingCount + i, language);
    const farmerName = generateFarmerName(existingCount + i, language);
    
    const farmer = new Farmer({
      name: farmerName,
      mobileNumber,
      location: `${village}, ${district}, ${state}`,
      preferredLanguage: language,
      territory: territory,
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
  
  // Get unique farmer groups for activities (each activity has 10-15 farmers for proper sampling)
  const farmersPerActivity = 12; // Increased to ensure good sampling
  
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
    
    // Get location from first farmer in the activity
    const firstFarmer = await Farmer.findById(selectedFarmers[0]);
    const activityLocation = firstFarmer ? firstFarmer.location.split(',')[0] : `Location ${i + 1}`;
    
    // Get officer name and territory from first farmer
    const firstFarmer = await Farmer.findById(selectedFarmers[0]);
    const officerName = INDIAN_OFFICER_NAMES[i % INDIAN_OFFICER_NAMES.length];
    const officerId = `OFF-${String.fromCharCode(65 + (i % 26))}${(i % 1000).toString().padStart(3, '0')}`;
    const activityTerritory = firstFarmer ? firstFarmer.territory : TERRITORIES[i % TERRITORIES.length];
    
    // Create activity
    const activity = new Activity({
      activityId,
      type: ACTIVITY_TYPES[i % ACTIVITY_TYPES.length],
      date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)), // Activities over last N days
      officerId: officerId,
      officerName: officerName,
      location: activityLocation,
      territory: activityTerritory,
      farmerIds: selectedFarmers,
      crops: CROPS.slice(0, Math.min((i % 4) + 2, CROPS.length)), // 2-5 crops per activity
      products: PRODUCTS.slice(0, Math.min((i % 3) + 1, PRODUCTS.length)), // 1-3 products per activity
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
