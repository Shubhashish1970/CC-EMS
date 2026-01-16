import express, { Request, Response, NextFunction } from 'express';
import { body, validationResult, query } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { sampleAndCreateTasks } from '../services/samplingService.js';
import { SamplingAudit } from '../models/SamplingAudit.js';
import { Activity } from '../models/Activity.js';
import { SamplingConfig } from '../models/SamplingConfig.js';
import { CallTask } from '../models/CallTask.js';
import logger from '../config/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ============================================================================
// Sampling Control (Team Lead + MIS Admin)
// ============================================================================

// @route   GET /api/sampling/stats
// @desc    Sampling dashboard stats for a date range (counts by type + lifecycle + farmers sampled + tasks created)
// @access  Private (Team Lead, MIS Admin)
router.get(
  '/stats',
  requirePermission('config.sampling'),
  [
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
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

      const { dateFrom, dateTo } = req.query as any;
      const match: any = {};
      if (dateFrom || dateTo) {
        match.date = {};
        if (dateFrom) match.date.$gte = new Date(dateFrom);
        if (dateTo) match.date.$lte = new Date(dateTo);
      }

      const auditCollection = SamplingAudit.collection.name;
      const taskCollection = CallTask.collection.name;

      const pipeline: any[] = [
        { $match: match },
        {
          $lookup: {
            from: auditCollection,
            localField: '_id',
            foreignField: 'activityId',
            as: 'audit',
          },
        },
        {
          $lookup: {
            from: taskCollection,
            localField: '_id',
            foreignField: 'activityId',
            as: 'tasks',
          },
        },
        {
          $addFields: {
            farmersTotal: { $size: { $ifNull: ['$farmerIds', []] } },
            sampledFarmers: {
              $ifNull: [{ $arrayElemAt: ['$audit.sampledCount', 0] }, 0],
            },
            tasksCreated: { $size: { $ifNull: ['$tasks', []] } },
            unassignedTasks: {
              $size: {
                $filter: {
                  input: { $ifNull: ['$tasks', []] },
                  as: 't',
                  cond: { $eq: ['$$t.status', 'unassigned'] },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: '$type',
            totalActivities: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$lifecycleStatus', 'active'] }, 1, 0] } },
            sampled: { $sum: { $cond: [{ $eq: ['$lifecycleStatus', 'sampled'] }, 1, 0] } },
            inactive: { $sum: { $cond: [{ $eq: ['$lifecycleStatus', 'inactive'] }, 1, 0] } },
            notEligible: { $sum: { $cond: [{ $eq: ['$lifecycleStatus', 'not_eligible'] }, 1, 0] } },
            farmersTotal: { $sum: '$farmersTotal' },
            sampledFarmers: { $sum: '$sampledFarmers' },
            tasksCreated: { $sum: '$tasksCreated' },
            unassignedTasks: { $sum: '$unassignedTasks' },
          },
        },
        { $sort: { totalActivities: -1 } },
      ];

      const byType = await Activity.aggregate(pipeline);

      const totals = byType.reduce(
        (acc: any, row: any) => {
          acc.totalActivities += row.totalActivities || 0;
          acc.active += row.active || 0;
          acc.sampled += row.sampled || 0;
          acc.inactive += row.inactive || 0;
          acc.notEligible += row.notEligible || 0;
          acc.farmersTotal += row.farmersTotal || 0;
          acc.sampledFarmers += row.sampledFarmers || 0;
          acc.tasksCreated += row.tasksCreated || 0;
          acc.unassignedTasks += row.unassignedTasks || 0;
          return acc;
        },
        {
          totalActivities: 0,
          active: 0,
          sampled: 0,
          inactive: 0,
          notEligible: 0,
          farmersTotal: 0,
          sampledFarmers: 0,
          tasksCreated: 0,
          unassignedTasks: 0,
        }
      );

      res.json({
        success: true,
        data: {
          dateFrom: dateFrom || null,
          dateTo: dateTo || null,
          totals,
          byType: byType.map((r: any) => ({
            type: r._id,
            totalActivities: r.totalActivities,
            active: r.active,
            sampled: r.sampled,
            inactive: r.inactive,
            notEligible: r.notEligible,
            farmersTotal: r.farmersTotal,
            sampledFarmers: r.sampledFarmers,
            tasksCreated: r.tasksCreated,
            unassignedTasks: r.unassignedTasks,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   GET /api/sampling/activities
// @desc    List activities by lifecycle status (Sampling Control)
// @access  Private (Team Lead, MIS Admin)
router.get(
  '/activities',
  requirePermission('config.sampling'),
  [
    query('lifecycleStatus').optional().isIn(['active', 'sampled', 'inactive', 'not_eligible']),
    query('type').optional().isString(),
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

      const { lifecycleStatus, type, dateFrom, dateTo, page = 1, limit = 20 } = req.query as any;
      const skip = (Number(page) - 1) * Number(limit);

      const q: any = {};
      if (lifecycleStatus) q.lifecycleStatus = lifecycleStatus;
      if (type) q.type = type;
      if (dateFrom || dateTo) {
        q.date = {};
        if (dateFrom) q.date.$gte = new Date(dateFrom);
        if (dateTo) q.date.$lte = new Date(dateTo);
      }

      const [activities, total] = await Promise.all([
        Activity.find(q)
          .select('activityId type date officerName tmName location territory territoryName state zoneName buName lifecycleStatus lifecycleUpdatedAt lastSamplingRunAt')
          .sort({ date: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Activity.countDocuments(q),
      ]);

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

// @route   GET /api/sampling/config
// @desc    Get sampling configuration (Sampling Control)
// @access  Private (Team Lead, MIS Admin)
router.get(
  '/config',
  requirePermission('config.sampling'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await SamplingConfig.findOne({ key: 'default' }).lean();
      res.json({ success: true, data: { config } });
    } catch (error) {
      next(error);
    }
  }
);

// @route   PUT /api/sampling/config
// @desc    Update sampling configuration (Sampling Control)
// @access  Private (Team Lead, MIS Admin)
router.put(
  '/config',
  requirePermission('config.sampling'),
  [
    body('activityCoolingDays').optional().isInt({ min: 0, max: 365 }),
    body('farmerCoolingDays').optional().isInt({ min: 0, max: 365 }),
    body('defaultPercentage').optional().isFloat({ min: 1, max: 100 }),
    body('activityTypePercentages').optional().isObject(),
    body('eligibleActivityTypes').optional().isArray(),
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

      const authUserId = (req as any).user?._id;
      const update: any = {
        ...req.body,
        updatedByUserId: authUserId || null,
      };

      const config = await SamplingConfig.findOneAndUpdate(
        { key: 'default' },
        { $set: update, $setOnInsert: { key: 'default', isActive: true } },
        { upsert: true, new: true }
      );

      res.json({ success: true, message: 'Sampling config updated', data: { config } });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/sampling/apply-eligibility
// @desc    Apply eligibility rules: mark disabled activity types as not_eligible (does NOT auto-reactivate)
// @access  Private (Team Lead, MIS Admin)
router.post(
  '/apply-eligibility',
  requirePermission('config.sampling'),
  [body('eligibleActivityTypes').isArray().withMessage('eligibleActivityTypes array is required')],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: { message: 'Validation failed', errors: errors.array() },
        });
      }

      const { eligibleActivityTypes } = req.body as { eligibleActivityTypes: string[] };
      const allTypes = ['Field Day', 'Group Meeting', 'Demo Visit', 'OFM', 'Other'];
      const eligibleSet = new Set(eligibleActivityTypes || []);
      const disabledTypes = allTypes.filter((t) => !eligibleSet.has(t));

      // Persist config as well (source-of-truth)
      await SamplingConfig.findOneAndUpdate(
        { key: 'default' },
        { $set: { eligibleActivityTypes: eligibleActivityTypes || [] } },
        { upsert: true, new: true }
      );

      // Mark activities of disabled types as not_eligible, but do not touch already-sampled activities.
      const result = await Activity.updateMany(
        {
          type: { $in: disabledTypes },
          lifecycleStatus: { $ne: 'sampled' },
        },
        { $set: { lifecycleStatus: 'not_eligible', lifecycleUpdatedAt: new Date() } }
      );

      res.json({
        success: true,
        message: 'Eligibility applied (disabled types moved to Not Eligible)',
        data: { disabledTypes, modifiedCount: result.modifiedCount },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/sampling/reactivate
// @desc    Bulk reactivate activities (set to active) with confirmation; optionally clears existing tasks/audit
// @access  Private (Team Lead, MIS Admin)
router.post(
  '/reactivate',
  requirePermission('config.sampling'),
  [
    body('confirm').isIn(['YES']).withMessage('Type YES to confirm'),
    body('activityIds').optional().isArray(),
    body('fromStatus').optional().isIn(['inactive', 'not_eligible', 'sampled']),
    body('dateFrom').optional().isISO8601(),
    body('dateTo').optional().isISO8601(),
    body('deleteExistingTasks').optional().isBoolean(),
    body('deleteExistingAudit').optional().isBoolean(),
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

      const { activityIds, fromStatus, dateFrom, dateTo, deleteExistingTasks, deleteExistingAudit } = req.body as any;
      const query: any = {};
      // Default: reactivate the current filtered lifecycle bucket
      if (fromStatus) query.lifecycleStatus = fromStatus;
      if (dateFrom || dateTo) {
        query.date = {};
        if (dateFrom) query.date.$gte = new Date(dateFrom);
        if (dateTo) query.date.$lte = new Date(dateTo);
      }

      // Prefer explicit IDs if provided; otherwise reactivate all matching filters
      if (activityIds && Array.isArray(activityIds) && activityIds.length > 0) {
        query._id = { $in: activityIds };
      }

      const activities = await Activity.find(query).select('_id').lean();
      const ids = activities.map((a) => a._id);

      if (deleteExistingTasks) {
        await CallTask.deleteMany({ activityId: { $in: ids } });
      }
      if (deleteExistingAudit) {
        await SamplingAudit.deleteMany({ activityId: { $in: ids } });
      }

      const result = await Activity.updateMany(
        { _id: { $in: ids } },
        { $set: { lifecycleStatus: 'active', lifecycleUpdatedAt: new Date() } }
      );

      res.json({
        success: true,
        message: 'Activities reactivated to Active',
        data: { count: ids.length, modifiedCount: result.modifiedCount },
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/sampling/run
// @desc    Run sampling (single or bulk) for Active activities; creates Unassigned tasks; sets Activity to Sampled/Inactive
// @access  Private (Team Lead, MIS Admin)
router.post(
  '/run',
  requirePermission('config.sampling'),
  [
    body('activityIds').optional().isArray(),
    body('lifecycleStatus').optional().isIn(['active', 'sampled', 'inactive', 'not_eligible']),
    body('dateFrom').optional().isISO8601(),
    body('dateTo').optional().isISO8601(),
    body('samplingPercentage').optional().isFloat({ min: 1, max: 100 }),
    body('forceRun').optional().isBoolean(),
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

      const authUserId = (req as any).user?._id?.toString();
      const { activityIds, lifecycleStatus, dateFrom, dateTo, samplingPercentage, forceRun } = req.body as any;

      const MAX_BULK = 5000;
      let matchedCount = 0;

      let ids: string[] = [];
      if (Array.isArray(activityIds) && activityIds.length > 0) {
        ids = activityIds;
        matchedCount = activityIds.length;
      } else {
        // Default to Active activities if no status is provided
        const q: any = {
          lifecycleStatus: lifecycleStatus || 'active',
        };
        if (dateFrom || dateTo) {
          q.date = {};
          if (dateFrom) q.date.$gte = new Date(dateFrom);
          if (dateTo) q.date.$lte = new Date(dateTo);
        }

        matchedCount = await Activity.countDocuments(q);

        const docs = await Activity.find(q)
          .select('_id')
          .sort({ date: -1 })
          .limit(MAX_BULK)
          .lean();
        ids = docs.map((a) => a._id.toString());
      }

      if (matchedCount > MAX_BULK) {
        logger.warn('Sampling run truncated by safety cap', { matchedCount, processed: ids.length, MAX_BULK });
      }

      logger.info('Sampling run requested', { requestedCount: ids.length, forceRun: !!forceRun });

      const results: any[] = [];
      let tasksCreatedTotal = 0;
      let sampledActivities = 0;
      let inactiveActivities = 0;
      let skipped = 0;

      for (const id of ids) {
        const r = await sampleAndCreateTasks(id, samplingPercentage, {
          runByUserId: authUserId,
          forceRun: !!forceRun,
          scheduledDate: new Date(),
        });
        results.push({ activityId: id, ...r });
        tasksCreatedTotal += r.tasksCreated || 0;
        if (r.skipped) skipped++;
        if (r.activityLifecycleStatus === 'sampled') sampledActivities++;
        if (r.activityLifecycleStatus === 'inactive') inactiveActivities++;
      }

      res.json({
        success: true,
        message: 'Sampling run completed',
        data: {
          matched: matchedCount,
          processed: ids.length,
          sampledActivities,
          inactiveActivities,
          skipped,
          tasksCreatedTotal,
          results,
        },
      });
    } catch (error) {
      next(error);
    }
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


