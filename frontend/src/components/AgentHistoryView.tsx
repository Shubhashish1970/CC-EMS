import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, ChevronDown, ArrowDownToLine, Filter, RefreshCw, Search, ChevronRight, Loader2, User as UserIcon, ChevronUp } from 'lucide-react';
import Button from './shared/Button';
import { tasksAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

type DateRangePreset =
  | 'Custom'
  | 'Today'
  | 'Yesterday'
  | 'This week (Sun - Today)'
  | 'Last 7 days'
  | 'Last week (Sun - Sat)'
  | 'Last 28 days'
  | 'Last 30 days';

type HistoryStatus = '' | 'in_progress' | 'completed' | 'not_reachable' | 'invalid_number';

type HistoryColumnKey =
  | 'expand'
  | 'farmer'
  | 'outcome'
  | 'outbound'
  | 'activityType'
  | 'territory'
  | 'updated'
  | 'action';

const DEFAULT_COL_WIDTHS: Record<HistoryColumnKey, number> = {
  expand: 56,
  farmer: 220,
  outcome: 200,
  outbound: 160,
  activityType: 160,
  territory: 220,
  updated: 140,
  action: 120,
};

const toISO = (d: Date) => d.toISOString().split('T')[0];
const formatPretty = (iso: string) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

const getPresetRange = (preset: DateRangePreset): { start: string; end: string } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  const end = new Date(today);
  const day = today.getDay();

  switch (preset) {
    case 'Today':
      return { start: toISO(today), end: toISO(today) };
    case 'Yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: toISO(y), end: toISO(y) };
    }
    case 'This week (Sun - Today)': {
      const s = new Date(today);
      s.setDate(s.getDate() - day);
      return { start: toISO(s), end: toISO(today) };
    }
    case 'Last 7 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { start: toISO(s), end: toISO(today) };
    }
    case 'Last week (Sun - Sat)': {
      const lastSat = new Date(today);
      lastSat.setDate(lastSat.getDate() - (day + 1));
      const lastSun = new Date(lastSat);
      lastSun.setDate(lastSun.getDate() - 6);
      return { start: toISO(lastSun), end: toISO(lastSat) };
    }
    case 'Last 28 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 27);
      return { start: toISO(s), end: toISO(today) };
    }
    case 'Last 30 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { start: toISO(s), end: toISO(today) };
    }
    case 'Custom':
    default:
      return { start: '', end: '' };
  }
};

const outcomeLabel = (status: string) => {
  if (status === 'completed') return 'Completed Conversation';
  if (status === 'in_progress') return 'In Progress';
  if (status === 'invalid_number') return 'Unsuccessful (Invalid)';
  if (status === 'not_reachable') return 'Unsuccessful';
  return status || 'Unknown';
};

const outboundLabel = (raw: string) => raw || '-';
const safeArr = (v: any) => (Array.isArray(v) ? v : v ? [v] : []);

const formatDateTime = (d: any) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const AgentHistoryView: React.FC<{ onOpenTask?: (taskId: string) => void }> = ({ onOpenTask }) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [pageSize, setPageSize] = useState<number>(() => {
    const raw = localStorage.getItem('agent.history.pageSize');
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 20;
  });
  const [tableSort, setTableSort] = useState<{ key: HistoryColumnKey; dir: 'asc' | 'desc' }>(() => {
    const raw = localStorage.getItem('agent.history.tableSort');
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.key && (parsed.dir === 'asc' || parsed.dir === 'desc')) return parsed;
    } catch {
      // ignore
    }
    return { key: 'updated', dir: 'desc' };
  });
  const [colWidths, setColWidths] = useState<Record<HistoryColumnKey, number>>(() => {
    const raw = localStorage.getItem('agent.history.colWidths');
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') return { ...DEFAULT_COL_WIDTHS, ...parsed };
    } catch {
      // ignore
    }
    return { ...DEFAULT_COL_WIDTHS };
  });
  const resizingRef = useRef<{ key: HistoryColumnKey; startX: number; startWidth: number } | null>(null);

  const [filters, setFilters] = useState<{
    status: HistoryStatus;
    territory: string;
    activityType: string;
    search: string;
    dateFrom: string;
    dateTo: string;
  }>({
    status: '',
    territory: '',
    activityType: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  const [filterOptions, setFilterOptions] = useState<{ territoryOptions: string[]; activityTypeOptions: string[] }>({
    territoryOptions: [],
    activityTypeOptions: [],
  });
  const [stats, setStats] = useState<any | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, any>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('Last 7 days');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const datePickerRef = useRef<HTMLDivElement | null>(null);

  const syncDraftFromFilters = () => {
    const start = filters.dateFrom || getPresetRange(selectedPreset).start;
    const end = filters.dateTo || getPresetRange(selectedPreset).end;
    setDraftStart(start);
    setDraftEnd(end);
  };

  // Default date range
  useEffect(() => {
    if (filters.dateFrom || filters.dateTo) return;
    const r = getPresetRange('Last 7 days');
    setFilters((p) => ({ ...p, dateFrom: r.start, dateTo: r.end }));
    setDraftStart(r.start);
    setDraftEnd(r.end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isDatePickerOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (datePickerRef.current && !datePickerRef.current.contains(t)) setIsDatePickerOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isDatePickerOpen]);

  const load = async (page = 1) => {
    setIsLoading(true);
    try {
      const res: any = await tasksAPI.getOwnHistory({
        status: filters.status || undefined,
        territory: filters.territory || undefined,
        activityType: filters.activityType || undefined,
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page,
        limit: pageSize,
      });
      setRows(res?.data?.tasks || []);
      setPagination(res?.data?.pagination || null);
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load(1).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.territory, filters.activityType, filters.search, filters.dateFrom, filters.dateTo, pageSize]);

  const page = Number(pagination?.page || 1);
  const pages = Number(pagination?.pages || 1);

  useEffect(() => {
    localStorage.setItem('agent.history.pageSize', String(pageSize));
  }, [pageSize]);

  useEffect(() => {
    localStorage.setItem('agent.history.tableSort', JSON.stringify(tableSort));
  }, [tableSort]);

  useEffect(() => {
    localStorage.setItem('agent.history.colWidths', JSON.stringify(colWidths));
  }, [colWidths]);

  const handleResizeStart = (key: HistoryColumnKey, startX: number) => {
    resizingRef.current = { key, startX, startWidth: colWidths[key] };
    const onMove = (e: MouseEvent) => {
      if (!resizingRef.current) return;
      const dx = e.clientX - resizingRef.current.startX;
      const next = Math.max(90, resizingRef.current.startWidth + dx);
      setColWidths((p) => ({ ...p, [key]: next }));
    };
    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const loadOptions = async () => {
    try {
      const res: any = await tasksAPI.getOwnHistoryOptions({
        status: filters.status || undefined,
        territory: filters.territory || undefined,
        activityType: filters.activityType || undefined,
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      if (res?.success && res?.data) {
        setFilterOptions({
          territoryOptions: Array.isArray(res.data.territoryOptions) ? res.data.territoryOptions : [],
          activityTypeOptions: Array.isArray(res.data.activityTypeOptions) ? res.data.activityTypeOptions : [],
        });
      }
    } catch {
      // ignore
    }
  };

  const loadStats = async () => {
    setIsStatsLoading(true);
    try {
      const res: any = await tasksAPI.getOwnHistoryStats({
        status: filters.status || undefined,
        territory: filters.territory || undefined,
        activityType: filters.activityType || undefined,
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });
      if (res?.success && res?.data) setStats(res.data);
    } catch {
      // ignore
    } finally {
      setIsStatsLoading(false);
    }
  };

  useEffect(() => {
    loadOptions().catch(() => undefined);
    loadStats().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.territory, filters.activityType, filters.search, filters.dateFrom, filters.dateTo]);

  const handleDownloadExcel = async () => {
    setIsExporting(true);
    try {
      await tasksAPI.downloadOwnHistoryExport({
        status: filters.status || undefined,
        territory: filters.territory || undefined,
        activityType: filters.activityType || undefined,
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        limit: 5000,
      });
      toast.showSuccess('Excel downloaded');
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to download excel');
    } finally {
      setIsExporting(false);
    }
  };

  const toggleExpand = async (taskId: string) => {
    const next = expandedId === taskId ? null : taskId;
    setExpandedId(next);
    if (!next) return;

    if (detailById[next]) return;
    setDetailLoadingId(next);
    try {
      const res: any = await tasksAPI.getOwnHistoryDetail(next);
      if (res?.success && res?.data?.task) {
        setDetailById((p) => ({ ...p, [next]: res.data.task }));
      }
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to load details');
    } finally {
      setDetailLoadingId((curr) => (curr === next ? null : curr));
    }
  };

  const visible = useMemo(() => {
    const data = Array.isArray(rows) ? [...rows] : [];

    const getText = (t: any, key: HistoryColumnKey) => {
      const farmer = t.farmerId || t.farmer || {};
      const activity = t.activityId || t.activity || {};
      if (key === 'farmer') return String(farmer?.name || '');
      if (key === 'outcome') return String(t.status || '');
      if (key === 'outbound') return String(t.callLog?.callStatus || '');
      if (key === 'activityType') return String(activity?.type || '');
      if (key === 'territory') return String(activity?.territoryName || activity?.territory || '');
      if (key === 'updated') return String(t.updatedAt || '');
      return '';
    };

    data.sort((a: any, b: any) => {
      const av = getText(a, tableSort.key);
      const bv = getText(b, tableSort.key);
      const dir = tableSort.dir === 'asc' ? 1 : -1;
      if (tableSort.key === 'updated') {
        const at = new Date(av).getTime() || 0;
        const bt = new Date(bv).getTime() || 0;
        return dir * (at - bt);
      }
      return dir * av.localeCompare(bv);
    });

    return data;
  }, [rows, tableSort.key, tableSort.dir]);

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#f1f5f1]">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Section - Matching Activity Sampling */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 mb-1">History</h2>
              <p className="text-sm text-slate-600">All tasks except "In Queue"</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setShowFilters((v) => !v)}>
                <Filter size={16} />
                Filters
              </Button>
              <Button variant="secondary" size="sm" onClick={() => load(page)} disabled={isLoading}>
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Filters Section - Matching Activity Sampling */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Activity Type</label>
                  <select
                    value={filters.activityType}
                    onChange={(e) => setFilters((p) => ({ ...p, activityType: e.target.value }))}
                    className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Types</option>
                    {filterOptions.activityTypeOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Territory</label>
                  <select
                    value={filters.territory}
                    onChange={(e) => setFilters((p) => ({ ...p, territory: e.target.value }))}
                    className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All Territories</option>
                    {filterOptions.territoryOptions.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value as any }))}
                    className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">All (except In Queue)</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed Conversation</option>
                    <option value="not_reachable">Unsuccessful</option>
                    <option value="invalid_number">Unsuccessful (Invalid)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      value={filters.search}
                      onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                      placeholder="Farmer, mobile, territory, activity..."
                      className="w-full pl-10 pr-3 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
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
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Start date</p>
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
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">End date</p>
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
                                  syncDraftFromFilters();
                                }}
                                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setFilters((p) => ({ ...p, dateFrom: draftStart, dateTo: draftEnd }));
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

        {/* Statistics Dashboard - Matching Activity Sampling */}
        {!isStatsLoading && (stats ? (stats?.total || 0) > 0 : (!isLoading && (pagination?.total || 0) > 0)) && (
          <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="text-green-700" size={18} />
                <h2 className="text-base font-black text-slate-900">Statistics</h2>
              </div>
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={isExporting || isLoading}
                className={`flex items-center justify-center h-10 w-10 rounded-2xl border transition-colors ${
                  isExporting
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-white border-slate-200 text-green-700 hover:bg-slate-50'
                }`}
                title="Download Excel (all records matching current filters)"
              >
                <ArrowDownToLine size={18} className={isExporting ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Compact Statistics Grid - Matching Activity Sampling */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</p>
                <p className="text-xl font-black text-slate-900">{stats?.total ?? pagination?.total ?? 0}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                <p className="text-xs font-black text-purple-600 uppercase tracking-widest mb-0.5">In Queue</p>
                <p className="text-xl font-black text-purple-800">{stats?.inQueue || 0}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-0.5">Completed</p>
                <p className="text-xl font-black text-green-800">{stats?.completedConversation || 0}</p>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                <p className="text-xs font-black text-yellow-600 uppercase tracking-widest mb-0.5">In Progress</p>
                <p className="text-xl font-black text-yellow-800">{stats?.inProgress || 0}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-0.5">Unsuccessful</p>
                <p className="text-xl font-black text-blue-800">{stats?.unsuccessful || 0}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 border border-red-200">
                <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-0.5">Invalid</p>
                <p className="text-xl font-black text-red-800">{stats?.invalid || 0}</p>
              </div>
            </div>
          </div>
        )}

        {/* History Table - Matching Activity Sampling */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-green-700" size={32} />
            <p className="text-sm text-slate-600 font-medium">Loading history...</p>
          </div>
        ) : !pagination || (pagination.total || 0) === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
            <p className="text-sm text-slate-600 font-medium">No history found for selected filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {(
                    [
                      ['expand', ''],
                      ['farmer', 'Farmer'],
                      ['outcome', 'Outcome'],
                      ['outbound', 'Outbound'],
                      ['activityType', 'Activity'],
                      ['territory', 'Territory'],
                      ['updated', 'Updated'],
                      ['action', 'Action'],
                    ] as Array<[HistoryColumnKey, string]>
                  ).map(([key, label]) => (
                    <th
                      key={key}
                      className="relative px-3 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest select-none"
                      style={{ width: colWidths[key], minWidth: colWidths[key] }}
                      onClick={key === 'action' || key === 'expand' ? undefined : () => {
                            setTableSort((p) => {
                          if (p.key === key) return { key, dir: p.dir === 'asc' ? 'desc' : 'asc' };
                          return { key, dir: 'asc' };
                            });
                          }}
                      title={key === 'action' || key === 'expand' ? undefined : 'Click to sort'}
                    >
                      <div className="flex items-center gap-2">
                        <span className="truncate">{label}</span>
                        {key !== 'action' && key !== 'expand' && tableSort.key === key && (
                          tableSort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                        )}
                      </div>
                        {key !== 'action' && key !== 'expand' && (
                          <div
                          className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleResizeStart(key, e.clientX);
                          }}
                            title="Drag to resize"
                          />
                        )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((t: any) => {
                  const farmer = t.farmerId || t.farmer || {};
                  const activity = t.activityId || t.activity || {};
                  const outbound = t.callLog?.callStatus || '';
                  const updated = t.updatedAt ? formatPretty(String(t.updatedAt).slice(0, 10)) : '-';
                  const territory = (activity.territoryName || activity.territory || '').toString();
                  const isOpen = expandedId === String(t._id);
                  const detail = detailById[String(t._id)] || null;
                  return (
                    <React.Fragment key={t._id}>
                      <tr className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-3 text-sm" style={{ width: colWidths.expand, minWidth: colWidths.expand }}>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors"
                            onClick={() => toggleExpand(String(t._id))}
                            title="Expand / collapse"
                          >
                            {isOpen ? (
                              <ChevronUp size={16} className="text-slate-500" />
                            ) : (
                              <ChevronDown size={16} className="text-slate-500" />
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-3 text-sm" style={{ width: colWidths.farmer, minWidth: colWidths.farmer }}>
                          <div className="flex items-center gap-3 min-w-0">
                            {farmer.photoUrl ? (
                              <img
                                src={farmer.photoUrl}
                                alt={farmer.name}
                                className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = '/images/farmer-default-logo.png';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                                <UserIcon className="text-slate-400" size={18} />
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-black text-slate-900 truncate">{farmer.name || 'Unknown'}</div>
                              <div className="text-xs text-slate-500 truncate">{farmer.mobileNumber || ''}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-sm font-bold text-slate-700" style={{ width: colWidths.outcome, minWidth: colWidths.outcome }}>
                        {outcomeLabel(t.status)}
                      </td>
                        <td className="px-3 py-3 text-sm text-slate-700" style={{ width: colWidths.outbound, minWidth: colWidths.outbound }}>
                        {outboundLabel(outbound)}
                      </td>
                        <td className="px-3 py-3 text-sm text-slate-700" style={{ width: colWidths.activityType, minWidth: colWidths.activityType }}>
                        {activity.type || '-'}
                      </td>
                        <td className="px-3 py-3 text-sm text-slate-700 truncate" title={territory || ''} style={{ width: colWidths.territory, minWidth: colWidths.territory }}>
                        {territory || '-'}
                      </td>
                        <td className="px-3 py-3 text-sm text-slate-700" style={{ width: colWidths.updated, minWidth: colWidths.updated }}>
                        {updated}
                      </td>
                        <td className="px-3 py-3 text-sm text-right" style={{ width: colWidths.action, minWidth: colWidths.action }}>
                        {t.status === 'in_progress' ? (
                          <button
                            type="button"
                            onClick={() => onOpenTask?.(String(t._id))}
                            className="px-3 py-1.5 rounded-xl text-xs font-black text-white bg-green-700 hover:bg-green-800"
                          >
                            Open
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Read-only</span>
                        )}
                      </td>
                      </tr>

                      {isOpen && (
                        <tr className="bg-white">
                          <td colSpan={8} className="px-5 pb-5 pt-4">
                            <div className="mx-2 bg-white rounded-2xl border border-slate-200 p-4">
                              {detailLoadingId === String(t._id) && (
                                <div className="flex items-center gap-2 text-slate-600 text-sm font-bold">
                                  <Loader2 size={16} className="animate-spin" />
                                  Loading details…
                                </div>
                              )}

                              {!detailLoadingId && !detail && (
                                <div className="text-sm text-slate-600">No additional details available.</div>
                              )}

                              {detail && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Farmer</div>
                                    <div className="text-sm font-bold text-slate-900">{detail.farmerId?.name || 'Unknown'}</div>
                                    <div className="text-xs text-slate-600">{detail.farmerId?.mobileNumber || ''}</div>
                                    <div className="text-xs text-slate-600">{detail.farmerId?.location || ''}</div>
                                    <div className="text-xs text-slate-600">Language: <span className="font-bold">{detail.farmerId?.preferredLanguage || 'Unknown'}</span></div>
                                  </div>

                                  <div className="space-y-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Activity</div>
                                    <div className="text-sm font-bold text-slate-900">{detail.activityId?.type || '-'}</div>
                                    <div className="text-xs text-slate-600">Officer: <span className="font-bold">{detail.activityId?.officerName || '-'}</span></div>
                                    <div className="text-xs text-slate-600">Territory: <span className="font-bold">{detail.activityId?.territoryName || detail.activityId?.territory || '-'}</span></div>
                                    <div className="text-xs text-slate-600">State: <span className="font-bold">{detail.activityId?.state || '-'}</span></div>
                                  </div>

                                  <div className="md:col-span-2">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outbound</div>
                                        <div className="text-sm font-bold text-slate-900">{detail.callLog?.callStatus || '-'}</div>
                                      </div>
                                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Call Started</div>
                                        <div className="text-sm font-bold text-slate-900">{formatDateTime(detail.callStartedAt) || '-'}</div>
                                      </div>
                                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Duration</div>
                                        <div className="text-sm font-bold text-slate-900">{Number(detail.callLog?.callDurationSeconds || 0)}s</div>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="md:col-span-2">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Farmer Comments</div>
                                    <div className="bg-white rounded-xl border border-slate-200 p-3 text-sm text-slate-700 whitespace-pre-wrap">
                                      {detail.callLog?.farmerComments || '-'}
                                    </div>
                                    <div className="mt-2 text-xs text-slate-600">
                                      Sentiment: <span className="font-bold">{detail.callLog?.sentiment || 'N/A'}</span>
                                    </div>
                                  </div>

                                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Crops Discussed</div>
                                      <div className="text-sm font-bold text-slate-900">{safeArr(detail.callLog?.cropsDiscussed).join(', ') || '-'}</div>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Products Discussed</div>
                                      <div className="text-sm font-bold text-slate-900">{safeArr(detail.callLog?.productsDiscussed).join(', ') || '-'}</div>
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

          {/* Pagination - Matching Activity Sampling */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <p className="text-sm text-slate-600">
              Page {page} of {pages} • {Number(pagination?.total || 0)} total records
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
                onClick={() => load(page - 1)}
                disabled={page === 1 || isLoading || pages <= 1}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => load(page + 1)}
                disabled={page >= pages || isLoading || pages <= 1}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default AgentHistoryView;

