import express, { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { syncFFAData, getSyncStatus } from '../services/ffaSync.js';
import { Activity } from '../models/Activity.js';
import { Farmer } from '../models/Farmer.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// @route   POST /api/ffa/sync
// @desc    Manually trigger FFA sync (MIS Admin only)
// @access  Private (MIS Admin)
router.post(
  '/sync',
  requirePermission('config.ffa'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ffaApiUrl = process.env.FFA_API_URL || 'http://localhost:4000/api';
      logger.info('Manual FFA sync triggered', {
        userId: (req as any).user?.id,
        userEmail: (req as any).user?.email,
        ffaApiUrl: ffaApiUrl,
        hasEnvVar: !!process.env.FFA_API_URL,
      });
      
      const result = await syncFFAData();

      res.json({
        success: true,
        message: `FFA sync completed: ${result.activitiesSynced} activities, ${result.farmersSynced} farmers synced${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`,
        data: result,
      });
    } catch (error) {
      const ffaApiUrl = process.env.FFA_API_URL || 'http://localhost:4000/api';
      logger.error('FFA sync endpoint error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ffaApiUrl: ffaApiUrl,
        hasEnvVar: !!process.env.FFA_API_URL,
        errorType: error instanceof Error ? error.constructor.name : typeof error,
      });
      
      // Provide more detailed error information
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during FFA sync';
      const statusCode = errorMessage.includes('Cannot connect') || errorMessage.includes('timeout') ? 503 : 500;
      
      res.status(statusCode).json({
        success: false,
        message: `FFA sync failed: ${errorMessage}`,
        error: errorMessage,
        details: {
          ffaApiUrl: ffaApiUrl,
          hasEnvVar: !!process.env.FFA_API_URL,
        },
      });
    }
  }
);

// @route   GET /api/ffa/status
// @desc    Get FFA sync status
// @access  Private (MIS Admin)
router.get(
  '/status',
  requirePermission('config.ffa'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = await getSyncStatus();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/ffa/activities
// @desc    List synced activities
// @access  Private (MIS Admin)
router.get(
  '/activities',
  requirePermission('config.ffa'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const activities = await Activity.find()
        .populate('farmerIds', 'name mobileNumber location')
        .sort({ syncedAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Activity.countDocuments();

      res.json({
        success: true,
        data: {
          activities,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/ffa/farmers
// @desc    List synced farmers
// @access  Private (MIS Admin)
router.get(
  '/farmers',
  requirePermission('config.ffa'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 50 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const farmers = await Farmer.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Farmer.countDocuments();

      res.json({
        success: true,
        data: {
          farmers,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit)),
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/ffa/reset
// @desc    Clear all synced FFA data (for development/testing)
// @access  Private (MIS Admin)
router.post(
  '/reset',
  requirePermission('config.ffa'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info('Clearing all FFA data...');
      
      const farmerResult = await Farmer.deleteMany({});
      const activityResult = await Activity.deleteMany({});
      
      logger.info(`Cleared ${farmerResult.deletedCount} farmers and ${activityResult.deletedCount} activities`);

      res.json({
        success: true,
        message: 'FFA data cleared successfully',
        data: {
          farmersDeleted: farmerResult.deletedCount,
          activitiesDeleted: activityResult.deletedCount,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

