import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, RefreshCw, Save, Play, RotateCcw, Filter, CheckSquare, Square } from 'lucide-react';
import { samplingAPI, tasksAPI, usersAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

type LifecycleStatus = 'active' | 'sampled' | 'inactive' | 'not_eligible';

const ALL_ACTIVITY_TYPES = ['Field Day', 'Group Meeting', 'Demo Visit', 'OFM', 'Other'] as const;

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
    type: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 20,
  });

  const [activities, setActivities] = useState<any[]>([]);
  const [activityPagination, setActivityPagination] = useState<any>(null);
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(new Set());

  const [unassignedTasks, setUnassignedTasks] = useState<any[]>([]);
  const [selectedUnassignedTaskIds, setSelectedUnassignedTaskIds] = useState<Set<string>>(new Set());
  const [agents, setAgents] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [bulkAssignAgentId, setBulkAssignAgentId] = useState<string>('');

  const selectionCount = selectedActivityIds.size;

  const loadConfig = async () => {
    const res: any = await samplingAPI.getConfig();
    const cfg = res?.data?.config;
    setConfig(cfg);

    setEligibleTypes(Array.isArray(cfg?.eligibleActivityTypes) ? cfg.eligibleActivityTypes : []);
    setActivityCoolingDays(Number(cfg?.activityCoolingDays ?? 5));
    setFarmerCoolingDays(Number(cfg?.farmerCoolingDays ?? 30));
    setDefaultPercentage(Number(cfg?.defaultPercentage ?? 10));
  };

  const loadActivities = async () => {
    const res: any = await samplingAPI.listActivities({
      lifecycleStatus: activityFilters.lifecycleStatus,
      type: activityFilters.type || undefined,
      dateFrom: activityFilters.dateFrom || undefined,
      dateTo: activityFilters.dateTo || undefined,
      page: activityFilters.page,
      limit: activityFilters.limit,
    });
    setActivities(res?.data?.activities || []);
    setActivityPagination(res?.data?.pagination || null);
    setSelectedActivityIds(new Set());
  };

  const loadUnassigned = async () => {
    const res: any = await tasksAPI.getUnassignedTasks({ page: 1, limit: 50 });
    setUnassignedTasks(res?.data?.tasks || []);
    setSelectedUnassignedTaskIds(new Set());
  };

  const loadAgents = async () => {
    const res: any = await usersAPI.getUsers({ role: 'cc_agent', isActive: true });
    const list = res?.data?.users || [];
    setAgents(list);
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await Promise.all([loadConfig(), loadActivities(), loadUnassigned(), loadAgents()]);
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
        await loadActivities();
      } catch (e: any) {
        toast.showError(e.message || 'Failed to load activities');
      } finally {
        setIsLoading(false);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityFilters.lifecycleStatus, activityFilters.type, activityFilters.dateFrom, activityFilters.dateTo, activityFilters.page, activityFilters.limit]);

  const allSelectedOnPage = useMemo(() => {
    if (!activities.length) return false;
    return activities.every((a) => selectedActivityIds.has(a._id));
  }, [activities, selectedActivityIds]);

  const toggleSelectAllOnPage = () => {
    const next = new Set(selectedActivityIds);
    if (allSelectedOnPage) {
      for (const a of activities) next.delete(a._id);
    } else {
      for (const a of activities) next.add(a._id);
    }
    setSelectedActivityIds(next);
  };

  const toggleActivitySelection = (id: string) => {
    const next = new Set(selectedActivityIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedActivityIds(next);
  };

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
      await loadActivities();
    } catch (e: any) {
      toast.showError(e.message || 'Failed to save config');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyEligibility = async () => {
    setIsLoading(true);
    try {
      await samplingAPI.applyEligibility(eligibleTypes);
      toast.showSuccess('Eligibility applied');
      await loadConfig();
      await loadActivities();
    } catch (e: any) {
      toast.showError(e.message || 'Failed to apply eligibility');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunSampling = async () => {
    if (selectionCount === 0) {
      toast.showError('Select at least one activity');
      return;
    }
    setIsLoading(true);
    try {
      const res: any = await samplingAPI.runSampling({ activityIds: Array.from(selectedActivityIds) });
      toast.showSuccess(`Sampling done. Tasks created: ${res?.data?.tasksCreatedTotal ?? 0}`);
      await loadActivities();
      await loadUnassigned();
    } catch (e: any) {
      toast.showError(e.message || 'Failed to run sampling');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactivateSelected = async () => {
    if (selectionCount === 0) {
      toast.showError('Select at least one activity');
      return;
    }
    const confirm = window.prompt('Type YES to confirm reactivating selected activities to Active');
    if (confirm !== 'YES') return;

    setIsLoading(true);
    try {
      await samplingAPI.reactivate({
        confirm: 'YES',
        activityIds: Array.from(selectedActivityIds),
        deleteExistingTasks: true,
        deleteExistingAudit: true,
      });
      toast.showSuccess('Reactivated selected activities');
      await loadActivities();
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
      await Promise.all([loadConfig(), loadActivities(), loadUnassigned()]);
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
              onClick={handleApplyEligibility}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black"
            >
              <Filter size={18} />
              Apply Eligibility (Not Eligible)
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-slate-900">Activities</h3>
            <p className="text-sm text-slate-600">Select activities and run sampling or reactivate</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSampling}
              disabled={isLoading || selectionCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-black disabled:opacity-50"
            >
              <Play size={16} />
              Run Sampling ({selectionCount})
            </button>
            <button
              onClick={handleReactivateSelected}
              disabled={isLoading || selectionCount === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-black disabled:opacity-50"
            >
              <RotateCcw size={16} />
              Reactivate ({selectionCount})
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Lifecycle</label>
            <select
              value={activityFilters.lifecycleStatus}
              onChange={(e) => setActivityFilters((p) => ({ ...p, lifecycleStatus: e.target.value as LifecycleStatus, page: 1 }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="not_eligible">Not Eligible</option>
              <option value="sampled">Sampled</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Type</label>
            <select
              value={activityFilters.type}
              onChange={(e) => setActivityFilters((p) => ({ ...p, type: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            >
              <option value="">All</option>
              {ALL_ACTIVITY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Date From</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={activityFilters.dateFrom}
                onChange={(e) => setActivityFilters((p) => ({ ...p, dateFrom: e.target.value, page: 1 }))}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Date To</label>
            <div className="relative">
              <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={activityFilters.dateTo}
                onChange={(e) => setActivityFilters((p) => ({ ...p, dateTo: e.target.value, page: 1 }))}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
            <button
              type="button"
              onClick={toggleSelectAllOnPage}
              className="flex items-center gap-2 text-sm font-black text-slate-700"
            >
              {allSelectedOnPage ? <CheckSquare size={16} /> : <Square size={16} />}
              Select page
            </button>
            <div className="text-xs text-slate-500">
              {activityPagination?.total ?? 0} total
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {activities.map((a) => (
              <div key={a._id} className="px-4 py-3 flex items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={() => toggleActivitySelection(a._id)}
                  className="mt-1"
                  title="Select"
                >
                  {selectedActivityIds.has(a._id) ? <CheckSquare size={18} className="text-green-700" /> : <Square size={18} className="text-slate-400" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900">{a.type}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
                      {lifecycleLabel(a.lifecycleStatus)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {new Date(a.date).toLocaleDateString('en-IN')} • {a.officerName}{a.tmName ? ` • ${a.tmName}` : ''} • {a.territoryName || a.territory} {a.state ? `• ${a.state}` : ''}
                  </p>
                </div>
              </div>
            ))}
            {!activities.length && (
              <div className="px-4 py-6 text-sm text-slate-600">No activities found for this filter.</div>
            )}
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
      <div className="hidden">{config ? lifecycleLabel('active') : ''}</div>
    </div>
  );
};

export default SamplingControlView;

