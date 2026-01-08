import React, { useState, useEffect } from 'react';
import { useToast } from '../../context/ToastContext';
import { adminAPI } from '../../services/api';
import { Loader2, Filter, RefreshCw, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle, Calendar, MapPin, Users as UsersIcon, Activity as ActivityIcon, Phone, User as UserIcon, CheckCircle2 } from 'lucide-react';
import Button from '../shared/Button';

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
    pending: number;
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
  const [filters, setFilters] = useState({
    activityType: '',
    territory: '',
    samplingStatus: '' as 'sampled' | 'not_sampled' | 'partial' | '',
    dateFrom: '',
    dateTo: '',
  });

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
        setActivities(response.data.activities || []);
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
  }, [filters.activityType, filters.territory, filters.samplingStatus, filters.dateFrom, filters.dateTo]);

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

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 mb-1">Activity Sampling</h2>
            <p className="text-sm text-slate-600">Monitor FFA activities and their sampling status</p>
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
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Activity Type
                </label>
                <select
                  value={filters.activityType}
                  onChange={(e) => setFilters({ ...filters, activityType: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                <input
                  type="text"
                  value={filters.territory}
                  onChange={(e) => setFilters({ ...filters, territory: e.target.value })}
                  placeholder="Filter by territory"
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Sampling Status
                </label>
                <select
                  value={filters.samplingStatus}
                  onChange={(e) => setFilters({ ...filters, samplingStatus: e.target.value as any })}
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Statuses</option>
                  <option value="sampled">Sampled</option>
                  <option value="not_sampled">Not Sampled</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
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
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

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
                            <span>{item.activity.location} • {item.activity.territory}</span>
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
                            {item.statusBreakdown.pending > 0 && (
                              <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium">
                                Pending: {item.statusBreakdown.pending}
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
                        {item.farmers && item.farmers.length > 0 && (
                          <div>
                            <h4 className="text-sm font-black text-slate-700 mb-3">
                              Farmers ({item.farmers.length})
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
                                              farmer.taskStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                              farmer.taskStatus === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                              farmer.taskStatus === 'completed' ? 'bg-green-100 text-green-700' :
                                              'bg-orange-100 text-orange-700'
                                            }`}>
                                              {farmer.taskStatus.replace('_', ' ').toUpperCase()}
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
