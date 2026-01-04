import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult, query } from 'express-validator';
import { CallTask, ICallLog, TaskStatus } from '../models/CallTask.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireRole, requirePermission } from '../middleware/rbac.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  getNextTaskForAgent,
  getPendingTasks,
  getTeamTasks,
  assignTaskToAgent,
  updateTaskStatus,
} from '../services/taskService.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// @route   GET /api/tasks/active
// @desc    Get next assigned task for CC Agent
// @access  Private (CC Agent only)
router.get(
  '/active',
  requirePermission('tasks.view.own'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const agentId = authReq.user._id.toString();
      const task = await getNextTaskForAgent(agentId);

      if (!task) {
        return res.json({
          success: true,
          data: { task: null, message: 'No pending tasks available' },
        });
      }

      // Update status to in_progress
      await updateTaskStatus(task._id.toString(), 'in_progress');

      // Ensure activity data includes crops and products
      const activity = task.activityId as any;
      const activityData = activity ? {
        type: activity.type || 'Unknown',
        date: activity.date || new Date(),
        officerName: activity.officerName || 'Unknown',
        location: activity.location || 'Unknown',
        territory: activity.territory || 'Unknown',
        crops: Array.isArray(activity.crops) ? activity.crops : (activity.crops ? [activity.crops] : []),
        products: Array.isArray(activity.products) ? activity.products : (activity.products ? [activity.products] : []),
      } : null;

      // Debug logging
      logger.info('Activity data in API response', {
        hasActivity: !!activity,
        crops: activity?.crops,
        products: activity?.products,
        cropsType: typeof activity?.crops,
        cropsIsArray: Array.isArray(activity?.crops),
      });

      res.json({
        success: true,
        data: {
          taskId: task._id,
          farmer: task.farmerId,
          activity: activityData,
          status: task.status,
          scheduledDate: task.scheduledDate,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/tasks/pending
// @desc    List pending tasks (Team Lead/Admin)
// @access  Private (Team Lead, MIS Admin)
router.get(
  '/pending',
  requirePermission('tasks.view.team'),
  [
    query('agentId').optional().isMongoId(),
    query('territory').optional().isString(),
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

      const { agentId, territory, page, limit } = req.query;

      const result = await getPendingTasks({
        agentId: agentId as string,
        territory: territory as string,
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

// @route   GET /api/tasks/team
// @desc    List team tasks (Team Lead)
// @access  Private (Team Lead)
router.get(
  '/team',
  requirePermission('tasks.view.team'),
  [
    query('status').optional().isIn(['pending', 'in_progress', 'completed', 'not_reachable', 'invalid_number']),
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

      const authReq = req as AuthRequest;
      const teamLeadId = authReq.user._id.toString();
      const { status, page, limit } = req.query;

      const result = await getTeamTasks(teamLeadId, {
        status: status as TaskStatus,
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

// @route   GET /api/tasks/:id
// @desc    Get task by ID
// @access  Private
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const taskId = req.params.id;
      const userId = authReq.user._id.toString();
      const userRole = authReq.user.role;

      const task = await CallTask.findById(taskId)
        .populate('farmerId')
        .populate('activityId')
        .populate('assignedAgentId', 'name email employeeId');

      if (!task) {
        const error: AppError = new Error('Task not found');
        error.statusCode = 404;
        throw error;
      }

      // Check permissions: CC Agent can only view own tasks
      if (userRole === 'cc_agent' && task.assignedAgentId.toString() !== userId) {
        const error: AppError = new Error('Access denied');
        error.statusCode = 403;
        throw error;
      }

      res.json({
        success: true,
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/tasks/:id/submit
// @desc    Submit call interaction (CC Agent)
// @access  Private (CC Agent only)
router.post(
  '/:id/submit',
  requirePermission('tasks.submit'),
  [
    body('callStatus').isIn(['Connected', 'Disconnected', 'Not Reachable', 'Invalid Number']).withMessage('Invalid call status'),
    body('didAttend').optional().isBoolean(),
    body('didRecall').optional().isBoolean(),
    body('cropsDiscussed').optional().isArray(),
    body('productsDiscussed').optional().isArray(),
    body('hasPurchased').optional().isBoolean(),
    body('willingToPurchase').optional().isBoolean(),
    body('nonPurchaseReason').optional().isString(),
    body('agentObservations').optional().isString(),
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

      const authReq = req as AuthRequest;
      const taskId = req.params.id;
      const agentId = authReq.user._id.toString();

      const task = await CallTask.findById(taskId);
      if (!task) {
        const error: AppError = new Error('Task not found');
        error.statusCode = 404;
        throw error;
      }

      // Verify task is assigned to this agent
      if (task.assignedAgentId.toString() !== agentId) {
        const error: AppError = new Error('Task not assigned to you');
        error.statusCode = 403;
        throw error;
      }

      // Create call log
      const callLog: ICallLog = {
        timestamp: new Date(),
        callStatus: req.body.callStatus,
        didAttend: req.body.didAttend ?? null,
        didRecall: req.body.didRecall ?? null,
        cropsDiscussed: req.body.cropsDiscussed || [],
        productsDiscussed: req.body.productsDiscussed || [],
        hasPurchased: req.body.hasPurchased ?? null,
        willingToPurchase: req.body.willingToPurchase ?? null,
        nonPurchaseReason: req.body.nonPurchaseReason || '',
        agentObservations: req.body.agentObservations || '',
      };

      // Update task with call log
      task.callLog = callLog;

      // Determine final status based on call status
      let finalStatus: TaskStatus = 'completed';
      if (req.body.callStatus === 'Not Reachable') {
        finalStatus = 'not_reachable';
      } else if (req.body.callStatus === 'Invalid Number') {
        finalStatus = 'invalid_number';
      }

      // Add to interaction history
      task.interactionHistory.push({
        timestamp: new Date(),
        status: task.status,
        notes: 'Call interaction submitted',
      });

      task.status = finalStatus;
      await task.save();

      logger.info(`Task ${taskId} submitted by agent ${authReq.user.email}`);

      res.json({
        success: true,
        message: 'Call interaction submitted successfully',
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }
);

// IMPORTANT: Bulk routes must come BEFORE parameterized routes (/:id/*) to avoid route conflicts
// @route   PUT /api/tasks/bulk/reassign
// @desc    Bulk reassign tasks to an agent
// @access  Private (Team Lead, MIS Admin)
router.put(
  '/bulk/reassign',
  requirePermission('tasks.reassign'),
  [
    body('taskIds').isArray().withMessage('taskIds must be an array'),
    body('taskIds.*').isMongoId().withMessage('Each task ID must be valid'),
    body('agentId').isMongoId().withMessage('Valid agent ID is required'),
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

      const { taskIds, agentId } = req.body;
      const results = [];
      const errors_list: any[] = [];

      for (const taskId of taskIds) {
        try {
          const task = await assignTaskToAgent(taskId, agentId);
          results.push(task);
        } catch (err: any) {
          errors_list.push({ taskId, error: err.message });
        }
      }

      res.json({
        success: true,
        message: `Reassigned ${results.length} of ${taskIds.length} tasks`,
        data: {
          successful: results.length,
          failed: errors_list.length,
          results,
          errors: errors_list,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/tasks/bulk/status
// @desc    Bulk update task status
// @access  Private (Team Lead, MIS Admin)
router.put(
  '/bulk/status',
  requirePermission('tasks.reassign'),
  [
    body('taskIds').isArray().withMessage('taskIds must be an array'),
    body('taskIds.*').isMongoId().withMessage('Each task ID must be valid'),
    body('status').isIn(['pending', 'in_progress', 'completed', 'not_reachable', 'invalid_number']).withMessage('Invalid status'),
    body('notes').optional().isString(),
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

      const { taskIds, status, notes } = req.body;
      const results = [];
      const errors_list: any[] = [];

      for (const taskId of taskIds) {
        try {
          const task = await updateTaskStatus(taskId, status, notes);
          results.push(task);
        } catch (err: any) {
          errors_list.push({ taskId, error: err.message });
        }
      }

      res.json({
        success: true,
        message: `Updated status for ${results.length} of ${taskIds.length} tasks`,
        data: {
          successful: results.length,
          failed: errors_list.length,
          results,
          errors: errors_list,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/tasks/:id/reassign
// @desc    Reassign task to another agent (Team Lead/Admin)
// @access  Private (Team Lead, MIS Admin)
router.put(
  '/:id/reassign',
  requirePermission('tasks.reassign'),
  [
    body('agentId').isMongoId().withMessage('Valid agent ID is required'),
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

      const taskId = req.params.id;
      const { agentId } = req.body;

      const task = await assignTaskToAgent(taskId, agentId);

      res.json({
        success: true,
        message: 'Task reassigned successfully',
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/tasks/:id/status
// @desc    Update task status
// @access  Private (Team Lead, MIS Admin)
router.put(
  '/:id/status',
  requirePermission('tasks.reassign'),
  [
    body('status').isIn(['pending', 'in_progress', 'completed', 'not_reachable', 'invalid_number']).withMessage('Invalid status'),
    body('notes').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const taskId = req.params.id;
      
      // CRITICAL: Prevent "bulk" from being treated as an ID - check BEFORE validation
      if (taskId === 'bulk' || taskId.toLowerCase() === 'bulk') {
        logger.error('Route conflict detected: /:id/status matched "bulk" instead of /bulk/status', {
          path: req.path,
          method: req.method,
          params: req.params,
        });
        const error: AppError = new Error('Invalid route: Use /bulk/status for bulk operations');
        error.statusCode = 400;
        throw error;
      }

      // Validate taskId is a valid MongoDB ObjectId format
      if (!/^[0-9a-fA-F]{24}$/.test(taskId)) {
        const error: AppError = new Error('Invalid task ID format');
        error.statusCode = 400;
        throw error;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', errors: errors.array() },
        });
      }
      
      const { status, notes } = req.body;

      const task = await updateTaskStatus(taskId, status, notes);

      res.json({
        success: true,
        message: 'Task status updated successfully',
        data: { task },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;

// Route fix deployed: Sun Jan  4 19:37:52 IST 2026

