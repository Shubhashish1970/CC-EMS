import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../config/logger.js';

const router = express.Router();

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            errors: errors.array(),
          },
        });
      }

      let { email, password } = req.body;

      // Normalize email (lowercase and trim)
      email = email.toLowerCase().trim();

      // Check database connection before querying
      const mongoose = await import('mongoose');
      const dbState = mongoose.default.connection.readyState;
      if (dbState !== 1) {
        logger.error(`Database not connected. ReadyState: ${dbState} (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)`);
        const error: AppError = new Error('Database connection error. Please try again later.');
        error.statusCode = 503;
        throw error;
      }

      logger.info(`Login attempt for email: ${email}`);

      // Find user by email (include password field) - email is already lowercase in DB
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        logger.warn(`Login failed: User not found for email: ${email}`);
        // Check if any users exist at all (for debugging)
        const userCount = await User.countDocuments();
        logger.info(`Total users in database: ${userCount}`);
        const error: AppError = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      logger.info(`User found: ${user.email} (ID: ${user._id}, Role: ${user.role}, Active: ${user.isActive})`);

      if (!user.isActive) {
        const error: AppError = new Error('Account is inactive');
        error.statusCode = 401;
        throw error;
      }

      // Check password
      if (!user.password) {
        logger.error(`User ${user.email} exists but password field is missing or null`);
        const error: AppError = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      logger.info(`Password field exists: ${!!user.password}, Length: ${user.password.length}, Starts with: ${user.password.substring(0, 10)}`);
      
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        logger.warn(`Password mismatch for user: ${user.email}. Password provided: [REDACTED], Hash length: ${user.password.length}`);
        // Check if password hash format is correct
        if (!user.password.startsWith('$2')) {
          logger.error(`Password hash for user ${user.email} is not in bcrypt format!`);
        }
        const error: AppError = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      logger.info(`Password verified successfully for user: ${user.email}`);

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate token
      const token = generateToken(user);

      logger.info(`User logged in: ${user.email} (${user.role})`);

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            employeeId: user.employeeId,
            languageCapabilities: user.languageCapabilities,
            assignedTerritories: user.assignedTerritories,
          },
        },
      });
    } catch (error) {
      // Enhanced error logging for debugging
      if (error instanceof Error) {
        if (error.name === 'MongoNetworkError' || error.message.includes('MongoServerError')) {
          logger.error(`Database connection error during login: ${error.message}`, { stack: error.stack });
          const dbError: AppError = new Error('Database connection error. Please try again later.');
          dbError.statusCode = 503;
          return next(dbError);
        }
        logger.error(`Login error for ${req.body.email}: ${error.message}`, { stack: error.stack });
      }
      next(error);
    }
  }
);

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticate, (req: Request, res: Response) => {
  logger.info(`User logged out: ${req.user?.email}`);
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      const error: AppError = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          employeeId: user.employeeId,
          languageCapabilities: user.languageCapabilities,
          assignedTerritories: user.assignedTerritories,
          teamLeadId: user.teamLeadId,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;


