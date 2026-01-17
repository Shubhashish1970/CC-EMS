import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, RefreshCw } from 'lucide-react';
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
  | 'Last 30 days';

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

const fmtDuration = (secs: number) => {
  const s = Number(secs || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r}s`;
};

const AgentAnalyticsView: React.FC = () => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const [bucket, setBucket] = useState<Bucket>('daily');
  const [filters, setFilters] = useState<{ dateFrom: string; dateTo: string }>({ dateFrom: '', dateTo: '' });

  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('Last 7 days');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const datePickerRef = useRef<HTMLDivElement | null>(null);

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

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#f1f5f1]">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Performance</h2>
              <p className="text-sm text-slate-600">Attempted = outbound status selected (not “In Queue”).</p>
            </div>
            <Button variant="secondary" size="sm" onClick={load} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date Range</div>
              <div className="relative" ref={datePickerRef}>
                <button
                  type="button"
                  onClick={() => setIsDatePickerOpen((v) => !v)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 flex items-center justify-between"
                >
                  <span className="truncate">
                    {selectedPreset} • {formatPretty(filters.dateFrom)} - {formatPretty(filters.dateTo)}
                  </span>
                  <ChevronDown size={16} className="text-slate-400" />
                </button>

                {isDatePickerOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preset</div>
                        <select
                          value={selectedPreset}
                          onChange={(e) => {
                            const p = e.target.value as DateRangePreset;
                            setSelectedPreset(p);
                            const r = getPresetRange(p);
                            setDraftStart(r.start || draftStart);
                            setDraftEnd(r.end || draftEnd);
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
                        >
                          {(['Custom','Today','Yesterday','This week (Sun - Today)','Last 7 days','Last week (Sun - Sat)','Last 28 days','Last 30 days'] as DateRangePreset[]).map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">From</div>
                          <input type="date" value={draftStart} onChange={(e) => { setSelectedPreset('Custom'); setDraftStart(e.target.value); }} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">To</div>
                          <input type="date" value={draftEnd} onChange={(e) => { setSelectedPreset('Custom'); setDraftEnd(e.target.value); }} className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-4">
                      <Button variant="secondary" size="sm" onClick={() => setIsDatePickerOpen(false)}>Cancel</Button>
                      <button
                        type="button"
                        onClick={() => {
                          setFilters({ dateFrom: draftStart, dateTo: draftEnd });
                          setIsDatePickerOpen(false);
                        }}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-green-700 hover:bg-green-800"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Bucket</div>
              <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-white">
                {(['daily','weekly','monthly'] as Bucket[]).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBucket(b)}
                    className={`flex-1 px-3 py-2 text-sm font-black uppercase tracking-tighter ${
                      bucket === b ? 'bg-green-700 text-white' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Connected Duration</div>
              <div className="text-xl font-black text-slate-900">{fmtDuration(Number(totals.avgConnectedDurationSeconds || 0))}</div>
              <div className="text-xs text-slate-500">Connected calls: {Number(totals.connectedCount || 0)}</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Attempted', value: totals.attempted || 0 },
              { label: 'Successful', value: totals.successful || 0 },
              { label: 'Unsuccessful', value: totals.unsuccessful || 0 },
              { label: 'In Progress', value: totals.inProgress || 0 },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-2xl p-4 border border-slate-200">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.label}</div>
                <div className="text-2xl font-black text-slate-900">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Disconnected', value: totals.disconnected || 0 },
              { label: 'Incoming N/A', value: totals.incomingNA || 0 },
              { label: 'Invalid', value: totals.invalid || 0 },
              { label: 'No Answer', value: totals.noAnswer || 0 },
            ].map((k) => (
              <div key={k.label} className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{k.label}</div>
                <div className="text-xl font-black text-slate-900">{k.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 overflow-x-auto">
            <div className="text-sm font-black text-slate-900 mb-2">Trend</div>
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="text-left py-3 pr-4">Period</th>
                  <th className="text-right py-3 pr-4">Attempted</th>
                  <th className="text-right py-3 pr-4">Successful</th>
                  <th className="text-right py-3 pr-4">Unsuccessful</th>
                  <th className="text-right py-3">In Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {trend.map((r: any) => (
                  <tr key={r.period} className="hover:bg-slate-50">
                    <td className="py-3 pr-4 font-bold text-slate-900">{r.period}</td>
                    <td className="py-3 pr-4 text-right font-bold text-slate-700">{r.attempted}</td>
                    <td className="py-3 pr-4 text-right font-bold text-green-700">{r.successful}</td>
                    <td className="py-3 pr-4 text-right font-bold text-slate-700">{r.unsuccessful}</td>
                    <td className="py-3 text-right font-bold text-slate-700">{r.inProgress}</td>
                  </tr>
                ))}
                {!trend.length && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No data for selected range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentAnalyticsView;

