import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { tasksAPI, usersAPI } from '../services/api';
import { Loader2, Search, Filter, RefreshCw, User as UserIcon, MapPin, Calendar, Phone, CheckCircle, Clock, XCircle, AlertCircle, Download, ArrowUpDown, CheckSquare, Square, BarChart3, AlertTriangle, ChevronDown } from 'lucide-react';
import Button from './shared/Button';
import TaskDetail from './TaskDetail';
import { exportToCSV, exportToPDF, exportToExcel, formatTaskForExport } from '../utils/exportUtils';
import ReassignModal from './ReassignModal';
import { getTaskStatusLabel, TaskStatus } from '../utils/taskStatusLabels';

interface Task {
  _id: string;
  status: TaskStatus;
  scheduledDate: string;
  farmerId: {
    name: string;
    mobileNumber: string;
    location: string;
    preferredLanguage: string;
    photoUrl?: string;
  };
  activityId: {
    type: string;
    date: string;
    officerName: string;
    location: string;
    territory: string;
  };
  assignedAgentId: {
    name: string;
    email: string;
    employeeId: string;
  };
  callLog?: any;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const TaskList: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    agentId: '',
    territory: '',
    search: '',
    dateFrom: '',
    dateTo: '',
  });
  const [agents, setAgents] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'scheduledDate' | 'status' | 'farmerName' | 'agentName'>('scheduledDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showBulkReassignModal, setShowBulkReassignModal] = useState(false);
  const [showBulkStatusModal, setShowBulkStatusModal] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Fetch agents
  useEffect(() => {
    const loadAgents = async () => {
      try {
        const response = await usersAPI.getUsers({ role: 'cc_agent', isActive: true }) as any;
        if (response.success && response.data?.users) {
          setAgents(response.data.users);
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
      }
    };
    loadAgents();
  }, []);

  // Fetch tasks
  useEffect(() => {
    if (!user) return;

    const loadTasks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        let response;
        if (user.role === 'team_lead') {
          response = await tasksAPI.getTeamTasks({
            status: filters.status || undefined,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            page: currentPage,
            limit: 20,
          });
        } else {
          response = await tasksAPI.getPendingTasks({
            agentId: filters.agentId || undefined,
            territory: filters.territory || undefined,
            dateFrom: filters.dateFrom || undefined,
            dateTo: filters.dateTo || undefined,
            page: currentPage,
            limit: 20,
          });
        }

        if (response.success && response.data) {
          setTasks(response.data.tasks || []);
          setPagination(response.data.pagination || null);
        } else {
          const errorMsg = response.error?.message || 'Failed to load tasks';
          setError(errorMsg);
          toast.showError(errorMsg);
        }
      } catch (err: any) {
        const errorMessage = err.message || err.response?.data?.error?.message || 'Failed to load tasks';
        setError(errorMessage);
        toast.showError(errorMessage);
        console.error('Error fetching tasks:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [user, filters.status, filters.agentId, filters.territory, filters.dateFrom, filters.dateTo, currentPage]);

  const handleRefresh = () => {
    if (user) {
      const loadTasks = async () => {
        setIsLoading(true);
        setError(null);
        try {
          let response;
          if (user.role === 'team_lead') {
            response = await tasksAPI.getTeamTasks({
              status: filters.status || undefined,
              dateFrom: filters.dateFrom || undefined,
              dateTo: filters.dateTo || undefined,
              page: currentPage,
              limit: 20,
            });
          } else {
            response = await tasksAPI.getPendingTasks({
              agentId: filters.agentId || undefined,
              territory: filters.territory || undefined,
              dateFrom: filters.dateFrom || undefined,
              dateTo: filters.dateTo || undefined,
              page: currentPage,
              limit: 20,
            });
          }

          if (response.success && response.data) {
            setTasks(response.data.tasks || []);
            setPagination(response.data.pagination || null);
          }
        } catch (err: any) {
          const errorMessage = err.message || 'Failed to load tasks';
          setError(errorMessage);
          toast.showError(errorMessage);
        } finally {
          setIsLoading(false);
        }
      };
      loadTasks();
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sampled_in_queue: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: getTaskStatusLabel('sampled_in_queue') },
      in_progress: { icon: Loader2, color: 'bg-blue-100 text-blue-800 border-blue-200', label: getTaskStatusLabel('in_progress') },
      completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: getTaskStatusLabel('completed') },
      not_reachable: { icon: XCircle, color: 'bg-orange-100 text-orange-800 border-orange-200', label: getTaskStatusLabel('not_reachable') },
      invalid_number: { icon: AlertCircle, color: 'bg-red-100 text-red-800 border-red-200', label: getTaskStatusLabel('invalid_number') },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.sampled_in_queue;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${config.color}`}>
        <Icon size={14} />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const filteredTasks = tasks.filter(task => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        task.farmerId.name.toLowerCase().includes(searchLower) ||
        task.farmerId.mobileNumber.includes(searchLower) ||
        task.assignedAgentId.name.toLowerCase().includes(searchLower) ||
        task.activityId.location.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'scheduledDate':
        aValue = new Date(a.scheduledDate).getTime();
        bValue = new Date(b.scheduledDate).getTime();
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'farmerName':
        aValue = a.farmerId.name.toLowerCase();
        bValue = b.farmerId.name.toLowerCase();
        break;
      case 'agentName':
        aValue = a.assignedAgentId.name.toLowerCase();
        bValue = b.assignedAgentId.name.toLowerCase();
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const calculateStatistics = () => {
    const stats = {
      total: filteredTasks.length,
      sampled_in_queue: 0,
      in_progress: 0,
      completed: 0,
      not_reachable: 0,
      invalid_number: 0,
      overdue: 0,
      dueToday: 0,
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    filteredTasks.forEach(task => {
      stats[task.status as keyof typeof stats]++;
      const scheduledDate = new Date(task.scheduledDate);
      if (scheduledDate < today && (task.status === 'sampled_in_queue' || task.status === 'in_progress')) {
        stats.overdue++;
      } else if (scheduledDate >= today && scheduledDate < tomorrow) {
        stats.dueToday++;
      }
    });

    return stats;
  };

  const getTaskPriority = (task: Task) => {
    const scheduledDate = new Date(task.scheduledDate);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (scheduledDate < today && (task.status === 'sampled_in_queue' || task.status === 'in_progress')) {
      return { level: 'overdue', color: 'bg-red-100 text-red-800 border-red-300', icon: AlertTriangle, label: 'Overdue' };
    } else if (scheduledDate >= today && scheduledDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)) {
      return { level: 'due-today', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: Clock, label: 'Due Today' };
    }
    return { level: 'on-time', color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircle, label: 'On Time' };
  };

  const statistics = calculateStatistics();

  const toggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
    setShowBulkActions(newSelected.size > 0);
  };

  const toggleSelectAll = () => {
    if (selectedTasks.size === sortedTasks.length) {
      setSelectedTasks(new Set());
      setShowBulkActions(false);
    } else {
      setSelectedTasks(new Set(sortedTasks.map(t => t._id)));
      setShowBulkActions(true);
    }
  };

  const handleBulkReassign = async (agentId: string) => {
    setIsBulkProcessing(true);
    try {
      const response = await tasksAPI.bulkReassignTasks(Array.from(selectedTasks), agentId) as any;
      if (response.success) {
        setSelectedTasks(new Set());
        setShowBulkActions(false);
        setShowBulkReassignModal(false);
        handleRefresh();
        if (response.data.failed > 0) {
          toast.showWarning(`Reassigned ${response.data.successful} task(s), ${response.data.failed} failed`);
        } else {
          toast.showSuccess(`Successfully reassigned ${response.data.successful} task(s)`);
        }
      }
    } catch (err: any) {
      toast.showError(err.message || 'Failed to reassign tasks');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkStatusUpdate = async (status: string, notes?: string) => {
    setIsBulkProcessing(true);
    try {
      const response = await tasksAPI.bulkUpdateStatus(Array.from(selectedTasks), status, notes) as any;
      if (response.success) {
        setSelectedTasks(new Set());
        setShowBulkActions(false);
        setShowBulkStatusModal(false);
        handleRefresh();
        if (response.data.failed > 0) {
          toast.showWarning(`Updated status for ${response.data.successful} task(s), ${response.data.failed} failed`);
        } else {
          toast.showSuccess(`Successfully updated status for ${response.data.successful} task(s)`);
        }
      }
    } catch (err: any) {
      toast.showError(err.message || 'Failed to update task status');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleExportCSV = () => {
    const tasksToExport = sortedTasks.map(formatTaskForExport);
    exportToCSV(tasksToExport, 'tasks', (msg) => toast.showWarning(msg));
    if (tasksToExport.length > 0) {
      toast.showSuccess(`Exported ${tasksToExport.length} task(s) to CSV`);
    }
  };

  const handleExportPDF = () => {
    const tasksToExport = sortedTasks.map(formatTaskForExport);
    exportToPDF(tasksToExport, 'tasks', (msg) => toast.showWarning(msg));
    if (tasksToExport.length > 0) {
      toast.showInfo('Opening print dialog for PDF export');
    }
  };

  const handleExportExcel = () => {
    const tasksToExport = sortedTasks.map(formatTaskForExport);
    exportToExcel(tasksToExport, 'tasks', (msg) => toast.showWarning(msg));
    if (tasksToExport.length > 0) {
      toast.showSuccess(`Exported ${tasksToExport.length} task(s) to Excel`);
    }
  };

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showExportDropdown && !target.closest('.export-dropdown-container')) {
        setShowExportDropdown(false);
      }
    };
    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportDropdown]);

  if (selectedTask) {
    return (
      <TaskDetail
        task={selectedTask}
        onBack={() => setSelectedTask(null)}
        onTaskUpdated={() => {
          setSelectedTask(null);
          handleRefresh();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f1] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 mb-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 mb-1">Task Management</h1>
              <p className="text-sm text-slate-600">
                {user?.role === 'team_lead' ? 'View and manage your team tasks' : 'View and manage all tasks in queue'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mr-2">
                  Sort
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="scheduledDate">Scheduled Date</option>
                  <option value="status">Status</option>
                  <option value="farmerName">Farmer Name</option>
                  <option value="agentName">Agent Name</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                >
                  <ArrowUpDown size={14} />
                </Button>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter size={16} />
                Filters
              </Button>
              <div className="relative export-dropdown-container">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  disabled={sortedTasks.length === 0}
                >
                  <Download size={16} />
                  Export
                  <ChevronDown size={14} className="ml-1" />
                </Button>
                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-2xl border border-slate-200 shadow-lg z-50">
                    <button
                      onClick={() => {
                        handleExportCSV();
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 first:rounded-t-2xl last:rounded-b-2xl transition-colors"
                    >
                      Export CSV
                    </button>
                    <button
                      onClick={() => {
                        handleExportExcel();
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 first:rounded-t-2xl last:rounded-b-2xl transition-colors"
                    >
                      Export XLSX
                    </button>
                    <button
                      onClick={() => {
                        handleExportPDF();
                        setShowExportDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 first:rounded-t-2xl last:rounded-b-2xl transition-colors"
                    >
                      Export PDF
                    </button>
                  </div>
                )}
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">All Statuses</option>
                    <option value="sampled_in_queue">Sampled - in queue</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="not_reachable">Not Reachable</option>
                    <option value="invalid_number">Invalid Number</option>
                  </select>
                </div>

                {user?.role !== 'team_lead' && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                      Agent
                    </label>
                    <select
                      value={filters.agentId}
                      onChange={(e) => setFilters({ ...filters, agentId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">All Agents</option>
                      {agents.map((agent) => (
                        <option key={agent._id} value={agent._id}>
                          {agent.name} ({agent.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {user?.role !== 'team_lead' && (
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                      Territory
                    </label>
                    <input
                      type="text"
                      value={filters.territory}
                      onChange={(e) => setFilters({ ...filters, territory: e.target.value })}
                      placeholder="Filter by territory"
                      className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Date From
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                    Date To
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    placeholder="Search by farmer name, mobile, agent, or location..."
                    className="w-full pl-12 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics Dashboard */}
        {!isLoading && filteredTasks.length > 0 && (
          <div className="bg-white rounded-3xl p-6 mb-6 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="text-green-700" size={20} />
              <h2 className="text-lg font-black text-slate-900">Task Statistics</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total Tasks</p>
                <p className="text-2xl font-black text-slate-900">{statistics.total}</p>
              </div>
              <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200">
                <p className="text-xs font-black text-yellow-600 uppercase tracking-widest mb-1">Sampled - in queue</p>
                <p className="text-2xl font-black text-yellow-800">{statistics.sampled_in_queue}</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">In Progress</p>
                <p className="text-2xl font-black text-blue-800">{statistics.in_progress}</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
                <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-1">Completed</p>
                <p className="text-2xl font-black text-green-800">{statistics.completed}</p>
              </div>
              <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
                <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Overdue</p>
                <p className="text-2xl font-black text-red-800">{statistics.overdue}</p>
              </div>
              <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
                <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">Due Today</p>
                <p className="text-2xl font-black text-orange-800">{statistics.dueToday}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tasks List */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
            <Loader2 className="animate-spin mx-auto mb-4 text-green-700" size={32} />
            <p className="text-sm text-slate-600 font-medium">Loading tasks...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
            <AlertCircle className="mx-auto mb-4 text-red-500" size={32} />
            <p className="text-sm text-red-600 font-medium">{error}</p>
            <Button variant="secondary" size="sm" onClick={handleRefresh} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
            <p className="text-sm text-slate-600 font-medium">No tasks found</p>
          </div>
        ) : (
          <>
            {/* Bulk Actions Toolbar */}
            {showBulkActions && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-green-900">
                    {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowBulkReassignModal(true)}
                    disabled={isBulkProcessing}
                  >
                    Reassign Selected
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowBulkStatusModal(true)}
                    disabled={isBulkProcessing}
                  >
                    Update Status
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTasks(new Set());
                    setShowBulkActions(false);
                  }}
                >
                  Clear Selection
                </Button>
              </div>
            )}

            <div className="space-y-3 mb-6">
              {/* Select All Checkbox */}
              <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedTasks.size === sortedTasks.length && sortedTasks.length > 0}
                    onChange={toggleSelectAll}
                    className="w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500"
                  />
                  <span className="text-sm font-bold text-slate-700">
                    Select All ({sortedTasks.length} tasks)
                  </span>
                </label>
              </div>

              {sortedTasks.map((task) => {
                const priority = getTaskPriority(task);
                const PriorityIcon = priority.icon;
                return (
                  <div
                    key={task._id}
                    className={`bg-white rounded-2xl p-5 border shadow-sm transition-all ${
                      selectedTasks.has(task._id)
                        ? 'border-green-500 bg-green-50'
                        : 'border-slate-200 hover:shadow-md cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Checkbox */}
                        <div className="flex-shrink-0 pt-1" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(task._id)}
                            onChange={() => toggleTaskSelection(task._id)}
                            className="w-5 h-5 text-green-600 border-slate-300 rounded focus:ring-green-500"
                          />
                        </div>
                        {/* Farmer Avatar */}
                        <div className="flex-shrink-0">
                          {task.farmerId.photoUrl ? (
                            <img
                              src={task.farmerId.photoUrl}
                              alt={task.farmerId.name}
                              className="w-14 h-14 rounded-full object-cover border-2 border-slate-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/images/farmer-default-logo.png';
                              }}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                              <UserIcon className="text-slate-400" size={24} />
                            </div>
                          )}
                        </div>

                        {/* Task Info */}
                        <div
                          className="flex-1 min-w-0"
                          onClick={() => setSelectedTask(task)}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-base font-black text-slate-900 truncate">{task.farmerId.name}</h3>
                            {getStatusBadge(task.status)}
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${priority.color}`}>
                              <PriorityIcon size={12} />
                              {priority.label}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2">
                              <Phone size={14} />
                              <span className="font-medium">{task.farmerId.mobileNumber}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin size={14} />
                              <span>{task.farmerId.location}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <UserIcon size={14} />
                              <span>Agent: {task.assignedAgentId.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar size={14} />
                              <span>Scheduled: {formatDate(task.scheduledDate)}</span>
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              <span>Activity: {task.activityId.type}</span>
                              <span>•</span>
                              <span>Officer: {task.activityId.officerName}</span>
                              <span>•</span>
                              <span>Language: {task.farmerId.preferredLanguage}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-600">
                    Page {pagination.page} of {pagination.pages} • {pagination.total} total tasks
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= pagination.pages || isLoading}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Bulk Reassign Modal */}
            {showBulkReassignModal && (
              <ReassignModal
                isOpen={showBulkReassignModal}
                onClose={() => setShowBulkReassignModal(false)}
                task={null as any}
                onReassigned={handleBulkReassign}
                isBulkMode={true}
                selectedTaskIds={Array.from(selectedTasks)}
              />
            )}

            {/* Bulk Status Update Modal */}
            {showBulkStatusModal && (
              <BulkStatusModal
                isOpen={showBulkStatusModal}
                onClose={() => setShowBulkStatusModal(false)}
                onUpdate={handleBulkStatusUpdate}
                selectedCount={selectedTasks.size}
                isProcessing={isBulkProcessing}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Bulk Status Modal Component
interface BulkStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (status: string, notes?: string) => void;
  selectedCount: number;
  isProcessing: boolean;
}

const BulkStatusModal: React.FC<BulkStatusModalProps> = ({ isOpen, onClose, onUpdate, selectedCount, isProcessing }) => {
  const [status, setStatus] = useState<string>('sampled_in_queue');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    onUpdate(status, notes || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl p-6 max-w-md w-full mx-4 border border-slate-200 shadow-xl">
        <h2 className="text-xl font-black text-slate-900 mb-4">Update Status for {selectedCount} Task(s)</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
              New Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="sampled_in_queue">Sampled - in queue</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="not_reachable">Not Reachable</option>
              <option value="invalid_number">Invalid Number</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Add notes about this status change..."
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={isProcessing}>
            {isProcessing ? 'Updating...' : 'Update Status'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TaskList;
