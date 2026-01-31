import express, { Request, Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { getDailyReport, getPeriodReport, getTaskDetailExportRows } from '../services/reportService.js';
import { getEmsProgress, getEmsDrilldown, type EmsDrilldownGroupBy } from '../services/kpiService.js';
import * as XLSX from 'xlsx';

const router = express.Router();

router.use(authenticate);
// Permission-based: mis_admin has reports.weekly; normalizes "admin" -> mis_admin so Admin always has access
router.use(requirePermission('reports.weekly'));

function parseFilters(req: Request): {
  dateFrom?: Date;
  dateTo?: Date;
  state?: string;
  territory?: string;
  zone?: string;
  bu?: string;
  activityType?: string;
} {
  return {
    dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
    dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
    state: (req.query.state as string) || undefined,
    territory: (req.query.territory as string) || undefined,
    zone: (req.query.zone as string) || undefined,
    bu: (req.query.bu as string) || undefined,
    activityType: (req.query.activityType as string) || undefined,
  };
}

const filterValidators = [
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
  query('state').optional().isString().trim(),
  query('territory').optional().isString().trim(),
  query('zone').optional().isString().trim(),
  query('bu').optional().isString().trim(),
  query('activityType').optional().isString().trim(),
];

/**
 * GET /api/reports/daily
 * Daily report rows (date, activities, tasks, farmers, completion %).
 */
router.get('/daily', filterValidators, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', errors: errors.array() } });
    }
    const filters = parseFilters(req);
    const rows = await getDailyReport(filters);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/weekly
 * Weekly aggregated report.
 */
router.get('/weekly', filterValidators, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', errors: errors.array() } });
    }
    const filters = parseFilters(req);
    const rows = await getPeriodReport(filters, 'weekly');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/monthly
 * Monthly aggregated report.
 */
router.get('/monthly', filterValidators, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', errors: errors.array() } });
    }
    const filters = parseFilters(req);
    const rows = await getPeriodReport(filters, 'monthly');
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/drilldown
 * Drilldown data (same as KPI drilldown). groupBy: state | territory | zone | bu | activityType.
 */
router.get(
  '/drilldown',
  [
    ...filterValidators,
    query('groupBy').isIn(['state', 'territory', 'zone', 'bu', 'activityType']).withMessage('Invalid groupBy'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: { message: 'Validation failed', errors: errors.array() } });
      }
      const filters = parseFilters(req);
      const groupBy = req.query.groupBy as EmsDrilldownGroupBy;
      const rows = await getEmsDrilldown(filters, groupBy);
      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/reports/export
 * Export EMS progress summary + drilldown (by state) as Excel. Query params: same filters + format=xlsx.
 */
router.get('/export', filterValidators, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', errors: errors.array() } });
    }
    const filters = parseFilters(req);
    const [summary, drilldownState] = await Promise.all([
      getEmsProgress(filters),
      getEmsDrilldown(filters, 'state'),
    ]);

    const wb = XLSX.utils.book_new();
    const summaryRows = [
      ['Metric', 'Value'],
      ['Activities Total', summary.activities.total],
      ['Activities Sampled', summary.activities.sampledCount],
      ['Activities Not Sampled', summary.activities.notSampledCount],
      ['Activities Partial', summary.activities.partialCount],
      ['Tasks Total', summary.tasks.total],
      ['Tasks Completed', summary.tasks.completed],
      ['Tasks In Queue', summary.tasks.sampled_in_queue + summary.tasks.unassigned],
      ['Tasks In Progress', summary.tasks.in_progress],
      ['Completion Rate %', summary.tasks.completionRatePct],
      ['Farmers in Activities', summary.farmers.totalInActivities],
      ['Farmers Sampled', summary.farmers.sampled],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary');

    const drillRows = [
      [
        'State',
        'Activities Total',
        'Activities Sampled',
        'Tasks Total',
        'Tasks Completed',
        'Completion %',
        'Farmers Total',
        'Farmers Sampled',
      ],
      ...drilldownState.map((r) => [
        r.label,
        r.activitiesTotal,
        r.activitiesSampled,
        r.tasksTotal,
        r.tasksCompleted,
        r.completionRatePct,
        r.farmersTotal,
        r.farmersSampled,
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(drillRows), 'By State');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `ems-progress-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/reports/tasks-detail-export
 * Excel export: 1) Activity details 2) Sampling details 3) Task details 4) Agent/Calling details 5) Final outcome and comments.
 */
router.get('/tasks-detail-export', filterValidators, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', errors: errors.array() } });
    }
    const filters = parseFilters(req);
    const rows = await getTaskDetailExportRows(filters);

    const wb = XLSX.utils.book_new();
    // Section 1: Activity details
    const headers = [
      'Activity ID',
      'Activity Type',
      'Activity Date',
      'Officer Name (FDA)',
      'Officer ID (FDA)',
      'TM Name',
      'TM Emp Code',
      'Activity Location',
      'Territory',
      'Territory Name',
      'Zone',
      'BU',
      'State',
      'Activity Crops',
      'Activity Products',
      'Lifecycle Status',
      'Activity Synced At',
      // Section 2: Sampling details
      'Sampling Percentage',
      'Sampling Total Farmers',
      'Sampling Sampled Count',
      'Sampling Algorithm',
      'Sampling Created At',
      // Section 3: Task details
      'Task ID',
      'Farmer Name',
      'Farmer Mobile',
      'Farmer Location',
      'Farmer Preferred Language',
      'Farmer Territory',
      'Task Scheduled Date',
      'Task Status',
      'Task Outcome',
      'Retry Count',
      'Is Callback',
      'Callback Number',
      'Task Created At',
      'Task Updated At',
      'Call Started At',
      // Section 4: Agent / Calling details
      'Agent Name',
      'Agent Email',
      'Agent Employee ID',
      'Call Timestamp',
      'Call Status',
      'Call Duration (sec)',
      'Did Attend',
      'Did Recall',
      'Crops Discussed',
      'Products Discussed',
      'Has Purchased',
      'Willing to Purchase',
      'Likely Purchase Date',
      'Non-Purchase Reason',
      'Purchased Products',
      // Section 5: Final outcome and comments
      'Outcome',
      'Final Status',
      'Farmer Comments',
      'Sentiment',
      'Last Status Note',
    ];
    const data = [headers, ...rows.map((r) => [
      r.activityId,
      r.activityType,
      r.activityDate,
      r.officerName,
      r.officerId,
      r.tmName,
      r.tmEmpCode,
      r.activityLocation,
      r.territory,
      r.territoryName,
      r.zoneName,
      r.buName,
      r.state,
      r.activityCrops,
      r.activityProducts,
      r.lifecycleStatus,
      r.activitySyncedAt,
      r.samplingPercentage,
      r.samplingTotalFarmers,
      r.samplingSampledCount,
      r.samplingAlgorithm,
      r.samplingCreatedAt,
      r.taskId,
      r.farmerName,
      r.farmerMobile,
      r.farmerLocation,
      r.farmerPreferredLanguage,
      r.farmerTerritory,
      r.taskScheduledDate,
      r.taskStatus,
      r.taskOutcome,
      r.retryCount,
      r.isCallback,
      r.callbackNumber,
      r.taskCreatedAt,
      r.taskUpdatedAt,
      r.callStartedAt,
      r.agentName,
      r.agentEmail,
      r.agentEmployeeId,
      r.callTimestamp,
      r.callStatus,
      r.callDurationSeconds,
      r.didAttend,
      r.didRecall,
      r.cropsDiscussed,
      r.productsDiscussed,
      r.hasPurchased,
      r.willingToPurchase,
      r.likelyPurchaseDate,
      r.nonPurchaseReason,
      r.purchasedProducts,
      r.outcome,
      r.finalStatus,
      r.farmerComments,
      r.sentiment,
      r.lastStatusNote,
    ])];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Task Details');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `ems-task-details-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    next(err);
  }
});

export default router;
