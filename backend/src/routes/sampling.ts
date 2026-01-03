import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { sampleAndCreateTasks, sampleAllActivities } from '../services/samplingService.js';
import { SamplingAudit } from '../models/SamplingAudit.js';
import { Activity } from '../models/Activity.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// @route   POST /api/sampling/execute
// @desc    Manually trigger sampling for an activity (MIS Admin only)
// @access  Private (MIS Admin)
router.post(
  '/execute',
  requirePermission('config.sampling'),
  [
    body('activityId').isMongoId().withMessage('Valid activity ID is required'),
    body('samplingPercentage').optional().isFloat({ min: 1, max: 100 }).withMessage('Percentage must be between 1 and 100'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', errors: errors.array() },
        });
      }

      const { activityId, samplingPercentage } = req.body;

      logger.info(`Manual sampling triggered for activity ${activityId}`);

      const result = await sampleAndCreateTasks(activityId, samplingPercentage);

      res.json({
        success: true,
        message: 'Sampling completed successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/sampling/execute-all
// @desc    Sample all unsampled activities (MIS Admin only)
// @access  Private (MIS Admin)
router.post(
  '/execute-all',
  requirePermission('config.sampling'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info('Batch sampling triggered for all unsampled activities');

      const result = await sampleAllActivities();

      res.json({
        success: true,
        message: 'Batch sampling completed',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/sampling/config
// @desc    Get sampling configuration
// @access  Private (MIS Admin)
router.get(
  '/config',
  requirePermission('config.sampling'),
  (req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        defaultPercentage: 7,
        activityTypePercentages: {
          'Field Day': 10,
          'Group Meeting': 8,
          'Demo Visit': 6,
          'OFM': 5,
        },
        coolingPeriodDays: 30,
      },
    });
  }
);

// @route   GET /api/sampling/audit
// @desc    Get sampling audit logs
// @access  Private (MIS Admin)
router.get(
  '/audit',
  requirePermission('config.sampling'),
  [
    query('activityId').optional().isMongoId(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', errors: errors.array() },
        });
      }

      const { activityId, page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const query: any = {};
      if (activityId) {
        query.activityId = activityId;
      }

      const audits = await SamplingAudit.find(query)
        .populate('activityId', 'type date location territory')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await SamplingAudit.countDocuments(query);

      res.json({
        success: true,
        data: {
          audits,
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

export default router;

