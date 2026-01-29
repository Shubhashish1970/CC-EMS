import express, { Request, Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { getDailyReport, getPeriodReport } from '../services/reportService.js';
import { getEmsProgress, getEmsDrilldown, type EmsDrilldownGroupBy } from '../services/kpiService.js';
import * as XLSX from 'xlsx';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('mis_admin'));

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

export default router;
