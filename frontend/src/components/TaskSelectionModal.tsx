import React, { useState, useEffect } from 'react';
import { X, Phone, MapPin, Loader2, Search, Info, Clock, CheckCircle, XCircle } from 'lucide-react';
import { tasksAPI } from '../services/api';

interface Task {
  taskId: string;
  farmer: {
    name: string;
    mobileNumber: string;
    location: string;
    preferredLanguage: string;
    photoUrl?: string;
  };
  activity: {
    type: string;
    date: string;
    officerName: string;
    tmName?: string;
    location: string;
    territory: string;
    state?: string;
    crops?: string[];
    products?: string[];
  };
  status: 'sampled_in_queue' | 'in_progress' | 'completed' | 'not_reachable' | 'invalid_number';
  scheduledDate: string;
  createdAt: string;
  updatedAt?: string;
  // Callback fields
  isCallback?: boolean;
  callbackNumber?: number;
  parentTaskId?: string;
}

interface TaskSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: Task) => void;
}

const TaskSelectionModal: React.FC<TaskSelectionModalProps> = ({ isOpen, onClose, onSelectTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isLoadingTask, setIsLoadingTask] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'in_progress' | 'sampled_in_queue' | 'completed'>('in_progress');

  useEffect(() => {
    if (isOpen) {
      fetchAvailableTasks();
      setSearchQuery('');
      setFilter('in_progress');
    }
  }, [isOpen]);

  const fetchAvailableTasks = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await tasksAPI.getAvailableTasks();
      if (response.success && response.data) {
        setTasks(response.data.tasks || []);
      } else {
        setError('Failed to load tasks');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTask = async (task: Task) => {
    setSelectedTaskId(task.taskId);
    setIsLoadingTask(true);
    try {
      const response = await tasksAPI.loadTask(task.taskId);
      if (response.success) {
        onSelectTask(task);
        onClose();
      } else {
        setError('Failed to load selected task');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load selected task');
    } finally {
      setIsLoadingTask(false);
      setSelectedTaskId(null);
    }
  };

  // Filter tasks based on search query and filter
  const filteredTasks = tasks.filter(task => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      !searchQuery || // If no search query, show all
      task.farmer.name.toLowerCase().includes(query) ||
      task.farmer.mobileNumber.includes(query) ||
      task.farmer.location.toLowerCase().includes(query);
    
    const matchesFilter = 
      (filter === 'in_progress' && task.status === 'in_progress') ||
      (filter === 'sampled_in_queue' && task.status === 'sampled_in_queue') || // Queue shows only sampled_in_queue
      (filter === 'completed' && (task.status === 'completed' || task.status === 'not_reachable' || task.status === 'invalid_number'));
    
    return matchesSearch && matchesFilter;
  });

  // Sort tasks: in_progress first, then queue, then completed; within group by scheduled date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const rank = (s: Task['status']) => {
      if (s === 'in_progress') return 0;
      if (s === 'sampled_in_queue') return 1;
      return 2; // completed/not_reachable/invalid_number
    };
    const rA = rank(a.status);
    const rB = rank(b.status);
    if (rA !== rB) return rA - rB;
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
  });

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const taskDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (taskDate.getTime() === today.getTime()) {
      return 'Today';
    }
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (taskDate.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    }
    
    const diffDays = Math.floor((today.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50 p-4">
      <div className="bg-white rounded-3xl w-[375px] h-[812px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200 mr-4" style={{ maxWidth: '375px' }}>
        {/* Header - Light theme */}
        <div className="bg-white px-6 pt-4 pb-3 border-b border-slate-200">
          {/* Close button and title */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-black text-slate-900">Select Contact</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              disabled={isLoadingTask}
            >
              <X size={22} className="text-slate-600" />
            </button>
          </div>

          {/* Search Bar - Light theme */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            />
          </div>

          {/* Filter Tabs - Light theme - Compact */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                filter === 'in_progress'
                  ? 'bg-slate-900 text-lime-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilter('sampled_in_queue')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                filter === 'sampled_in_queue'
                  ? 'bg-slate-900 text-lime-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Queue
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                filter === 'completed'
                  ? 'bg-slate-900 text-lime-400'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Content - Light theme */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-lime-600" size={32} />
              <span className="ml-3 text-slate-600 font-medium">Loading contacts...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20 px-6">
              <Phone size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-red-600 mb-4 font-medium">{error}</p>
                <button
                onClick={fetchAvailableTasks}
                className="px-6 py-2 bg-slate-900 text-white rounded-2xl font-medium hover:bg-slate-800"
              >
                Retry
              </button>
            </div>
          ) : sortedTasks.length === 0 ? (
            <div className="text-center py-20 px-6">
              <Phone size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 font-medium text-lg mb-2">
                {searchQuery || filter !== 'all' ? 'No matches found' : 'No tasks available'}
              </p>
              <p className="text-sm text-slate-500">
                {searchQuery || filter !== 'all' 
                  ? 'Try adjusting your search or filter' 
                  : 'All tasks have been completed or are not yet due'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {sortedTasks.map((task) => {
                const isSelected = selectedTaskId === task.taskId;
                const isInProgress = task.status === 'in_progress';
                const isCompleted = task.status === 'completed' || task.status === 'not_reachable' || task.status === 'invalid_number';
                const isSuccessful = task.status === 'completed';
                const isUnsuccessful = task.status === 'not_reachable' || task.status === 'invalid_number';

                return (
                  <button
                    key={task.taskId}
                    onClick={() => {
                      if (isLoadingTask) return;
                      // Completed tasks are shown for visibility but cannot be loaded into an active call flow.
                      if (isCompleted) return;
                      handleSelectTask(task);
                    }}
                    disabled={isLoadingTask || isCompleted}
                    className={`w-full px-6 py-4 hover:bg-white active:bg-slate-50 transition-colors flex items-center gap-4 ${
                      isSelected ? 'bg-green-50' : ''
                    } ${isLoadingTask ? 'opacity-50 cursor-not-allowed' : isCompleted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {/* Profile Icon/Photo - Light theme */}
                    <div className="flex-shrink-0 relative">
                      {task.farmer.photoUrl ? (
                        <img
                          src={task.farmer.photoUrl}
                          alt={task.farmer.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-slate-200"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div
                        className="avatar-fallback w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-md border-2 border-white"
                        style={{ display: task.farmer.photoUrl ? 'none' : 'flex' }}
                      >
                        <span className="text-white text-lg font-bold">
                          {getInitials(task.farmer.name)}
                        </span>
                      </div>
                      {/* In Progress Indicator */}
                      {isInProgress && (
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center">
                          <Clock size={10} className="text-white animate-pulse" />
                        </div>
                      )}
                      {/* Completed Status Indicator */}
                      {isCompleted && (
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 border-2 border-white rounded-full flex items-center justify-center ${
                          isSuccessful ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {isSuccessful ? (
                            <CheckCircle size={10} className="text-white" />
                          ) : (
                            <XCircle size={10} className="text-white" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Contact Info - Light theme */}
                    <div className="flex-1 min-w-0 text-left">
                      {/* Farmer Name - Large and Bold */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-black text-slate-900 truncate">
                          {task.farmer.name}
                        </h3>
                        {/* Callback Badge */}
                        {task.isCallback && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold border border-purple-200">
                            Callback #{task.callbackNumber || 1}
                          </span>
                        )}
                        {isInProgress && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">
                            In Progress
                          </span>
                        )}
                        {isCompleted && (
                          <span className={`flex-shrink-0 px-2 py-0.5 rounded-lg text-xs font-bold border ${
                            isSuccessful
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-red-100 text-red-700 border-red-200'
                          }`}>
                            {isSuccessful ? 'Successful' : 'Unsuccessful'}
                          </span>
                        )}
                      </div>

                      {/* Mobile Number - Prominent */}
                      <div className="flex items-center gap-2 mb-1">
                        <Phone size={12} className="text-lime-600 flex-shrink-0" />
                        <a
                          href={`tel:${task.farmer.mobileNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-bold text-slate-700 hover:text-slate-900"
                        >
                          {task.farmer.mobileNumber}
                        </a>
                      </div>

                      {/* Location - Subtle */}
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-600 truncate">
                          {task.farmer.location}
                        </span>
                      </div>

                      {/* Field context - FDA/TM/Territory/State */}
                      <div className="mt-1">
                        <span className="text-[11px] text-slate-500 font-medium truncate block">
                          FDA: {task.activity.officerName}
                          {task.activity.tmName ? ` • TM: ${task.activity.tmName}` : ''}
                          {task.activity.territory ? ` • ${task.activity.territory}` : ''}
                          {task.activity.state ? ` • ${task.activity.state}` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Right Side - Time and Action */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {/* Call Button / Status Icon */}
                      {isCompleted ? (
                        <>
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${
                              isSuccessful ? 'bg-green-500' : 'bg-red-500'
                            }`}
                          >
                            {isSuccessful ? (
                              <CheckCircle size={18} className="text-white" />
                            ) : (
                              <XCircle size={18} className="text-white" />
                            )}
                          </div>
                          {/* Final Update Date/Time - Below status icon for completed calls */}
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {formatTime(task.updatedAt || task.scheduledDate)}
                          </span>
                        </>
                      ) : (
                        <>
                          {/* Scheduled Date/Time - Above call button for active calls */}
                          <span className="text-xs text-slate-500 whitespace-nowrap">
                            {formatTime(task.scheduledDate)}
                          </span>
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${
                              isSelected
                                ? 'bg-slate-900 scale-95'
                                : 'bg-slate-800 hover:bg-slate-900 active:scale-95'
                            } ${isLoadingTask ? 'opacity-50' : ''}`}
                          >
                            {isSelected && isLoadingTask ? (
                              <Loader2 size={18} className="animate-spin text-lime-400" />
                            ) : (
                              <Phone size={18} className="text-lime-400" />
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - Task Count */}
        <div className="bg-white border-t border-slate-200 px-6 py-3">
          <div className="text-center">
            <p className="text-xs text-slate-500">
              {tasks.length > 0 ? (
                <>
              <span className="font-bold text-slate-700">{sortedTasks.length}</span> contact
              {sortedTasks.length !== 1 ? 's' : ''} available
                  {(searchQuery || filter !== 'all') && tasks.length > sortedTasks.length && (
                    <span> (filtered from {tasks.length})</span>
                  )}
                </>
              ) : (
                'No contacts available'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSelectionModal;
