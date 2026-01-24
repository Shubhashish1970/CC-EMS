import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { adminAPI, ffaAPI } from '../../services/api';
import { Loader2, Filter, RefreshCw, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, Calendar, MapPin, Users as UsersIcon, Activity as ActivityIcon, Phone, User as UserIcon, CheckCircle2, Download, BarChart3, ArrowDownToLine, ArrowUpToLine } from 'lucide-react';
import Button from '../shared/Button';
import { getTaskStatusLabel } from '../../utils/taskStatusLabels';

interface ActivitySamplingStatus {
  activity: {
    _id: string;
    type: string;
    date: string;
    officerName: string;
    location: string;
    territory: string;
    farmerIds: string[];
    crops?: string[];
    products?: string[];
  };
  samplingStatus: 'sampled' | 'not_sampled' | 'partial';
  samplingAudit?: {
    samplingPercentage: number;
    totalFarmers: number;
    sampledCount: number;
    createdAt: string;
  };
  tasksCount: number;
  assignedAgents: Array<{
    agentId: string;
    agentName: string;
    agentEmail: string;
    tasksCount: number;
  }>;
  statusBreakdown: {
    sampled_in_queue: number;
    in_progress: number;
    completed: number;
    not_reachable: number;
    invalid_number: number;
  };
  farmers?: Array<{
    farmerId: string;
    name: string;
    mobileNumber: string;
    preferredLanguage: string;
    location: string;
    photoUrl?: string;
    isSampled: boolean;
    taskId?: string;
    assignedAgentId?: string;
    assignedAgentName?: string;
    taskStatus?: string;
  }>;
}

type ActivityTableColumnKey =
  | 'expand'
  | 'type'
  | 'samplingStatus'
  | 'date'
  | 'territory'
  | 'bu'
  | 'officer'
  | 'farmersTotal'
  | 'farmersSampled'
  | 'tasksTotal'
  | 'inQueue'
  | 'inProgress'
  | 'completed';

const DEFAULT_ACTIVITY_TABLE_WIDTHS: Record<ActivityTableColumnKey, number> = {
  expand: 56,
  type: 180,
  samplingStatus: 140,
  date: 130,
  territory: 240,
  bu: 170,
  officer: 220,
  farmersTotal: 130,
  farmersSampled: 150,
  tasksTotal: 110,
  inQueue: 110,
  inProgress: 120,
  completed: 110,
};

const ActivitySamplingView: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [activities, setActivities] = useState<ActivitySamplingStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<any | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState<number>(() => {
    const raw = localStorage.getItem('admin.activitySampling.pageSize');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 50;
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [isIncrementalSyncing, setIsIncrementalSyncing] = useState(false);
  const [isFullSyncing, setIsFullSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ lastSyncAt: string | null; totalActivities: number; totalFarmers: number } | null>(null);
  const [dataSource, setDataSource] = useState<'api' | 'excel'>(() => {
    const v = localStorage.getItem('admin.activitySampling.dataSource');
    return v === 'excel' ? 'excel' : 'api';
  });
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const [importReport, setImportReport] = useState<any | null>(null);
  const [tableSort, setTableSort] = useState<{ key: ActivityTableColumnKey; dir: 'asc' | 'desc' }>(() => {
    const raw = localStorage.getItem('admin.activitySampling.tableSort');
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.key && (parsed.dir === 'asc' || parsed.dir === 'desc')) return parsed;
    } catch {
      // ignore
    }
    return { key: 'date', dir: 'desc' };
  });
  const [tableColumnWidths, setTableColumnWidths] = useState<Record<ActivityTableColumnKey, number>>(() => {
    const raw = localStorage.getItem('admin.activitySampling.tableColumnWidths');
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') return { ...DEFAULT_ACTIVITY_TABLE_WIDTHS, ...parsed };
    } catch {
      // ignore
    }
    return { ...DEFAULT_ACTIVITY_TABLE_WIDTHS };
  });
  const resizingRef = useRef<{ key: ActivityTableColumnKey; startX: number; startWidth: number } | null>(null);
  const [filters, setFilters] = useState({
    activityType: '',
    territory: '',
    zone: '',
    bu: '',
    samplingStatus: '' as 'sampled' | 'not_sampled' | 'partial' | '',
    dateFrom: '',
    dateTo: '',
  });
  type DateRangePreset =
    | 'Custom'
    | 'Today'
    | 'Yesterday'
    | 'This week (Sun - Today)'
    | 'Last 7 days'
    | 'Last week (Sun - Sat)'
    | 'Last 28 days'
    | 'Last 30 days';

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('Last 7 days');
  const [draftStart, setDraftStart] = useState(''); // YYYY-MM-DD
  const [draftEnd, setDraftEnd] = useState(''); // YYYY-MM-DD
  const datePickerRef = useRef<HTMLDivElement | null>(null);

  const toISODate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatPretty = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getPresetRange = (preset: DateRangePreset): { start: string; end: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const end = new Date(today);
    const start = new Date(today);

    const day = today.getDay(); // 0=Sun

    switch (preset) {
      case 'Today':
        return { start: toISODate(today), end: toISODate(today) };
      case 'Yesterday': {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return { start: toISODate(y), end: toISODate(y) };
      }
      case 'This week (Sun - Today)': {
        const s = new Date(today);
        s.setDate(s.getDate() - day);
        return { start: toISODate(s), end: toISODate(today) };
      }
      case 'Last 7 days': {
        const s = new Date(today);
        s.setDate(s.getDate() - 6);
        return { start: toISODate(s), end: toISODate(today) };
      }
      case 'Last week (Sun - Sat)': {
        const lastSat = new Date(today);
        lastSat.setDate(lastSat.getDate() - (day + 1));
        const lastSun = new Date(lastSat);
        lastSun.setDate(lastSun.getDate() - 6);
        return { start: toISODate(lastSun), end: toISODate(lastSat) };
      }
      case 'Last 28 days': {
        const s = new Date(today);
        s.setDate(s.getDate() - 27);
        return { start: toISODate(s), end: toISODate(today) };
      }
      case 'Last 30 days': {
        const s = new Date(today);
        s.setDate(s.getDate() - 29);
        return { start: toISODate(s), end: toISODate(today) };
      }
      case 'Custom':
      default:
        return { start: filters.dateFrom || toISODate(start), end: filters.dateTo || toISODate(end) };
    }
  };

  const syncDraftFromFilters = () => {
    const start = filters.dateFrom || getPresetRange(selectedPreset).start;
    const end = filters.dateTo || getPresetRange(selectedPreset).end;
    setDraftStart(start);
    setDraftEnd(end);
  };

  // Apply default date range on first load (Last 7 days) if user hasn't set any dates yet
  useEffect(() => {
    if (filters.dateFrom || filters.dateTo) return;
    const range = getPresetRange('Last 7 days');
    setFilters((prev) => ({ ...prev, dateFrom: range.start, dateTo: range.end }));
    setDraftStart(range.start);
    setDraftEnd(range.end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [filterOptions, setFilterOptions] = useState<{ territoryOptions: string[]; zoneOptions: string[]; buOptions: string[] }>({
    territoryOptions: [],
    zoneOptions: [],
    buOptions: [],
  });

  const fetchFilterOptions = async () => {
    try {
      const res: any = await adminAPI.getActivitiesSamplingFilterOptions({
        activityType: filters.activityType || undefined,
        territory: filters.territory || undefined,
        zone: filters.zone || undefined,
        bu: filters.bu || undefined,
        samplingStatus: filters.samplingStatus || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      if (res?.success && res?.data) {
        setFilterOptions({
          territoryOptions: Array.isArray(res.data.territoryOptions) ? res.data.territoryOptions : [],
          zoneOptions: Array.isArray(res.data.zoneOptions) ? res.data.zoneOptions : [],
          buOptions: Array.isArray(res.data.buOptions) ? res.data.buOptions : [],
        });
      }
    } catch {
      // ignore; don't block UI
    }
  };

  useEffect(() => {
    if (!isDatePickerOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isDatePickerOpen]);

  useEffect(() => {
    fetchFilterOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.activityType,
    filters.territory,
    filters.zone,
    filters.bu,
    filters.samplingStatus,
    filters.dateFrom,
    filters.dateTo,
  ]);

  const fetchActivities = async (page: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getActivitiesWithSampling({
        ...filters,
        samplingStatus: filters.samplingStatus || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page,
        limit: pageSize,
      }) as any;

      if (response.success && response.data) {
        const activitiesData = response.data.activities || [];
        console.log('Activities received:', activitiesData.length);
        if (activitiesData.length > 0) {
          console.log('Sample activity:', {
            id: activitiesData[0].activity?._id,
            farmersArray: activitiesData[0].farmers,
            farmersCount: activitiesData[0].farmers?.length || 0,
            totalFarmers: activitiesData[0].activity?.farmerIds?.length || 0,
          });
        }
        setActivities(activitiesData);
        setPagination(response.data.pagination || { page: 1, limit: pageSize, total: 0, pages: 1 });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load activities';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    setIsStatsLoading(true);
    try {
      const res: any = await adminAPI.getActivitiesSamplingStats({
        ...filters,
        samplingStatus: filters.samplingStatus || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      if (res?.success && res?.data) {
        setStatsData(res.data);
      }
    } catch (err) {
      // Non-blocking: keep UI usable even if stats fail
      console.error('Failed to fetch activity sampling stats:', err);
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(1);
    fetchSyncStatus();
    fetchStats();
  }, [filters.activityType, filters.territory, filters.zone, filters.bu, filters.samplingStatus, filters.dateFrom, filters.dateTo, pageSize]);

  useEffect(() => {
    localStorage.setItem('admin.activitySampling.dataSource', dataSource);
  }, [dataSource]);

  useEffect(() => {
    localStorage.setItem('admin.activitySampling.pageSize', String(pageSize));
  }, [pageSize]);

  useEffect(() => {
    localStorage.setItem('admin.activitySampling.tableSort', JSON.stringify(tableSort));
  }, [tableSort]);

  useEffect(() => {
    localStorage.setItem('admin.activitySampling.tableColumnWidths', JSON.stringify(tableColumnWidths));
  }, [tableColumnWidths]);

  const fetchSyncStatus = async () => {
    try {
      const response = await ffaAPI.getFFASyncStatus() as any;
      if (response.success && response.data) {
        setSyncStatus(response.data);
      }
    } catch (err) {
      // Silently fail - sync status is not critical
      console.error('Failed to fetch sync status:', err);
    }
  };

  const handleSyncFFA = async (fullSync: boolean = false) => {
    if (dataSource !== 'api') {
      showError('Data source is Excel. Switch to API to use Sync options.');
      return;
    }
    // Set appropriate loading state based on sync type
    if (fullSync) {
      setIsFullSyncing(true);
    } else {
      setIsIncrementalSyncing(true);
    }
    
    try {
      const response = await ffaAPI.syncFFAData(fullSync) as any;
      if (response.success) {
        const syncType = response.data.syncType || 'incremental';
        showSuccess(`FFA sync completed (${syncType}): ${response.data.activitiesSynced} activities, ${response.data.farmersSynced} farmers synced`);
        // Refresh activities and sync status
        await fetchActivities(pagination.page);
        await fetchSyncStatus();
      } else {
        showError('FFA sync failed');
      }
    } catch (err: any) {
      showError(err.message || 'Failed to sync FFA data');
    } finally {
      // Clear appropriate loading state
      if (fullSync) {
        setIsFullSyncing(false);
      } else {
        setIsIncrementalSyncing(false);
      }
    }
  };

  const handleImportExcel = async () => {
    if (!excelFile) {
      showError('Please choose an Excel file first.');
      return;
    }
    setIsImportingExcel(true);
    setImportReport(null);
    try {
      const res = await ffaAPI.importExcel(excelFile);
      setImportReport(res?.data || res);
      showSuccess('Excel imported successfully');
      // Refresh UI
      await fetchActivities(1);
      await fetchSyncStatus();
    } catch (err: any) {
      showError(err?.message || 'Failed to import Excel');
    } finally {
      setIsImportingExcel(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await ffaAPI.downloadExcelTemplate();
    } catch (err: any) {
      showError(err?.message || 'Failed to download template');
    }
  };

  const handleDownloadActivitiesExport = async () => {
    setIsExporting(true);
    try {
      await adminAPI.downloadActivitiesSamplingExport({
        ...filters,
        samplingStatus: filters.samplingStatus || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page: pagination.page,
        limit: pageSize,
      });
      showSuccess('Excel downloaded');
    } catch (err: any) {
      showError(err?.message || 'Failed to download excel');
    } finally {
      setIsExporting(false);
    }
  };

  const getSamplingStatusBadge = (status: 'sampled' | 'not_sampled' | 'partial') => {
    const config = {
      sampled: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Sampled' },
      not_sampled: { icon: XCircle, color: 'bg-slate-100 text-slate-800 border-slate-200', label: 'Not Sampled' },
      partial: { icon: AlertCircle, color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Partial' },
    };
    const { icon: Icon, color, label } = config[status];
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${color}`}>
        <Icon size={14} />
        {label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const toggleExpand = (activityId: string) => {
    setExpandedActivity(expandedActivity === activityId ? null : activityId);
  };

  const getSortValue = (item: ActivitySamplingStatus, key: ActivityTableColumnKey): string | number => {
    const a: any = item.activity as any;
    switch (key) {
      case 'expand':
        return 0;
      case 'type':
        return (item.activity.type || '').toLowerCase();
      case 'samplingStatus':
        return item.samplingStatus;
      case 'date':
        return new Date(item.activity.date).getTime() || 0;
      case 'territory':
        return ((a.territoryName || item.activity.territory || '') as string).toLowerCase();
      case 'bu':
        return ((a.buName || '') as string).toLowerCase();
      case 'officer':
        return (item.activity.officerName || '').toLowerCase();
      case 'farmersTotal':
        return item.activity.farmerIds?.length || 0;
      case 'farmersSampled':
        return item.samplingAudit?.sampledCount || 0;
      case 'tasksTotal': {
        const b = item.statusBreakdown;
        if (b) {
          return (b.sampled_in_queue || 0) + (b.in_progress || 0) + (b.completed || 0) + (b.not_reachable || 0) + (b.invalid_number || 0);
        }
        return item.tasksCount || 0;
      }
      case 'inQueue':
        return item.statusBreakdown?.sampled_in_queue || 0;
      case 'inProgress':
        return item.statusBreakdown?.in_progress || 0;
      case 'completed':
        return item.statusBreakdown?.completed || 0;
      default:
        return '';
    }
  };

  const sortedActivities = useMemo(() => {
    const { key, dir } = tableSort;
    const mapped = activities.map((item, idx) => ({ item, idx }));
    mapped.sort((x, y) => {
      const ax = getSortValue(x.item, key);
      const ay = getSortValue(y.item, key);
      let cmp = 0;
      if (typeof ax === 'number' && typeof ay === 'number') {
        cmp = ax - ay;
      } else {
        cmp = String(ax).localeCompare(String(ay));
      }
      if (cmp === 0) return x.idx - y.idx; // stable
      return dir === 'asc' ? cmp : -cmp;
    });
    return mapped.map((m) => m.item);
  }, [activities, tableSort]);

  const handleHeaderClick = (key: ActivityTableColumnKey) => {
    setTableSort((prev) => {
      if (prev.key === key) return { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      return { key, dir: 'asc' };
    });
  };

  const startResize = (e: React.MouseEvent, key: ActivityTableColumnKey) => {
    e.preventDefault();
    e.stopPropagation();
    const startWidth = tableColumnWidths[key] ?? DEFAULT_ACTIVITY_TABLE_WIDTHS[key];
    resizingRef.current = { key, startX: e.clientX, startWidth };

    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const dx = ev.clientX - resizingRef.current.startX;
      const next = Math.max(80, resizingRef.current.startWidth + dx);
      setTableColumnWidths((prev) => ({ ...prev, [resizingRef.current!.key]: next }));
    };
    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const calculateStatistics = () => {
    const stats = {
      totalActivities: activities.length,
      activitiesWithSampling: 0, // Activities that have any sampling (sampled + partial)
      activitiesFullySampled: 0, // Activities where all farmers were sampled
      activitiesPartiallySampled: 0, // Activities where only some farmers were sampled
      activitiesNotSampled: 0,
      totalFarmers: 0,
      farmersSampled: 0,
      totalTasks: 0, // Use statusBreakdown sum as source of truth (ensures all tasks have status)
      tasksSampledInQueue: 0,
      tasksInProgress: 0,
      tasksCompleted: 0,
      tasksNotReachable: 0,
      tasksInvalidNumber: 0,
      tasksWithMismatch: 0, // Track activities where tasksCount != statusBreakdown sum
    };

    activities.forEach((item) => {
      // Count activities by sampling status
      if (item.samplingStatus === 'sampled') {
        stats.activitiesWithSampling++;
        stats.activitiesFullySampled++;
      } else if (item.samplingStatus === 'partial') {
        stats.activitiesWithSampling++;
        stats.activitiesPartiallySampled++;
      } else if (item.samplingStatus === 'not_sampled') {
        stats.activitiesNotSampled++;
      }

      // Count farmers
      const totalFarmersInActivity = item.activity.farmerIds?.length || 0;
      stats.totalFarmers += totalFarmersInActivity;
      
      if (item.samplingAudit) {
        stats.farmersSampled += item.samplingAudit.sampledCount;
      }

      // Count tasks by status from breakdown (this is the accurate count)
      // Each task must have a status, so statusBreakdown sum = actual task count
      if (item.statusBreakdown) {
        const statusSum = 
          (item.statusBreakdown.sampled_in_queue || 0) +
          (item.statusBreakdown.in_progress || 0) +
          (item.statusBreakdown.completed || 0) +
          (item.statusBreakdown.not_reachable || 0) +
          (item.statusBreakdown.invalid_number || 0);
        
        stats.totalTasks += statusSum;
        stats.tasksSampledInQueue += item.statusBreakdown.sampled_in_queue || 0;
        stats.tasksInProgress += item.statusBreakdown.in_progress || 0;
        stats.tasksCompleted += item.statusBreakdown.completed || 0;
        stats.tasksNotReachable += item.statusBreakdown.not_reachable || 0;
        stats.tasksInvalidNumber += item.statusBreakdown.invalid_number || 0;

        // Validate: tasksCount should equal statusBreakdown sum
        if (item.tasksCount && item.tasksCount !== statusSum) {
          stats.tasksWithMismatch++;
          console.warn(`Activity ${item.activity._id}: tasksCount (${item.tasksCount}) != statusBreakdown sum (${statusSum})`);
        }
      } else if (item.tasksCount) {
        // Fallback: if no statusBreakdown, use tasksCount
        stats.totalTasks += item.tasksCount;
      }
    });

    return stats;
  };

  const statistics = statsData || calculateStatistics();

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Activity Monitoring</h2>
            <p className="text-sm text-slate-600">Monitor FFA activities and their status</p>
            {syncStatus && (
              <p className="text-xs text-slate-500 mt-1">
                Last sync: {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString() : 'Never'} • 
                {syncStatus.totalActivities} activities • {syncStatus.totalFarmers} farmers
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {/* iPhone-style toggle */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Source</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-black ${dataSource === 'api' ? 'text-slate-900' : 'text-slate-400'}`}>API</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={dataSource === 'excel'}
                  onClick={() => setDataSource((p) => (p === 'api' ? 'excel' : 'api'))}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
                    dataSource === 'excel' ? 'bg-green-700 border-green-700' : 'bg-slate-200 border-slate-300'
                  }`}
                  title="Toggle data source"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      dataSource === 'excel' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-xs font-black ${dataSource === 'excel' ? 'text-slate-900' : 'text-slate-400'}`}>Excel</span>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              Filters
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchActivities(pagination.page)}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSyncFFA(false)}
              disabled={dataSource !== 'api' || isIncrementalSyncing || isFullSyncing}
              title="Incremental sync: Only syncs new activities since last sync"
            >
              <Download size={16} className={isIncrementalSyncing ? 'animate-spin' : ''} />
              {isIncrementalSyncing ? 'Syncing...' : 'Sync FFA'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSyncFFA(true)}
              disabled={dataSource !== 'api' || isIncrementalSyncing || isFullSyncing}
              title="Full sync: Syncs all activities (takes longer)"
            >
              <Download size={16} className={isFullSyncing ? 'animate-spin' : ''} />
              {isFullSyncing ? 'Full Syncing...' : 'Full Sync'}
            </Button>
          </div>
        </div>

        {dataSource === 'excel' && (
          <div className="mt-3 pt-3 border-t border-slate-200">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex flex-col gap-3">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest">
                    Upload Excel (2 sheets: Activities + Farmers)
                </label>

                <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                  <div className="flex-1">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setExcelFile(f);
                        setImportReport(null);
                      }}
                      className="w-full h-10 px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
                    />
                  </div>

                  <div className="flex items-center gap-3 md:flex-shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center justify-center h-10 w-10 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    title="Download Excel template"
                  >
                    <ArrowDownToLine size={18} />
                  </button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleImportExcel}
                    disabled={!excelFile || isImportingExcel}
                    title="Upload and import activities & farmers"
                    className="h-10"
                  >
                    <ArrowUpToLine size={16} className={isImportingExcel ? 'animate-spin' : ''} />
                    {isImportingExcel ? 'Importing...' : 'Upload & Import'}
                  </Button>
                  </div>
                </div>

                <p className="text-xs text-slate-500">
                  Excel must include sheet names exactly: <span className="font-bold">Activities</span> and{' '}
                  <span className="font-bold">Farmers</span>. Date format: <span className="font-bold">DD/MM/YYYY</span>.
                </p>
              </div>

              {importReport && (
                <div className="mt-4 text-sm text-slate-700">
                  <div className="font-black text-slate-900 mb-1">Import Summary</div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activities upserted</div>
                      <div className="text-lg font-black text-slate-900">{importReport.activitiesUpserted ?? 0}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Farmers upserted</div>
                      <div className="text-lg font-black text-slate-900">{importReport.farmersUpserted ?? 0}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Links updated</div>
                      <div className="text-lg font-black text-slate-900">{importReport.linksUpdated ?? 0}</div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 p-3">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Errors</div>
                      <div className="text-lg font-black text-slate-900">{importReport.errorsCount ?? 0}</div>
                    </div>
                  </div>

                  {Array.isArray(importReport.errors) && importReport.errors.length > 0 && (
                    <div className="mt-3 text-xs text-slate-700">
                      <div className="font-black text-slate-900 mb-1">Errors (first {importReport.errors.length})</div>
                      <div className="max-h-40 overflow-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-slate-400">Sheet</th>
                              <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-slate-400">Row</th>
                              <th className="text-left px-3 py-2 font-black uppercase tracking-widest text-slate-400">Message</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {importReport.errors.map((e: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-3 py-2">{e.sheet}</td>
                                <td className="px-3 py-2">{e.row}</td>
                                <td className="px-3 py-2">{e.message}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Activity Type
                </label>
                <select
                  value={filters.activityType}
                  onChange={(e) => setFilters({ ...filters, activityType: e.target.value })}
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Types</option>
                  <option value="Field Day">Field Day</option>
                  <option value="Group Meeting">Group Meeting</option>
                  <option value="Demo Visit">Demo Visit</option>
                  <option value="OFM">OFM</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Territory
                </label>
                <select
                  value={filters.territory}
                  onChange={(e) => setFilters({ ...filters, territory: e.target.value })}
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Territories</option>
                  {filterOptions.territoryOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Zone
                </label>
                <select
                  value={filters.zone}
                  onChange={(e) => setFilters({ ...filters, zone: e.target.value })}
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Zones</option>
                  {filterOptions.zoneOptions.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  BU
                </label>
                <select
                  value={filters.bu}
                  onChange={(e) => setFilters({ ...filters, bu: e.target.value })}
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All BUs</option>
                  {filterOptions.buOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Sampling Status
                </label>
                <select
                  value={filters.samplingStatus}
                  onChange={(e) => setFilters({ ...filters, samplingStatus: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Statuses</option>
                  <option value="sampled">Sampled</option>
                  <option value="not_sampled">Not Sampled</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Date Range
                </label>
                <div className="relative" ref={datePickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDatePickerOpen((prev) => {
                        const next = !prev;
                        if (!prev && next) {
                          syncDraftFromFilters();
                        }
                        return next;
                      });
                    }}
                    className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-between"
                  >
                    <span className="truncate">
                      {selectedPreset}
                      {filters.dateFrom && filters.dateTo ? ` • ${formatPretty(filters.dateFrom)} - ${formatPretty(filters.dateTo)}` : ''}
                    </span>
                    <span className="text-slate-400 font-black">▾</span>
                  </button>

                  {isDatePickerOpen && (
                    <div className="absolute z-50 mt-2 w-[720px] max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                      <div className="flex">
                        {/* Presets */}
                        <div className="w-56 border-r border-slate-200 bg-slate-50 p-2">
                          {([
                            'Custom',
                            'Today',
                            'Yesterday',
                            'This week (Sun - Today)',
                            'Last 7 days',
                            'Last week (Sun - Sat)',
                            'Last 28 days',
                            'Last 30 days',
                          ] as DateRangePreset[]).map((p) => {
                            const isActive = selectedPreset === p;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => {
                                  setSelectedPreset(p);
                                  const { start, end } = getPresetRange(p);
                                  setDraftStart(start);
                                  setDraftEnd(end);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
                                  isActive ? 'bg-white border border-slate-200 text-slate-900' : 'text-slate-700 hover:bg-white'
                                }`}
                              >
                                {p}
                              </button>
                            );
                          })}
                        </div>

                        {/* Date inputs */}
                        <div className="flex-1 p-4">
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <div className="flex-1">
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                Start date
                              </p>
                <input
                  type="date"
                                value={draftStart}
                                onChange={(e) => {
                                  setSelectedPreset('Custom');
                                  setDraftStart(e.target.value);
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
                            <div className="flex-1">
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                End date
                              </p>
                <input
                  type="date"
                                value={draftEnd}
                                onChange={(e) => {
                                  setSelectedPreset('Custom');
                                  setDraftEnd(e.target.value);
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setIsDatePickerOpen(false);
                                // revert draft to current filters
                                syncDraftFromFilters();
                              }}
                              className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFilters((prev) => ({
                                  ...prev,
                                  dateFrom: draftStart || '',
                                  dateTo: draftEnd || '',
                                }));
                                setIsDatePickerOpen(false);
                              }}
                              className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-green-700 hover:bg-green-800"
                            >
                              Apply
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Statistics Dashboard */}
      {!isStatsLoading && (statsData ? (statistics?.totalActivities || 0) > 0 : (!isLoading && activities.length > 0)) && (
        <div className="bg-white rounded-3xl p-4 mb-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-green-700" size={18} />
              <h2 className="text-base font-black text-slate-900">Statistics</h2>
            </div>
            <button
              type="button"
              onClick={handleDownloadActivitiesExport}
              disabled={isLoading || isExporting}
              className={`flex items-center justify-center h-10 w-10 rounded-2xl border transition-colors ${
                isExporting
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-white border-slate-200 text-green-700 hover:bg-slate-50'
              }`}
              title="Download Excel (matches current filters and page)"
            >
              <ArrowDownToLine size={18} className={isExporting ? 'animate-spin' : ''} />
            </button>
          </div>
          
          {/* Compact Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
            {/* Activities */}
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Activities</p>
              <p className="text-xl font-black text-slate-900">{statistics.totalActivities}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 border border-green-200">
              <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-0.5">With Sampling</p>
              <p className="text-xl font-black text-green-800">{statistics.activitiesWithSampling}</p>
              <p className="text-[10px] text-green-600 mt-0.5">
                ({statistics.activitiesFullySampled} full, {statistics.activitiesPartiallySampled} partial)
              </p>
            </div>
            
            {/* Farmers */}
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-0.5">Total Farmers</p>
              <p className="text-xl font-black text-blue-800">{statistics.totalFarmers}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 border border-green-200">
              <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-0.5">Farmers Sampled</p>
              <p className="text-xl font-black text-green-800">{statistics.farmersSampled}</p>
              {statistics.totalFarmers > 0 && (
                <p className="text-[10px] text-green-600 mt-0.5">
                  ({Math.round((statistics.farmersSampled / statistics.totalFarmers) * 100)}%)
                </p>
              )}
            </div>
            
            {/* Tasks */}
            <div className={`rounded-xl p-3 border ${
              statistics.totalTasks !== statistics.farmersSampled 
                ? 'bg-orange-50 border-orange-200' 
                : 'bg-slate-50 border-slate-200'
            }`}>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Tasks</p>
              <p className="text-xl font-black text-slate-900">{statistics.totalTasks}</p>
              <p className={`text-[10px] mt-0.5 ${
                statistics.totalTasks !== statistics.farmersSampled 
                  ? 'text-orange-600 font-bold' 
                  : 'text-slate-500'
              }`}>
                {statistics.farmersSampled > statistics.totalTasks 
                  ? `⚠ ${statistics.farmersSampled - statistics.totalTasks} pending (${statistics.farmersSampled} sampled)`
                  : statistics.farmersSampled < statistics.totalTasks
                  ? `⚠ ${statistics.totalTasks - statistics.farmersSampled} extra (${statistics.farmersSampled} sampled)`
                  : `${statistics.farmersSampled} sampled = ${statistics.totalTasks} tasks ✓`}
              </p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
              <p className="text-xs font-black text-yellow-600 uppercase tracking-widest mb-0.5">In Queue</p>
              <p className="text-xl font-black text-yellow-800">{statistics.tasksSampledInQueue}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-0.5">In Progress</p>
              <p className="text-xl font-black text-blue-800">{statistics.tasksInProgress}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 border border-green-200">
              <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-0.5">Completed</p>
              <p className="text-xl font-black text-green-800">{statistics.tasksCompleted}</p>
            </div>
          </div>
        </div>
      )}

      {/* Activities List */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-green-700" size={32} />
          <p className="text-sm text-slate-600 font-medium">Loading activities...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={32} />
          <p className="text-sm text-red-600 font-medium mb-4">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => fetchActivities(pagination.page)}>
            Try Again
          </Button>
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
          <p className="text-sm text-slate-600 font-medium">No activities found</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    {(
                      [
                        { key: 'expand', label: '' },
                        { key: 'type', label: 'Type' },
                        { key: 'samplingStatus', label: 'Sampling' },
                        { key: 'date', label: 'Date' },
                        { key: 'territory', label: 'Territory' },
                        { key: 'bu', label: 'BU' },
                        { key: 'officer', label: 'Officer' },
                        { key: 'farmersTotal', label: 'Total Farmers' },
                        { key: 'farmersSampled', label: 'Farmers Sampled' },
                        { key: 'tasksTotal', label: 'Tasks' },
                        { key: 'inQueue', label: 'In Queue' },
                        { key: 'inProgress', label: 'In Progress' },
                        { key: 'completed', label: 'Completed' },
                      ] as Array<{ key: ActivityTableColumnKey; label: string }>
                    ).map((col) => {
                      const isSorted = tableSort.key === col.key;
                      const width = tableColumnWidths[col.key] ?? DEFAULT_ACTIVITY_TABLE_WIDTHS[col.key];
              return (
                        <th
                          key={col.key}
                          className="relative px-3 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest select-none"
                          style={{ width, minWidth: width }}
                          onClick={col.key === 'expand' ? undefined : () => handleHeaderClick(col.key)}
                          title="Click to sort"
                        >
                          <div className="flex items-center gap-2">
                            <span className="truncate">{col.label}</span>
                            {col.key !== 'expand' && isSorted && (tableSort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
                          </div>
                          <div
                            className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                            onMouseDown={(e) => startResize(e, col.key)}
                            title="Drag to resize"
                          />
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedActivities.map((item) => {
                    const isExpanded = expandedActivity === item.activity._id;
                    const a: any = item.activity as any;
                    const territory = String((a.territoryName || item.activity.territory || '') ?? '').trim();
                    const bu = String(a.buName ?? '').trim();
                    const totalFarmers = item.activity.farmerIds?.length || 0;
                    const farmersSampled = item.samplingAudit?.sampledCount ?? null;
                    const tasksTotal = Number(getSortValue(item, 'tasksTotal') || 0);
                    const inQueue = item.statusBreakdown?.sampled_in_queue || 0;
                    const inProgress = item.statusBreakdown?.in_progress || 0;
                    const completed = item.statusBreakdown?.completed || 0;

                    return (
                      <React.Fragment key={item.activity._id}>
                        <tr className="border-b border-slate-100 hover:bg-slate-50">
                          <td
                            className="px-3 py-3 text-sm"
                            style={{
                              width: tableColumnWidths.expand ?? DEFAULT_ACTIVITY_TABLE_WIDTHS.expand,
                              minWidth: tableColumnWidths.expand ?? DEFAULT_ACTIVITY_TABLE_WIDTHS.expand,
                            }}
                          >
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors"
                              onClick={() => toggleExpand(item.activity._id)}
                              title="Expand / collapse"
                            >
                              {isExpanded ? (
                                <ChevronUp size={16} className="text-slate-500" />
                              ) : (
                                <ChevronDown size={16} className="text-slate-500" />
                              )}
                            </button>
                          </td>
                          <td
                            className="px-3 py-3 text-sm"
                            style={{
                              width: tableColumnWidths.type ?? DEFAULT_ACTIVITY_TABLE_WIDTHS.type,
                              minWidth: tableColumnWidths.type ?? DEFAULT_ACTIVITY_TABLE_WIDTHS.type,
                            }}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <ActivityIcon size={16} className="text-green-700 flex-shrink-0" />
                              <span className="font-black text-slate-900 truncate">{item.activity.type}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm">{getSamplingStatusBadge(item.samplingStatus)}</td>
                          <td className="px-3 py-3 text-sm text-slate-700">{formatDate(item.activity.date)}</td>
                          <td className="px-3 py-3 text-sm text-slate-700 truncate" title={territory || ''}>{territory || '-'}</td>
                          <td className="px-3 py-3 text-sm text-slate-700 truncate" title={bu || ''}>{bu || '-'}</td>
                          <td className="px-3 py-3 text-sm text-slate-700 truncate" title={item.activity.officerName || ''}>{item.activity.officerName || '-'}</td>
                          <td className="px-3 py-3 text-sm font-bold text-slate-900">{totalFarmers}</td>
                          <td className="px-3 py-3 text-sm font-bold text-slate-900">
                            {farmersSampled === null ? '-' : (
                              <span title={item.samplingAudit ? `${item.samplingAudit.samplingPercentage}%` : ''}>{farmersSampled}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-sm font-bold text-slate-900">{tasksTotal}</td>
                          <td className="px-3 py-3 text-sm font-bold text-yellow-800">{inQueue}</td>
                          <td className="px-3 py-3 text-sm font-bold text-blue-800">{inProgress}</td>
                          <td className="px-3 py-3 text-sm font-bold text-green-800">{completed}</td>
                        </tr>

                  {isExpanded && (
                          <tr className="bg-white">
                            <td colSpan={13} className="px-3 pb-3 pt-2">
                              <div className="space-y-2">
                        {/* Assigned Agents */}
                        {item.assignedAgents.length > 0 && (
                          <div>
                            <h4 className="text-xs font-black text-slate-700 mb-1">Assigned Agents</h4>
                            <div className="space-y-1.5">
                              {item.assignedAgents.map((agent) => (
                                <div
                                  key={agent.agentId}
                                  className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200"
                                >
                                  <div>
                                    <p className="text-xs font-medium text-slate-900">{agent.agentName}</p>
                                    <p className="text-[10px] text-slate-600">{agent.agentEmail}</p>
                                  </div>
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                                    {agent.tasksCount} task{agent.tasksCount !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Sampling Audit Details */}
                        {item.samplingAudit && (
                          <div>
                            <h4 className="text-xs font-black text-slate-700 mb-1">Sampling Details</h4>
                            <div className="flex items-center gap-4 p-2 bg-slate-50 rounded-lg border border-slate-200">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">Sampling %:</span>
                                <span className="text-xs font-bold text-slate-900">{item.samplingAudit.samplingPercentage}%</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">Total:</span>
                                <span className="text-xs font-bold text-slate-900">{item.samplingAudit.totalFarmers}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">Sampled:</span>
                                <span className="text-xs font-bold text-slate-900">{item.samplingAudit.sampledCount}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Crops and Products */}
                        {(item.activity.crops?.length > 0 || item.activity.products?.length > 0) && (
                          <div>
                            <h4 className="text-xs font-black text-slate-700 mb-1">Activity Details</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {item.activity.crops?.map((crop, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-lg text-[10px] font-medium border border-green-200">
                                  {crop}
                                </span>
                              ))}
                              {item.activity.products?.map((product, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-medium border border-blue-200">
                                  {product}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Farmers List */}
                        {item.farmers && item.farmers.length > 0 ? (
                          <div>
                            <h4 className="text-xs font-black text-slate-700 mb-1.5">
                              Farmers List ({item.farmers.length} of {item.activity.farmerIds?.length || 0})
                              <span className="ml-2 text-[10px] font-normal text-slate-500">
                                ({item.farmers.filter(f => f.isSampled).length} sampled, {item.farmers.filter(f => !f.isSampled).length} not sampled)
                              </span>
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 max-h-80 overflow-y-auto">
                              {item.farmers.map((farmer) => (
                                <div
                                  key={farmer.farmerId}
                                  className={`p-3 rounded-xl border-2 transition-all ${
                                    farmer.isSampled
                                      ? 'bg-green-50 border-green-200'
                                      : 'bg-slate-50 border-slate-200'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    {/* Farmer Avatar */}
                                    <div className="flex-shrink-0">
                                      {farmer.photoUrl ? (
                                        <img
                                          src={farmer.photoUrl}
                                          alt={farmer.name}
                                          className="w-12 h-12 rounded-full object-cover border-2 border-slate-200"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = '/images/farmer-default-logo.png';
                                          }}
                                        />
                                      ) : (
                                        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center ${
                                          farmer.isSampled
                                            ? 'bg-green-100 border-green-300'
                                            : 'bg-slate-100 border-slate-300'
                                        }`}>
                                          <UserIcon size={20} className={farmer.isSampled ? 'text-green-700' : 'text-slate-400'} />
                                        </div>
                                      )}
                                    </div>

                                    {/* Farmer Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-black text-slate-900 truncate">{farmer.name}</p>
                                        {farmer.isSampled ? (
                                          <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                                        ) : (
                                          <XCircle size={14} className="text-slate-400 flex-shrink-0" />
                                        )}
                                      </div>
                                      <div className="space-y-1 text-xs text-slate-600">
                                        <div className="flex items-center gap-1.5">
                                          <Phone size={12} />
                                          <span className="font-medium">{farmer.mobileNumber}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <MapPin size={12} />
                                          <span className="truncate">{farmer.location}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-medium">Language:</span>
                                          <span>{farmer.preferredLanguage}</span>
                                        </div>
                                      </div>

                                      {/* Sampling Status Badge */}
                                      {farmer.isSampled && farmer.taskStatus && (
                                        <div className="mt-2 pt-2 border-t border-green-200">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs text-green-700 font-medium">Assigned to:</span>
                                            <span className="text-xs font-bold text-green-800">{farmer.assignedAgentName || 'Unknown'}</span>
                                          </div>
                                          <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs text-green-700 font-medium">Status:</span>
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                              farmer.taskStatus === 'sampled_in_queue' ? 'bg-yellow-100 text-yellow-700' :
                                              farmer.taskStatus === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                              farmer.taskStatus === 'completed' ? 'bg-green-100 text-green-700' :
                                              farmer.taskStatus === 'not_reachable' ? 'bg-red-100 text-red-700' :
                                              farmer.taskStatus === 'invalid_number' ? 'bg-red-100 text-red-700' :
                                              'bg-gray-100 text-gray-700'
                                            }`}>
                                              {farmer.taskStatus ? getTaskStatusLabel(farmer.taskStatus) : 'Unknown'}
                                            </span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          // Show message if no farmers or farmers array missing
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <div className="flex items-start gap-3">
                              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                              <div className="flex-1">
                                <p className="text-sm text-amber-700 font-medium">
                                  {item.activity.farmerIds && item.activity.farmerIds.length > 0
                                    ? `This activity has ${item.activity.farmerIds.length} farmers, but farmer details are not available.`
                                    : 'No farmers are associated with this activity.'}
                                </p>
                                {item.activity.farmerIds && item.activity.farmerIds.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    <p className="text-xs text-amber-600">
                                      Farmers may need to be synced from FFA or farmer documents may not exist in the database.
                                    </p>
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      onClick={() => handleSyncFFA(false)}
                                      disabled={isIncrementalSyncing || isFullSyncing}
                                      className="mt-2"
                                    >
                                      <Download size={14} className={isIncrementalSyncing ? 'animate-spin' : ''} />
                                      {isIncrementalSyncing ? 'Syncing...' : 'Sync FFA Data'}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                            </td>
                          </tr>
                  )}
                      </React.Fragment>
              );
            })}
                </tbody>
              </table>
            </div>
          </div>
 

          {/* Pagination */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.pages} • {pagination.total} total activities
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Rows</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    title="Rows per page"
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchActivities(pagination.page - 1)}
                  disabled={pagination.page === 1 || isLoading || pagination.pages <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fetchActivities(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages || isLoading || pagination.pages <= 1}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ActivitySamplingView;
