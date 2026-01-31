import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { kpiAPI, reportsAPI, type EmsProgressFilters, type EmsProgressSummary, type EmsDrilldownRow, type EmsDrilldownGroupBy } from '../../services/api';
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
  ChevronDown,
  List,
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

const GROUP_BY_OPTIONS: { value: EmsDrilldownGroupBy; label: string }[] = [
  { value: 'state', label: 'By State' },
  { value: 'territory', label: 'By Territory' },
  { value: 'zone', label: 'By Zone' },
  { value: 'bu', label: 'By BU' },
  { value: 'activityType', label: 'By Activity Type' },
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
  const [drilldown, setDrilldown] = useState<EmsDrilldownRow[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    stateOptions: string[];
    territoryOptions: string[];
    zoneOptions: string[];
    buOptions: string[];
    activityTypeOptions: string[];
  }>({ stateOptions: [], territoryOptions: [], zoneOptions: [], buOptions: [], activityTypeOptions: [] });
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingDrilldown, setIsLoadingDrilldown] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingTaskDetails, setIsExportingTaskDetails] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [groupBy, setGroupBy] = useState<EmsDrilldownGroupBy>('state');
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

  const fetchDrilldown = useCallback(async () => {
    setIsLoadingDrilldown(true);
    try {
      const res = await kpiAPI.getEmsDrilldown(groupBy, filters);
      if (res.success && res.data) setDrilldown(res.data);
      else setDrilldown([]);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to load drilldown');
      setDrilldown([]);
    } finally {
      setIsLoadingDrilldown(false);
    }
  }, [groupBy, filters, showError]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchDrilldown();
  }, [fetchDrilldown]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await reportsAPI.downloadExport(filters);
      showSuccess('Summary report downloaded');
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
            onClick={() => { fetchSummary(); fetchDrilldown(); fetchOptions(); }}
            disabled={isLoadingSummary || isLoadingDrilldown}
            className="flex items-center gap-2"
          >
            {isLoadingSummary || isLoadingDrilldown ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Summary report
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleExportTaskDetails}
            disabled={isExportingTaskDetails}
            className="flex items-center gap-2"
          >
            {isExportingTaskDetails ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Export task details (Excel)
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {isLoadingSummary ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-lime-600" size={32} />
          </div>
        ) : summary ? (
          <>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <ActivityIcon size={16} />
                <span className="text-xs font-medium">Activities</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{summary.activities.total}</p>
              <p className="text-xs text-slate-400 mt-1">
                Sampled: {summary.activities.sampledCount} · Not: {summary.activities.notSampledCount} · Partial: {summary.activities.partialCount}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Target size={16} />
                <span className="text-xs font-medium">Tasks</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{summary.tasks.total}</p>
              <p className="text-xs text-slate-400 mt-1">
                Completed: {summary.tasks.completed} · Queue: {(summary.tasks.sampled_in_queue || 0) + (summary.tasks.unassigned || 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <CheckCircle size={16} />
                <span className="text-xs font-medium">Completion</span>
              </div>
              <p className="text-2xl font-bold text-lime-600">{summary.tasks.completionRatePct}%</p>
              <p className="text-xs text-slate-400 mt-1">Task completion rate</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Users size={16} />
                <span className="text-xs font-medium">Farmers</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{summary.farmers.totalInActivities}</p>
              <p className="text-xs text-slate-400 mt-1">Sampled: {summary.farmers.sampled}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <Clock size={16} />
                <span className="text-xs font-medium">In Progress</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{summary.tasks.in_progress}</p>
              <p className="text-xs text-slate-400 mt-1">Tasks in progress</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-1">
                <List size={16} />
                <span className="text-xs font-medium">Unassigned</span>
              </div>
              <p className="text-2xl font-bold text-slate-800">{summary.tasks.unassigned || 0}</p>
              <p className="text-xs text-slate-400 mt-1">Awaiting allocation</p>
            </div>
          </>
        ) : (
          <div className="col-span-full text-center py-8 text-slate-500">No data. Adjust filters or refresh.</div>
        )}
      </div>

      {/* Drill-down - no overflow-hidden so Group by dropdown shows all options (not clipped) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Drill-down</h3>
          <div className="flex items-center gap-2 relative z-10">
            <span className="text-sm text-slate-500">Group by</span>
            <div className="min-w-[240px] w-64">
              <StyledSelect
                value={groupBy}
                onChange={(v) => setGroupBy(v as EmsDrilldownGroupBy)}
                options={GROUP_BY_OPTIONS}
                placeholder="Group by"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoadingDrilldown ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-lime-600" size={28} />
            </div>
          ) : drilldown.length === 0 ? (
            <div className="text-center py-12 text-slate-500">No drill-down data for current filters.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-left text-slate-600 font-medium">
                  <th className="px-4 py-3">Group</th>
                  <th className="px-4 py-3 text-right">Activities</th>
                  <th className="px-4 py-3 text-right">Sampled</th>
                  <th className="px-4 py-3 text-right">Tasks</th>
                  <th className="px-4 py-3 text-right">Completed</th>
                  <th className="px-4 py-3 text-right">Completion %</th>
                  <th className="px-4 py-3 text-right">Farmers</th>
                  <th className="px-4 py-3 text-right">Farmers Sampled</th>
                </tr>
              </thead>
              <tbody>
                {drilldown.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.label || '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.activitiesTotal}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.activitiesSampled}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.tasksTotal}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.tasksCompleted}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={row.completionRatePct >= 70 ? 'text-lime-600 font-medium' : row.completionRatePct >= 40 ? 'text-amber-600' : 'text-slate-600'}>
                        {row.completionRatePct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.farmersTotal}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{row.farmersSampled}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        For a detailed activity list with the same filters, use the <strong>Activity Monitoring</strong> tab and apply the same date range and filters there.
      </p>
    </div>
  );
};

export default ActivityEmsProgressView;
