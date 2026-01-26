import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI;
    
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Connection pool configuration optimized for 25-30 agents, 4000-5000 activities/day
    const options: mongoose.ConnectOptions = {
      maxPoolSize: 50,            // Maximum number of connections in the pool
      minPoolSize: 10,            // Keep warm connections ready (increased from 5)
      maxIdleTimeMS: 30000,       // Close idle connections after 30 seconds
      socketTimeoutMS: 45000,     // Close sockets after 45 seconds of inactivity
      serverSelectionTimeoutMS: 5000, // Fail fast if server not available
      heartbeatFrequencyMS: 10000,    // Check server health every 10 seconds
      retryWrites: true,          // Retry failed writes automatically
      retryReads: true,           // Retry failed reads automatically
      w: 'majority' as const,     // Write concern for data durability
    };

    await mongoose.connect(mongoURI, options);

    console.log('✅ MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

export default connectDB;


