import express, { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requirePermission } from '../middleware/rbac.js';
import { syncFFAData, getSyncStatus, getSyncProgress } from '../services/ffaSync.js';
import { Activity } from '../models/Activity.js';
import { Farmer } from '../models/Farmer.js';
import { CallTask } from '../models/CallTask.js';
import { SamplingAudit } from '../models/SamplingAudit.js';
import { CoolingPeriod } from '../models/CoolingPeriod.js';
import { SamplingConfig } from '../models/SamplingConfig.js';
import { MasterCrop, MasterProduct } from '../models/MasterData.js';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { getLanguageForState } from '../utils/stateLanguageMapper.js';
import logger from '../config/logger.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB
const TEMPLATE_FILENAME = 'ffa_ems_template.xlsx';

// ---------------------------------------------------------------------------
// GET /api/ffa/master-data – active crops & products for Mock FFA API (API-key protected, no JWT)
// Set FFA_MASTER_KEY on EMS backend; FFA (mock or real) sends X-FFA-Master-Key with same value.
// ---------------------------------------------------------------------------
router.get(
  '/master-data',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const expectedKey = process.env.FFA_MASTER_KEY;
      const providedKey = (req.headers['x-ffa-master-key'] as string)?.trim();

      if (!expectedKey || !expectedKey.trim()) {
        logger.warn('[FFA] Master-data endpoint: FFA_MASTER_KEY not set');
        return res.status(503).json({
          success: false,
          error: { message: 'Master-data for FFA is not configured (FFA_MASTER_KEY missing).' },
        });
      }
      if (providedKey !== expectedKey) {
        return res.status(401).json({
          success: false,
          error: { message: 'Invalid or missing X-FFA-Master-Key.' },
        });
      }

      const [crops, products] = await Promise.all([
        MasterCrop.find({ isActive: true }).select('name').sort({ name: 1 }).lean(),
        MasterProduct.find({ isActive: true }).select('name').sort({ name: 1 }).lean(),
      ]);

      const cropNames = crops.map((c: any) => (c.name || '').trim()).filter(Boolean);
      const productNames = products.map((p: any) => (p.name || '').trim()).filter(Boolean);

      res.json({
        success: true,
        data: {
          crops: cropNames,
          products: productNames,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// All other routes require authentication
router.use(authenticate);

type ExcelActivityRow = {
  activityId: string;
  type: string;
  date: string | number | Date;
  officerId: string;
  officerName: string;
  location: string;
  territory: string;
  state: string;
  territoryName?: string;
  zoneName?: string;
  buName?: string;
  tmEmpCode?: string;
  tmName?: string;
  crops?: string;
  products?: string;
};

type ExcelFarmerRow = {
  activityId: string;
  farmerId?: string;
  name: string;
  mobileNumber: string;
  location: string;
  photoUrl?: string;
  crops?: string;
};

const normalizeStr = (v: any) => String(v ?? '').trim();

const parseExcelDate = (value: any): Date => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error('Invalid date');
    return value;
  }

  // Excel serial number
  if (typeof value === 'number' && Number.isFinite(value)) {
    const d = XLSX.SSF.parse_date_code(value);
    if (!d) throw new Error('Invalid excel date');
    return new Date(d.y, d.m - 1, d.d);
  }

  const raw = normalizeStr(value);
  if (!raw) throw new Error('Invalid date (missing)');

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    const [ddStr, mmStr, yyyyStr] = raw.split('/');
    const dd = Number(ddStr);
    const mm = Number(mmStr);
    const yyyy = Number(yyyyStr);
    const d = new Date(yyyy, mm - 1, dd);
    if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) {
      throw new Error(`Invalid date (DD/MM/YYYY): ${raw}`);
    }
    return d;
  }

  // YYYY-MM-DD or ISO
  const d = new Date(raw.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00.000Z` : raw);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${raw}`);
  return d;
};

const splitCSVCell = (value: any): string[] => {
  const raw = normalizeStr(value);
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const formatDDMMYYYY = (d: Date): string => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
};

// @route   GET /api/ffa/sync-progress
// @desc    Get current FFA sync progress (for progress bar / polling)
// @access  Private (MIS Admin)
router.get(
  '/sync-progress',
  requirePermission('config.ffa'),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const progress = getSyncProgress();
      res.json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/ffa/sync
// @desc    Manually trigger FFA sync (MIS Admin only). Runs in background; client should poll GET /sync-progress.
// @access  Private (MIS Admin)
router.post(
  '/sync',
  requirePermission('config.ffa'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ffaApiUrl = process.env.FFA_API_URL || 'http://localhost:4000/api';
      const fullSync = req.query.fullSync === 'true' || req.body?.fullSync === true;

      logger.info(`[FFA SYNC] Manual FFA sync triggered (${fullSync ? 'full' : 'incremental'})`, {
        userId: (req as any).user?.id,
        userEmail: (req as any).user?.email,
        ffaApiUrl: ffaApiUrl,
        hasEnvVar: !!process.env.FFA_API_URL,
        fullSync,
      });

      // Run sync in background so client can poll progress
      syncFFAData(fullSync).catch((err) => {
        logger.error('[FFA SYNC] Background sync error:', err);
      });

      res.json({
        success: true,
        started: true,
        message: 'FFA sync started. Poll /api/ffa/sync-progress for progress.',
        data: { fullSync },
      });
    } catch (error) {
      const ffaApiUrl = process.env.FFA_API_URL || 'http://localhost:4000/api';
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error('FFA sync endpoint error:', {
        error: errorMessage,
        ffaApiUrl: ffaApiUrl,
        hasEnvVar: !!process.env.FFA_API_URL,
      });

      const statusCode = errorMessage.includes('Cannot connect') || errorMessage.includes('timeout') ? 503 : 500;
      res.status(statusCode).json({
        success: false,
        message: `FFA sync failed to start: ${errorMessage}`,
        error: errorMessage,
        details: { ffaApiUrl: ffaApiUrl, hasEnvVar: !!process.env.FFA_API_URL },
      });
    }
  }
);

// @route   GET /api/ffa/excel-template
// @desc    Download Excel template (2 sheets: Activities + Farmers) with sample rows
// @access  Private (MIS Admin)
router.get(
  '/excel-template',
  requirePermission('config.ffa'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const wb = XLSX.utils.book_new();

      const activitiesSample = [
        {
          activityId: 'FFA-ACT-EX-0001',
          type: 'Field Day',
          date: formatDDMMYYYY(new Date()),
          officerId: 'FDA-0001',
          officerName: 'Officer Name',
          tmEmpCode: 'TM-0001',
          tmName: 'TM Name',
          location: 'Village Name',
          territory: 'Karnataka Zone',
          state: 'Karnataka',
          territoryName: 'Karnataka Zone',
          zoneName: 'South Zone',
          buName: 'BU - Seeds',
          crops: 'Rice,Wheat',
          products: 'NACL Pro,NACL Gold',
        },
      ];

      const farmersSample = [
        {
          activityId: 'FFA-ACT-EX-0001',
          farmerId: 'FFA-FARM-EX-1',
          name: 'Farmer Name',
          mobileNumber: '9000000000',
          location: 'Village, District, State',
          photoUrl: '',
          crops: 'Rice',
        },
        {
          activityId: 'FFA-ACT-EX-0001',
          farmerId: 'FFA-FARM-EX-2',
          name: 'Farmer Name 2',
          mobileNumber: '9000000001',
          location: 'Village, District, State',
          photoUrl: '',
          crops: 'Wheat',
        },
      ];

      const wsActivities = XLSX.utils.json_to_sheet(activitiesSample, { skipHeader: false });
      const wsFarmers = XLSX.utils.json_to_sheet(farmersSample, { skipHeader: false });
      XLSX.utils.book_append_sheet(wb, wsActivities, 'Activities');
      XLSX.utils.book_append_sheet(wb, wsFarmers, 'Farmers');

      const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${TEMPLATE_FILENAME}"`);
      res.status(200).send(buf);
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/ffa/import-excel
// @desc    Import Activities + Farmers via Excel (2 sheets) as fallback when FFA API is unavailable
// @access  Private (MIS Admin)
router.post(
  '/import-excel',
  requirePermission('config.ffa'),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ success: false, error: { message: 'Missing file. Use multipart/form-data with field name "file".' } });
      }

      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const activitiesSheetName = workbook.SheetNames.find((n) => n.toLowerCase() === 'activities');
      const farmersSheetName = workbook.SheetNames.find((n) => n.toLowerCase() === 'farmers');

      if (!activitiesSheetName || !farmersSheetName) {
        return res.status(400).json({
          success: false,
          error: { message: 'Workbook must include 2 sheets named exactly: Activities, Farmers' },
        });
      }

      const activitiesSheet = workbook.Sheets[activitiesSheetName];
      const farmersSheet = workbook.Sheets[farmersSheetName];

      const activitiesRows = XLSX.utils.sheet_to_json<ExcelActivityRow>(activitiesSheet, { defval: '', raw: true });
      const farmersRows = XLSX.utils.sheet_to_json<ExcelFarmerRow>(farmersSheet, { defval: '', raw: true });

      const errors: Array<{ sheet: 'Activities' | 'Farmers'; row: number; message: string }> = [];

      // Build activity map
      const activityById = new Map<string, ExcelActivityRow>();
      activitiesRows.forEach((r, idx) => {
        const rowNum = idx + 2; // header row + 1
        const activityId = normalizeStr((r as any).activityId);
        if (!activityId) {
          errors.push({ sheet: 'Activities', row: rowNum, message: 'Missing activityId' });
          return;
        }
        activityById.set(activityId, r);
      });

      let activitiesUpserted = 0;
      let farmersUpserted = 0;
      let linksUpdated = 0;

      // Group farmers by activityId
      const farmersByActivity = new Map<string, ExcelFarmerRow[]>();
      farmersRows.forEach((r, idx) => {
        const rowNum = idx + 2;
        const activityId = normalizeStr((r as any).activityId);
        if (!activityId) {
          errors.push({ sheet: 'Farmers', row: rowNum, message: 'Missing activityId' });
          return;
        }
        if (!farmersByActivity.has(activityId)) farmersByActivity.set(activityId, []);
        farmersByActivity.get(activityId)!.push(r);
      });

      for (const [activityId, activityRow] of activityById.entries()) {
        try {
          const type = normalizeStr((activityRow as any).type);
          const officerId = normalizeStr((activityRow as any).officerId);
          const officerName = normalizeStr((activityRow as any).officerName);
          const location = normalizeStr((activityRow as any).location);
          const territory = normalizeStr((activityRow as any).territory);
          const state = normalizeStr((activityRow as any).state);

          if (!type || !officerId || !officerName || !location || !territory || !state) {
            throw new Error('Missing one or more required fields: type, officerId, officerName, location, territory, state');
          }

          const date = parseExcelDate((activityRow as any).date);

          const preferredLanguage = await getLanguageForState(state);

          const upserted = await Activity.findOneAndUpdate(
            { activityId },
            {
              $set: {
                activityId,
                type,
                date,
                officerId,
                officerName,
                location,
                territory,
                state,
                territoryName: normalizeStr((activityRow as any).territoryName || territory),
                zoneName: normalizeStr((activityRow as any).zoneName || ''),
                buName: normalizeStr((activityRow as any).buName || ''),
                tmEmpCode: normalizeStr((activityRow as any).tmEmpCode || ''),
                tmName: normalizeStr((activityRow as any).tmName || ''),
                crops: splitCSVCell((activityRow as any).crops),
                products: splitCSVCell((activityRow as any).products),
                syncedAt: new Date(),
              },
              $setOnInsert: {
                lifecycleStatus: 'active',
                lifecycleUpdatedAt: new Date(),
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          activitiesUpserted += 1;

          const farmerRowsForActivity = farmersByActivity.get(activityId) || [];
          const farmerIds: any[] = [];
          const seenMobile = new Set<string>();

          for (let i = 0; i < farmerRowsForActivity.length; i++) {
            const fr = farmerRowsForActivity[i];
            const rowNum = farmersRows.indexOf(fr) + 2; // approximate row number

            const name = normalizeStr((fr as any).name);
            const mobileNumber = normalizeStr((fr as any).mobileNumber);
            const farmerLocation = normalizeStr((fr as any).location);
            // Farmer-level territory column is not expected in Excel anymore; derive from Activity.
            const farmerTerritory = normalizeStr(upserted.territoryName || upserted.territory);
            const photoUrl = normalizeStr((fr as any).photoUrl || '');

            if (!name || !mobileNumber || !farmerLocation) {
              errors.push({ sheet: 'Farmers', row: rowNum, message: `Missing required farmer fields (name/mobileNumber/location) for activityId=${activityId}` });
              continue;
            }
            if (seenMobile.has(mobileNumber)) continue;
            seenMobile.add(mobileNumber);

            const farmer = await Farmer.findOneAndUpdate(
              { mobileNumber },
              {
                name,
                mobileNumber,
                location: farmerLocation,
                preferredLanguage,
                territory: farmerTerritory || 'Unknown',
                photoUrl: photoUrl || undefined,
              },
              { upsert: true, new: true }
            );
            farmersUpserted += 1;
            farmerIds.push(farmer._id);
          }

          // Replace/Set farmerIds from Excel for this activity (deduped)
          upserted.farmerIds = farmerIds;
          await upserted.save();
          linksUpdated += 1;
        } catch (e: any) {
          errors.push({ sheet: 'Activities', row: 0, message: `activityId=${activityId}: ${e?.message || String(e)}` });
        }
      }

      res.json({
        success: true,
        message: `Excel import completed: ${activitiesUpserted} activities processed, ${farmersUpserted} farmers upserted`,
        data: {
          activitiesRows: activitiesRows.length,
          farmersRows: farmersRows.length,
          activitiesUpserted,
          farmersUpserted,
          linksUpdated,
          errorsCount: errors.length,
          errors: errors.slice(0, 200),
        },
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
      
      // DEV SAFE RESET (Option A):
      // Delete operational/synced data, preserve users/master data.
      const taskResult = await CallTask.deleteMany({});
      const auditResult = await SamplingAudit.deleteMany({});
      const coolingResult = await CoolingPeriod.deleteMany({});
      const samplingConfigResult = await SamplingConfig.deleteMany({});
      const activityResult = await Activity.deleteMany({});
      const farmerResult = await Farmer.deleteMany({});
      
      logger.info(
        `Cleared ${farmerResult.deletedCount} farmers, ${activityResult.deletedCount} activities, ${taskResult.deletedCount} tasks`
      );

      res.json({
        success: true,
        message: 'Dev operational data cleared successfully',
        data: {
          tasksDeleted: taskResult.deletedCount,
          samplingAuditsDeleted: auditResult.deletedCount,
          coolingPeriodsDeleted: coolingResult.deletedCount,
          samplingConfigsDeleted: samplingConfigResult.deletedCount,
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

