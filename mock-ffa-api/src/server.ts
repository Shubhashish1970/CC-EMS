import express, { Express, Request, Response } from 'express';
import cors from 'cors';

const app: Express = express();
// Cloud Run uses PORT 8080, local development uses 4000
const PORT = process.env.PORT || 4000;

// Log server start
console.log(`🚀 Mock FFA API starting on port ${PORT}`);

app.use(cors());
app.use(express.json());

// Mock data storage (in-memory, resets on server restart)
let mockActivities: any[] = [];
let mockFarmers: any[] = [];

// Indian data constants
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

// Indian farmer names by language
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

// Helper functions
const generateMobileNumber = (index: number): string => {
  const prefixes = [7, 8, 9];
  const prefix = prefixes[index % prefixes.length];
  const base = prefix * 1000000000;
  return String(base + (index % 100000000)).padStart(10, '0');
};

const generateIndianLocation = (index: number, language: string): { state: string; district: string; village: string; territory: string } => {
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

const generateFarmerName = (index: number, language: string): string => {
  const names = INDIAN_NAMES[language] || INDIAN_NAMES['Hindi'];
  return names[index % names.length];
};

// Generate sample data on startup
const generateSampleData = () => {
  const ACTIVITY_COUNT = 50; // Generate 50 activities
  const FARMERS_PER_ACTIVITY = 12; // 12 farmers per activity for proper sampling
  
  // Clear existing data
  mockActivities = [];
  mockFarmers = [];
  
  // Track unique mobile numbers
  const usedMobileNumbers = new Set<string>();
  let farmerIndex = 0;

  for (let i = 1; i <= ACTIVITY_COUNT; i++) {
    const activityDate = new Date();
    activityDate.setDate(activityDate.getDate() - (i * 2)); // Activities spread over last 100 days

    // Select language for this activity (determines state/territory)
    const language = LANGUAGES[i % LANGUAGES.length];
    const { state, district, village, territory } = generateIndianLocation(i, language);
    
    // Generate crops and products for this activity (2-5 crops, 1-3 products)
    const activityCrops = CROPS
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 4));
    const activityProducts = PRODUCTS
      .sort(() => Math.random() - 0.5)
      .slice(0, 1 + Math.floor(Math.random() * 3));

    // Get officer name
    const officerName = INDIAN_OFFICER_NAMES[i % INDIAN_OFFICER_NAMES.length];
    const officerId = `OFF-${String.fromCharCode(65 + (i % 26))}${(i % 1000).toString().padStart(3, '0')}`;

    const activity = {
      activityId: `FFA-ACT-${1000 + i}`,
      type: ACTIVITY_TYPES[i % ACTIVITY_TYPES.length],
      date: activityDate.toISOString().split('T')[0],
      officerId: officerId,
      officerName: officerName,
      location: village, // Use village name as location
      territory: territory, // State-based territory
      crops: activityCrops,
      products: activityProducts,
      farmers: [] as any[],
    };

    // Generate 12 farmers per activity
    for (let j = 1; j <= FARMERS_PER_ACTIVITY; j++) {
      // Generate unique mobile number
      let mobileNumber: string;
      do {
        mobileNumber = generateMobileNumber(farmerIndex);
        farmerIndex++;
      } while (usedMobileNumbers.has(mobileNumber));
      usedMobileNumbers.add(mobileNumber);

      const farmerName = generateFarmerName(farmerIndex, language);
      const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(farmerName)}&size=128&background=${Math.floor(Math.random() * 16777215).toString(16)}&color=fff&bold=true&format=png`;
      
      const farmer = {
        farmerId: `FFA-FARM-${i}-${j}`,
        name: farmerName,
        mobileNumber: mobileNumber,
        location: `${village}, ${district}, ${state}`, // Full location string
        preferredLanguage: language,
        territory: territory,
        crops: [activityCrops[Math.floor(Math.random() * activityCrops.length)]],
        photoUrl: photoUrl,
      };
      
      activity.farmers.push(farmer);
      mockFarmers.push(farmer);
    }

    mockActivities.push(activity);
  }
  
  console.log(`✅ Generated ${mockActivities.length} activities with ${mockFarmers.length} farmers`);
};

// Initialize sample data
generateSampleData();

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Mock FFA API is running',
    data: {
      activitiesCount: mockActivities.length,
      farmersCount: mockFarmers.length,
    },
  });
});

// Get all activities
app.get('/api/activities', (req: Request, res: Response) => {
  const { page = 1, limit = 100, dateFrom } = req.query; // dateFrom for incremental sync
  const skip = (Number(page) - 1) * Number(limit);

  // Filter activities by dateFrom if provided (for incremental sync)
  let filteredActivities = mockActivities;
  if (dateFrom && typeof dateFrom === 'string') {
    const dateFromDate = new Date(dateFrom);
    filteredActivities = mockActivities.filter((activity) => {
      const activityDate = new Date(activity.date);
      return activityDate >= dateFromDate;
    });
    console.log(`Filtering activities: ${mockActivities.length} total, ${filteredActivities.length} after ${dateFrom}`);
  }

  const activities = filteredActivities.slice(skip, skip + Number(limit));

  res.json({
    success: true,
    data: {
      activities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: filteredActivities.length,
        pages: Math.ceil(filteredActivities.length / Number(limit)),
      },
    },
  });
});

// Get activity by ID
app.get('/api/activities/:activityId', (req: Request, res: Response) => {
  const { activityId } = req.params;
  const activity = mockActivities.find(a => a.activityId === activityId);

  if (!activity) {
    return res.status(404).json({
      success: false,
      error: { message: 'Activity not found' },
    });
  }

  res.json({
    success: true,
    data: { activity },
  });
});

// Get all farmers
app.get('/api/farmers', (req: Request, res: Response) => {
  const { page = 1, limit = 50 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const farmers = mockFarmers.slice(skip, skip + Number(limit));

  res.json({
    success: true,
    data: {
      farmers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: mockFarmers.length,
        pages: Math.ceil(mockFarmers.length / Number(limit)),
      },
    },
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock FFA API running on port ${PORT}`);
  console.log(`📊 Sample data: ${mockActivities.length} activities, ${mockFarmers.length} farmers`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});
