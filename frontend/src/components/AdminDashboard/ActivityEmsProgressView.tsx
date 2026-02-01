import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import {
  kpiAPI,
  reportsAPI,
  type EmsProgressFilters,
  type EmsProgressSummary,
  type EmsReportGroupBy,
  type EmsReportSummaryRow,
  type EmsTrendRow,
  type EmsTrendBucket,
} from '../../services/api';
import {
  BarChart3,
  Filter,
  RefreshCw,
  Download,
  Activity as ActivityIcon,
  Users,
  CheckCircle,
  Clock,
  Target,
  Loader2,
  List,
  TrendingUp,
  Phone,
  PhoneOff,
  MessageCircle,
  ShoppingCart,
  FileBarChart,
  Calendar,
} from 'lucide-react';
import Button from '../shared/Button';
import StyledSelect from '../shared/StyledSelect';

type DateRangePreset =
  | 'Custom'
  | 'Today'
  | 'Yesterday'
  | 'This week (Sun - Today)'
  | 'Last 7 days'
  | 'Last week (Sun - Sat)'
  | 'Last 28 days'
  | 'Last 30 days';

const EMS_REPORT_GROUP_BY_OPTIONS: { value: EmsReportGroupBy; label: string }[] = [
  { value: 'fda', label: 'By FDA' },
  { value: 'territory', label: 'By Territory' },
  { value: 'region', label: 'By Region' },
  { value: 'zone', label: 'By Zone' },
  { value: 'bu', label: 'By BU' },
  { value: 'tm', label: 'By TM' },
];

const TREND_BUCKET_OPTIONS: { value: EmsTrendBucket; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DETAIL_GROUP_BY_OPTIONS: { value: EmsReportGroupBy; label: string }[] = [
  { value: 'fda', label: 'By FDA' },
  { value: 'tm', label: 'By TM' },
];

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDefaultDateRange(): { dateFrom: string; dateTo: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - 29);
  return { dateFrom: toISODate(start), dateTo: toISODate(today) };
}

function getPresetRange(preset: DateRangePreset, currentFrom?: string, currentTo?: string): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay();
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
      return { start: currentFrom || toISODate(today), end: currentTo || toISODate(today) };
  }
}

function formatPretty(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ActivityEmsProgressView: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [summary, setSummary] = useState<EmsProgressSummary | null>(null);
  const [emsDetailRows, setEmsDetailRows] = useState<EmsReportSummaryRow[]>([]);
  const [emsTrends, setEmsTrends] = useState<EmsTrendRow[]>([]);
  const [trendBucket, setTrendBucket] = useState<EmsTrendBucket>('weekly');
  const [detailGroupBy, setDetailGroupBy] = useState<EmsReportGroupBy>('fda');
  const [isLoadingEmsDetail, setIsLoadingEmsDetail] = useState(false);
  const [isLoadingEmsTrends, setIsLoadingEmsTrends] = useState(false);
  const [filterOptions, setFilterOptions] = useState<{
    stateOptions: string[];
    territoryOptions: string[];
    zoneOptions: string[];
    buOptions: string[];
    activityTypeOptions: string[];
  }>({ stateOptions: [], territoryOptions: [], zoneOptions: [], buOptions: [], activityTypeOptions: [] });
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingTaskDetails, setIsExportingTaskDetails] = useState(false);
  const [showEmsReportModal, setShowEmsReportModal] = useState(false);
  const [emsReportGroupBy, setEmsReportGroupBy] = useState<EmsReportGroupBy>('fda');
  const [emsReportLevel, setEmsReportLevel] = useState<'summary' | 'line'>('summary');
  const [showFilters, setShowFilters] = useState(false);
  const defaultRange = getDefaultDateRange();
  const [filters, setFilters] = useState<EmsProgressFilters>({
    dateFrom: defaultRange.dateFrom,
    dateTo: defaultRange.dateTo,
    state: '',
    territory: '',
    zone: '',
    bu: '',
    activityType: '',
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('Last 30 days');
  const [draftStart, setDraftStart] = useState(defaultRange.dateFrom);
  const [draftEnd, setDraftEnd] = useState(defaultRange.dateTo);
  const datePickerRef = useRef<HTMLDivElement | null>(null);

  const syncDraftFromFilters = useCallback(() => {
    const start = filters.dateFrom || getPresetRange(selectedPreset, filters.dateFrom, filters.dateTo).start;
    const end = filters.dateTo || getPresetRange(selectedPreset, filters.dateFrom, filters.dateTo).end;
    setDraftStart(start);
    setDraftEnd(end);
  }, [filters.dateFrom, filters.dateTo, selectedPreset]);

  useEffect(() => {
    if (!isDatePickerOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [isDatePickerOpen]);

  const fetchOptions = useCallback(async () => {
    setIsLoadingOptions(true);
    try {
      const res = await kpiAPI.getEmsFilterOptions(filters);
      if (res.success && res.data) {
        setFilterOptions({
          stateOptions: res.data.stateOptions || [],
          territoryOptions: res.data.territoryOptions || [],
          zoneOptions: res.data.zoneOptions || [],
          buOptions: res.data.buOptions || [],
          activityTypeOptions: res.data.activityTypeOptions || [],
        });
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to load filter options');
    } finally {
      setIsLoadingOptions(false);
    }
  }, [filters.dateFrom, filters.dateTo, filters.state, filters.territory, filters.zone, filters.bu, filters.activityType, showError]);

  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const res = await kpiAPI.getEmsProgress(filters);
      if (res.success && res.data) setSummary(res.data);
      else setSummary(null);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to load EMS progress');
      setSummary(null);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [filters, showError]);

  const fetchEmsDetail = useCallback(async () => {
    setIsLoadingEmsDetail(true);
    try {
      const res = await reportsAPI.getEmsReport(detailGroupBy, 'summary', filters);
      if (res.success && res.data) setEmsDetailRows(res.data);
      else setEmsDetailRows([]);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to load EMS detail');
      setEmsDetailRows([]);
    } finally {
      setIsLoadingEmsDetail(false);
    }
  }, [detailGroupBy, filters, showError]);

  const fetchEmsTrends = useCallback(async () => {
    setIsLoadingEmsTrends(true);
    try {
      const res = await reportsAPI.getEmsTrends(trendBucket, filters);
      if (res.success && res.data) setEmsTrends(res.data);
      else setEmsTrends([]);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to load trends');
      setEmsTrends([]);
    } finally {
      setIsLoadingEmsTrends(false);
    }
  }, [trendBucket, filters, showError]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchEmsDetail();
  }, [fetchEmsDetail]);

  useEffect(() => {
    fetchEmsTrends();
  }, [fetchEmsTrends]);

  const handleEmsReportDownload = async () => {
    setIsExporting(true);
    try {
      await reportsAPI.downloadEmsReportExport(emsReportGroupBy, emsReportLevel, filters);
      showSuccess('EMS report downloaded');
      setShowEmsReportModal(false);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTaskDetails = async () => {
    setIsExportingTaskDetails(true);
    try {
      await reportsAPI.downloadTaskDetailsExport(filters);
      showSuccess('Task details Excel downloaded');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setIsExportingTaskDetails(false);
    }
  };

  const applyFilter = (key: keyof EmsProgressFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value || '' }));
  };

  const stateOptions = [{ value: '', label: 'All States' }, ...filterOptions.stateOptions.map((s) => ({ value: s, label: s }))];
  const territoryOptions = [{ value: '', label: 'All Territories' }, ...filterOptions.territoryOptions.map((t) => ({ value: t, label: t }))];
  const zoneOptions = [{ value: '', label: 'All Zones' }, ...filterOptions.zoneOptions.map((z) => ({ value: z, label: z }))];
  const buOptions = [{ value: '', label: 'All BUs' }, ...filterOptions.buOptions.map((b) => ({ value: b, label: b }))];
  const activityTypeOptions = [{ value: '', label: 'All Types' }, ...filterOptions.activityTypeOptions.map((t) => ({ value: t, label: t }))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lime-500/20 rounded-xl flex items-center justify-center">
            <BarChart3 className="text-lime-600" size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Activity EMS Progress</h2>
            <p className="text-sm text-slate-500">Holistic view of activities, tasks, and completion with filters and drill-down</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter size={16} />
            {showFilters ? 'Hide filters' : 'Filters'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { fetchSummary(); fetchEmsDetail(); fetchEmsTrends(); fetchOptions(); }}
            disabled={isLoadingSummary || isLoadingEmsDetail || isLoadingEmsTrends}
            className="flex items-center gap-2"
          >
            {isLoadingSummary || isLoadingEmsDetail || isLoadingEmsTrends ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowEmsReportModal(true)}
            disabled={isExporting}
            className="flex items-center gap-2 ring-2 ring-lime-400 ring-offset-2"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            EMS report
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportTaskDetails}
            disabled={isExportingTaskDetails}
            className="flex items-center gap-2"
          >
            {isExportingTaskDetails ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export Task Details
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Date Range</label>
              <div className="relative" ref={datePickerRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsDatePickerOpen((prev) => {
                      const next = !prev;
                      if (!prev && next) syncDraftFromFilters();
                      return next;
                    });
                  }}
                  className="w-full min-h-12 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400 flex items-center justify-between"
                >
                  <span className="truncate">
                    {selectedPreset}
                    {filters.dateFrom && filters.dateTo ? ` • ${formatPretty(filters.dateFrom)} - ${formatPretty(filters.dateTo)}` : ''}
                  </span>
                  <span className="text-slate-400 font-black">▾</span>
                </button>

                {isDatePickerOpen && (
                  <div className="absolute z-50 mt-2 left-0 w-[720px] max-w-[90vw] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                    <div className="flex flex-col sm:flex-row">
                      <div className="w-full sm:w-56 border-b sm:border-b-0 sm:border-r border-slate-200 bg-slate-50 p-2 shrink-0">
                        {(['Custom', 'Today', 'Yesterday', 'This week (Sun - Today)', 'Last 7 days', 'Last week (Sun - Sat)', 'Last 28 days', 'Last 30 days'] as DateRangePreset[]).map((p) => {
                          const isActive = selectedPreset === p;
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setSelectedPreset(p);
                                const { start, end } = getPresetRange(p, filters.dateFrom, filters.dateTo);
                                setDraftStart(start);
                                setDraftEnd(end);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-bold transition-colors ${isActive ? 'bg-white border border-slate-200 text-slate-900' : 'text-slate-700 hover:bg-white'}`}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex-1 p-4">
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div className="flex-1">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Start date</p>
                            <input
                              type="date"
                              value={draftStart}
                              onChange={(e) => {
                                setSelectedPreset('Custom');
                                setDraftStart(e.target.value);
                              }}
                              className="w-full min-h-12 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">End date</p>
                            <input
                              type="date"
                              value={draftEnd}
                              onChange={(e) => {
                                setSelectedPreset('Custom');
                                setDraftEnd(e.target.value);
                              }}
                              className="w-full min-h-12 px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              setIsDatePickerOpen(false);
                              syncDraftFromFilters();
                            }}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFilters((prev) => ({ ...prev, dateFrom: draftStart || '', dateTo: draftEnd || '' }));
                              setIsDatePickerOpen(false);
                            }}
                            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800"
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
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">State</label>
              <StyledSelect
                value={filters.state || ''}
                onChange={(v) => applyFilter('state', v)}
                options={stateOptions}
                placeholder="All States"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Territory</label>
              <StyledSelect
                value={filters.territory || ''}
                onChange={(v) => applyFilter('territory', v)}
                options={territoryOptions}
                placeholder="All Territories"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Zone</label>
              <StyledSelect
                value={filters.zone || ''}
                onChange={(v) => applyFilter('zone', v)}
                options={zoneOptions}
                placeholder="All Zones"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">BU</label>
              <StyledSelect
                value={filters.bu || ''}
                onChange={(v) => applyFilter('bu', v)}
                options={buOptions}
                placeholder="All BUs"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Activity Type</label>
              <StyledSelect
                value={filters.activityType || ''}
                onChange={(v) => applyFilter('activityType', v)}
                options={activityTypeOptions}
                placeholder="All Types"
              />
            </div>
          </div>
        </div>
      )}

      {/* Visual KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {isLoadingSummary ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-lime-600" size={32} />
          </div>
        ) : summary ? (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <ActivityIcon className="text-slate-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activities</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{summary.activities.total}</p>
                <p className="text-[11px] text-slate-400 mt-1">Sampled: {summary.activities.sampledCount} · Partial: {summary.activities.partialCount}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Target className="text-blue-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasks</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{summary.tasks.total}</p>
                <p className="text-[11px] text-slate-400 mt-1">Completed: {summary.tasks.completed} · Queue: {(summary.tasks.sampled_in_queue || 0) + (summary.tasks.unassigned || 0)}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-lime-500 p-4 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-lime-50 flex items-center justify-center shrink-0">
                <CheckCircle className="text-lime-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completion</p>
                <p className="text-2xl font-bold text-lime-600 mt-0.5">{summary.tasks.completionRatePct}%</p>
                <p className="text-[11px] text-slate-400 mt-1">Task completion rate</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                <Users className="text-amber-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Farmers</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{summary.farmers.totalInActivities}</p>
                <p className="text-[11px] text-slate-400 mt-1">Sampled: {summary.farmers.sampled}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                <Clock className="text-violet-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{summary.tasks.in_progress}</p>
                <p className="text-[11px] text-slate-400 mt-1">Tasks in progress</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-3 hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                <List className="text-slate-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unassigned</p>
                <p className="text-2xl font-bold text-slate-800 mt-0.5">{summary.tasks.unassigned || 0}</p>
                <p className="text-[11px] text-slate-400 mt-1">Awaiting allocation</p>
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-full text-center py-8 text-slate-500">No data. Adjust filters or refresh.</div>
        )}
      </div>

      {/* Trend: shift in the needle */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-lime-600" size={20} />
            <h3 className="font-semibold text-slate-800">Trend over time</h3>
          </div>
          <div className="flex items-center gap-2">
            {TREND_BUCKET_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTrendBucket(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  trendBucket === opt.value ? 'bg-lime-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="p-4">
          {isLoadingEmsTrends ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-lime-600" size={28} />
            </div>
          ) : emsTrends.length === 0 ? (
            <p className="text-center py-8 text-slate-500 text-sm">No trend data for current filters. Complete some calls in the date range.</p>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <FileBarChart size={14} /> EMS Score
                </p>
                <div className="flex items-end gap-1 h-24">
                  {emsTrends.map((r) => {
                    const max = Math.max(...emsTrends.map((x) => x.emsScore), 1);
                    const h = max > 0 ? (r.emsScore / max) * 80 : 0;
                    return (
                      <div key={r.period} className="flex-1 min-w-0 flex flex-col items-center gap-1" title={`${r.period}: ${r.emsScore}`}>
                        <div className="w-full bg-lime-100 rounded-t flex-1 min-h-[4px] flex flex-col justify-end">
                          <div className="bg-lime-500 rounded-t transition-all" style={{ height: `${h}px` }} />
                        </div>
                        <span className="text-[10px] text-slate-500 truncate w-full text-center">{r.period}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Phone size={14} /> Connected calls
                </p>
                <div className="flex items-end gap-1 h-20">
                  {emsTrends.map((r) => {
                    const max = Math.max(...emsTrends.map((x) => x.totalConnected), 1);
                    const h = max > 0 ? (r.totalConnected / max) * 64 : 0;
                    return (
                      <div key={r.period} className="flex-1 min-w-0 flex flex-col items-center gap-1" title={`${r.period}: ${r.totalConnected}`}>
                        <div className="w-full bg-blue-100 rounded-t flex-1 min-h-[4px] flex flex-col justify-end">
                          <div className="bg-blue-500 rounded-t transition-all" style={{ height: `${h}px` }} />
                        </div>
                        <span className="text-[10px] text-slate-500 truncate w-full text-center">{r.period}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EMS metrics detail – drill by FDA / TM */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <MessageCircle className="text-slate-600" size={20} />
            <h3 className="font-semibold text-slate-800">EMS metrics detail</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Drill by</span>
            <div className="min-w-[160px]">
              <StyledSelect
                value={detailGroupBy}
                onChange={(v) => setDetailGroupBy(v as EmsReportGroupBy)}
                options={DETAIL_GROUP_BY_OPTIONS}
                placeholder="Drill by"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoadingEmsDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-lime-600" size={28} />
            </div>
          ) : emsDetailRows.length === 0 ? (
            <p className="text-center py-12 text-slate-500 text-sm">No EMS detail for current filters. Apply filters and ensure completed calls exist.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-slate-600 font-medium">
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3 text-right">Attempted</th>
                  <th className="px-4 py-3 text-right">Connected</th>
                  <th className="px-4 py-3 text-right">Mobile validity %</th>
                  <th className="px-4 py-3 text-right">Meeting validity %</th>
                  <th className="px-4 py-3 text-right">Meeting conversion %</th>
                  <th className="px-4 py-3 text-right">Purchase intention %</th>
                  <th className="px-4 py-3 text-right">EMS Score</th>
                  <th className="px-4 py-3 max-w-[200px]">Relative remarks</th>
                </tr>
              </thead>
              <tbody>
                {emsDetailRows.map((row) => (
                  <tr key={row.groupKey} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.groupLabel || '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.totalAttempted}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.totalConnected}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.mobileValidityPct}%</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.meetingValidityPct}%</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.meetingConversionPct}%</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.purchaseIntentionPct}%</td>
                    <td className="px-4 py-3 text-right">
                      <span className={row.emsScore >= 70 ? 'text-lime-600 font-semibold' : row.emsScore >= 50 ? 'text-amber-600' : 'text-slate-700'}>
                        {row.emsScore}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs max-w-[200px] truncate" title={row.relativeRemarks}>{row.relativeRemarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        For a detailed activity list with the same filters, use the <strong>Activity Monitoring</strong> tab. Use <strong>EMS report</strong> to export by FDA, Territory, Region, Zone, BU, or TM.
      </p>

      {/* EMS Report download modal */}
      {showEmsReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowEmsReportModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Download EMS report</h3>
            <p className="text-sm text-slate-500 mb-4">Choose how to group the report. Current date range and filters will be applied.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Group by</label>
                <StyledSelect
                  value={emsReportGroupBy}
                  onChange={(v) => setEmsReportGroupBy(v as EmsReportGroupBy)}
                  options={EMS_REPORT_GROUP_BY_OPTIONS}
                  placeholder="Select"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Report level</label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="emsLevel"
                      checked={emsReportLevel === 'summary'}
                      onChange={() => setEmsReportLevel('summary')}
                      className="text-lime-600 focus:ring-lime-500"
                    />
                    <span className="text-sm text-slate-700">Summary (one row per group)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="emsLevel"
                      checked={emsReportLevel === 'line'}
                      onChange={() => setEmsReportLevel('line')}
                      className="text-lime-600 focus:ring-lime-500"
                    />
                    <span className="text-sm text-slate-700">Line level (one row per call)</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <Button variant="secondary" size="sm" onClick={() => setShowEmsReportModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleEmsReportDownload} disabled={isExporting} className="flex items-center gap-2">
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Download
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityEmsProgressView;
