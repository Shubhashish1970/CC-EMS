import express, { Request, Response, NextFunction } from 'express';
import { query, param, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  getActivitiesWithSampling,
  getAgentQueues,
  getAgentQueue,
} from '../services/adminService.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes require authentication and MIS Admin role
router.use(authenticate);
router.use(requireRole('mis_admin'));

/**
 * @route   GET /api/admin/activities-sampling
 * @desc    Get all activities with sampling status and assigned agents
 * @access  Private (MIS Admin only)
 */
router.get(
  '/activities-sampling',
  [
    query('activityType').optional().isString(),
    query('territory').optional().isString(),
    query('zone').optional().isString(),
    query('bu').optional().isString(),
    query('samplingStatus').optional().isIn(['sampled', 'not_sampled', 'partial']),
    query('dateFrom').optional().isISO8601().toDate(),
    query('dateTo').optional().isISO8601().toDate(),
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

      const {
        activityType,
        territory,
        zone,
        bu,
        samplingStatus,
        dateFrom,
        dateTo,
        page,
        limit,
      } = req.query;

      // Convert date strings to Date objects if provided
      const dateFromParsed = dateFrom ? new Date(dateFrom as string) : undefined;
      const dateToParsed = dateTo ? new Date(dateTo as string) : undefined;

      const result = await getActivitiesWithSampling({
        activityType: activityType as string,
        territory: territory as string,
        zone: zone as string,
        bu: bu as string,
        samplingStatus: samplingStatus as 'sampled' | 'not_sampled' | 'partial',
        dateFrom: dateFromParsed,
        dateTo: dateToParsed,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/admin/agent-queues
 * @desc    Get task queues for all agents with status breakdown
 * @access  Private (MIS Admin only)
 */
router.get(
  '/agent-queues',
  [
    query('agentId').optional().isMongoId(),
    query('isActive').optional().isBoolean(),
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

      const { agentId, isActive } = req.query;

      const result = await getAgentQueues({
        agentId: agentId as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   GET /api/admin/agent-queues/:agentId
 * @desc    Get detailed queue for a specific agent
 * @access  Private (MIS Admin only)
 */
router.get(
  '/agent-queues/:agentId',
  [param('agentId').isMongoId().withMessage('Invalid agent ID')],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', errors: errors.array() },
        });
      }

      const { agentId } = req.params;

      const result = await getAgentQueue(agentId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

