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

// Hierarchy: BU (North/South/East/West) → Zone (state combos) → Region (district combos) → Territory (tehsils)
const BUS = ['North', 'South', 'East', 'West'] as const;

const ZONES_BY_BU: Record<string, string[]> = {
  North: ['Uttarakhand + Uttar Pradesh', 'Punjab + Haryana', 'Delhi-NCR', 'Himachal Pradesh'],
  East: ['West Bengal + Odisha', 'Bihar + Jharkhand', 'NE'],
  West: ['Maharashtra + Gujarat', 'Rajasthan', 'Madhya Pradesh'],
  South: ['Karnataka', 'Tamil Nadu + Kerala', 'Andhra Pradesh + Telangana'],
};

const TERRITORIES_BY_BU: Record<string, string[]> = {
  North: ['Dehradun Tehsil', 'Mussoorie Tehsil', 'Lucknow Tehsil', 'Sitapur + Raebareli Tehsils', 'Ludhiana Tehsil', 'Amritsar Tehsil', 'Gurgaon Tehsil', 'Faridabad Tehsil', 'Shimla Tehsil', 'Nainital Tehsil', 'Meerut Tehsil', 'Varanasi Tehsil'],
  East: ['Kolkata North Tehsil', 'Howrah Tehsil', 'Patna Tehsil', 'Gaya Tehsil', 'Bhubaneswar Tehsil', 'Guwahati Tehsil', 'Ranchi Tehsil', 'Durgapur + Asansol Tehsils', 'Siliguri Tehsil'],
  West: ['Mumbai City Tehsil', 'Thane Tehsil', 'Ahmedabad Tehsil', 'Surat Tehsil', 'Pune Tehsil', 'Jaipur Tehsil', 'Udaipur Tehsil', 'Indore Tehsil', 'Nagpur Tehsil'],
  South: ['Bangalore North Tehsil', 'Bangalore South Tehsil', 'Chennai Tehsil', 'Hyderabad Tehsil', 'Mysore Tehsil', 'Vijayawada + Guntur Tehsils', 'Kochi Tehsil', 'Coimbatore Tehsil', 'Madurai Tehsil'],
};

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

const LANGUAGES = ['Hindi', 'English', 'Telugu', 'Marathi', 'Kannada', 'Tamil'];
const ACTIVITY_TYPES = ['Field Day', 'Group Meeting', 'Demo Visit', 'OFM'];
// Fallback when EMS master-data is not available (e.g. local dev without EMS)
const FALLBACK_CROPS = ['Paddy', 'Cotton', 'Chilli', 'Soybean', 'Maize', 'Wheat', 'Sugarcane', 'Groundnut', 'Sunflower', 'Mustard', 'Jowar', 'Bajra', 'Ragi', 'Turmeric', 'Onion', 'Tomato', 'Potato', 'Brinjal', 'Okra', 'Cucumber'];
const FALLBACK_PRODUCTS = ['Nagarjuna Urea', 'Specialty Fungicide', 'Bio-Stimulant X', 'Insecticide Pro', 'Root Booster', 'Growth Enhancer', 'Foliar Spray', 'Seed Treatment', 'Soil Conditioner', 'Micronutrient Mix'];
// Used by generateSampleData; set from EMS master-data at startup when EMS_API_URL + FFA_MASTER_KEY are set
let CROPS: string[] = [...FALLBACK_CROPS];
let PRODUCTS: string[] = [...FALLBACK_PRODUCTS];

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

const formatDDMMYYYY = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

const parseDateParam = (value: string): Date | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  // Support DD/MM/YYYY (new)
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [ddStr, mmStr, yyyyStr] = raw.split('/');
    const dd = Number(ddStr);
    const mm = Number(mmStr);
    const yyyy = Number(yyyyStr);
    const d = new Date(yyyy, mm - 1, dd);
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
    return d;
  }

  // Support YYYY-MM-DD (legacy) + ISO (fallback)
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d;
};

// Helper functions
const generateMobileNumber = (index: number): string => {
  const prefixes = [7, 8, 9];
  const prefix = prefixes[index % prefixes.length];
  const base = prefix * 1000000000;
  return String(base + (index % 100000000)).padStart(10, '0');
};

// Pick BU → Zone (state combo) → Territory (tehsil); state for language from zone
const pickHierarchy = (index: number): { bu: string; zone: string; territory: string; state: string } => {
  const bu = BUS[index % BUS.length];
  const zones = ZONES_BY_BU[bu] || [];
  const territories = TERRITORIES_BY_BU[bu] || [];
  const zone = zones[Math.floor((index / BUS.length) % zones.length)];
  const territory = territories[Math.floor((index / (BUS.length * zones.length)) % territories.length)];
  const state = ZONE_TO_STATE[zone] || 'Uttar Pradesh';
  return { bu, zone, territory, state };
};

const generateFieldSalesHierarchy = (index: number) => {
  // Synthetic hierarchy values for mock payload
  const fda = {
    empCode: `FDA-${String(index).padStart(4, '0')}`,
    name: INDIAN_OFFICER_NAMES[index % INDIAN_OFFICER_NAMES.length],
  };
  const tm = {
    empCode: `TM-${String(index % 300).padStart(4, '0')}`,
    name: `TM ${INDIAN_OFFICER_NAMES[(index + 7) % INDIAN_OFFICER_NAMES.length]}`,
  };
  const rm = {
    empCode: `RM-${String(index % 120).padStart(4, '0')}`,
    name: `RM ${INDIAN_OFFICER_NAMES[(index + 13) % INDIAN_OFFICER_NAMES.length]}`,
  };
  const zm = {
    empCode: `ZM-${String(index % 40).padStart(3, '0')}`,
    name: `ZM ${INDIAN_OFFICER_NAMES[(index + 19) % INDIAN_OFFICER_NAMES.length]}`,
  };
  const buHead = {
    empCode: `BUH-${String(index % 12).padStart(3, '0')}`,
    name: `BU Head ${INDIAN_OFFICER_NAMES[(index + 23) % INDIAN_OFFICER_NAMES.length]}`,
  };
  const rdm = {
    empCode: `RDM-${String(index % 50).padStart(3, '0')}`,
    name: `RDM ${INDIAN_OFFICER_NAMES[(index + 29) % INDIAN_OFFICER_NAMES.length]}`,
  };
  return { fda, tm, rm, zm, buHead, rdm };
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

    // BU → Zone (state combo) → Territory (tehsil)
    const { bu, zone, territory, state } = pickHierarchy(i);
    const language = LANGUAGES[i % LANGUAGES.length];
    const village = INDIAN_VILLAGES[i % INDIAN_VILLAGES.length];
    
    const activityCrops = CROPS
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 4));
    const activityProducts = PRODUCTS
      .sort(() => Math.random() - 0.5)
      .slice(0, 1 + Math.floor(Math.random() * 3));

    const hierarchy = generateFieldSalesHierarchy(i);
    const officerName = hierarchy.fda.name;
    const officerId = hierarchy.fda.empCode;

    const activity = {
      activityId: `FFA-ACT-${1000 + i}`,
      type: ACTIVITY_TYPES[i % ACTIVITY_TYPES.length],
      date: formatDDMMYYYY(activityDate),
      officerId: officerId,
      officerName: officerName,
      location: `${village}, ${territory}`,
      territory: territory,
      state: state,
      territoryName: territory,
      zoneName: zone,
      buName: bu,
      tmEmpCode: hierarchy.tm.empCode,
      tmName: hierarchy.tm.name,
      fieldSalesHierarchy: hierarchy,
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
        location: `${village}, ${territory}, ${state}`,
        // preferredLanguage: language, // REMOVED - will be derived from state in backend
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

/** EMS GET /api/ffa/master-data response shape (for TypeScript) */
interface EMSMasterDataResponse {
  success?: boolean;
  data?: {
    crops?: unknown[];
    products?: unknown[];
  };
}

/**
 * Fetch active crops and products from EMS backend (Option A).
 * Set EMS_API_URL and FFA_MASTER_KEY so FFA (mock or real) uses current masters.
 */
async function fetchMastersFromEMS(): Promise<{ crops: string[]; products: string[] } | null> {
  const emsUrl = (process.env.EMS_API_URL || '').trim();
  const masterKey = (process.env.FFA_MASTER_KEY || '').trim();
  if (!emsUrl || !masterKey) {
    return null;
  }
  const base = emsUrl.replace(/\/$/, '');
  const url = `${base}/api/ffa/master-data`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { 'X-FFA-Master-Key': masterKey },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn(`[Mock FFA] EMS master-data returned ${res.status}, using fallback crops/products`);
      return null;
    }
    const data = (await res.json()) as EMSMasterDataResponse;
    if (!data?.success || !data?.data) {
      console.warn('[Mock FFA] EMS master-data invalid response, using fallback');
      return null;
    }
    const crops = Array.isArray(data.data.crops) ? data.data.crops.map((c: unknown) => String(c).trim()).filter(Boolean) : [];
    const products = Array.isArray(data.data.products) ? data.data.products.map((p: unknown) => String(p).trim()).filter(Boolean) : [];
    if (crops.length === 0 || products.length === 0) {
      console.warn('[Mock FFA] EMS returned empty crops or products, using fallback');
      return null;
    }
    return { crops, products };
  } catch (err) {
    console.warn('[Mock FFA] Failed to fetch masters from EMS:', (err as Error).message, '– using fallback crops/products');
    return null;
  }
}

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
    const dateFromDate = parseDateParam(dateFrom);
    if (!dateFromDate) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid dateFrom. Use DD/MM/YYYY (recommended) or YYYY-MM-DD.' },
      });
    }
    filteredActivities = mockActivities.filter((activity) => {
      const activityDate = parseDateParam(activity.date);
      if (!activityDate) return false;
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

// Start server: fetch masters from EMS (if configured), then generate data and listen
async function startServer() {
  const masters = await fetchMastersFromEMS();
  if (masters) {
    CROPS = masters.crops;
    PRODUCTS = masters.products;
    console.log(`✅ Loaded masters from EMS: ${CROPS.length} crops, ${PRODUCTS.length} products`);
  } else {
    console.log(`📋 Using fallback crops/products (set EMS_API_URL + FFA_MASTER_KEY to use EMS masters)`);
  }
  generateSampleData();
  app.listen(PORT, () => {
    console.log(`🚀 Mock FFA API running on port ${PORT}`);
    console.log(`📊 Sample data: ${mockActivities.length} activities, ${mockFarmers.length} farmers`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Mock FFA API:', err);
  process.exit(1);
});
