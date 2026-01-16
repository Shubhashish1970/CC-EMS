import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { tasksAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../shared/Modal';

type DateRangePreset =
  | 'Custom'
  | 'Today'
  | 'Yesterday'
  | 'This week (Sun - Today)'
  | 'Last 7 days'
  | 'Last week (Sun - Sat)'
  | 'Last 28 days'
  | 'Last 30 days';

const LANGUAGE_ORDER = [
  'Hindi',
  'Telugu',
  'Marathi',
  'Kannada',
  'Tamil',
  'Bengali',
  'Oriya',
  'Malayalam',
  'English',
  'Unknown',
] as const;

const TaskDashboardView: React.FC = () => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [allocRun, setAllocRun] = useState<any>(null);

  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', bu: '', state: '' });
  const [allocLanguage, setAllocLanguage] = useState<string>('ALL');
  const [allocCount, setAllocCount] = useState<number>(0);
  const [isAllocConfirmOpen, setIsAllocConfirmOpen] = useState(false);

  // Date range dropdown (same UX as Sampling Dashboard)
  const datePickerRef = useRef<HTMLDivElement | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('Custom');
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');

  const toISO = (d: Date) => d.toISOString().split('T')[0];
  const formatPretty = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  const getPresetRange = (preset: DateRangePreset): { start: string; end: string } => {
    const today = new Date();
    const start = new Date(today);

    const startOfWeekSunday = (dt: Date) => {
      const d = new Date(dt);
      const day = d.getDay();
      d.setDate(d.getDate() - day);
      return d;
    };

    switch (preset) {
      case 'Today':
        return { start: toISO(today), end: toISO(today) };
      case 'Yesterday': {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        return { start: toISO(y), end: toISO(y) };
      }
      case 'This week (Sun - Today)': {
        const s = startOfWeekSunday(today);
        return { start: toISO(s), end: toISO(today) };
      }
      case 'Last 7 days': {
        start.setDate(start.getDate() - 6);
        return { start: toISO(start), end: toISO(today) };
      }
      case 'Last week (Sun - Sat)': {
        const thisSun = startOfWeekSunday(today);
        const lastSun = new Date(thisSun);
        lastSun.setDate(lastSun.getDate() - 7);
        const lastSat = new Date(thisSun);
        lastSat.setDate(lastSat.getDate() - 1);
        return { start: toISO(lastSun), end: toISO(lastSat) };
      }
      case 'Last 28 days': {
        start.setDate(start.getDate() - 27);
        return { start: toISO(start), end: toISO(today) };
      }
      case 'Last 30 days': {
        start.setDate(start.getDate() - 29);
        return { start: toISO(start), end: toISO(today) };
      }
      case 'Custom':
      default:
        return { start: filters.dateFrom || '', end: filters.dateTo || '' };
    }
  };

  const syncDraftFromFilters = () => {
    setDraftStart(filters.dateFrom || '');
    setDraftEnd(filters.dateTo || '');
  };

  useEffect(() => {
    if (!isDatePickerOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (datePickerRef.current && !datePickerRef.current.contains(target)) {
        setIsDatePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isDatePickerOpen]);

  const loadDashboard = async () => {
    const res: any = await tasksAPI.getDashboard({
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      bu: filters.bu || undefined,
      state: filters.state || undefined,
    });
    setData(res?.data || null);
  };

  const loadLatestAllocationStatus = async () => {
    const res: any = await tasksAPI.getLatestAllocationStatus();
    const run = res?.data?.run || null;
    setAllocRun(run);
    return run;
  };

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadDashboard(), loadLatestAllocationStatus()]);
      } catch (e: any) {
        toast.showError(e.message || 'Failed to load task dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.dateFrom, filters.dateTo, filters.bu, filters.state]);

  const isAllocRunning = allocRun?.status === 'running';
  const allocPct = useMemo(() => {
    const processed = Number(allocRun?.processed ?? 0);
    const total = Number(allocRun?.total ?? 0);
    if (!total || total <= 0) return 0;
    const pct = Math.round((processed / total) * 100);
    return Math.max(0, Math.min(100, pct));
  }, [allocRun?.processed, allocRun?.total]);

  // Poll allocation status + refresh dashboard while allocation is running
  useEffect(() => {
    if (!isAllocRunning) return;
    let statusTimer: any = null;
    let refreshTimer: any = null;

    const tickStatus = async () => {
      try {
        const r = await loadLatestAllocationStatus();
        if (r && r.status !== 'running') {
          // final refresh
          await loadDashboard();
        }
      } catch {
        // ignore
      }
    };

    tickStatus();
    statusTimer = setInterval(tickStatus, 2000);
    refreshTimer = setInterval(() => {
      loadDashboard().catch(() => undefined);
    }, 5000);

    return () => {
      if (statusTimer) clearInterval(statusTimer);
      if (refreshTimer) clearInterval(refreshTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAllocRunning]);

  const unassignedRows = useMemo(() => {
    const rows = Array.isArray(data?.unassignedByLanguage) ? [...data.unassignedByLanguage] : [];
    const rank = (l: string) => {
      const idx = LANGUAGE_ORDER.indexOf(l as any);
      return idx === -1 ? 999 : idx;
    };
    rows.sort((a: any, b: any) => {
      const ar = rank(a.language);
      const br = rank(b.language);
      if (ar !== br) return ar - br;
      return String(a.language).localeCompare(String(b.language));
    });
    return rows;
  }, [data]);

  const unassignedTotalByLanguage = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of unassignedRows as any[]) {
      map.set(r.language, Number(r.unassigned || 0));
    }
    return map;
  }, [unassignedRows]);

  const totalUnassigned = useMemo(() => Number(data?.totals?.totalUnassigned || 0), [data]);
  const totals = useMemo(() => data?.totals || {}, [data]);

  const agentRows = useMemo(() => {
    const rows = Array.isArray(data?.agentWorkload) ? [...data.agentWorkload] : [];
    // stable order: name asc (backend already sorts by name, but keep stable)
    rows.sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));
    return rows;
  }, [data]);

  // Preselect the first language with unassigned tasks once data is loaded
  useEffect(() => {
    if (allocLanguage) return;
    // Default to ALL (best of both worlds) if any unassigned exists
    const any = (unassignedRows as any[]).some((r) => Number(r.unassigned || 0) > 0);
    if (any) setAllocLanguage('ALL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unassignedRows]);

  const openAllocateConfirm = () => {
    if (!allocLanguage) {
      toast.showError('Select a language to allocate');
      return;
    }
    const available = allocLanguage === 'ALL' ? totalUnassigned : Number(unassignedTotalByLanguage.get(allocLanguage) || 0);
    if (available <= 0) {
      toast.showError('No unassigned tasks for the selected language');
      return;
    }
    setIsAllocConfirmOpen(true);
  };

  const confirmAllocate = async () => {
    const available = allocLanguage === 'ALL' ? totalUnassigned : Number(unassignedTotalByLanguage.get(allocLanguage) || 0);
    const requested = allocCount && allocCount > 0 ? Math.min(allocCount, available) : available;

    setIsAllocConfirmOpen(false);
    setIsLoading(true);
    try {
      // Optimistic: show allocation progress immediately (0%) so user sees it started.
      setAllocRun({
        _id: 'optimistic',
        status: 'running',
        total: requested,
        processed: 0,
        allocated: 0,
        skipped: 0,
        lastProgressAt: new Date().toISOString(),
      });

      const payload: any = {
        language: allocLanguage,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        bu: filters.bu || undefined,
        state: filters.state || undefined,
      };
      // If count is 0/blank, allocate all (backend interprets missing/0 as all)
      if (allocCount && allocCount > 0) payload.count = requested;

      await tasksAPI.allocate(payload);
      toast.showSuccess(
        allocLanguage === 'ALL'
          ? `Allocated ${requested} task(s) across all languages`
          : `Allocated ${requested} task(s) for ${allocLanguage}`
      );
      await Promise.all([loadDashboard(), loadLatestAllocationStatus()]);
    } catch (e: any) {
      const msg = e?.message || 'Failed to allocate tasks';
      if (typeof msg === 'string' && msg.toLowerCase().includes('timed out')) {
        toast.showSuccess('Allocation is still running. Keeping this screen active and checking status...');
        // keep polling; status effect will refresh
        await loadLatestAllocationStatus().catch(() => undefined);
      } else {
        toast.showError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await loadDashboard();
      toast.showSuccess('Refreshed');
    } catch (e: any) {
      toast.showError(e.message || 'Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Modal
        isOpen={isAllocConfirmOpen}
        onClose={() => setIsAllocConfirmOpen(false)}
        title="Confirm Allocation"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-700 font-medium">
            Auto-allocate{' '}
            <span className="font-black">
              {allocCount && allocCount > 0
                ? Math.min(allocCount, allocLanguage === 'ALL' ? totalUnassigned : Number(unassignedTotalByLanguage.get(allocLanguage) || 0))
                : (allocLanguage === 'ALL' ? totalUnassigned : Number(unassignedTotalByLanguage.get(allocLanguage) || 0))}
            </span>{' '}
            unassigned task(s){' '}
            {allocLanguage === 'ALL' ? (
              <span className="font-black">across all languages</span>
            ) : (
              <>
                for <span className="font-black">{allocLanguage}</span>
              </>
            )}{' '}
            to capable agents?
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-700 font-bold">
              Allocation will distribute tasks round-robin across agents who have this language capability and move tasks to{' '}
              <span className="font-black">Sampled-in-queue</span>.
            </p>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAllocConfirmOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-black"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmAllocate}
              className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-black disabled:opacity-50"
              disabled={isLoading}
            >
              Yes
            </button>
          </div>
        </div>
      </Modal>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Task Dashboard</h2>
            <p className="text-sm text-slate-600">
              Unassigned tasks by language + agent workload (Sampled-in-queue and In-progress)
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold"
            disabled={isLoading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Date Range</label>
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-between"
              >
                <span className="truncate">
                  {selectedPreset}
                  {filters.dateFrom && filters.dateTo ? ` • ${formatPretty(filters.dateFrom)} - ${formatPretty(filters.dateTo)}` : ''}
                </span>
                <Calendar size={16} className="text-slate-400" />
              </button>

              {isDatePickerOpen && (
                <div className="absolute z-50 mt-2 w-[720px] max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="flex">
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
                            setFilters((prev) => ({ ...prev, dateFrom: draftStart || '', dateTo: draftEnd || '' }));
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

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">BU</label>
            <select
              value={filters.bu}
              onChange={(e) => setFilters((p) => ({ ...p, bu: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
            >
              <option value="">All</option>
              {(data?.filterOptions?.buOptions || []).map((b: string) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">State</label>
            <select
              value={filters.state}
              onChange={(e) => setFilters((p) => ({ ...p, state: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
            >
              <option value="">All</option>
              {(data?.filterOptions?.stateOptions || []).map((s: string) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total Open', value: totals.totalOpen ?? 0 },
            { label: 'Unassigned', value: totals.unassigned ?? 0 },
            { label: 'Assigned', value: totals.assigned ?? 0 },
            { label: 'Sampled-in-queue', value: totals.sampledInQueue ?? 0 },
            { label: 'In-progress', value: totals.inProgress ?? 0 },
          ].map((c: any) => (
            <div key={c.label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
              <p className="text-xl font-black text-slate-900">{c.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Unassigned by language */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">Tasks by Language (Open)</h3>
          <div className="text-sm font-bold text-slate-600">
            Total Unassigned: <span className="font-black text-slate-900">{data?.totals?.totalUnassigned ?? 0}</span>
          </div>
        </div>

        {/* Allocation controls */}
        <div className="mt-4 flex flex-col md:flex-row md:items-end gap-3 md:justify-between">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:max-w-3xl">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Language</label>
              <select
                value={allocLanguage}
                onChange={(e) => setAllocLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
              >
                <option value="">Select language</option>
                <option value="ALL">All Languages ({totalUnassigned})</option>
                {unassignedRows
                  .filter((r: any) => Number(r.unassigned || 0) > 0)
                  .map((r: any) => (
                    <option key={r.language} value={r.language}>
                      {r.language} ({r.unassigned})
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">
                Count (optional)
              </label>
              <input
                type="number"
                min={0}
                value={allocCount}
                onChange={(e) => setAllocCount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
                placeholder="0 = All"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={openAllocateConfirm}
                disabled={
                  isLoading ||
                  isAllocRunning ||
                  !allocLanguage ||
                  (allocLanguage === 'ALL'
                    ? totalUnassigned === 0
                    : Number(unassignedTotalByLanguage.get(allocLanguage) || 0) === 0)
                }
                className="w-full px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-black disabled:opacity-50"
              >
                Auto-Allocate
              </button>
            </div>
          </div>
        </div>

        {/* Allocation progress */}
        <div className="mt-4">
          {allocRun ? (
            <div className="text-xs text-slate-600">
              <span className="font-black">Latest allocation:</span>{' '}
              <span className="font-bold">
                {allocRun.status === 'running' ? 'Running' : allocRun.status === 'completed' ? 'Completed' : 'Failed'}
              </span>
              {typeof allocRun.processed === 'number' && typeof allocRun.total === 'number' ? (
                <>
                  {' '}
                  • <span className="font-bold">Processed {allocRun.processed}/{allocRun.total}</span>
                </>
              ) : null}
              {typeof allocRun.allocated === 'number' ? (
                <>
                  {' '}
                  • <span className="font-bold">Allocated {allocRun.allocated}</span>
                </>
              ) : null}
              {typeof allocRun.skipped === 'number' && allocRun.skipped > 0 ? (
                <>
                  {' '}
                  • <span className="font-bold text-amber-800">Skipped {allocRun.skipped}</span>
                </>
              ) : null}
            </div>
          ) : (
            <div className="text-xs text-slate-500">Latest allocation: none</div>
          )}

          {isAllocRunning && (
            <div className="mt-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-black text-green-900">Allocation is running…</div>
                <div className="text-xs font-black text-green-900">{allocPct}%</div>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-green-100 overflow-hidden">
                <div
                  className="h-2 bg-green-700 rounded-full transition-[width] duration-300"
                  style={{ width: `${allocPct}%` }}
                />
              </div>
              <div className="mt-2 text-xs text-green-900">
                The dashboard will refresh automatically while allocation runs. Please wait until it completes.
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="min-w-[780px] w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Language</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Total Open</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Unassigned</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Sampled-in-queue</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">In-progress</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.openByLanguage || []).map((r: any) => (
                <tr key={r.language}>
                  <td className="px-4 py-3 font-black text-slate-900">{r.language}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">{r.unassigned}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">{r.totalOpen}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">{r.unassigned}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">{r.sampledInQueue}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">{r.inProgress}</td>
                </tr>
              ))}
              {(!data?.openByLanguage || data.openByLanguage.length === 0) && (
                <tr>
                  <td className="px-4 py-6 text-slate-600" colSpan={5}>
                    No open tasks found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent workload */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-black text-slate-900">Agent Workload</h3>
        <p className="text-sm text-slate-600 mt-1">Assigned workload = Sampled-in-queue + In-progress</p>

        <div className="mt-4 overflow-x-auto border border-slate-200 rounded-2xl">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Agent</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Employee ID</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Languages</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Assigned</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Sampled-in-queue</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">In-progress</th>
                <th className="px-4 py-3 text-left text-xs font-black text-slate-400 uppercase tracking-widest">Total Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentRows.map((a: any) => (
                <tr key={a.agentId}>
                  <td className="px-4 py-3">
                    <div className="font-black text-slate-900">{a.name}</div>
                    <div className="text-xs text-slate-500">{a.email}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">{a.employeeId}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-700">
                    {(Array.isArray(a.languageCapabilities) ? a.languageCapabilities : []).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3 font-black text-slate-900">{a.totalOpen}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">{a.sampledInQueue}</td>
                  <td className="px-4 py-3 font-bold text-slate-700">{a.inProgress}</td>
                  <td className="px-4 py-3 font-black text-slate-900">{a.totalOpen}</td>
                </tr>
              ))}
              {!agentRows.length && (
                <tr>
                  <td className="px-4 py-6 text-slate-600" colSpan={7}>
                    No agents found for this Team Lead.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TaskDashboardView;

