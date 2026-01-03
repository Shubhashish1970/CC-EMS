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
      logger.info('Manual FFA sync triggered');
      
      const result = await syncFFAData();

      res.json({
        success: true,
        message: 'FFA sync completed',
        data: result,
      });
    } catch (error) {
      next(error);
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

