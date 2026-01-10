import React, { useState, useEffect } from 'react';
import { X, Phone, MapPin, Loader2, Search, Info, Clock } from 'lucide-react';
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
    location: string;
    territory: string;
    crops?: string[];
    products?: string[];
  };
  status: 'sampled_in_queue' | 'in_progress';
  scheduledDate: string;
  createdAt: string;
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
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'sampled_in_queue'>('all');

  useEffect(() => {
    if (isOpen) {
      fetchAvailableTasks();
      setSearchQuery('');
      setFilter('all');
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
      task.farmer.name.toLowerCase().includes(query) ||
      task.farmer.mobileNumber.includes(query) ||
      task.farmer.location.toLowerCase().includes(query);
    
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'in_progress' && task.status === 'in_progress') ||
      (filter === 'sampled_in_queue' && task.status === 'sampled_in_queue');
    
    return matchesSearch && matchesFilter;
  });

  // Sort tasks: in_progress first, then by scheduled date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
    if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
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
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Filter Tabs - Light theme */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                filter === 'all'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                filter === 'in_progress'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              In Progress
            </button>
            <button
              onClick={() => setFilter('sampled_in_queue')}
              className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
                filter === 'sampled_in_queue'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Queue
            </button>
          </div>
        </div>

        {/* Content - Light theme */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-green-700" size={32} />
              <span className="ml-3 text-slate-600 font-medium">Loading contacts...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20 px-6">
              <Phone size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-red-600 mb-4 font-medium">{error}</p>
              <button
                onClick={fetchAvailableTasks}
                className="px-6 py-2 bg-green-700 text-white rounded-2xl font-medium hover:bg-green-800"
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

                return (
                  <button
                    key={task.taskId}
                    onClick={() => !isLoadingTask && handleSelectTask(task)}
                    disabled={isLoadingTask}
                    className={`w-full px-6 py-4 hover:bg-white active:bg-slate-50 transition-colors flex items-center gap-4 ${
                      isSelected ? 'bg-green-50' : ''
                    } ${isLoadingTask ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                    </div>

                    {/* Contact Info - Light theme */}
                    <div className="flex-1 min-w-0 text-left">
                      {/* Farmer Name - Large and Bold */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-black text-slate-900 truncate">
                          {task.farmer.name}
                        </h3>
                        {isInProgress && (
                          <span className="flex-shrink-0 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200">
                            In Progress
                          </span>
                        )}
                      </div>

                      {/* Mobile Number - Prominent */}
                      <div className="flex items-center gap-2 mb-1">
                        <Phone size={12} className="text-green-600 flex-shrink-0" />
                        <a
                          href={`tel:${task.farmer.mobileNumber}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-bold text-green-700 hover:text-green-800"
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
                    </div>

                    {/* Right Side - Time and Action */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                      {/* Scheduled Date/Time */}
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatTime(task.scheduledDate)}
                      </span>

                      {/* Call Button - Green Circle */}
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md ${
                          isSelected
                            ? 'bg-green-700 scale-95'
                            : 'bg-green-600 hover:bg-green-700 active:scale-95'
                        } ${isLoadingTask ? 'opacity-50' : ''}`}
                      >
                        {isSelected && isLoadingTask ? (
                          <Loader2 size={18} className="animate-spin text-white" />
                        ) : (
                          <Phone size={18} className="text-white" />
                        )}
                      </div>
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
              <span className="font-bold text-slate-700">{sortedTasks.length}</span> contact
              {sortedTasks.length !== 1 ? 's' : ''} available
              {(searchQuery || filter !== 'all') && ` (filtered from ${tasks.length})`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskSelectionModal;
