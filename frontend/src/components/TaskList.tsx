import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tasksAPI, usersAPI } from '../services/api';
import { Loader2, Search, Filter, RefreshCw, User as UserIcon, MapPin, Calendar, Phone, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import Button from './shared/Button';
import TaskDetail from './TaskDetail';

interface Task {
  _id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'not_reachable' | 'invalid_number';
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filters, setFilters] = useState({
    status: '' as string,
    agentId: '',
    territory: '',
    search: '',
  });
  const [agents, setAgents] = useState<Array<{ _id: string; name: string; email: string }>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch agents for filter dropdown
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await usersAPI.getUsers({ role: 'cc_agent', isActive: true }) as any;
        if (response.success && response.data?.users) {
          setAgents(response.data.users);
        }
      } catch (err) {
        console.error('Error fetching agents:', err);
      }
    };
    fetchAgents();
  }, []);

  // Fetch tasks
  const fetchTasks = async (page: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      let response;
      if (user?.role === 'team_lead') {
        response = await tasksAPI.getTeamTasks({
          status: filters.status || undefined,
          page,
          limit: 20,
        });
      } else {
        response = await tasksAPI.getPendingTasks({
          agentId: filters.agentId || undefined,
          territory: filters.territory || undefined,
          page,
          limit: 20,
        });
      }

      if (response.success && response.data) {
        setTasks(response.data.tasks || []);
        setPagination(response.data.pagination || null);
        setCurrentPage(page);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks(1);
  }, [filters.status, filters.agentId, filters.territory]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
      in_progress: { icon: Loader2, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'In Progress' },
      completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
      not_reachable: { icon: XCircle, color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Not Reachable' },
      invalid_number: { icon: AlertCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Invalid Number' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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

  if (selectedTask) {
    return (
      <TaskDetail
        task={selectedTask}
        onBack={() => setSelectedTask(null)}
        onTaskUpdated={() => {
          setSelectedTask(null);
          fetchTasks(currentPage);
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
                {user?.role === 'team_lead' ? 'View and manage your team tasks' : 'View and manage all pending tasks'}
              </p>
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
                onClick={() => fetchTasks(currentPage)}
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
                    <option value="pending">Pending</option>
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
            <Button variant="secondary" size="sm" onClick={() => fetchTasks(currentPage)} className="mt-4">
              Try Again
            </Button>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
            <p className="text-sm text-slate-600 font-medium">No tasks found</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {filteredTasks.map((task) => (
                <div
                  key={task._id}
                  onClick={() => setSelectedTask(task)}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-base font-black text-slate-900 truncate">{task.farmerId.name}</h3>
                          {getStatusBadge(task.status)}
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
              ))}
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
                      onClick={() => fetchTasks(currentPage - 1)}
                      disabled={currentPage === 1 || isLoading}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => fetchTasks(currentPage + 1)}
                      disabled={currentPage >= pagination.pages || isLoading}
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
    </div>
  );
};

export default TaskList;
