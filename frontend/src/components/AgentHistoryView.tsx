import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, RefreshCw, ChevronDown } from 'lucide-react';
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

const AgentHistoryView: React.FC<{ onOpenTask?: (taskId: string) => void }> = ({ onOpenTask }) => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);

  const [filters, setFilters] = useState<{ status: HistoryStatus; search: string; dateFrom: string; dateTo: string }>({
    status: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });

  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('Last 7 days');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const datePickerRef = useRef<HTMLDivElement | null>(null);

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
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page,
        limit: 20,
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
  }, [filters.status, filters.search, filters.dateFrom, filters.dateTo]);

  const page = Number(pagination?.page || 1);
  const pages = Number(pagination?.pages || 1);

  const visible = useMemo(() => rows || [], [rows]);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#f1f5f1]">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">History</h2>
              <p className="text-sm text-slate-600">All tasks except “In Queue”.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => load(page)} disabled={isLoading}>
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</div>
              <select
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value as any }))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
              >
                <option value="">All (except In Queue)</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed Conversation</option>
                <option value="not_reachable">Unsuccessful</option>
                <option value="invalid_number">Unsuccessful (Invalid)</option>
              </select>
            </div>

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
                          setFilters((p) => ({ ...p, dateFrom: draftStart, dateTo: draftEnd }));
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
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Search</div>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.search}
                  onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
                  placeholder="Farmer, mobile, territory, activity..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <th className="text-left py-3 pr-4">Farmer</th>
                  <th className="text-left py-3 pr-4">Outcome</th>
                  <th className="text-left py-3 pr-4">Outbound</th>
                  <th className="text-left py-3 pr-4">Activity</th>
                  <th className="text-left py-3 pr-4">Territory</th>
                  <th className="text-left py-3 pr-4">Updated</th>
                  <th className="text-right py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((t: any) => {
                  const farmer = t.farmerId || t.farmer || {};
                  const activity = t.activityId || t.activity || {};
                  const outbound = t.callLog?.callStatus || '';
                  const updated = t.updatedAt ? formatPretty(String(t.updatedAt).slice(0, 10)) : '-';
                  const territory = (activity.territoryName || activity.territory || '').toString();
                  return (
                    <tr key={t._id} className="hover:bg-slate-50">
                      <td className="py-3 pr-4">
                        <div className="font-bold text-slate-900">{farmer.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-500">{farmer.mobileNumber || ''}</div>
                      </td>
                      <td className="py-3 pr-4 font-bold text-slate-700">{outcomeLabel(t.status)}</td>
                      <td className="py-3 pr-4 text-slate-700">{outboundLabel(outbound)}</td>
                      <td className="py-3 pr-4 text-slate-700">{activity.type || '-'}</td>
                      <td className="py-3 pr-4 text-slate-700">{territory || '-'}</td>
                      <td className="py-3 pr-4 text-slate-600">{updated}</td>
                      <td className="py-3 text-right">
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
                  );
                })}
                {!visible.length && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No history found for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Page <span className="font-bold">{page}</span> of <span className="font-bold">{pages}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1 || isLoading} onClick={() => load(page - 1)}>
                  Prev
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= pages || isLoading} onClick={() => load(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentHistoryView;

