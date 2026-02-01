import { Activity } from '../models/Activity.js';
import { CallTask } from '../models/CallTask.js';
import mongoose from 'mongoose';
import type { EmsProgressFilters } from './kpiService.js';
import { buildActivityMatch } from './kpiService.js';

export type EmsReportGroupBy = 'tm' | 'fda' | 'bu' | 'zone' | 'region' | 'territory';

/** Connected = callStatus === 'Connected' AND (didAttend set OR hasPurchased set OR willingToPurchase set) */
function isConnectedAndProgressed(log: { callStatus?: string; didAttend?: string | null; hasPurchased?: boolean | null; willingToPurchase?: boolean | null }): boolean {
  if (!log || log.callStatus !== 'Connected') return false;
  const didAttendSet = log.didAttend != null && String(log.didAttend).trim() !== '';
  const hasPurchasedSet = log.hasPurchased != null;
  const willingSet = log.willingToPurchase != null;
  return didAttendSet || hasPurchasedSet || willingSet;
}

/** One row per group with aggregated EMS metrics (full breakdown for report structure) */
export interface EmsReportSummaryRow {
  groupKey: string;
  groupLabel: string;
  totalAttempted: number;
  totalConnected: number;
  disconnectedCount: number;
  incomingNACount: number;
  invalidCount: number;
  noAnswerCount: number;
  identityWrongCount: number;
  dontRecallCount: number;
  noMissedCount: number;
  notAFarmerCount: number;
  yesAttendedCount: number;
  notPurchasedCount: number;
  purchasedCount: number;
  willingMaybeCount: number;
  willingNoCount: number;
  willingYesCount: number;
  yesPlusPurchasedCount: number;
  mobileValidityPct: number;
  hygienePct: number;
  meetingValidityPct: number;
  meetingConversionPct: number;
  purchaseIntentionPct: number;
  emsScore: number;
  relativeRemarks: string;
}

/** One row per call with call-level metrics and relative remarks */
export interface EmsReportLineRow {
  taskId: string;
  groupKey: string;
  groupLabel: string;
  activityId: string;
  activityDate: string;
  farmerName: string;
  farmerMobile: string;
  officerName: string;
  tmName: string;
  territoryName: string;
  zoneName: string;
  buName: string;
  state: string;
  totalAttempted: 1;
  connected: 0 | 1;
  invalid: 0 | 1;
  identityWrong: 0 | 1;
  notAFarmer: 0 | 1;
  yesAttended: 0 | 1;
  purchased: 0 | 1;
  willingYes: 0 | 1;
  mobileValidityPct: number;
  hygienePct: number;
  meetingValidityPct: number;
  meetingConversionPct: number;
  purchaseIntentionPct: number;
  emsScore: number;
  relativeRemarks: string;
}

function getGroupField(groupBy: EmsReportGroupBy): string {
  switch (groupBy) {
    case 'tm': return 'tmName';
    case 'fda': return 'officerName';
    case 'bu': return 'buName';
    case 'zone': return 'zoneName';
    case 'region': return 'state';
    case 'territory': return 'territoryName';
    default: return 'territoryName';
  }
}

function first10Words(text: string | undefined | null): string {
  if (text == null || typeof text !== 'string') return '—';
  const words = text.trim().split(/\s+/).filter(Boolean).slice(0, 10);
  return words.join(' ') || '—';
}

function buildRelativeRemarks(meetingValidityPct: number, meetingConversionPct: number, emsScore: number): string {
  if (emsScore >= 80) return 'Good performance across parameters';
  if (meetingValidityPct >= 70 && meetingConversionPct < 50) return 'Good meeting validity, but poor conversion';
  if (meetingValidityPct >= 50 && meetingValidityPct < 70 && meetingConversionPct < 50) return 'Moderate meeting validity and poor conversion';
  if (emsScore >= 50 && emsScore < 70) return 'Moderate score across parameters';
  if (emsScore < 50) return 'Need to be reviewed';
  if (meetingValidityPct < 50 && meetingConversionPct < 50) return 'Low meeting validity & conversion';
  return 'Moderate performance, need improvement in meeting conversion';
}

/**
 * EMS Report summary: one row per group (TM, FDA, BU, Zone, Region, Territory).
 * Includes all attempted calls: status completed (Connected), not_reachable (Disconnected/Incoming N/A/No Answer), invalid_number (Invalid).
 * Connected = callLog.callStatus === 'Connected' and progressed to next stage or beyond.
 */
export async function getEmsReportSummary(
  filters: EmsProgressFilters | undefined,
  groupBy: EmsReportGroupBy
): Promise<EmsReportSummaryRow[]> {
  const activityMatch = buildActivityMatch(filters);
  const activityCollection = Activity.collection.name;
  const groupField = getGroupField(groupBy);

  const activityIds = await Activity.find(activityMatch as any).select('_id').lean();
  const ids = activityIds.map((a: any) => a._id);
  if (ids.length === 0) return [];

  const agg = await CallTask.aggregate([
    {
      $match: {
        status: { $in: ['completed', 'not_reachable', 'invalid_number'] },
        callLog: { $exists: true, $ne: null },
        activityId: { $in: ids },
      },
    },
    {
      $lookup: {
        from: activityCollection,
        localField: 'activityId',
        foreignField: '_id',
        as: 'activity',
      },
    },
    { $unwind: '$activity' },
    {
      $addFields: {
        __group: { $ifNull: [`$activity.${groupField}`, '—'] },
        __callStatus: { $ifNull: ['$callLog.callStatus', ''] },
        __didAttend: '$callLog.didAttend',
        __hasPurchased: '$callLog.hasPurchased',
        __willingToPurchase: '$callLog.willingToPurchase',
        __isConnected: {
          $and: [
            { $eq: ['$callLog.callStatus', 'Connected'] },
            {
              $or: [
                { $and: [{ $ne: ['$callLog.didAttend', null] }, { $ne: [{ $type: '$callLog.didAttend' }, 'missing'] }] },
                { $eq: ['$callLog.hasPurchased', true] },
                { $eq: ['$callLog.willingToPurchase', true] },
              ],
            },
          ],
        },
        __disconnected: { $eq: ['$callLog.callStatus', 'Disconnected'] },
        __incomingNA: { $in: ['$callLog.callStatus', ['Incoming N/A', 'Not Reachable']] },
        __isInvalid: { $in: ['$callLog.callStatus', ['Invalid', 'Invalid Number']] },
        __noAnswer: { $eq: ['$callLog.callStatus', 'No Answer'] },
        __identityWrong: { $eq: ['$callLog.didAttend', 'Identity Wrong'] },
        __dontRecall: { $eq: ['$callLog.didAttend', "Don't recall"] },
        __noMissed: { $eq: ['$callLog.didAttend', 'No, I missed'] },
        __notAFarmer: { $eq: ['$callLog.didAttend', 'Not a Farmer'] },
        __yesAttended: { $eq: ['$callLog.didAttend', 'Yes, I attended'] },
        __notPurchased: { $eq: ['$callLog.hasPurchased', false] },
        __purchased: { $eq: ['$callLog.hasPurchased', true] },
        __willingMaybe: { $and: [{ $ne: ['$callLog.willingToPurchase', true] }, { $ne: ['$callLog.willingToPurchase', false] }] },
        __willingNo: { $eq: ['$callLog.willingToPurchase', false] },
        __willingYes: { $eq: ['$callLog.willingToPurchase', true] },
      },
    },
    {
      $group: {
        _id: '$__group',
        totalAttempted: { $sum: 1 },
        totalConnected: { $sum: { $cond: ['$__isConnected', 1, 0] } },
        disconnectedCount: { $sum: { $cond: ['$__disconnected', 1, 0] } },
        incomingNACount: { $sum: { $cond: ['$__incomingNA', 1, 0] } },
        invalidCount: { $sum: { $cond: ['$__isInvalid', 1, 0] } },
        noAnswerCount: { $sum: { $cond: ['$__noAnswer', 1, 0] } },
        identityWrongCount: { $sum: { $cond: ['$__identityWrong', 1, 0] } },
        dontRecallCount: { $sum: { $cond: ['$__dontRecall', 1, 0] } },
        noMissedCount: { $sum: { $cond: ['$__noMissed', 1, 0] } },
        notAFarmerCount: { $sum: { $cond: ['$__notAFarmer', 1, 0] } },
        yesAttendedCount: { $sum: { $cond: ['$__yesAttended', 1, 0] } },
        notPurchasedCount: { $sum: { $cond: ['$__notPurchased', 1, 0] } },
        purchasedCount: { $sum: { $cond: ['$__purchased', 1, 0] } },
        willingMaybeCount: { $sum: { $cond: ['$__willingMaybe', 1, 0] } },
        willingNoCount: { $sum: { $cond: ['$__willingNo', 1, 0] } },
        willingYesCount: { $sum: { $cond: ['$__willingYes', 1, 0] } },
      },
    },
  ]).exec();

  const rows: EmsReportSummaryRow[] = [];
  for (const row of agg) {
    const label = row._id != null ? String(row._id).trim() || '—' : '—';
    const totalAttempted = Number(row.totalAttempted || 0);
    const totalConnected = Number(row.totalConnected || 0);
    const disconnectedCount = Number(row.disconnectedCount || 0);
    const incomingNACount = Number(row.incomingNACount || 0);
    const invalidCount = Number(row.invalidCount || 0);
    const noAnswerCount = Number(row.noAnswerCount || 0);
    const identityWrongCount = Number(row.identityWrongCount || 0);
    const dontRecallCount = Number(row.dontRecallCount || 0);
    const noMissedCount = Number(row.noMissedCount || 0);
    const notAFarmerCount = Number(row.notAFarmerCount || 0);
    const yesAttendedCount = Number(row.yesAttendedCount || 0);
    const notPurchasedCount = Number(row.notPurchasedCount || 0);
    const purchasedCount = Number(row.purchasedCount || 0);
    const willingMaybeCount = Number(row.willingMaybeCount || 0);
    const willingNoCount = Number(row.willingNoCount || 0);
    const willingYesCount = Number(row.willingYesCount || 0);

    const mobileValidityPct =
      totalAttempted > 0 ? Math.round(((totalAttempted - invalidCount) / totalAttempted) * 100) : 0;
    const hygienePct =
      totalConnected > 0
        ? Math.round(((totalConnected - identityWrongCount - notAFarmerCount) / totalConnected) * 100)
        : 0;
    const meetingValidityPct = totalConnected > 0 ? Math.round((yesAttendedCount / totalConnected) * 100) : 0;
    const meetingConversionPct = totalConnected > 0 ? Math.round((purchasedCount / totalConnected) * 100) : 0;
    const purchaseIntentionPct =
      totalConnected > 0 ? Math.round(((willingYesCount + purchasedCount) / totalConnected) * 100) : 0;
    const emsScore = Math.round(
      (mobileValidityPct + meetingValidityPct + meetingConversionPct + purchaseIntentionPct) / 4
    );
    const yesPlusPurchasedCount = willingYesCount + purchasedCount;
    const relativeRemarks = buildRelativeRemarks(meetingValidityPct, meetingConversionPct, emsScore);

    rows.push({
      groupKey: label,
      groupLabel: label,
      totalAttempted,
      totalConnected,
      disconnectedCount,
      incomingNACount,
      invalidCount,
      noAnswerCount,
      identityWrongCount,
      dontRecallCount,
      noMissedCount,
      notAFarmerCount,
      yesAttendedCount,
      notPurchasedCount,
      purchasedCount,
      willingMaybeCount,
      willingNoCount,
      willingYesCount,
      yesPlusPurchasedCount,
      mobileValidityPct,
      hygienePct,
      meetingValidityPct,
      meetingConversionPct,
      purchaseIntentionPct,
      emsScore,
      relativeRemarks,
    });
  }

  rows.sort((a, b) => b.totalAttempted - a.totalAttempted);
  return rows;
}

/**
 * EMS Report line-level: one row per call with metrics and relative remarks.
 */
export async function getEmsReportLineLevel(
  filters: EmsProgressFilters | undefined,
  groupBy: EmsReportGroupBy
): Promise<EmsReportLineRow[]> {
  const activityMatch = buildActivityMatch(filters);
  const groupField = getGroupField(groupBy);

  const activityIds = await Activity.find(activityMatch as any).select('_id').lean();
  const ids = activityIds.map((a: any) => a._id);
  if (ids.length === 0) return [];

  const tasks = await CallTask.find({
    status: { $in: ['completed', 'not_reachable', 'invalid_number'] },
    callLog: { $exists: true, $ne: null },
    activityId: { $in: ids },
  })
    .populate('activityId', 'date officerName tmName territoryName zoneName buName state territory')
    .populate('farmerId', 'name mobileNumber')
    .sort({ updatedAt: -1 })
    .lean();

  const rows: EmsReportLineRow[] = [];
  for (const t of tasks as any[]) {
    const log = t.callLog || {};
    const act = t.activityId || {};
    const farmer = t.farmerId || {};
    const groupLabel = act[groupField] != null ? String(act[groupField]).trim() || '—' : '—';

    const isConnected = isConnectedAndProgressed(log);
    const isInvalid = log.callStatus === 'Invalid' || log.callStatus === 'Invalid Number';
    const identityWrong = log.didAttend === 'Identity Wrong' ? 1 : 0;
    const notAFarmer = log.didAttend === 'Not a Farmer' ? 1 : 0;
    const yesAttended = log.didAttend === 'Yes, I attended' ? 1 : 0;
    const purchased = log.hasPurchased === true ? 1 : 0;
    const willingYes = log.willingToPurchase === true ? 1 : 0;

    const totalConnected = isConnected ? 1 : 0;
    const mobileValidityPct = isInvalid ? 0 : 100;
    const hygienePct =
      totalConnected > 0 ? Math.round(((totalConnected - identityWrong - notAFarmer) / totalConnected) * 100) : 0;
    const meetingValidityPct = totalConnected > 0 ? (yesAttended / totalConnected) * 100 : 0;
    const meetingConversionPct = totalConnected > 0 ? (purchased / totalConnected) * 100 : 0;
    const purchaseIntentionPct = totalConnected > 0 ? ((willingYes + purchased) / totalConnected) * 100 : 0;
    const emsScore = Math.round(
      (mobileValidityPct + meetingValidityPct + meetingConversionPct + purchaseIntentionPct) / 4
    );

    const sentiment = log.sentiment != null ? String(log.sentiment) : 'N/A';
    const relativeRemarks = `${first10Words(log.farmerComments)} + ${sentiment}`;

    rows.push({
      taskId: t._id?.toString() ?? '',
      groupKey: groupLabel,
      groupLabel,
      activityId: act._id?.toString() ?? '',
      activityDate: act.date ? new Date(act.date).toISOString().slice(0, 10) : '',
      farmerName: farmer?.name ?? '',
      farmerMobile: farmer?.mobileNumber ?? '',
      officerName: act.officerName ?? '',
      tmName: act.tmName ?? '',
      territoryName: act.territoryName ?? act.territory ?? '',
      zoneName: act.zoneName ?? '',
      buName: act.buName ?? '',
      state: act.state ?? '',
      totalAttempted: 1,
      connected: (isConnected ? 1 : 0) as 0 | 1,
      invalid: (isInvalid ? 1 : 0) as 0 | 1,
      identityWrong: identityWrong as 0 | 1,
      notAFarmer: notAFarmer as 0 | 1,
      yesAttended: yesAttended as 0 | 1,
      purchased: purchased as 0 | 1,
      willingYes: willingYes as 0 | 1,
      mobileValidityPct,
      hygienePct,
      meetingValidityPct,
      meetingConversionPct,
      purchaseIntentionPct,
      emsScore,
      relativeRemarks,
    });
  }

  return rows;
}

export type EmsTrendBucket = 'daily' | 'weekly' | 'monthly';

export interface EmsTrendRow {
  period: string;
  totalAttempted: number;
  totalConnected: number;
  emsScore: number;
  mobileValidityPct: number;
  meetingValidityPct: number;
  meetingConversionPct: number;
  purchaseIntentionPct: number;
}

/**
 * EMS trends: time-series of NBU-level metrics by period (daily, weekly, monthly).
 * Uses activity.date for bucketing. Same filters as EMS report.
 */
export async function getEmsReportTrends(
  filters: EmsProgressFilters | undefined,
  bucket: EmsTrendBucket
): Promise<EmsTrendRow[]> {
  const activityMatch = buildActivityMatch(filters);
  const activityCollection = Activity.collection.name;

  const activityIds = await Activity.find(activityMatch as any).select('_id').lean();
  const ids = activityIds.map((a: any) => a._id);
  if (ids.length === 0) return [];

  const dateFormat =
    bucket === 'monthly' ? '%Y-%m' : bucket === 'weekly' ? '%G-W%V' : '%Y-%m-%d';

  const agg = await CallTask.aggregate([
    {
      $match: {
        status: { $in: ['completed', 'not_reachable', 'invalid_number'] },
        callLog: { $exists: true, $ne: null },
        activityId: { $in: ids },
      },
    },
    {
      $lookup: {
        from: activityCollection,
        localField: 'activityId',
        foreignField: '_id',
        as: 'activity',
      },
    },
    { $unwind: '$activity' },
    {
      $addFields: {
        __period: { $dateToString: { format: dateFormat, date: '$activity.date' } },
        __isConnected: {
          $and: [
            { $eq: ['$callLog.callStatus', 'Connected'] },
            {
              $or: [
                { $and: [{ $ne: ['$callLog.didAttend', null] }, { $ne: [{ $type: '$callLog.didAttend' }, 'missing'] }] },
                { $eq: ['$callLog.hasPurchased', true] },
                { $eq: ['$callLog.willingToPurchase', true] },
              ],
            },
          ],
        },
        __isInvalid: { $in: ['$callLog.callStatus', ['Invalid', 'Invalid Number']] },
        __identityWrong: { $eq: ['$callLog.didAttend', 'Identity Wrong'] },
        __notAFarmer: { $eq: ['$callLog.didAttend', 'Not a Farmer'] },
        __yesAttended: { $eq: ['$callLog.didAttend', 'Yes, I attended'] },
        __purchased: { $eq: ['$callLog.hasPurchased', true] },
        __willingYes: { $eq: ['$callLog.willingToPurchase', true] },
      },
    },
    {
      $group: {
        _id: '$__period',
        totalAttempted: { $sum: 1 },
        totalConnected: { $sum: { $cond: ['$__isConnected', 1, 0] } },
        invalidCount: { $sum: { $cond: ['$__isInvalid', 1, 0] } },
        identityWrongCount: { $sum: { $cond: ['$__identityWrong', 1, 0] } },
        notAFarmerCount: { $sum: { $cond: ['$__notAFarmer', 1, 0] } },
        yesAttendedCount: { $sum: { $cond: ['$__yesAttended', 1, 0] } },
        purchasedCount: { $sum: { $cond: ['$__purchased', 1, 0] } },
        willingYesCount: { $sum: { $cond: ['$__willingYes', 1, 0] } },
      },
    },
  ]).exec();

  const rows: EmsTrendRow[] = [];
  for (const row of agg) {
    const period = row._id != null ? String(row._id) : '—';
    const totalAttempted = Number(row.totalAttempted || 0);
    const totalConnected = Number(row.totalConnected || 0);
    const invalidCount = Number(row.invalidCount || 0);
    const identityWrongCount = Number(row.identityWrongCount || 0);
    const notAFarmerCount = Number(row.notAFarmerCount || 0);
    const yesAttendedCount = Number(row.yesAttendedCount || 0);
    const purchasedCount = Number(row.purchasedCount || 0);
    const willingYesCount = Number(row.willingYesCount || 0);

    const mobileValidityPct =
      totalAttempted > 0 ? Math.round(((totalAttempted - invalidCount) / totalAttempted) * 100) : 0;
    const meetingValidityPct = totalConnected > 0 ? Math.round((yesAttendedCount / totalConnected) * 100) : 0;
    const meetingConversionPct = totalConnected > 0 ? Math.round((purchasedCount / totalConnected) * 100) : 0;
    const purchaseIntentionPct =
      totalConnected > 0 ? Math.round(((willingYesCount + purchasedCount) / totalConnected) * 100) : 0;
    const emsScore = Math.round(
      (mobileValidityPct + meetingValidityPct + meetingConversionPct + purchaseIntentionPct) / 4
    );

    rows.push({
      period,
      totalAttempted,
      totalConnected,
      emsScore,
      mobileValidityPct,
      meetingValidityPct,
      meetingConversionPct,
      purchaseIntentionPct,
    });
  }

  rows.sort((a, b) => a.period.localeCompare(b.period));
  return rows;
}
