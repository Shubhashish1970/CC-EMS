import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, RefreshCw, TrendingUp, TrendingDown, Clock, Phone, CheckCircle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import Button from './shared/Button';
import { tasksAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

type Bucket = 'daily' | 'weekly' | 'monthly';
type DateRangePreset =
  | 'Custom'
  | 'Today'
  | 'Yesterday'
  | 'This week (Sun - Today)'
  | 'Last 7 days'
  | 'Last week (Sun - Sat)'
  | 'Last 28 days'
  | 'Last 30 days'
  | 'Last 90 days';

// Format date to YYYY-MM-DD in local timezone (not UTC) to avoid timezone conversion issues
const toLocalISO = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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
  const day = today.getDay();

  switch (preset) {
    case 'Today':
      return { start: toLocalISO(today), end: toLocalISO(today) };
    case 'Yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: toLocalISO(y), end: toLocalISO(y) };
    }
    case 'This week (Sun - Today)': {
      const s = new Date(today);
      s.setDate(s.getDate() - day);
      return { start: toLocalISO(s), end: toLocalISO(today) };
    }
    case 'Last 7 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { start: toLocalISO(s), end: toLocalISO(today) };
    }
    case 'Last week (Sun - Sat)': {
      const lastSat = new Date(today);
      lastSat.setDate(lastSat.getDate() - (day + 1));
      const lastSun = new Date(lastSat);
      lastSun.setDate(lastSun.getDate() - 6);
      return { start: toLocalISO(lastSun), end: toLocalISO(lastSat) };
    }
    case 'Last 28 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 27);
      return { start: toLocalISO(s), end: toLocalISO(today) };
    }
    case 'Last 30 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { start: toLocalISO(s), end: toLocalISO(today) };
    }
    case 'Last 90 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 89);
      return { start: toLocalISO(s), end: toLocalISO(today) };
    }
    case 'Custom':
    default:
      return { start: '', end: '' };
  }
};

// Auto-select bucket based on date range
const getAutoBucket = (dateFrom: string, dateTo: string): Bucket => {
  if (!dateFrom || !dateTo) return 'daily';
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  const days = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  if (days <= 14) return 'daily';
  if (days <= 60) return 'weekly';
  return 'monthly';
};

const fmtDuration = (secs: number) => {
  const s = Number(secs || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
};

// Format period for display
const formatPeriod = (period: string, bucket: Bucket) => {
  if (bucket === 'daily') {
    try {
      const d = new Date(period);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    } catch {
      return period;
    }
  }
  return period;
};

const AgentAnalyticsView: React.FC = () => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [showDetailTable, setShowDetailTable] = useState(false);

  const [filters, setFilters] = useState<{ dateFrom: string; dateTo: string }>({ dateFrom: '', dateTo: '' });

  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('Last 7 days');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const datePickerRef = useRef<HTMLDivElement | null>(null);

  // Auto-calculate bucket based on date range
  const bucket = useMemo(() => getAutoBucket(filters.dateFrom, filters.dateTo), [filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    if (filters.dateFrom || filters.dateTo) return;
    const r = getPresetRange('Last 7 days');
    setFilters({ dateFrom: r.start, dateTo: r.end });
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

  const load = async () => {
    setIsLoading(true);
    try {
      const res: any = await tasksAPI.getOwnAnalytics({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        bucket,
      });
      setData(res?.data || null);
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to load performance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo, bucket]);

  const totals = useMemo(() => data?.totals || {}, [data]);
  const trend = useMemo(() => Array.isArray(data?.trend) ? data.trend : [], [data]);

  // Calculate max for bar chart scaling
  const maxAttempted = useMemo(() => {
    if (!trend.length) return 1;
    return Math.max(...trend.map((r: any) => r.attempted || 0), 1);
  }, [trend]);

  // Outcome breakdown for visual display
  const outcomeData = useMemo(() => [
    { label: 'Completed', value: totals.successful || 0, color: 'bg-green-500', textColor: 'text-green-700' },
    { label: 'Unsuccessful', value: totals.unsuccessful || 0, color: 'bg-red-500', textColor: 'text-red-700' },
    { label: 'In Progress', value: totals.inProgress || 0, color: 'bg-amber-500', textColor: 'text-amber-700' },
  ], [totals]);

  // Outbound status breakdown
  const outboundData = useMemo(() => [
    { label: 'Connected', value: totals.connected || 0, color: 'bg-green-400' },
    { label: 'No Answer', value: totals.noAnswer || 0, color: 'bg-slate-400' },
    { label: 'Disconnected', value: totals.disconnected || 0, color: 'bg-orange-400' },
    { label: 'Invalid', value: totals.invalid || 0, color: 'bg-red-400' },
    { label: 'Incoming N/A', value: totals.incomingNA || 0, color: 'bg-purple-400' },
  ].filter(d => d.value > 0), [totals]);

  const totalOutbound = useMemo(() => outboundData.reduce((sum, d) => sum + d.value, 0), [outboundData]);

  return (
    <div className="h-full overflow-y-auto p-6 bg-[#f1f5f1]">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Performance Dashboard</h2>
              <p className="text-xs text-slate-500">Your call performance metrics and trends</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Date Range Selector */}
              <div className="relative" ref={datePickerRef}>
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen((v) => !v)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 flex items-center gap-2 hover:bg-slate-50"
                >
                  <span className="truncate max-w-[200px]">
                    {selectedPreset === 'Custom' ? `${formatPretty(filters.dateFrom)} - ${formatPretty(filters.dateTo)}` : selectedPreset}
                  </span>
                  <ChevronDown size={16} className="text-slate-400" />
                </button>

                {isDatePickerOpen && (
                  <div className="absolute z-50 mt-2 right-0 w-80 bg-white rounded-2xl border border-slate-200 shadow-lg p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Quick Select</div>
                        <div className="grid grid-cols-2 gap-1">
                          {(['Today', 'Yesterday', 'Last 7 days', 'Last 28 days', 'Last 30 days', 'Last 90 days'] as DateRangePreset[]).map((p) => (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                setSelectedPreset(p);
                                const r = getPresetRange(p);
                                setDraftStart(r.start);
                                setDraftEnd(r.end);
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left ${
                                selectedPreset === p ? 'bg-green-100 text-green-700' : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">From</div>
                          <input type="date" value={draftStart} onChange={(e) => { setSelectedPreset('Custom'); setDraftStart(e.target.value); }} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">To</div>
                          <input type="date" value={draftEnd} onChange={(e) => { setSelectedPreset('Custom'); setDraftEnd(e.target.value); }} className="w-full px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
                      <Button variant="secondary" size="sm" onClick={() => setIsDatePickerOpen(false)}>Cancel</Button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilters({ dateFrom: draftStart, dateTo: draftEnd });
                          setIsDatePickerOpen(false);
                        }}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-green-700 hover:bg-green-800"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <Button variant="secondary" size="sm" onClick={load} disabled={isLoading}>
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Total Calls */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-50">
                <Phone size={14} className="text-blue-600" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Calls</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{totals.attempted || 0}</div>
            <div className="text-xs text-slate-500 mt-1">{totals.callsPerDay || 0}/day avg</div>
          </div>

          {/* Success Rate */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${(totals.successRate || 0) >= 50 ? 'bg-green-50' : 'bg-amber-50'}`}>
                {(totals.successRate || 0) >= 50 ? (
                  <TrendingUp size={14} className="text-green-600" />
                ) : (
                  <TrendingDown size={14} className="text-amber-600" />
                )}
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Success Rate</span>
            </div>
            <div className={`text-3xl font-black ${(totals.successRate || 0) >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
              {totals.successRate || 0}%
            </div>
            <div className="text-xs text-slate-500 mt-1">{totals.successful || 0} completed</div>
          </div>

          {/* Avg Duration */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-purple-50">
                <Clock size={14} className="text-purple-600" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Duration</span>
            </div>
            <div className="text-3xl font-black text-slate-900">{fmtDuration(totals.avgConnectedDurationSeconds || 0)}</div>
            <div className="text-xs text-slate-500 mt-1">{totals.connectedCount || 0} connected</div>
          </div>

          {/* Outcomes Summary */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-slate-100">
                <AlertCircle size={14} className="text-slate-600" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Outcomes</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <CheckCircle size={14} className="text-green-500" />
                <span className="text-sm font-bold text-slate-700">{totals.successful || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle size={14} className="text-red-500" />
                <span className="text-sm font-bold text-slate-700">{totals.unsuccessful || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} className="text-amber-500" />
                <span className="text-sm font-bold text-slate-700">{totals.inProgress || 0}</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1.5">Completed • Unsuccessful • In Progress</div>
          </div>
        </div>

        {/* Trend Chart + Outcome Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Trend Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900">Call Trend</h3>
                <p className="text-[10px] text-slate-500">Grouped by {bucket}</p>
              </div>
            </div>
            
            {trend.length > 0 ? (
              <div className="space-y-2">
                {trend.map((row: any) => {
                  const successPct = row.attempted > 0 ? (row.successful / row.attempted) * 100 : 0;
                  const unsuccessPct = row.attempted > 0 ? (row.unsuccessful / row.attempted) * 100 : 0;
                  const inProgressPct = row.attempted > 0 ? (row.inProgress / row.attempted) * 100 : 0;
                  const barWidth = (row.attempted / maxAttempted) * 100;
                  
                  return (
                    <div key={row.period} className="flex items-center gap-3">
                      <div className="w-16 text-xs font-medium text-slate-600 text-right shrink-0">
                        {formatPeriod(row.period, bucket)}
                      </div>
                      <div className="flex-1 h-7 bg-slate-100 rounded-lg overflow-hidden relative" style={{ width: `${barWidth}%`, minWidth: '40px' }}>
                        <div className="h-full flex">
                          {successPct > 0 && (
                            <div className="bg-green-500 h-full" style={{ width: `${successPct}%` }} title={`Completed: ${row.successful}`} />
                          )}
                          {unsuccessPct > 0 && (
                            <div className="bg-red-400 h-full" style={{ width: `${unsuccessPct}%` }} title={`Unsuccessful: ${row.unsuccessful}`} />
                          )}
                          {inProgressPct > 0 && (
                            <div className="bg-amber-400 h-full" style={{ width: `${inProgressPct}%` }} title={`In Progress: ${row.inProgress}`} />
                          )}
                        </div>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white mix-blend-difference">
                          {row.attempted}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
                No data for selected range
              </div>
            )}
            
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-[10px] text-slate-600">Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-red-400" />
                <span className="text-[10px] text-slate-600">Unsuccessful</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-amber-400" />
                <span className="text-[10px] text-slate-600">In Progress</span>
              </div>
            </div>
          </div>

          {/* Outbound Status Breakdown */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-4">Call Status Breakdown</h3>
            
            {outboundData.length > 0 ? (
              <div className="space-y-3">
                {outboundData.map((item) => {
                  const pct = totalOutbound > 0 ? Math.round((item.value / totalOutbound) * 100) : 0;
                  return (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-600">{item.label}</span>
                        <span className="text-xs font-bold text-slate-900">{item.value} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
                No outbound data
              </div>
            )}
          </div>
        </div>

        {/* Detailed Table (Collapsible) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowDetailTable(!showDetailTable)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50"
          >
            <span className="text-sm font-black text-slate-700">Detailed Breakdown</span>
            <ChevronRight size={16} className={`text-slate-400 transition-transform ${showDetailTable ? 'rotate-90' : ''}`} />
          </button>
          
          {showDetailTable && (
            <div className="px-4 pb-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                    <th className="text-left py-2 pr-4">Period</th>
                    <th className="text-right py-2 pr-4">Attempted</th>
                    <th className="text-right py-2 pr-4">Completed</th>
                    <th className="text-right py-2 pr-4">Unsuccessful</th>
                    <th className="text-right py-2 pr-4">In Progress</th>
                    <th className="text-right py-2">Success %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {trend.map((r: any) => {
                    const successPct = r.attempted > 0 ? Math.round((r.successful / r.attempted) * 100) : 0;
                    return (
                      <tr key={r.period} className="hover:bg-slate-50">
                        <td className="py-2 pr-4 font-medium text-slate-900">{r.period}</td>
                        <td className="py-2 pr-4 text-right font-bold text-slate-700">{r.attempted}</td>
                        <td className="py-2 pr-4 text-right font-bold text-green-600">{r.successful}</td>
                        <td className="py-2 pr-4 text-right font-bold text-red-600">{r.unsuccessful}</td>
                        <td className="py-2 pr-4 text-right font-bold text-amber-600">{r.inProgress}</td>
                        <td className="py-2 text-right font-bold text-slate-700">{successPct}%</td>
                      </tr>
                    );
                  })}
                  {!trend.length && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No data for selected range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentAnalyticsView;
