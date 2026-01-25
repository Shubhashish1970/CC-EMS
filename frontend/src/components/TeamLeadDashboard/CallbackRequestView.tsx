import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, RefreshCw, Phone, CheckSquare, Square, Loader2, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import Button from '../shared/Button';
import { tasksAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

type DateRangePreset =
  | 'Custom'
  | 'Today'
  | 'Yesterday'
  | 'Last 7 days'
  | 'Last 14 days'
  | 'Last 30 days';

interface CallbackTask {
  _id: string;
  status: string;
  outcome: string;
  callbackNumber: number;
  isCallback: boolean;
  updatedAt: string;
  callLog?: {
    callStatus?: string;
    callDurationSeconds?: number;
  };
  farmer: {
    _id: string;
    name: string;
    mobileNumber: string;
    preferredLanguage: string;
    location: string;
  };
  activity: {
    _id: string;
    type: string;
    territoryName: string;
  };
  agent: {
    _id: string;
    name: string;
    email: string;
  };
}

interface Agent {
  _id: string;
  name: string;
  email: string;
}

// Format date to YYYY-MM-DD in local timezone
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

  switch (preset) {
    case 'Today':
      return { start: toLocalISO(today), end: toLocalISO(today) };
    case 'Yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: toLocalISO(y), end: toLocalISO(y) };
    }
    case 'Last 7 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { start: toLocalISO(s), end: toLocalISO(today) };
    }
    case 'Last 14 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 13);
      return { start: toLocalISO(s), end: toLocalISO(today) };
    }
    case 'Last 30 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { start: toLocalISO(s), end: toLocalISO(today) };
    }
    case 'Custom':
    default:
      return { start: '', end: '' };
  }
};

const formatDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
};

const CallbackRequestView: React.FC = () => {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [tasks, setTasks] = useState<CallbackTask[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });

  // Filters
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    outcome: 'all',
    callType: 'all',
    agentId: 'all',
  });

  // Date picker state
  const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>('Last 7 days');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const datePickerRef = useRef<HTMLDivElement | null>(null);

  // Initialize date range
  useEffect(() => {
    const r = getPresetRange('Last 7 days');
    setFilters(f => ({ ...f, dateFrom: r.start, dateTo: r.end }));
    setDraftStart(r.start);
    setDraftEnd(r.end);
  }, []);

  // Close date picker on outside click
  useEffect(() => {
    if (!isDatePickerOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (datePickerRef.current && !datePickerRef.current.contains(t)) setIsDatePickerOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isDatePickerOpen]);

  const loadTasks = async (page = 1) => {
    setIsLoading(true);
    try {
      const res: any = await tasksAPI.getCallbackCandidates({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        outcome: filters.outcome !== 'all' ? filters.outcome : undefined,
        callType: filters.callType !== 'all' ? filters.callType : undefined,
        agentId: filters.agentId !== 'all' ? filters.agentId : undefined,
        page,
        limit: pagination.limit,
      });

      if (res.success) {
        setTasks(res.data.tasks || []);
        setAgents(res.data.agents || []);
        setPagination(res.data.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
        setSelectedTaskIds(new Set()); // Clear selection on new data
      }
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (filters.dateFrom && filters.dateTo) {
      loadTasks(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleSelectAll = () => {
    if (selectedTaskIds.size === tasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasks.filter(t => t.callbackNumber < 2).map(t => t._id)));
    }
  };

  const handleSelectTask = (taskId: string) => {
    const task = tasks.find(t => t._id === taskId);
    if (task && task.callbackNumber >= 2) return; // Can't select max retry tasks

    const newSet = new Set(selectedTaskIds);
    if (newSet.has(taskId)) {
      newSet.delete(taskId);
    } else {
      newSet.add(taskId);
    }
    setSelectedTaskIds(newSet);
  };

  const handleCreateCallbacks = async () => {
    if (selectedTaskIds.size === 0) {
      toast.showWarning('Please select at least one task');
      return;
    }

    setIsCreating(true);
    try {
      const res: any = await tasksAPI.createCallbacks(Array.from(selectedTaskIds));
      
      if (res.success) {
        toast.showSuccess(`Created ${res.data.summary.created} callback(s)${res.data.summary.skipped > 0 ? `, ${res.data.summary.skipped} skipped` : ''}`);
        loadTasks(pagination.page); // Reload to reflect changes
      }
    } catch (e: any) {
      toast.showError(e?.message || 'Failed to create callbacks');
    } finally {
      setIsCreating(false);
    }
  };

  const syncDraftFromFilters = () => {
    setDraftStart(filters.dateFrom);
    setDraftEnd(filters.dateTo);
  };

  const selectableTasks = tasks.filter(t => t.callbackNumber < 2);
  const allSelected = selectableTasks.length > 0 && selectedTaskIds.size === selectableTasks.length;

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-slate-900">Request Callbacks</h2>
            <p className="text-xs text-slate-500">Select completed/unsuccessful calls to schedule callbacks</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => loadTasks(pagination.page)} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Date Range */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Date Range</label>
            <div className="relative" ref={datePickerRef}>
              <button
                type="button"
                onClick={() => {
                  setIsDatePickerOpen(prev => {
                    if (!prev) syncDraftFromFilters();
                    return !prev;
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 flex items-center justify-between"
              >
                <span className="truncate">
                  {selectedPreset}
                  {filters.dateFrom && filters.dateTo ? ` • ${formatPretty(filters.dateFrom)} - ${formatPretty(filters.dateTo)}` : ''}
                </span>
                <ChevronDown size={16} className="text-slate-400" />
              </button>

              {isDatePickerOpen && (
                <div className="absolute z-50 mt-2 w-[500px] max-w-[90vw] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="flex">
                    <div className="w-44 border-r border-slate-200 bg-slate-50 p-2">
                      {(['Custom', 'Today', 'Yesterday', 'Last 7 days', 'Last 14 days', 'Last 30 days'] as DateRangePreset[]).map((p) => (
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
                            selectedPreset === p ? 'bg-white border border-slate-200 text-slate-900' : 'text-slate-700 hover:bg-white'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <div className="flex-1 p-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Start</p>
                          <input
                            type="date"
                            value={draftStart}
                            onChange={(e) => { setSelectedPreset('Custom'); setDraftStart(e.target.value); }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">End</p>
                          <input
                            type="date"
                            value={draftEnd}
                            onChange={(e) => { setSelectedPreset('Custom'); setDraftEnd(e.target.value); }}
                            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                        <Button variant="secondary" size="sm" onClick={() => setIsDatePickerOpen(false)}>Cancel</Button>
                        <button
                          type="button"
                          onClick={() => {
                            setFilters(f => ({ ...f, dateFrom: draftStart, dateTo: draftEnd }));
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

          {/* Outcome Filter */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Outcome</label>
            <select
              value={filters.outcome}
              onChange={(e) => setFilters(f => ({ ...f, outcome: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
            >
              <option value="all">All Outcomes</option>
              <option value="Unsuccessful">Unsuccessful</option>
              <option value="Completed Conversation">Completed</option>
            </select>
          </div>

          {/* Call Type Filter */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Call Type</label>
            <select
              value={filters.callType}
              onChange={(e) => setFilters(f => ({ ...f, callType: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
            >
              <option value="all">All Types</option>
              <option value="original">Original</option>
              <option value="callback">Callback</option>
            </select>
          </div>

          {/* Agent Filter */}
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Agent</label>
            <select
              value={filters.agentId}
              onChange={(e) => setFilters(f => ({ ...f, agentId: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700"
            >
              <option value="all">All Agents</option>
              {agents.map(agent => (
                <option key={agent._id} value={agent._id}>{agent.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Action Bar */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900"
              disabled={selectableTasks.length === 0}
            >
              {allSelected ? <CheckSquare size={18} className="text-green-600" /> : <Square size={18} className="text-slate-400" />}
              {allSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-sm text-slate-500">
              {selectedTaskIds.size} of {selectableTasks.length} selected
            </span>
          </div>
          <button
            type="button"
            onClick={handleCreateCallbacks}
            disabled={selectedTaskIds.size === 0 || isCreating}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Phone size={16} />}
            Create {selectedTaskIds.size} Callback{selectedTaskIds.size !== 1 ? 's' : ''}
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left w-10"></th>
                <th className="px-4 py-3 text-left">Farmer</th>
                <th className="px-4 py-3 text-left">Outcome</th>
                <th className="px-4 py-3 text-left">Outbound</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Agent</th>
                <th className="px-4 py-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Loader2 className="animate-spin mx-auto text-slate-400" size={24} />
                    <p className="text-sm text-slate-500 mt-2">Loading tasks...</p>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <AlertCircle className="mx-auto text-slate-300" size={32} />
                    <p className="text-sm text-slate-500 mt-2">No tasks found for selected filters</p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const isMaxRetry = task.callbackNumber >= 2;
                  const isSelected = selectedTaskIds.has(task._id);

                  return (
                    <tr
                      key={task._id}
                      className={`hover:bg-slate-50 ${isMaxRetry ? 'opacity-50' : ''} ${isSelected ? 'bg-green-50' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleSelectTask(task._id)}
                          disabled={isMaxRetry}
                          className="disabled:cursor-not-allowed"
                          title={isMaxRetry ? 'Max callbacks reached (2)' : ''}
                        >
                          {isSelected ? (
                            <CheckSquare size={18} className="text-green-600" />
                          ) : (
                            <Square size={18} className={isMaxRetry ? 'text-slate-300' : 'text-slate-400'} />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{task.farmer?.name || 'Unknown'}</p>
                          <p className="text-xs text-slate-500">{task.farmer?.mobileNumber}</p>
                          <p className="text-[10px] text-slate-400">{task.farmer?.location}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                          task.outcome === 'Completed Conversation' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {task.outcome === 'Completed Conversation' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {task.outcome === 'Completed Conversation' ? 'Completed' : 'Unsuccessful'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {task.callLog?.callStatus || '-'}
                      </td>
                      <td className="px-4 py-3">
                        {task.isCallback ? (
                          <span className="px-2 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700">
                            Callback #{task.callbackNumber}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600">
                            Original
                          </span>
                        )}
                        {isMaxRetry && (
                          <span className="ml-1 text-[10px] text-red-500">(Max)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {task.agent?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {formatDate(task.updatedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
            <p className="text-sm text-slate-600">
              Page {pagination.page} of {pagination.pages} • {pagination.total} total tasks
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadTasks(pagination.page - 1)}
                disabled={pagination.page === 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => loadTasks(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallbackRequestView;
