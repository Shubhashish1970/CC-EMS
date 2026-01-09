import express, { Express, Request, Response } from 'express';
import cors from 'cors';

const app: Express = express();
// Cloud Run uses PORT 8080, local development uses 4000
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Mock data storage (in-memory, resets on server restart)
let mockActivities: any[] = [];
let mockFarmers: any[] = [];

// Generate sample data on startup
const generateSampleData = () => {
  const activityTypes = ['Field Day', 'Group Meeting', 'Demo Visit', 'OFM'];
  const locations = ['Guntur, AP', 'Bapatla Block', 'Vijayawada', 'Rajahmundry'];
  const territories = ['Andhra Pradesh', 'Telangana', 'Karnataka'];
  const languages = ['Hindi', 'Telugu', 'Marathi', 'Kannada', 'Tamil'];
  const crops = ['Paddy', 'Cotton', 'Chilli', 'Soybean', 'Maize', 'Wheat', 'Sugarcane'];
  const products = ['Nagarjuna Urea', 'Specialty Fungicide', 'Bio-Stimulant X', 'Insecticide Pro', 'Root Booster'];
  const officers = ['Sandeep Kumar', 'Rajesh Patel', 'Priya Sharma', 'Amit Singh'];
  
  // Authentic Indian farmer names
  const indianFirstNames = [
    'Ramesh', 'Suresh', 'Kumar', 'Rajesh', 'Mohan', 'Srinivas', 'Venkatesh', 'Ravi', 'Krishna', 'Gopal',
    'Lakshmi', 'Padma', 'Saraswati', 'Kamala', 'Radha', 'Meera', 'Anjali', 'Priya', 'Sunita', 'Kavita',
    'Raman', 'Sundaram', 'Murugan', 'Arjun', 'Vikram', 'Siddharth', 'Amit', 'Rohit', 'Nikhil', 'Aditya',
    'Geeta', 'Sita', 'Uma', 'Shanti', 'Devi', 'Parvati', 'Durga', 'Kali', 'Ganga', 'Yamuna',
    'Babu', 'Raju', 'Mallesh', 'Nagesh', 'Suresh', 'Mahesh', 'Ganesh', 'Shankar', 'Narayan', 'Hari',
    'Manjula', 'Pushpa', 'Latha', 'Rekha', 'Shobha', 'Usha', 'Asha', 'Neeta', 'Seeta', 'Leela'
  ];
  
  const indianSurnames = [
    'Rao', 'Reddy', 'Naidu', 'Goud', 'Patel', 'Sharma', 'Kumar', 'Singh', 'Yadav', 'Kumar',
    'Nair', 'Menon', 'Pillai', 'Krishnan', 'Iyer', 'Iyengar', 'Gowda', 'Shetty', 'Hegde', 'Bhat',
    'Joshi', 'Desai', 'Mehta', 'Shah', 'Agarwal', 'Gupta', 'Jain', 'Verma', 'Malhotra', 'Kapoor',
    'Murthy', 'Swamy', 'Acharya', 'Prasad', 'Das', 'Bose', 'Banerjee', 'Chatterjee', 'Mukherjee', 'Ghosh',
    'Khan', 'Ahmed', 'Ali', 'Hussain', 'Malik', 'Sheikh', 'Ansari', 'Qureshi', 'Rahman', 'Hasan'
  ];
  
  // Function to generate random Indian farmer name
  const getRandomIndianName = () => {
    const firstName = indianFirstNames[Math.floor(Math.random() * indianFirstNames.length)];
    const surname = indianSurnames[Math.floor(Math.random() * indianSurnames.length)];
    return `${firstName} ${surname}`;
  };

  // Generate 5 sample activities
  for (let i = 1; i <= 5; i++) {
    const activityDate = new Date();
    activityDate.setDate(activityDate.getDate() - (i * 7)); // Activities from past weeks

    // Generate random crops and products for this activity (2-4 crops, 2-3 products)
    const activityCrops = crops
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 3));
    const activityProducts = products
      .sort(() => Math.random() - 0.5)
      .slice(0, 2 + Math.floor(Math.random() * 2));

    const activity = {
      activityId: `FFA-ACT-${1000 + i}`,
      type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
      date: activityDate.toISOString().split('T')[0],
      officerId: `OFF-${i}`,
      officerName: officers[Math.floor(Math.random() * officers.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      territory: territories[Math.floor(Math.random() * territories.length)],
      crops: activityCrops,
      products: activityProducts,
      farmers: [] as any[],
    };

    // Generate 10-20 farmers per activity
    const farmerCount = 10 + Math.floor(Math.random() * 11);
    for (let j = 1; j <= farmerCount; j++) {
      const farmerName = getRandomIndianName();
      // Generate photo URL using UI Avatars service (placeholder avatars based on name)
      // Format: https://ui-avatars.com/api/?name=NAME&size=128&background=random&color=fff&bold=true
      const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(farmerName)}&size=128&background=${Math.floor(Math.random() * 16777215).toString(16)}&color=fff&bold=true&format=png`;
      
      const farmer = {
        farmerId: `FFA-FARM-${i}-${j}`,
        name: farmerName,
        mobileNumber: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
        location: activity.location,
        preferredLanguage: languages[Math.floor(Math.random() * languages.length)],
        territory: activity.territory,
        crops: [crops[Math.floor(Math.random() * crops.length)]],
        photoUrl: photoUrl,
      };
      activity.farmers.push(farmer);
      mockFarmers.push(farmer);
    }

    mockActivities.push(activity);
  }
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
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const activities = mockActivities.slice(skip, skip + Number(limit));

  res.json({
    success: true,
    data: {
      activities,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: mockActivities.length,
        pages: Math.ceil(mockActivities.length / Number(limit)),
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
