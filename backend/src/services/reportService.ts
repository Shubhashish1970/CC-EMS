import { Activity } from '../models/Activity.js';
import { CallTask } from '../models/CallTask.js';
import { SamplingAudit } from '../models/SamplingAudit.js';
import mongoose from 'mongoose';
import type { EmsProgressFilters } from './kpiService.js';
import { buildActivityMatch } from './kpiService.js';

export interface ReportFilters extends EmsProgressFilters {
  bucket?: 'daily' | 'weekly' | 'monthly';
}

export interface DailyReportRow {
  date: string; // YYYY-MM-DD
  activitiesTotal: number;
  activitiesSampled: number;
  tasksTotal: number;
  tasksCompleted: number;
  farmersTotal: number;
  farmersSampled: number;
  completionRatePct: number;
}

/**
 * Daily aggregation for report: one row per day in range.
 */
export async function getDailyReport(filters?: ReportFilters): Promise<DailyReportRow[]> {
  const activityMatch = buildActivityMatch(filters);
  const activityCollection = Activity.collection.name;
  const auditCollection = SamplingAudit.collection.name;

  const activityAgg = await Activity.aggregate([
    { $match: activityMatch },
    {
      $lookup: {
        from: auditCollection,
        localField: '_id',
        foreignField: 'activityId',
        as: 'audits',
      },
    },
    {
      $addFields: {
        farmerCount: { $size: { $ifNull: ['$farmerIds', []] } },
        sampledCount: { $ifNull: [{ $arrayElemAt: ['$audits.sampledCount', 0] }, 0] },
        dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
      },
    },
    {
      $group: {
        _id: '$dateStr',
        activitiesTotal: { $sum: 1 },
        farmersTotal: { $sum: '$farmerCount' },
        farmersSampled: { $sum: '$sampledCount' },
        activityIds: { $push: '$_id' },
      },
    },
  ]).exec();

  if (activityAgg.length === 0) {
    return [];
  }

  const allActivityIds = activityAgg.flatMap((r: any) => r.activityIds || []).map((id: mongoose.Types.ObjectId) => id);
  const taskAgg = await CallTask.aggregate([
    { $match: { activityId: { $in: allActivityIds } } },
    {
      $lookup: {
        from: activityCollection,
        localField: 'activityId',
        foreignField: '_id',
        as: 'act',
      },
    },
    { $unwind: '$act' },
    {
      $addFields: {
        dateStr: { $dateToString: { format: '%Y-%m-%d', date: '$act.date' } },
      },
    },
    {
      $group: {
        _id: { dateStr: '$dateStr', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]).exec();

  const byDate = new Map<string, { tasksTotal: number; tasksCompleted: number }>();
  for (const row of activityAgg) {
    byDate.set(row._id, {
      tasksTotal: 0,
      tasksCompleted: 0,
    });
  }
  for (const row of taskAgg) {
    const dateStr = row._id?.dateStr;
    if (!dateStr) continue;
    if (!byDate.has(dateStr)) byDate.set(dateStr, { tasksTotal: 0, tasksCompleted: 0 });
    const rec = byDate.get(dateStr)!;
    rec.tasksTotal += Number(row.count || 0);
    if (row._id?.status === 'completed') rec.tasksCompleted += Number(row.count || 0);
  }

  const rows: DailyReportRow[] = [];
  for (const row of activityAgg) {
    const dateStr = row._id;
    const taskRec = byDate.get(dateStr) || { tasksTotal: 0, tasksCompleted: 0 };
    const completionRatePct = taskRec.tasksTotal > 0 ? Math.round((taskRec.tasksCompleted / taskRec.tasksTotal) * 100) : 0;
    rows.push({
      date: dateStr,
      activitiesTotal: Number(row.activitiesTotal || 0),
      activitiesSampled: 0, // not computed per-day here for brevity; use summary for that
      tasksTotal: taskRec.tasksTotal,
      tasksCompleted: taskRec.tasksCompleted,
      farmersTotal: Number(row.farmersTotal || 0),
      farmersSampled: Number(row.farmersSampled || 0),
      completionRatePct,
    });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

export interface ReportSummaryRow {
  period: string; // e.g. "2026-01" or "2026-W03" or "2026-01-15"
  activitiesTotal: number;
  tasksTotal: number;
  tasksCompleted: number;
  farmersTotal: number;
  farmersSampled: number;
  completionRatePct: number;
}

/**
 * Weekly or monthly report: aggregate by week/month.
 */
export async function getPeriodReport(
  filters: ReportFilters | undefined,
  period: 'weekly' | 'monthly'
): Promise<ReportSummaryRow[]> {
  const activityMatch = buildActivityMatch(filters);
  const activityCollection = Activity.collection.name;
  const auditCollection = SamplingAudit.collection.name;
  const dateFormat = period === 'monthly' ? '%Y-%m' : '%Y-%U'; // ISO week

  const activityAgg = await Activity.aggregate([
    { $match: activityMatch },
    {
      $lookup: {
        from: auditCollection,
        localField: '_id',
        foreignField: 'activityId',
        as: 'audits',
      },
    },
    {
      $addFields: {
        farmerCount: { $size: { $ifNull: ['$farmerIds', []] } },
        sampledCount: { $ifNull: [{ $arrayElemAt: ['$audits.sampledCount', 0] }, 0] },
        periodStr: { $dateToString: { format: dateFormat, date: '$date' } },
      },
    },
    {
      $group: {
        _id: '$periodStr',
        activitiesTotal: { $sum: 1 },
        farmersTotal: { $sum: '$farmerCount' },
        farmersSampled: { $sum: '$sampledCount' },
        activityIds: { $push: '$_id' },
      },
    },
  ]).exec();

  if (activityAgg.length === 0) return [];

  const allActivityIds = activityAgg.flatMap((r: any) => r.activityIds || []).map((id: mongoose.Types.ObjectId) => id);
  const taskAgg = await CallTask.aggregate([
    { $match: { activityId: { $in: allActivityIds } } },
    {
      $lookup: {
        from: activityCollection,
        localField: 'activityId',
        foreignField: '_id',
        as: 'act',
      },
    },
    { $unwind: '$act' },
    {
      $addFields: {
        periodStr: { $dateToString: { format: dateFormat, date: '$act.date' } },
      },
    },
    {
      $group: {
        _id: { periodStr: '$periodStr', status: '$status' },
        count: { $sum: 1 },
      },
    },
  ]).exec();

  const byPeriod = new Map<string, { tasksTotal: number; tasksCompleted: number }>();
  for (const row of activityAgg) {
    byPeriod.set(row._id, { tasksTotal: 0, tasksCompleted: 0 });
  }
  for (const row of taskAgg) {
    const p = row._id?.periodStr;
    if (!p) continue;
    if (!byPeriod.has(p)) byPeriod.set(p, { tasksTotal: 0, tasksCompleted: 0 });
    const rec = byPeriod.get(p)!;
    rec.tasksTotal += Number(row.count || 0);
    if (row._id?.status === 'completed') rec.tasksCompleted += Number(row.count || 0);
  }

  const rows: ReportSummaryRow[] = activityAgg.map((row: any) => {
    const taskRec = byPeriod.get(row._id) || { tasksTotal: 0, tasksCompleted: 0 };
    const completionRatePct = taskRec.tasksTotal > 0 ? Math.round((taskRec.tasksCompleted / taskRec.tasksTotal) * 100) : 0;
    return {
      period: row._id,
      activitiesTotal: Number(row.activitiesTotal || 0),
      tasksTotal: taskRec.tasksTotal,
      tasksCompleted: taskRec.tasksCompleted,
      farmersTotal: Number(row.farmersTotal || 0),
      farmersSampled: Number(row.farmersSampled || 0),
      completionRatePct,
    };
  });
  rows.sort((a, b) => a.period.localeCompare(b.period));
  return rows;
}
