import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult, query } from 'express-validator';
import { CallTask, ICallLog, TaskStatus } from '../models/CallTask.js';
import { User } from '../models/User.js';
import { Farmer } from '../models/Farmer.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireRole, requirePermission } from '../middleware/rbac.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  getNextTaskForAgent,
  getAvailableTasksForAgent,
  getPendingTasks,
  getTeamTasks,
  getUnassignedTasks,
  assignTaskToAgent,
  updateTaskStatus,
} from '../services/taskService.js';
import logger from '../config/logger.js';
import mongoose from 'mongoose';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Middleware to log route matching for debugging
router.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/bulk/')) {
    logger.info('Route matched (bulk):', { 
      method: req.method, 
      path: req.path, 
      originalUrl: req.originalUrl || req.url 
    });
  }
  next();
});

// @route   GET /api/tasks/available
// @desc    Get all available tasks for CC Agent (for selection)
// @access  Private (CC Agent only)
router.get(
  '/available',
  requirePermission('tasks.view.own'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const agentId = authReq.user._id.toString();
      const tasks = await getAvailableTasksForAgent(agentId);

      // Format tasks for response
      const formattedTasks = tasks.map((task) => {
        const farmer = task.farmerId as any;
        const activity = task.activityId as any;
        
        return {
          taskId: task._id.toString(),
          farmer: {
            name: farmer?.name || 'Unknown',
            mobileNumber: farmer?.mobileNumber || 'Unknown',
            location: farmer?.location || 'Unknown',
            preferredLanguage: farmer?.preferredLanguage || 'Unknown',
            photoUrl: farmer?.photoUrl,
          },
          activity: {
            type: activity?.type || 'Unknown',
            date: activity?.date || task.createdAt,
            // Agent-facing: FDA + TM + Territory + State
            officerName: activity?.officerName || 'Unknown', // FDA
            tmName: activity?.tmName || '',
            location: activity?.location || 'Unknown',
            territory: activity?.territoryName || activity?.territory || 'Unknown',
            state: activity?.state || '',
            crops: Array.isArray(activity?.crops) ? activity.crops : (activity?.crops ? [activity.crops] : []),
            products: Array.isArray(activity?.products) ? activity.products : (activity?.products ? [activity.products] : []),
          },
          status: task.status,
          scheduledDate: task.scheduledDate,
          createdAt: task.createdAt,
        };
      });

      res.json({
        success: true,
        data: {
          tasks: formattedTasks,
          count: formattedTasks.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/tasks/:id/load
// @desc    Load a specific task for CC Agent (sets status to in_progress)
// @access  Private (CC Agent only)
router.post(
  '/:id/load',
  requirePermission('tasks.view.own'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      const agentId = authReq.user._id.toString();
      const taskId = req.params.id;

      // Get and verify task
      const task = await CallTask.findById(taskId)
        .populate('farmerId', 'name location preferredLanguage mobileNumber photoUrl')
        .populate('activityId', 'type date officerName tmName location territory territoryName state crops products');

      if (!task) {
        const error: AppError = new Error('Task not found');
        error.statusCode = 404;
        throw error;
      }

      // Verify task is assigned to this agent
      if (!task.assignedAgentId || task.assignedAgentId.toString() !== agentId) {
        const error: AppError = new Error('Task not assigned to you');
        error.statusCode = 403;
        throw error;
      }

      // Verify task is available (sampled_in_queue or in_progress)
      if (task.status !== 'sampled_in_queue' && task.status !== 'in_progress') {
        const error: AppError = new Error('Task is not available to load');
        error.statusCode = 400;
        throw error;
      }

      // Update status to in_progress if it's sampled_in_queue
      if (task.status === 'sampled_in_queue') {
        await updateTaskStatus(taskId, 'in_progress', 'Task selected by agent');
        task.status = 'in_progress';
      }

      // Format activity data
      const activity = task.activityId as any;
      // State should come from Activity API v2; keep legacy fallback only if state missing.
      const territory = activity?.territoryName || activity?.territory || 'Unknown';
      const state = activity?.state || (territory !== 'Unknown' ? territory.replace(/\s+Zone$/, '').trim() : '');
      
      const activityData = activity ? {
        type: activity.type || 'Unknown',
        date: activity.date || new Date(),
        officerName: activity.officerName || 'Unknown',
        tmName: activity.tmName || '',
        location: activity.location || 'Unknown', // village
        territory: territory,
        state: state,
        crops: Array.isArray(activity.crops) ? activity.crops : (activity.crops ? [activity.crops] : []),
        products: Array.isArray(activity.products) ? activity.products : (activity.products ? [activity.products] : []),
      } : null;

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

// @route   GET /api/tasks/active
// @desc    Get next assigned task for CC Agent (legacy - for backward compatibility)
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
          data: { task: null, message: 'No tasks available in queue' },
        });
      }

      // Update status to in_progress
      await updateTaskStatus(task._id.toString(), 'in_progress', 'Task loaded by agent');

      // Ensure activity data includes crops and products
      const activity = task.activityId as any;
      // State should come from Activity API v2; keep legacy fallback only if state missing.
      const territory = activity?.territoryName || activity?.territory || 'Unknown';
      const state = activity?.state || (territory !== 'Unknown' ? territory.replace(/\s+Zone$/, '').trim() : '');
      
      const activityData = activity ? {
        type: activity.type || 'Unknown',
        date: activity.date || new Date(),
        officerName: activity.officerName || 'Unknown',
        tmName: activity.tmName || '',
        location: activity.location || 'Unknown', // village
        territory: territory,
        state: state,
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

      const { agentId, territory, dateFrom, dateTo, page, limit } = req.query;

      const result = await getPendingTasks({
        agentId: agentId as string,
        territory: territory as string,
        dateFrom: dateFrom ? (dateFrom as string) : undefined,
        dateTo: dateTo ? (dateTo as string) : undefined,
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
    query('status').optional().isIn(['unassigned', 'sampled_in_queue', 'in_progress', 'completed', 'not_reachable', 'invalid_number']),
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

      const authReq = req as AuthRequest;
      const teamLeadId = authReq.user._id.toString();
      const { status, dateFrom, dateTo, page, limit } = req.query;

      logger.info('📥 GET /api/tasks/team - Request received', {
        teamLeadId,
        queryParams: { status, dateFrom, dateTo, page, limit },
        statusType: typeof status,
        statusValue: status,
      });

      const result = await getTeamTasks(teamLeadId, {
        status: status ? (status as string).trim() as TaskStatus : undefined,
        dateFrom: dateFrom ? (dateFrom as string) : undefined,
        dateTo: dateTo ? (dateTo as string) : undefined,
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

// @route   GET /api/tasks/dashboard
// @desc    Task dashboard for Team Lead: unassigned by language + agent workload (sampled_in_queue/in_progress)
// @access  Private (Team Lead, MIS Admin)
router.get(
  '/dashboard',
  requirePermission('tasks.view.team'),
  [
    query('dateFrom').optional().isISO8601().toDate(),
    query('dateTo').optional().isISO8601().toDate(),
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
      const { dateFrom, dateTo } = req.query as any;

      const dateMatch: any = {};
      if (dateFrom || dateTo) {
        dateMatch.scheduledDate = {};
        if (dateFrom) {
          const d = new Date(dateFrom);
          d.setHours(0, 0, 0, 0);
          dateMatch.scheduledDate.$gte = d;
        }
        if (dateTo) {
          const d = new Date(dateTo);
          d.setHours(23, 59, 59, 999);
          dateMatch.scheduledDate.$lte = d;
        }
      }

      // Team agents (for workload summary)
      const agents = await User.find({
        teamLeadId: new mongoose.Types.ObjectId(teamLeadId),
        role: 'cc_agent',
        isActive: true,
      })
        .select('_id name email employeeId languageCapabilities')
        .sort({ name: 1 })
        .lean();

      const agentIds = agents.map((a) => a._id);

      // 1) Unassigned tasks by farmer preferredLanguage
      const byLanguageRaw = await CallTask.aggregate([
        { $match: { status: 'unassigned', ...dateMatch } },
        {
          $lookup: {
            from: Farmer.collection.name,
            localField: 'farmerId',
            foreignField: '_id',
            as: 'farmer',
          },
        },
        { $unwind: { path: '$farmer', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$farmer.preferredLanguage', 'Unknown'] },
            unassigned: { $sum: 1 },
          },
        },
        { $project: { _id: 0, language: '$_id', unassigned: 1 } },
      ]);

      // Stable order for language rows
      const languageOrder = ['Hindi', 'Telugu', 'Marathi', 'Kannada', 'Tamil', 'Bengali', 'Oriya', 'Malayalam', 'English', 'Unknown'];
      const languageRank = (l: string) => {
        const idx = languageOrder.indexOf(l);
        return idx === -1 ? 999 : idx;
      };

      const byLanguage = [...byLanguageRaw].sort((a: any, b: any) => {
        const ar = languageRank(a.language);
        const br = languageRank(b.language);
        if (ar !== br) return ar - br;
        return String(a.language).localeCompare(String(b.language));
      });

      const totalUnassigned = byLanguage.reduce((sum: number, r: any) => sum + (r.unassigned || 0), 0);

      // 2) Agent workload: sampled_in_queue + in_progress
      const workloadAgg = agentIds.length
        ? await CallTask.aggregate([
            {
              $match: {
                assignedAgentId: { $in: agentIds },
                status: { $in: ['sampled_in_queue', 'in_progress'] },
                ...dateMatch,
              },
            },
            {
              $group: {
                _id: { agentId: '$assignedAgentId', status: '$status' },
                count: { $sum: 1 },
              },
            },
          ])
        : [];

      const workloadMap = new Map<string, { sampled_in_queue: number; in_progress: number }>();
      for (const row of workloadAgg) {
        const agentId = row._id?.agentId?.toString();
        const status = row._id?.status as 'sampled_in_queue' | 'in_progress';
        if (!agentId) continue;
        const current = workloadMap.get(agentId) || { sampled_in_queue: 0, in_progress: 0 };
        current[status] = row.count || 0;
        workloadMap.set(agentId, current);
      }

      const agentWorkload = agents.map((a) => {
        const c = workloadMap.get(a._id.toString()) || { sampled_in_queue: 0, in_progress: 0 };
        return {
          agentId: a._id.toString(),
          name: a.name,
          email: a.email,
          employeeId: a.employeeId,
          languageCapabilities: Array.isArray((a as any).languageCapabilities) ? (a as any).languageCapabilities : [],
          sampledInQueue: c.sampled_in_queue,
          inProgress: c.in_progress,
          totalOpen: c.sampled_in_queue + c.in_progress,
        };
      });

      res.json({
        success: true,
        data: {
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          unassignedByLanguage: byLanguage,
          totals: {
            totalUnassigned,
          },
          agentWorkload,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/tasks/allocate
// @desc    Allocate unassigned tasks for a language to capable agents (round-robin); sets status to sampled_in_queue
// @access  Private (Team Lead, MIS Admin)
router.post(
  '/allocate',
  requirePermission('tasks.reassign'),
  [
    body('language').isString().notEmpty(),
    // count is optional: when omitted or 0, allocate all matching tasks (bounded by server cap)
    body('count').optional().isInt({ min: 0, max: 5000 }),
    body('dateFrom').optional().isISO8601().toDate(),
    body('dateTo').optional().isISO8601().toDate(),
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
      const { language, count, dateFrom, dateTo } = req.body as any;

      const normalize = (s: any) => String(s ?? '').trim().toLowerCase();
      const desired = normalize(language);
      const isAllLanguages = desired === 'all' || desired === '__all__';
      const serverCap = 5000;
      const requestedCountRaw = typeof count === 'number' ? count : Number(count);
      const requestedCount = Number.isFinite(requestedCountRaw) ? requestedCountRaw : 0; // 0 means "all"

      // Find active agents under this team lead (then do robust matching in code)
      const teamAgents = await User.find({
        teamLeadId: new mongoose.Types.ObjectId(teamLeadId),
        role: 'cc_agent',
        isActive: true,
      })
        .select('_id name email languageCapabilities')
        .sort({ name: 1 })
        .lean();

      const agentsByLanguage = new Map<string, any[]>();
      for (const a of teamAgents as any[]) {
        const caps: string[] = Array.isArray(a.languageCapabilities) ? a.languageCapabilities : [];
        for (const cap of caps) {
          const key = normalize(cap);
          if (!key) continue;
          const list = agentsByLanguage.get(key) || [];
          list.push(a);
          agentsByLanguage.set(key, list);
        }
      }

      const capableAgents = isAllLanguages ? teamAgents : (agentsByLanguage.get(desired) || []);
      if (!capableAgents.length) {
        return res.status(400).json({
          success: false,
          error: {
            message: `No active agents found under your team with language capability "${language}"`,
            details: {
              teamAgentsFound: teamAgents.length,
              teamAgents: teamAgents.map((a: any) => ({
                name: a.name,
                email: a.email,
                languageCapabilities: Array.isArray(a.languageCapabilities) ? a.languageCapabilities : [],
              })),
            },
          },
        });
      }

      const dateMatch: any = {};
      if (dateFrom || dateTo) {
        dateMatch.scheduledDate = {};
        if (dateFrom) {
          const d = new Date(dateFrom);
          d.setHours(0, 0, 0, 0);
          dateMatch.scheduledDate.$gte = d;
        }
        if (dateTo) {
          const d = new Date(dateTo);
          d.setHours(23, 59, 59, 999);
          dateMatch.scheduledDate.$lte = d;
        }
      }

      // Find unassigned tasks for farmers of this language
      const basePipeline: any[] = [
        { $match: { status: 'unassigned', ...dateMatch } },
        {
          $lookup: {
            from: Farmer.collection.name,
            localField: 'farmerId',
            foreignField: '_id',
            as: 'farmer',
          },
        },
        { $unwind: '$farmer' },
      ];

      const taskRows = await CallTask.aggregate([
        ...basePipeline,
        ...(isAllLanguages ? [] : [{ $match: { 'farmer.preferredLanguage': language } }]),
        { $sort: { scheduledDate: 1, createdAt: 1 } },
        { $limit: serverCap },
        { $project: { _id: 1, farmerLanguage: '$farmer.preferredLanguage' } },
      ]);

      if (!taskRows.length) {
        return res.json({
          success: true,
          message: isAllLanguages ? 'No unassigned tasks found' : 'No unassigned tasks found for this language',
          data: { requested: requestedCount, allocated: 0 },
        });
      }

      // If ALL: pick tasks in a fair way across languages (round-robin by language) up to requestedCount
      // If requestedCount is 0 => allocate all tasks (bounded by serverCap).
      let selectedTasks: Array<{ _id: any; farmerLanguage: string }> = [];

      if (!isAllLanguages) {
        selectedTasks = taskRows.map((r: any) => ({ _id: r._id, farmerLanguage: r.farmerLanguage }));
        if (requestedCount > 0) selectedTasks = selectedTasks.slice(0, requestedCount);
      } else {
        const buckets = new Map<string, Array<{ _id: any; farmerLanguage: string }>>();
        for (const r of taskRows as any[]) {
          const langKey = normalize(r.farmerLanguage) || 'unknown';
          const arr = buckets.get(langKey) || [];
          arr.push({ _id: r._id, farmerLanguage: r.farmerLanguage });
          buckets.set(langKey, arr);
        }

        const langs = Array.from(buckets.keys()).sort(); // stable ordering
        const target = requestedCount > 0 ? Math.min(requestedCount, serverCap) : serverCap;
        let added = 0;
        while (added < target) {
          let progressed = false;
          for (const lk of langs) {
            const q = buckets.get(lk);
            if (!q || q.length === 0) continue;
            const t = q.shift()!;
            selectedTasks.push(t);
            added++;
            progressed = true;
            if (added >= target) break;
          }
          if (!progressed) break; // all empty
        }
      }

      if (!selectedTasks.length) {
        return res.json({
          success: true,
          message: 'No matching tasks found',
          data: { requested: requestedCount, allocated: 0 },
        });
      }

      // Round-robin assignment across capable agents
      const STATUS_UNASSIGNED: TaskStatus = 'unassigned';
      const STATUS_QUEUED: TaskStatus = 'sampled_in_queue';

      const languageAgentCursor = new Map<string, number>();
      const skippedByLanguage: Record<string, number> = {};

      const bulkOps = selectedTasks
        .map((t, idx: number) => {
          const taskId = t._id;
          const farmerLangKey = normalize(t.farmerLanguage) || 'unknown';

          const langAgents = isAllLanguages ? (agentsByLanguage.get(farmerLangKey) || []) : capableAgents;
          if (!langAgents.length) {
            skippedByLanguage[farmerLangKey] = (skippedByLanguage[farmerLangKey] || 0) + 1;
            return null;
          }

          const cursor = languageAgentCursor.get(farmerLangKey) || 0;
          const agent = langAgents[cursor % langAgents.length];
          languageAgentCursor.set(farmerLangKey, cursor + 1);

        return {
          updateOne: {
            filter: { _id: taskId, status: STATUS_UNASSIGNED },
            update: {
              $set: {
                assignedAgentId: agent._id,
                status: STATUS_QUEUED,
              },
              $push: {
                interactionHistory: {
                  timestamp: new Date(),
                  status: STATUS_QUEUED,
                  notes: `Allocated by Team Lead (auto) to ${agent.email}`,
                },
              },
            },
          },
        };
      })
      .filter(Boolean);

      const result = await CallTask.bulkWrite(bulkOps as any, { ordered: false });

      res.json({
        success: true,
        message: 'Tasks allocated successfully',
        data: {
          language,
          requested: requestedCount,
          matchedTasks: selectedTasks.length,
          allocated: result.modifiedCount || 0,
          agentsUsed: capableAgents.map((a: any) => ({ agentId: a._id.toString(), name: a.name, email: a.email })),
          skippedByLanguage,
        },
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
  '/unassigned',
  requirePermission('tasks.view.team'),
  [
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

      const { dateFrom, dateTo, page, limit } = req.query;
      const result = await getUnassignedTasks({
        dateFrom: dateFrom ? (dateFrom as string) : undefined,
        dateTo: dateTo ? (dateTo as string) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

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
      if (userRole === 'cc_agent' && (!task.assignedAgentId || task.assignedAgentId.toString() !== userId)) {
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
    body('didAttend').optional().isIn(['Yes, I attended', 'No, I missed', "Don't recall", 'Identity Wrong', 'Not a Farmer', null]).withMessage('Invalid didAttend value'),
    body('didRecall').optional().isBoolean(),
    body('cropsDiscussed').optional().isArray(),
    body('productsDiscussed').optional().isArray(),
    body('hasPurchased').optional().isBoolean(),
    body('willingToPurchase').optional().isBoolean(),
    body('nonPurchaseReason').optional().isString(),
    body('farmerComments').optional().isString(),
    body('sentiment').optional().isIn(['Positive', 'Negative', 'Neutral', 'N/A']).withMessage('Invalid sentiment value'),
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
      if (!task.assignedAgentId || task.assignedAgentId.toString() !== agentId) {
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
        farmerComments: req.body.farmerComments || '',
        sentiment: req.body.sentiment || 'N/A',
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

      // Add to interaction history (record previous status before update)
      const previousStatus = task.status;
      // Add to interaction history
      task.interactionHistory.push({
        timestamp: new Date(),
        status: previousStatus,
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

// ============================================================================
// CRITICAL: Bulk routes MUST be defined BEFORE parameterized routes (/:id/*)
// Express matches routes in order, so /bulk/status must come before /:id/status
// ============================================================================

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
// CRITICAL: This route MUST match /tasks/bulk/status exactly
router.put(
  '/bulk/status',
  requirePermission('tasks.reassign'),
  [
    body('taskIds').isArray().withMessage('taskIds must be an array'),
    body('taskIds.*').isMongoId().withMessage('Each task ID must be valid'),
    body('status').isIn(['sampled_in_queue', 'in_progress', 'completed', 'not_reachable', 'invalid_number']).withMessage('Invalid status'),
    body('notes').optional().isString(),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // CRITICAL: Explicitly verify we're in the correct route handler
      const path = req.path || req.url;
      if (!path.includes('/bulk/status')) {
        logger.error('Bulk status route handler called but path does not match!', {
          path,
          originalUrl: req.originalUrl,
          url: req.url,
          method: req.method,
        });
        const error: AppError = new Error('Internal route matching error');
        error.statusCode = 500;
        throw error;
      }

      // Log that we're in the bulk route handler
      logger.info('✅ Bulk status update route matched correctly', {
        path: req.path,
        originalUrl: req.originalUrl,
        method: req.method,
        body: { taskIds: req.body.taskIds?.length, status: req.body.status },
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', errors: errors.array() },
        });
      }

      const { taskIds, status, notes } = req.body;
      
      // CRITICAL: Validate taskIds is an array and not empty
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        logger.error('Invalid taskIds in request body', { taskIds, body: req.body });
        return res.status(400).json({
          success: false,
          error: { message: 'taskIds must be a non-empty array' },
        });
      }

      // CRITICAL: Filter out any invalid IDs (including 'bulk' if it somehow got in)
      const validTaskIds = taskIds.filter((id: string) => {
        if (typeof id !== 'string' || id === 'bulk' || id.toLowerCase() === 'bulk') {
          logger.warn('Filtering out invalid taskId from bulk update', { invalidId: id, allTaskIds: taskIds });
          return false;
        }
        return /^[0-9a-fA-F]{24}$/.test(id);
      });

      if (validTaskIds.length === 0) {
        logger.error('No valid taskIds after filtering', { originalTaskIds: taskIds });
        return res.status(400).json({
          success: false,
          error: { message: 'No valid task IDs provided' },
        });
      }

      if (validTaskIds.length !== taskIds.length) {
        logger.warn('Some invalid taskIds were filtered out', { 
          original: taskIds.length, 
          valid: validTaskIds.length,
          invalid: taskIds.filter((id: string) => !validTaskIds.includes(id))
        });
      }

      const results = [];
      const errors_list: any[] = [];

      for (const taskId of validTaskIds) {
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
      // CRITICAL: Add param validation middleware BEFORE route handler
      (req: Request, res: Response, next: NextFunction) => {
        const taskId = req.params.id;
        // EXPLICITLY reject 'bulk' at the middleware level - before ANY other code runs
        if (taskId === 'bulk' || taskId?.toLowerCase() === 'bulk') {
          logger.error('❌ MIDDLEWARE REJECTION: /:id/status matched "bulk" - this should not happen!', {
            path: req.path,
            originalUrl: req.originalUrl,
            method: req.method,
            params: req.params,
            url: req.url,
          });
          const error: AppError = new Error('Invalid route: Use /bulk/status for bulk operations. Route matching error detected.');
          error.statusCode = 400;
          return next(error);
        }
        next();
      },
      [
        body('status').isIn(['sampled_in_queue', 'in_progress', 'completed', 'not_reachable', 'invalid_number']).withMessage('Invalid status'),
        body('notes').optional().isString(),
      ],
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const taskId = req.params.id;
          
          // Double-check (defense in depth)
          if (taskId === 'bulk' || taskId?.toLowerCase() === 'bulk') {
            logger.error('❌ DOUBLE-CHECK FAILED: taskId is still "bulk" after middleware!', {
              path: req.path,
              originalUrl: req.originalUrl,
              method: req.method,
              params: req.params,
            });
            const error: AppError = new Error('Invalid route: Use /bulk/status for bulk operations');
            error.statusCode = 400;
            throw error;
          }

      // Validate taskId is a valid MongoDB ObjectId format
      const originalUrl = req.originalUrl || req.path;
      if (!/^[0-9a-fA-F]{24}$/.test(taskId)) {
        logger.warn('Invalid task ID format received', { taskId, path: req.path, originalUrl: originalUrl });
        const error: AppError = new Error('Invalid task ID format');
        error.statusCode = 400;
        throw error;
      }
      
      logger.info('Single task status update route matched', {
        taskId,
        path: req.path,
        originalUrl: originalUrl,
        method: req.method,
      });

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