import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, RefreshCw, Save, Play, RotateCcw, Filter, CheckSquare, Square } from 'lucide-react';
import { samplingAPI, tasksAPI, usersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

type LifecycleStatus = 'active' | 'sampled' | 'inactive' | 'not_eligible';

const ALL_ACTIVITY_TYPES = ['Field Day', 'Group Meeting', 'Demo Visit', 'OFM', 'Other'] as const;
type DateRangePreset =
  | 'Custom'
  | 'Today'
  | 'Yesterday'
  | 'This week (Sun - Today)'
  | 'Last 7 days'
  | 'Last week (Sun - Sat)'
  | 'Last 28 days'
  | 'Last 30 days';

type SamplingRunStatus = 'running' | 'completed' | 'failed';
type LatestRun = {
  _id: string;
  status: SamplingRunStatus;
  matched?: number;
  processed?: number;
  tasksCreatedTotal?: number;
  errorCount?: number;
};

const RunStatusInline: React.FC<{
  loadLatestRunStatus: () => Promise<LatestRun | null>;
  isLoading: boolean;
}> = ({ loadLatestRunStatus, isLoading }) => {
  const [run, setRun] = useState<LatestRun | null>(null);

  useEffect(() => {
    let mounted = true;
    let timer: any = null;

    const tick = async () => {
      try {
        const r = await loadLatestRunStatus();
        if (mounted) setRun(r);
      } catch {
        // ignore
      }
    };

    tick();

    const shouldPoll = isLoading || run?.status === 'running';
    if (shouldPoll) {
      timer = setInterval(tick, 2000);
    }

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, run?.status]);

  if (!run) return <span>Latest run: none</span>;

  const statusLabel =
    run.status === 'running' ? 'Running' : run.status === 'completed' ? 'Completed' : 'Failed';

  const parts = [
    `Latest run: ${statusLabel}`,
    typeof run.processed === 'number' && typeof run.matched === 'number'
      ? `Processed ${run.processed}/${run.matched}`
      : null,
    typeof run.tasksCreatedTotal === 'number' ? `Tasks ${run.tasksCreatedTotal}` : null,
    typeof run.errorCount === 'number' && run.errorCount > 0 ? `Errors ${run.errorCount}` : null,
  ].filter(Boolean);

  return <span>{parts.join(' • ')}</span>;
};

const SamplingControlView: React.FC = () => {
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const [eligibleTypes, setEligibleTypes] = useState<string[]>([]);
  const [activityCoolingDays, setActivityCoolingDays] = useState<number>(5);
  const [farmerCoolingDays, setFarmerCoolingDays] = useState<number>(30);
  const [defaultPercentage, setDefaultPercentage] = useState<number>(10);

  const [activityFilters, setActivityFilters] = useState({
    lifecycleStatus: 'active' as LifecycleStatus,
    dateFrom: '',
    dateTo: '',
  });

  // Date range dropdown (same UX as Admin Activity Sampling)
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
    const end = new Date(today);
    const start = new Date(today);

    const startOfWeekSunday = (dt: Date) => {
      const d = new Date(dt);
      const day = d.getDay(); // 0=Sun
      d.setDate(d.getDate() - day);
      return d;
    };

    switch (preset) {
      case 'Today': {
        return { start: toISO(today), end: toISO(today) };
      }
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
        const s = new Date(today);
        s.setDate(s.getDate() - 6);
        return { start: toISO(s), end: toISO(today) };
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
      default: {
        return { start: activityFilters.dateFrom || '', end: activityFilters.dateTo || '' };
      }
    }
  };

  const syncDraftFromFilters = () => {
    setDraftStart(activityFilters.dateFrom || '');
    setDraftEnd(activityFilters.dateTo || '');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDatePickerOpen]);

  const [stats, setStats] = useState<any>(null);

  const [unassignedTasks, setUnassignedTasks] = useState<any[]>([]);
  const [selectedUnassignedTaskIds, setSelectedUnassignedTaskIds] = useState<Set<string>>(new Set());
  const [agents, setAgents] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [bulkAssignAgentId, setBulkAssignAgentId] = useState<string>('');

  const totalActivities = Number(stats?.totals?.totalActivities || 0);
  const totalMatchingByLifecycle = useMemo(() => {
    const t = stats?.totals;
    if (!t) return 0;
    switch (activityFilters.lifecycleStatus) {
      case 'active':
        return Number(t.active || 0);
      case 'sampled':
        return Number(t.sampled || 0);
      case 'inactive':
        return Number(t.inactive || 0);
      case 'not_eligible':
        return Number(t.notEligible || 0);
      default:
        return 0;
    }
  }, [stats, activityFilters.lifecycleStatus]);

  const loadConfig = async () => {
    const res: any = await samplingAPI.getConfig();
    const cfg = res?.data?.config;
    setConfig(cfg);

    setEligibleTypes(Array.isArray(cfg?.eligibleActivityTypes) ? cfg.eligibleActivityTypes : []);
    setActivityCoolingDays(Number(cfg?.activityCoolingDays ?? 5));
    setFarmerCoolingDays(Number(cfg?.farmerCoolingDays ?? 30));
    setDefaultPercentage(Number(cfg?.defaultPercentage ?? 10));
  };

  const loadStats = async () => {
    const res: any = await samplingAPI.getStats({
      dateFrom: activityFilters.dateFrom || undefined,
      dateTo: activityFilters.dateTo || undefined,
    });
    setStats(res?.data || null);
  };

  const loadLatestRunStatus = async () => {
    const res: any = await samplingAPI.getLatestRunStatus();
    return res?.data?.run || null;
  };

  const loadUnassigned = async () => {
    const res: any = await tasksAPI.getUnassignedTasks({ page: 1, limit: 50 });
    setUnassignedTasks(res?.data?.tasks || []);
    setSelectedUnassignedTaskIds(new Set());
  };

  const loadAgents = async () => {
    const res: any = await usersAPI.getTeamAgents();
    const list = res?.data?.agents || [];
    setAgents(list);
  };

  const handleResetSelections = () => {
    // Clear any checked rows and reset filters back to defaults
    setSelectedUnassignedTaskIds(new Set());
    setBulkAssignAgentId('');
    setActivityFilters({
      lifecycleStatus: 'active',
      dateFrom: '',
      dateTo: '',
    });
    toast.showSuccess('Selections cleared');
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadConfig(), loadStats(), loadUnassigned(), loadAgents()]);
      } catch (e: any) {
        toast.showError(e.message || 'Failed to load sampling control data');
      } finally {
        setIsLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadStats()]);
      } catch (e: any) {
        toast.showError(e.message || 'Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityFilters.lifecycleStatus, activityFilters.dateFrom, activityFilters.dateTo]);

  // Note: Activities selection removed. Sampling runs on ALL activities matching current filters.

  const toggleEligibilityType = (type: string) => {
    const set = new Set(eligibleTypes);
    if (set.has(type)) set.delete(type);
    else set.add(type);
    setEligibleTypes(Array.from(set));
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    try {
      await samplingAPI.updateConfig({
        eligibleActivityTypes: eligibleTypes,
        activityCoolingDays,
        farmerCoolingDays,
        defaultPercentage,
      });
      // Requirement: if a type is not selected, activities of that type should move to Not Eligible.
      await samplingAPI.applyEligibility(eligibleTypes);
      toast.showSuccess('Sampling config saved and eligibility applied');
      await loadConfig();
      await loadStats();
    } catch (e: any) {
      toast.showError(e.message || 'Failed to save config');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChooseActivityTypeToSample = async () => {
    setIsLoading(true);
    try {
      await samplingAPI.applyEligibility(eligibleTypes);
      toast.showSuccess('Activity type selection applied');
      await loadConfig();
      await loadStats();
    } catch (e: any) {
      toast.showError(e.message || 'Failed to apply eligibility');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunSampling = async () => {
    if (totalMatchingByLifecycle === 0) {
      toast.showError('No activities match the current filters');
      return;
    }
    setIsLoading(true);
    try {
      const res: any = await samplingAPI.runSampling({
        lifecycleStatus: activityFilters.lifecycleStatus,
        dateFrom: activityFilters.dateFrom || undefined,
        dateTo: activityFilters.dateTo || undefined,
      });
      toast.showSuccess(
        `Sampling done. Matched: ${res?.data?.matched ?? 0}, Processed: ${res?.data?.processed ?? 0}, Tasks created: ${res?.data?.tasksCreatedTotal ?? 0}`
      );
      await loadStats();
      await loadUnassigned();
    } catch (e: any) {
      // If the request timed out on the client, keep polling status instead of showing a hard error
      const msg = e?.message || 'Failed to run sampling';
      if (typeof msg === 'string' && msg.toLowerCase().includes('timed out')) {
        toast.showSuccess('Sampling is still running. Keeping this screen active and checking status...');
        // Keep loading state; polling will stop when run completes, then refresh
        const waitForCompletion = async () => {
          for (let i = 0; i < 180; i++) { // ~6 minutes max
            const run = await loadLatestRunStatus();
            if (run && run.status !== 'running') {
              await loadStats();
              await loadUnassigned();
              return;
            }
            await new Promise((r) => setTimeout(r, 2000));
          }
          toast.showError('Sampling is taking longer than expected. Please refresh and check again.');
        };
        await waitForCompletion();
      } else {
        toast.showError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivateSelected = async () => {
    if (totalMatchingByLifecycle === 0) {
      toast.showError('No activities match the current filters');
      return;
    }
    const confirm = window.prompt('Type YES to confirm reactivating ALL matching activities to Active');
    if (confirm !== 'YES') return;

    setIsLoading(true);
    try {
      await samplingAPI.reactivate({
        confirm: 'YES',
        fromStatus: activityFilters.lifecycleStatus,
        dateFrom: activityFilters.dateFrom || undefined,
        dateTo: activityFilters.dateTo || undefined,
        deleteExistingTasks: true,
        deleteExistingAudit: true,
      });
      toast.showSuccess('Reactivated activities');
      await loadStats();
      await loadUnassigned();
    } catch (e: any) {
      toast.showError(e.message || 'Failed to reactivate');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadConfig(), loadStats(), loadUnassigned()]);
      toast.showSuccess('Refreshed');
    } catch (e: any) {
      toast.showError(e.message || 'Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUnassignedCount = selectedUnassignedTaskIds.size;
  const toggleUnassignedSelection = (id: string) => {
    const next = new Set(selectedUnassignedTaskIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedUnassignedTaskIds(next);
  };

  const handleBulkAssign = async () => {
    if (!bulkAssignAgentId) {
      toast.showError('Select an agent for assignment');
      return;
    }
    if (selectedUnassignedCount === 0) {
      toast.showError('Select at least one unassigned task');
      return;
    }
    setIsLoading(true);
    try {
      await tasksAPI.bulkReassignTasks(Array.from(selectedUnassignedTaskIds), bulkAssignAgentId);
      toast.showSuccess('Assigned tasks to agent');
      await loadUnassigned();
      setBulkAssignAgentId('');
    } catch (e: any) {
      toast.showError(e.message || 'Failed to assign tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const lifecycleLabel = (s: string) => {
    const map: Record<string, string> = {
      active: 'Active',
      sampled: 'Sampled',
      inactive: 'Inactive',
      not_eligible: 'Not Eligible',
    };
    return map[s] || s;
  };

  const eligibleSummary = useMemo(() => {
    if (!eligibleTypes.length) return 'All types eligible';
    return eligibleTypes.join(', ');
  }, [eligibleTypes]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Sampling Control</h2>
            <p className="text-sm text-slate-600">Configure eligibility + cooling, then run sampling (creates Unassigned tasks)</p>
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

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Activity cooling (days)</label>
                <input
                  type="number"
                  value={activityCoolingDays}
                  onChange={(e) => setActivityCoolingDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Farmer cooling (days)</label>
                <input
                  type="number"
                  value={farmerCoolingDays}
                  onChange={(e) => setFarmerCoolingDays(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Default sampling %</label>
                <input
                  type="number"
                  value={defaultPercentage}
                  onChange={(e) => setDefaultPercentage(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
                />
              </div>
            </div>

            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Eligible activity types</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_ACTIVITY_TYPES.map((t) => {
                  const checked = eligibleTypes.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleEligibilityType(t)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-bold ${
                        checked ? 'border-green-300 bg-green-50 text-green-800' : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {checked ? <CheckSquare size={16} /> : <Square size={16} />}
                      {t}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-2">Current: {eligibleSummary}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleSaveConfig}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-green-700 hover:bg-green-800 text-white font-black"
            >
              <Save size={18} />
              Save Config
            </button>
            <button
              onClick={handleChooseActivityTypeToSample}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black"
            >
              <Filter size={18} />
              Choose Activity Type to Sample
            </button>
          </div>
        </div>
      </div>

      {/* Quick Dashboard */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Sampling Dashboard</h3>
            <p className="text-sm text-slate-600">
              Quick view by activity type for the selected date range
              {activityFilters.dateFrom && activityFilters.dateTo
                ? ` • ${formatPretty(activityFilters.dateFrom)} - ${formatPretty(activityFilters.dateTo)}`
                : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetSelections}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-black disabled:opacity-50"
              title="Reset lifecycle/date range filters"
            >
              <RotateCcw size={16} />
              Reset
            </button>
            <button
              onClick={handleRunSampling}
              disabled={isLoading || totalMatchingByLifecycle === 0 || activityFilters.lifecycleStatus !== 'active'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-black disabled:opacity-50"
            >
              <Play size={16} />
              Run Sampling (All {totalMatchingByLifecycle})
            </button>
            <button
              onClick={handleReactivateSelected}
              disabled={isLoading || totalMatchingByLifecycle === 0 || activityFilters.lifecycleStatus === 'active'}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-black disabled:opacity-50"
            >
              <RotateCcw size={16} />
              Reactivate (All {totalMatchingByLifecycle})
            </button>
          </div>
        </div>

        {/* Latest run status */}
        <div className="mt-2 text-xs text-slate-500">
          {/* This stays lightweight; details are pulled from the backend tracker */}
          <RunStatusInline loadLatestRunStatus={loadLatestRunStatus} isLoading={isLoading} />
        </div>

        {/* Filters (move here; no per-activity sampling selection needed) */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Lifecycle</label>
            <select
              value={activityFilters.lifecycleStatus}
              onChange={(e) => setActivityFilters((p) => ({ ...p, lifecycleStatus: e.target.value as LifecycleStatus }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="not_eligible">Not Eligible</option>
              <option value="sampled">Sampled</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Date Range</label>
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
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center justify-between"
              >
                <span className="truncate">
                  {selectedPreset}
                  {activityFilters.dateFrom && activityFilters.dateTo
                    ? ` • ${formatPretty(activityFilters.dateFrom)} - ${formatPretty(activityFilters.dateTo)}`
                    : ''}
                </span>
                <span className="text-slate-400 font-black">▾</span>
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
                            syncDraftFromFilters();
                          }}
                          className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setActivityFilters((prev) => ({
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

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: 'Total Activities', value: stats?.totals?.totalActivities ?? 0 },
            { label: 'Active', value: stats?.totals?.active ?? 0 },
            { label: 'Sampled', value: stats?.totals?.sampled ?? 0 },
            { label: 'Inactive', value: stats?.totals?.inactive ?? 0 },
            { label: 'Not Eligible', value: stats?.totals?.notEligible ?? 0 },
            { label: 'Farmers Total', value: stats?.totals?.farmersTotal ?? 0 },
            { label: 'Farmers Sampled', value: stats?.totals?.sampledFarmers ?? 0 },
            { label: 'Tasks Created', value: stats?.totals?.tasksCreated ?? 0 },
          ].map((card) => (
            <div key={card.label} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
              <p className="text-xl font-black text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
            <div className="text-sm font-black text-slate-700">By Activity Type</div>
            <div className="text-xs text-slate-500">
              Farmers sampled = sampling audit total; Tasks created = call tasks count
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="bg-white border-b border-slate-200">
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Type</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Total</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Active</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Sampled</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Inactive</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Not Eligible</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Farmers Total</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Farmers Sampled</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Tasks</th>
                  <th className="px-4 py-3 text-xs font-black text-slate-400 uppercase tracking-widest">Unassigned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(stats?.byType || []).map((row: any) => (
                  <tr key={row.type} className="bg-white">
                    <td className="px-4 py-3 font-black text-slate-900">{row.type}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.totalActivities}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.active}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.sampled}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.inactive}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.notEligible}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.farmersTotal}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.sampledFarmers}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.tasksCreated}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{row.unassignedTasks}</td>
                  </tr>
                ))}
                {(!stats?.byType || stats.byType.length === 0) && (
                  <tr>
                    <td className="px-4 py-6 text-slate-600" colSpan={10}>
                      No activities found in this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <h3 className="text-lg font-black text-slate-900">Unassigned Tasks</h3>
        <p className="text-sm text-slate-600">Tasks created by sampling that need assignment</p>

        <div className="mt-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <select
              value={bulkAssignAgentId}
              onChange={(e) => setBulkAssignAgentId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
            >
              <option value="">Select agent</option>
              {agents.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name} ({a.email})
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkAssign}
              disabled={isLoading || !bulkAssignAgentId || selectedUnassignedCount === 0}
              className="px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-black disabled:opacity-50"
            >
              Assign ({selectedUnassignedCount})
            </button>
          </div>
          <button
            onClick={loadUnassigned}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-black"
          >
            <RefreshCw size={16} />
            Refresh tasks
          </button>
        </div>

        <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden">
          <div className="divide-y divide-slate-100">
            {unassignedTasks.map((t) => (
              <div key={t._id} className="px-4 py-3 flex items-start gap-3">
                <button type="button" onClick={() => toggleUnassignedSelection(t._id)} className="mt-1">
                  {selectedUnassignedTaskIds.has(t._id) ? <CheckSquare size={18} className="text-green-700" /> : <Square size={18} className="text-slate-400" />}
                </button>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-900">{t.farmerId?.name || 'Unknown Farmer'}</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {t.farmerId?.preferredLanguage || 'Unknown'} • {t.farmerId?.mobileNumber || 'Unknown'} • {t.activityId?.type || 'Unknown'} • {t.activityId?.territoryName || t.activityId?.territory || ''}
                  </p>
                </div>
              </div>
            ))}
            {!unassignedTasks.length && (
              <div className="px-4 py-6 text-sm text-slate-600">No unassigned tasks right now.</div>
            )}
          </div>
        </div>
      </div>

      {/* Keep config reference to avoid unused warning */}
      <div className="hidden">{config ? lifecycleLabel('active') : ''}{totalActivities}</div>
    </div>
  );
};

export default SamplingControlView;

