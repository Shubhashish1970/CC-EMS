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

      const { email, password } = req.body;

      // Find user by email (include password field)
      const user = await User.findOne({ email }).select('+password');

      if (!user) {
        const error: AppError = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      if (!user.isActive) {
        const error: AppError = new Error('Account is inactive');
        error.statusCode = 401;
        throw error;
      }

      // Check password
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        const error: AppError = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

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

