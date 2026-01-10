import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import logger from './config/logger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

// Load environment variables
// Testing deployment after adding Cloud Build Editor role
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : [
      'http://localhost:3000',
      'https://cc-ems-dev.web.app',
      'https://cc-ems-dev.firebaseapp.com',
    ];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EMS Call Centre API is running',
    timestamp: new Date().toISOString(),
  });
});

// Database health check
app.get('/api/health/database', async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const isConnected = mongoose.default.connection.readyState === 1;
    
    res.json({
      success: isConnected,
      message: isConnected ? 'Database connected' : 'Database disconnected',
      readyState: mongoose.default.connection.readyState,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Debug endpoint: Check if admin user exists (public, for debugging)
app.get('/api/debug/admin-exists', async (req, res) => {
  try {
    const mongoose = await import('mongoose');
    const { User } = await import('./models/User.js');
    
    const isConnected = mongoose.default.connection.readyState === 1;
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        message: 'Database not connected',
        readyState: mongoose.default.connection.readyState,
      });
    }

    // Try multiple email variations
    const emailVariations = ['shubhashish@kweka.ai', 'Shubhashish@kweka.ai', 'SHUBHASHISH@KWEKA.AI'];
    let admin = null;
    let matchedEmail = null;

    for (const email of emailVariations) {
      admin = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
      if (admin) {
        matchedEmail = email;
        break;
      }
    }

    const userCount = await User.countDocuments();
    
    // Test password comparison if user exists
    let passwordTestResult = null;
    if (admin && admin.password) {
      try {
        const { comparePassword } = await import('./utils/password.js');
        const testPassword = 'Admin@123';
        const passwordMatch = await comparePassword(testPassword, admin.password);
        passwordTestResult = {
          testPassword: testPassword,
          passwordExists: !!admin.password,
          passwordLength: admin.password?.length || 0,
          passwordStartsWith: admin.password?.substring(0, 10) || 'N/A',
          passwordHashFormat: admin.password.startsWith('$2') ? 'bcrypt' : 'unknown',
          passwordMatch: passwordMatch,
        };
      } catch (error) {
        passwordTestResult = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    } else if (admin && !admin.password) {
      passwordTestResult = {
        error: 'User exists but password field is missing or null',
      };
    }
    
    res.json({
      success: true,
      data: {
        adminExists: !!admin,
        matchedEmail: matchedEmail,
        totalUsers: userCount,
        adminDetails: admin ? {
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
          employeeId: admin.employeeId,
        } : null,
        passwordTest: passwordTestResult,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Debug check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
    });
  }
});

// Password reset endpoint (protected with secret token)
app.post('/api/debug/reset-admin-password', async (req, res) => {
  try {
    // Check for secret token in header
    const secretToken = req.headers['x-seed-token'];
    const expectedToken = process.env.ADMIN_SEED_TOKEN || 'change-this-secret-token';
    
    if (secretToken !== expectedToken) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const mongoose = await import('mongoose');
    const { User } = await import('./models/User.js');
    const { hashPassword } = await import('./utils/password.js');
    
    const isConnected = mongoose.default.connection.readyState === 1;
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: { message: 'Database not connected' },
      });
    }

    // Find admin user
    const admin = await User.findOne({ email: 'shubhashish@kweka.ai' }).select('+password');
    if (!admin) {
      return res.status(404).json({
        success: false,
        error: { message: 'Admin user not found' },
      });
    }

    // Reset password to Admin@123
    const newPassword = req.body.password || 'Admin@123';
    const hashedPassword = await hashPassword(newPassword);
    
    admin.password = hashedPassword;
    await admin.save();
    
    logger.info(`✅ Admin user password reset via debug endpoint`);

    res.json({
      success: true,
      message: 'Admin password reset successfully',
      data: {
        email: admin.email,
        password: newPassword === 'Admin@123' ? 'Admin@123' : '[CUSTOM]',
      },
    });
  } catch (error) {
    logger.error('Error resetting admin password:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to reset admin password',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// Test email endpoint (protected with secret token)
app.post('/api/debug/test-email', async (req, res) => {
  try {
    // Check for secret token in header
    const secretToken = req.headers['x-seed-token'];
    const expectedToken = process.env.ADMIN_SEED_TOKEN || 'change-this-secret-token';
    
    if (secretToken !== expectedToken) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const { to } = req.body;
    if (!to) {
      return res.status(400).json({
        success: false,
        error: { message: 'Email address (to) is required' },
      });
    }

    const { sendEmail, generatePasswordResetEmail } = await import('./utils/email.js');
    
    // Generate a test token
    const testToken = 'test-token-' + Date.now();
    const emailContent = generatePasswordResetEmail(testToken, 'Test User');
    
    const emailSent = await sendEmail({
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (emailSent) {
      res.json({
        success: true,
        message: `Test email sent successfully to ${to}`,
        data: {
          to,
          resendKeyPresent: !!process.env.RESEND_KEY,
          resendKeyLength: process.env.RESEND_KEY?.length || 0,
          emailFrom: process.env.EMAIL_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev',
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to send test email',
          details: {
            to,
            resendKeyPresent: !!process.env.RESEND_KEY,
            emailFrom: process.env.EMAIL_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev',
          },
        },
      });
    }
  } catch (error) {
    logger.error('Error in test-email:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// Admin seed endpoint (protected with secret token)
app.post('/api/debug/seed-admin', async (req, res) => {
  try {
    // Check for secret token in header
    const secretToken = req.headers['x-seed-token'];
    const expectedToken = process.env.ADMIN_SEED_TOKEN || 'change-this-secret-token';
    
    if (secretToken !== expectedToken) {
      return res.status(401).json({
        success: false,
        error: { message: 'Unauthorized' },
      });
    }

    const mongoose = await import('mongoose');
    const { User } = await import('./models/User.js');
    const { hashPassword } = await import('./utils/password.js');
    
    const isConnected = mongoose.default.connection.readyState === 1;
    if (!isConnected) {
      return res.status(503).json({
        success: false,
        error: { message: 'Database not connected' },
      });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'shubhashish@kweka.ai' });
    if (existingAdmin) {
      return res.json({
        success: true,
        message: 'Admin user already exists',
        data: {
          email: existingAdmin.email,
          role: existingAdmin.role,
          isActive: existingAdmin.isActive,
        },
      });
    }

    // Create admin user
    const hashedPassword = await hashPassword('Admin@123');
    
    const admin = new User({
      name: 'System Administrator',
      email: 'shubhashish@kweka.ai',
      password: hashedPassword,
      employeeId: 'ADMIN001',
      role: 'mis_admin',
      languageCapabilities: ['Hindi', 'English', 'Telugu', 'Marathi', 'Kannada', 'Tamil'],
      assignedTerritories: [],
      isActive: true,
    });

    await admin.save();
    
    logger.info('✅ Admin user created via seed endpoint');

    res.json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    logger.error('Error seeding admin user:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to seed admin user',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

// API routes
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import ffaRoutes from './routes/ffa.js';
import samplingRoutes from './routes/sampling.js';
import masterDataRoutes from './routes/masterData.js';
import adminRoutes from './routes/admin.js';
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/ffa', ffaRoutes);
app.use('/api/sampling', samplingRoutes);
app.use('/api/master-data', masterDataRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use(notFound);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Setup cron jobs (only in production or if enabled)
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_CRON === 'true') {
      const { setupCronJobs } = await import('./config/cron.js');
      setupCronJobs();
    }

    // Start Express server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

