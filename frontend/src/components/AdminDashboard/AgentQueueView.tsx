import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { adminAPI } from '../../services/api';
import { Loader2, RefreshCw, Users as UsersIcon, Calendar, Phone, MapPin, CheckCircle, Clock, XCircle, AlertCircle, Search, ChevronRight } from 'lucide-react';
import Button from '../shared/Button';

interface AgentQueueSummary {
  agentId: string;
  agentName: string;
  agentEmail: string;
  employeeId: string;
  languageCapabilities: string[];
  statusBreakdown: {
    sampled_in_queue: number;
    in_progress: number;
    completed: number;
    not_reachable: number;
    invalid_number: number;
    total: number;
  };
}

interface AgentQueueDetail {
  agent: {
    agentId: string;
    agentName: string;
    agentEmail: string;
    employeeId: string;
    languageCapabilities: string[];
  };
  statusBreakdown: {
    sampled_in_queue: number;
    in_progress: number;
    completed: number;
    not_reachable: number;
    invalid_number: number;
    total: number;
  };
  tasks: Array<{
    taskId: string;
    farmer: {
      name: string;
      mobileNumber: string;
      preferredLanguage: string;
      location: string;
    };
    activity: {
      type: string;
      date: string;
      officerName: string;
      territory: string;
    };
    status: 'sampled_in_queue' | 'in_progress' | 'completed' | 'not_reachable' | 'invalid_number';
    scheduledDate: string;
    createdAt: string;
  }>;
}

const AgentQueueView: React.FC = () => {
  const { showError, showSuccess } = useToast();
  const [queues, setQueues] = useState<AgentQueueSummary[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentDetail, setAgentDetail] = useState<AgentQueueDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  const fetchQueues = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await adminAPI.getAgentQueues({
        isActive: showOnlyActive,
      }) as any;

      if (response.success && response.data) {
        setQueues(response.data || []);
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load agent queues';
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAgentDetail = async (agentId: string) => {
    setIsLoadingDetail(true);
    try {
      const response = await adminAPI.getAgentQueue(agentId) as any;

      if (response.success && response.data) {
        setAgentDetail(response.data);
        setSelectedAgentId(agentId);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to load agent queue details');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, [showOnlyActive]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      sampled_in_queue: { icon: Clock, color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Sampled - in queue' },
      in_progress: { icon: Loader2, color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'In Progress' },
      completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
      not_reachable: { icon: XCircle, color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'Not Reachable' },
      invalid_number: { icon: AlertCircle, color: 'bg-red-100 text-red-800 border-red-200', label: 'Invalid Number' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.sampled_in_queue;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${config.color}`}>
        <Icon size={12} className={status === 'in_progress' ? 'animate-spin' : ''} />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // If agent detail is selected, show detail view
  if (agentDetail && selectedAgentId) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => { setAgentDetail(null); setSelectedAgentId(null); }}>
                ← Back to Queues
              </Button>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchAgentDetail(selectedAgentId)}
              disabled={isLoadingDetail}
            >
              <RefreshCw size={16} className={isLoadingDetail ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
              <UsersIcon className="text-slate-400" size={32} />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black text-slate-900 mb-1">{agentDetail.agent.agentName}</h2>
              <p className="text-sm text-slate-600 mb-2">{agentDetail.agent.agentEmail}</p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span>Employee ID: {agentDetail.agent.employeeId}</span>
                <span>Languages: {agentDetail.agent.languageCapabilities.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-4">Queue Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
              <p className="text-2xl font-black text-slate-900">{agentDetail.statusBreakdown.total}</p>
            </div>
            <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200">
              <p className="text-xs font-black text-yellow-600 uppercase tracking-widest mb-1">Sampled - in queue</p>
              <p className="text-2xl font-black text-yellow-800">{agentDetail.statusBreakdown.sampled_in_queue}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-1">In Progress</p>
              <p className="text-2xl font-black text-blue-800">{agentDetail.statusBreakdown.in_progress}</p>
            </div>
            <div className="bg-green-50 rounded-2xl p-4 border border-green-200">
              <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-1">Completed</p>
              <p className="text-2xl font-black text-green-800">{agentDetail.statusBreakdown.completed}</p>
            </div>
            <div className="bg-orange-50 rounded-2xl p-4 border border-orange-200">
              <p className="text-xs font-black text-orange-600 uppercase tracking-widest mb-1">Not Reachable</p>
              <p className="text-2xl font-black text-orange-800">{agentDetail.statusBreakdown.not_reachable}</p>
            </div>
            <div className="bg-red-50 rounded-2xl p-4 border border-red-200">
              <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-1">Invalid</p>
              <p className="text-2xl font-black text-red-800">{agentDetail.statusBreakdown.invalid_number}</p>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-4">Tasks ({agentDetail.tasks.length})</h3>
          {agentDetail.tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-slate-600 font-medium">No tasks in queue</p>
            </div>
          ) : (
            <div className="space-y-3">
              {agentDetail.tasks.map((task) => (
                <div
                  key={task.taskId}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="text-base font-black text-slate-900">{task.farmer.name}</h4>
                        {getStatusBadge(task.status)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone size={14} />
                          <span>{task.farmer.mobileNumber}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} />
                          <span>{task.farmer.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} />
                          <span>Scheduled: {formatDate(task.scheduledDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>Language: {task.farmer.preferredLanguage}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Activity: {task.activity.type}</span>
                      <span>•</span>
                      <span>Officer: {task.activity.officerName}</span>
                      <span>•</span>
                      <span>Territory: {task.activity.territory}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default view: List of all agent queues
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Agent Queues</h2>
            <p className="text-sm text-slate-600">Monitor task queues for all agents</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnlyActive}
                onChange={(e) => setShowOnlyActive(e.target.checked)}
                className="w-4 h-4 text-green-600 border-slate-300 rounded focus:ring-green-500"
              />
              <span className="text-sm font-medium text-slate-700">Active Only</span>
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchQueues}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Queues List */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
          <Loader2 className="animate-spin mx-auto mb-4 text-green-700" size={32} />
          <p className="text-sm text-slate-600 font-medium">Loading agent queues...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
          <AlertCircle className="mx-auto mb-4 text-red-500" size={32} />
          <p className="text-sm text-red-600 font-medium mb-4">{error}</p>
          <Button variant="secondary" size="sm" onClick={fetchQueues}>
            Try Again
          </Button>
        </div>
      ) : queues.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200 shadow-sm text-center">
          <p className="text-sm text-slate-600 font-medium">No agent queues found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {queues.map((queue) => (
            <div
              key={queue.agentId}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => fetchAgentDetail(queue.agentId)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <UsersIcon size={18} className="text-green-700" />
                    <h3 className="text-base font-black text-slate-900">{queue.agentName}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-1">{queue.agentEmail}</p>
                  <p className="text-xs text-slate-500">ID: {queue.employeeId}</p>
                </div>
                <ChevronRight size={20} className="text-slate-400" />
              </div>

              <div className="mb-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Languages
                </p>
                <div className="flex flex-wrap gap-1">
                  {queue.languageCapabilities.map((lang, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-200"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-black text-slate-900">Total Tasks</span>
                  <span className="text-xl font-black text-green-700">{queue.statusBreakdown.total}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Sampled - in queue</span>
                    <span className="font-bold text-yellow-700">{queue.statusBreakdown.sampled_in_queue}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">In Progress</span>
                    <span className="font-bold text-blue-700">{queue.statusBreakdown.in_progress}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Completed</span>
                    <span className="font-bold text-green-700">{queue.statusBreakdown.completed}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Not Reachable</span>
                    <span className="font-bold text-orange-700">{queue.statusBreakdown.not_reachable}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgentQueueView;
