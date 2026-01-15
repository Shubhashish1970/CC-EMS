import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useToast } from '../../context/ToastContext';
import { adminAPI, ffaAPI } from '../../services/api';
import { Loader2, Filter, RefreshCw, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, Calendar, MapPin, Users as UsersIcon, Activity as ActivityIcon, Phone, User as UserIcon, CheckCircle2, Download, BarChart3 } from 'lucide-react';
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

const ActivitySamplingView: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [activities, setActivities] = useState<ActivitySamplingStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [isIncrementalSyncing, setIsIncrementalSyncing] = useState(false);
  const [isFullSyncing, setIsFullSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ lastSyncAt: string | null; totalActivities: number; totalFarmers: number } | null>(null);
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
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('Last 28 days');
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

  const territoryOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of activities) {
      const a: any = (item as any)?.activity;
      const t = (a?.territoryName || a?.territory || '').trim();
      if (t) values.add(t);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [activities]);

  const zoneOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of activities) {
      const a: any = (item as any)?.activity;
      const z = (a?.zoneName || '').trim();
      if (z) values.add(z);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [activities]);

  const buOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of activities) {
      const a: any = (item as any)?.activity;
      const b = (a?.buName || '').trim();
      if (b) values.add(b);
    }
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [activities]);

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
        limit: 50,
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
        setPagination(response.data.pagination || { page: 1, limit: 50, total: 0, pages: 1 });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load activities';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities(1);
    fetchSyncStatus();
  }, [filters.activityType, filters.territory, filters.zone, filters.bu, filters.samplingStatus, filters.dateFrom, filters.dateTo]);

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

  const statistics = calculateStatistics();

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Activity Sampling</h2>
            <p className="text-sm text-slate-600">Monitor FFA activities and their sampling status</p>
            {syncStatus && (
              <p className="text-xs text-slate-500 mt-1">
                Last sync: {syncStatus.lastSyncAt ? new Date(syncStatus.lastSyncAt).toLocaleString() : 'Never'} • 
                {syncStatus.totalActivities} activities • {syncStatus.totalFarmers} farmers
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
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
              disabled={isIncrementalSyncing || isFullSyncing}
              title="Incremental sync: Only syncs new activities since last sync"
            >
              <Download size={16} className={isIncrementalSyncing ? 'animate-spin' : ''} />
              {isIncrementalSyncing ? 'Syncing...' : 'Sync FFA'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSyncFFA(true)}
              disabled={isIncrementalSyncing || isFullSyncing}
              title="Full sync: Syncs all activities (takes longer)"
            >
              <Download size={16} className={isFullSyncing ? 'animate-spin' : ''} />
              {isFullSyncing ? 'Full Syncing...' : 'Full Sync'}
            </Button>
          </div>
        </div>

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
                  {territoryOptions.map((t) => (
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
                  {zoneOptions.map((z) => (
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
                  {buOptions.map((b) => (
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
      {!isLoading && activities.length > 0 && (
        <div className="bg-white rounded-3xl p-4 mb-6 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="text-green-700" size={18} />
            <h2 className="text-base font-black text-slate-900">Statistics</h2>
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
          <div className="space-y-3">
            {activities.map((item) => {
              const isExpanded = expandedActivity === item.activity._id;
              return (
                <div
                  key={item.activity._id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  <div
                    className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => toggleExpand(item.activity._id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <ActivityIcon size={20} className="text-green-700" />
                          <h3 className="text-lg font-black text-slate-900">{item.activity.type}</h3>
                          {getSamplingStatusBadge(item.samplingStatus)}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-600">
                          <div className="flex items-center gap-2">
                            <Calendar size={14} />
                            <span>{formatDate(item.activity.date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin size={14} />
                            <span>
                              {item.activity.location}
                              {' • '}
                              {(item.activity as any).territoryName || item.activity.territory}
                              {(item.activity as any).zoneName ? ` • ${(item.activity as any).zoneName}` : ''}
                              {(item.activity as any).buName ? ` • ${(item.activity as any).buName}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <UsersIcon size={14} />
                            <span>Officer: {item.activity.officerName}</span>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-6 text-xs text-slate-500">
                          <span>Total Farmers: {item.activity.farmerIds?.length || 0}</span>
                          {item.samplingAudit && (
                            <>
                              <span>Sampled: {item.samplingAudit.sampledCount} ({item.samplingAudit.samplingPercentage}%)</span>
                              <span>Tasks Created: {item.tasksCount}</span>
                            </>
                          )}
                          {item.assignedAgents.length > 0 && (
                            <span>Assigned Agents: {item.assignedAgents.length}</span>
                          )}
                        </div>

                        {/* Status Breakdown */}
                        {item.statusBreakdown && (
                          <div className="mt-3 flex items-center gap-4">
                            {item.statusBreakdown.sampled_in_queue > 0 && (
                              <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium">
                                Sampled - in queue: {item.statusBreakdown.sampled_in_queue}
                              </span>
                            )}
                            {item.statusBreakdown.in_progress > 0 && (
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                                In Progress: {item.statusBreakdown.in_progress}
                              </span>
                            )}
                            {item.statusBreakdown.completed > 0 && (
                              <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium">
                                Completed: {item.statusBreakdown.completed}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="ml-4">
                        {isExpanded ? (
                          <ChevronUp size={20} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={20} className="text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-0 border-t border-slate-100">
                      <div className="mt-4 space-y-4">
                        {/* Assigned Agents */}
                        {item.assignedAgents.length > 0 && (
                          <div>
                            <h4 className="text-sm font-black text-slate-700 mb-2">Assigned Agents</h4>
                            <div className="space-y-2">
                              {item.assignedAgents.map((agent) => (
                                <div
                                  key={agent.agentId}
                                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200"
                                >
                                  <div>
                                    <p className="text-sm font-medium text-slate-900">{agent.agentName}</p>
                                    <p className="text-xs text-slate-600">{agent.agentEmail}</p>
                                  </div>
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
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
                            <h4 className="text-sm font-black text-slate-700 mb-2">Sampling Details</h4>
                            <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Sampling Percentage</p>
                                <p className="text-sm font-bold text-slate-900">{item.samplingAudit.samplingPercentage}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Total Farmers</p>
                                <p className="text-sm font-bold text-slate-900">{item.samplingAudit.totalFarmers}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500 mb-1">Sampled Count</p>
                                <p className="text-sm font-bold text-slate-900">{item.samplingAudit.sampledCount}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Crops and Products */}
                        {(item.activity.crops?.length > 0 || item.activity.products?.length > 0) && (
                          <div>
                            <h4 className="text-sm font-black text-slate-700 mb-2">Activity Details</h4>
                            <div className="flex flex-wrap gap-2">
                              {item.activity.crops?.map((crop, idx) => (
                                <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 rounded-xl text-xs font-medium border border-green-200">
                                  {crop}
                                </span>
                              ))}
                              {item.activity.products?.map((product, idx) => (
                                <span key={idx} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-xl text-xs font-medium border border-blue-200">
                                  {product}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Farmers List */}
                        {item.farmers && item.farmers.length > 0 ? (
                          <div>
                            <h4 className="text-sm font-black text-slate-700 mb-3">
                              Farmers List ({item.farmers.length} of {item.activity.farmerIds?.length || 0})
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                ({item.farmers.filter(f => f.isSampled).length} sampled, {item.farmers.filter(f => !f.isSampled).length} not sampled)
                              </span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
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
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {pagination.page} of {pagination.pages} • {pagination.total} total activities
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fetchActivities(pagination.page - 1)}
                    disabled={pagination.page === 1 || isLoading}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fetchActivities(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages || isLoading}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ActivitySamplingView;
