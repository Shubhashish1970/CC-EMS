import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { tasksAPI } from '../services/api';
import {
  Phone, User, CheckCircle, Zap, LogOut, Globe, Loader2, Database,
  TrendingUp, MapPin, History, X, PhoneOff
} from 'lucide-react';
import BinaryToggle from './BinaryToggle';
import MultiTagSelect from './MultiTagSelect';
import CallTimer from './CallTimer';
import TaskDetailsPanel from './TaskDetailsPanel';
import CallInteractionForm from './CallInteractionForm';
import AICopilotPanel from './AICopilotPanel';
import CallReviewModal from './CallReviewModal';
import Button from './shared/Button';

// Business Constants
const IndianCrops = ['Paddy', 'Cotton', 'Chilli', 'Soybean', 'Maize', 'Wheat', 'Sugarcane'];
const NACLProducts = ['Nagarjuna Urea', 'Specialty Fungicide', 'Bio-Stimulant X', 'Insecticide Pro', 'Root Booster'];
const NonPurchaseReasons = ['Price', 'Availability', 'Brand preference', 'No requirement', 'Not convinced', 'Other'];

interface TaskData {
  taskId: string;
  farmer: {
    name: string;
    location: string;
    preferredLanguage: string;
    mobileNumber?: string;
    photoUrl?: string;
  };
  activity: {
    type: string;
    date: string;
    officer: string;
    location: string;
    crops?: string[];
    products?: string[];
  };
}

const AgentWorkspace: React.FC = () => {
  const { user, logout } = useAuth();
  const [callDuration, setCallDuration] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [taskData, setTaskData] = useState<TaskData | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'flow' | 'ai'>('flow');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [isAIPanelExpanded, setIsAIPanelExpanded] = useState(false);
  const [formData, setFormData] = useState({
    callStatus: '',
    didAttend: null as string | null,
    didRecall: null as boolean | null,
    cropsDiscussed: [] as string[],
    productsDiscussed: [] as string[],
    hasPurchased: null as boolean | null,
    willingToPurchase: null as boolean | null,
    likelyPurchaseDate: undefined as string | undefined,
    nonPurchaseReason: '',
    purchasedProducts: [] as Array<{ product: string; quantity: string; unit: string }>,
    agentObservations: '',
  });

  // Timer for call duration (only when call status is "Connected")
  useEffect(() => {
    if (!taskData || formData.callStatus !== 'Connected') {
      if (formData.callStatus !== 'Connected') {
        setCallDuration(0); // Reset timer if status changes away from Connected
      }
      return;
    }
    
    const timer = setInterval(() => {
      setCallDuration(p => p + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [taskData, formData.callStatus]);


  const handleLoadTasks = async () => {
    console.log('handleLoadTasks: Function called, starting task load...');
    
    // Clear any existing abort controller and error
    if (abortController) {
      console.log('handleLoadTasks: Aborting existing controller');
      abortController.abort();
    }
    setError(null);
    
    const controller = new AbortController();
    setAbortController(controller);
    setIsLoading(true);
    console.log('handleLoadTasks: isLoading set to true');
    
    let timeoutCleared = false;
    
    // Set a maximum timeout to ensure loading always clears (10 seconds)
    const timeoutId = setTimeout(() => {
      if (!controller.signal.aborted && !timeoutCleared) {
        console.warn('handleLoadTasks: Timeout after 10 seconds');
        controller.abort();
        setIsLoading(false);
        setTaskData(null);
        setError('Request timed out. Please check your connection and try again.');
        setAbortController(null);
        timeoutCleared = true;
      }
    }, 10000);
    
    try {
      await fetchActiveTask(controller.signal);
      // Clear error on success
      setError(null);
      console.log('handleLoadTasks: Task fetch completed successfully');
    } catch (error) {
      // Only handle error if not aborted
      if (!controller.signal.aborted) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load tasks. Please try again.';
        setError(errorMessage);
        setTaskData(null);
        console.error('handleLoadTasks: Error loading tasks:', error);
      } else {
        console.log('handleLoadTasks: Request was aborted, ignoring error');
      }
    } finally {
      // Always clear timeout and loading state
      if (!timeoutCleared) {
        clearTimeout(timeoutId);
      }
      // Immediately clear loading state
      console.log('handleLoadTasks: Finally block - clearing loading state');
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleStopLoading = () => {
    if (abortController) {
      abortController.abort();
    }
    setIsLoading(false);
    setAbortController(null);
  };

  const fetchActiveTask = async (abortSignal?: AbortSignal) => {
    // Check if already aborted
    if (abortSignal?.aborted) {
      console.log('fetchActiveTask: Already aborted, returning');
      return;
    }

    try {
      console.log('fetchActiveTask: Calling API...');
      const response = await tasksAPI.fetchActiveTask(abortSignal);
      console.log('fetchActiveTask: API response received:', response);
      
      // Check if aborted during the call
      if (abortSignal?.aborted) {
        return;
      }
      
      // Handle both response formats: 
      // - No task: { success: true, data: { task: null, message: "..." } }
      // - Task found: { success: true, data: { taskId: "...", farmer: {...}, activity: {...} } }
      console.log('fetchActiveTask: Full response:', JSON.stringify(response, null, 2));
      console.log('fetchActiveTask: response.success:', response.success);
      console.log('fetchActiveTask: response.data exists?', !!response.data);
      
      if (response.success && response.data) {
        console.log('fetchActiveTask: Response data keys:', Object.keys(response.data));
        console.log('fetchActiveTask: taskId value:', response.data.taskId);
        console.log('fetchActiveTask: taskId type:', typeof response.data.taskId);
        console.log('fetchActiveTask: taskId truthy?', !!response.data.taskId);
        console.log('fetchActiveTask: task value:', response.data.task);
        
        // Check if taskId exists (task found) - handle both string and object ID
        const taskId = response.data.taskId;
        const hasTaskId = taskId !== null && taskId !== undefined && taskId !== '';
        
        console.log('fetchActiveTask: hasTaskId check result:', hasTaskId);
        
        if (hasTaskId) {
          console.log('fetchActiveTask: ✅ TaskId found! Processing task data...');
          // Task found - ensure farmer and activity are properly formatted
          const farmer = response.data.farmer;
          const activity = response.data.activity;
          
          console.log('fetchActiveTask: Farmer:', farmer);
          console.log('fetchActiveTask: Activity:', activity);
          console.log('fetchActiveTask: Activity crops:', activity?.crops);
          console.log('fetchActiveTask: Activity products:', activity?.products);
          console.log('fetchActiveTask: Activity crops type:', typeof activity?.crops);
          console.log('fetchActiveTask: Activity crops is array:', Array.isArray(activity?.crops));
          
          if (!farmer || !activity) {
            console.error('fetchActiveTask: ❌ Missing farmer or activity');
            throw new Error('Task data is incomplete. Please try again.');
          }
          
          if (!taskId) {
            console.error('fetchActiveTask: ❌ Missing taskId');
            throw new Error('Task ID is missing');
          }
          
          // Convert taskId to string if it's an object (taskId is guaranteed to be non-null after check above)
          // Store in a const to help TypeScript understand it's non-null
          const safeTaskId: string | { toString(): string } = taskId;
          const taskIdString = typeof safeTaskId === 'object' && 'toString' in safeTaskId && typeof safeTaskId.toString === 'function' 
            ? safeTaskId.toString() 
            : String(safeTaskId);
          
          // Ensure crops and products are arrays
          const activityCrops = Array.isArray(activity.crops) 
            ? activity.crops 
            : (activity.crops ? [activity.crops] : []);
          const activityProducts = Array.isArray(activity.products) 
            ? activity.products 
            : (activity.products ? [activity.products] : []);
          
          // Task found - set task data (map backend field names to frontend format)
          const taskDataToSet = {
            taskId: taskIdString,
            farmer: {
              name: farmer.name || 'Unknown',
              location: farmer.location || 'Unknown',
              preferredLanguage: farmer.preferredLanguage || 'English',
              mobileNumber: farmer.mobileNumber || '',
              photoUrl: farmer.photoUrl || undefined,
            },
            activity: {
              type: activity.type || 'Unknown',
              date: activity.date || new Date().toISOString(),
              officer: activity.officerName || activity.officer || 'Unknown',
              location: activity.location || 'Unknown',
              crops: activityCrops, // Crops from activity data
              products: activityProducts, // Products from activity data
            },
          };
          
          console.log('fetchActiveTask: ✅ Prepared taskData:', taskDataToSet);
          console.log('fetchActiveTask: ✅ Activity crops in taskData:', taskDataToSet.activity.crops);
          console.log('fetchActiveTask: ✅ Activity products in taskData:', taskDataToSet.activity.products);
          console.log('fetchActiveTask: Calling setTaskData...');
          setTaskData(taskDataToSet);
          console.log('fetchActiveTask: setTaskData called successfully');
          
          // Reset form when new task is loaded
          setFormData({
            callStatus: '',
            didAttend: null,
            didRecall: null,
            cropsDiscussed: [],
            productsDiscussed: [],
            hasPurchased: null,
            willingToPurchase: null,
            likelyPurchaseDate: undefined,
            nonPurchaseReason: '',
            purchasedProducts: [],
            agentObservations: '',
          });
          setCallDuration(0);
          // Clear any previous errors
          setError(null);
          console.log('fetchActiveTask: ✅ Task data set successfully!');
        } else {
          // No task available - explicitly set to null
          console.log('fetchActiveTask: ⚠️ No taskId found in response');
          console.log('fetchActiveTask: Response data:', JSON.stringify(response.data, null, 2));
          setTaskData(null);
          setError(null);
        }
      } else {
        // Invalid response or no data
        console.error('fetchActiveTask: ❌ Invalid response structure');
        throw new Error('Invalid response from server. Please try again.');
      }
    } catch (error) {
      // Check if aborted
      if (abortSignal?.aborted) {
        return;
      }
      
      // Log error
      console.error('Error fetching active task:', error);
      // Always set taskData to null on error
      setTaskData(null);
      // Re-throw to let caller handle
      throw error;
    }
  };

  // Map frontend call status to backend format
  const mapCallStatusToBackend = (frontendStatus: string): string => {
    const statusMap: Record<string, string> = {
      'Connected': 'Connected',
      'Disconnected': 'Disconnected',
      'Incoming N/A': 'Not Reachable',
      'Invalid': 'Invalid Number',
      'No Answer': 'Not Reachable',
    };
    return statusMap[frontendStatus] || frontendStatus;
  };

  const handleFinalSubmit = async () => {
    if (!taskData) return;

    setIsSubmitting(true);
    try {
      // Map frontend status to backend format
      const backendStatus = mapCallStatusToBackend(formData.callStatus);
      const submissionData = {
        ...formData,
        callStatus: backendStatus,
      };
      
      await tasksAPI.submitInteraction(taskData.taskId, submissionData);
      
      // Clear form and task data
      setFormData({
        callStatus: '',
        didAttend: null,
        didRecall: null,
        cropsDiscussed: [],
        productsDiscussed: [],
        hasPurchased: null,
        willingToPurchase: null,
        likelyPurchaseDate: undefined,
        nonPurchaseReason: '',
        purchasedProducts: [],
        agentObservations: '',
      });
      setTaskData(null);
      setCallDuration(0);
      
      // Fetch next task
      await handleLoadTasks();
    } catch (error) {
      console.error('Error submitting interaction:', error);
      alert('Failed to submit interaction. Please try again.');
      throw error; // Re-throw to let modal handle it
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishCall = () => {
    if (!taskData) return;
    
    // Check if call status is selected
    if (!formData.callStatus) {
      alert('Please select call status before finishing the call');
      return;
    }
    
    setShowReviewModal(true);
  };

  const toggleList = (field: 'cropsDiscussed' | 'productsDiscussed', item: string) => {
    setFormData(prev => {
      const exists = prev[field].includes(item);
      const updated = exists ? prev[field].filter(i => i !== item) : [...prev[field], item];
      return { ...prev, [field]: updated };
    });
  };

  // Always show the Agent Workspace interface - no conditional rendering

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-[#f1f5f1] text-slate-900 font-sans antialiased overflow-hidden relative">
      
      {/* Loading Overlay - Only shows when loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-4 shadow-xl">
            <Loader2 className="animate-spin text-green-700" size={32} />
            <p className="font-bold text-green-800">Loading tasks...</p>
            <Button 
              variant="secondary" 
              onClick={handleStopLoading}
              size="sm"
            >
              Stop Loading
            </Button>
          </div>
        </div>
      )}

      {/* Error Banner - Shows at top when there's an error */}
      {error && !isLoading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 shadow-lg max-w-md">
          <X className="text-red-700" size={20} />
          <div className="flex-1">
            <p className="font-bold text-red-800 text-sm">Error Loading Tasks</p>
            <p className="text-xs text-red-600">{error}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" onClick={handleLoadTasks} size="sm">
              Retry
            </Button>
            <Button variant="secondary" onClick={() => setError(null)} size="sm">
              Dismiss
            </Button>
          </div>
        </div>
      )}
      
      {/* Global Navigation (Desktop) */}
      <aside className="hidden lg:flex w-20 flex-col items-center py-8 bg-green-950 text-white shadow-2xl z-30">
        <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-green-500/20">
          <Database size={24} className="text-white" />
        </div>
        <nav className="flex flex-col gap-8">
          <button className="p-3 bg-white/10 rounded-2xl text-green-400 border border-white/10 shadow-xl">
            <Phone size={24} />
          </button>
          <button className="p-3 text-white/40 hover:text-white transition-all">
            <History size={24} />
          </button>
          <button className="p-3 text-white/40 hover:text-white transition-all">
            <TrendingUp size={24} />
          </button>
        </nav>
        <button 
          onClick={logout}
          className="mt-auto p-3 text-white/40 hover:text-red-400 transition-all"
        >
          <LogOut size={24} />
        </button>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative">
        
        {/* Unified Task Header */}
        <header className="h-20 bg-white border-b border-green-100 px-4 lg:px-8 flex items-center justify-between shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-4 lg:gap-8">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-green-700 uppercase tracking-[0.2em]">NACL EMS System</span>
              <h1 className="text-base lg:text-xl font-black text-slate-800 tracking-tight">Agent Workspace</h1>
            </div>
            <div className="h-10 w-px bg-slate-100 hidden md:block" />
            {taskData && formData.callStatus === 'Connected' && (
              <div className="hidden sm:flex items-center gap-3">
                <CallTimer duration={callDuration} />
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-bold text-slate-500 uppercase">
                  <Globe size={14} className="text-indigo-500" />
                  {taskData.farmer.preferredLanguage}
                </div>
              </div>
            )}
            {!taskData && (
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Load Tasks button clicked!');
                    handleLoadTasks().catch(err => {
                      console.error('Error in handleLoadTasks:', err);
                    });
                  }}
                  disabled={isLoading}
                  type="button"
                  className="px-4 py-2 bg-green-700 text-white rounded-2xl text-xs font-bold hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Phone size={16} />
                      Load Tasks
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
              <div className="flex items-center gap-3">
                {taskData && (
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={handleFinishCall}
                    disabled={isSubmitting || !formData.callStatus}
                    title={!formData.callStatus ? 'Please select call status' : formData.callStatus === 'Connected' ? 'Finish call and submit' : 'Save call attempt'}
                  >
                    <PhoneOff size={16} />
                    {formData.callStatus === 'Connected' ? 'Finish Call' : 'Save Call'}
                  </Button>
                )}
            <Button variant="danger" size="sm" onClick={logout}>
              <LogOut size={16} />
              Logout
            </Button>
          </div>
        </header>

        {/* Main Three-Pane Interface */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Document Context (Details) */}
          <TaskDetailsPanel 
            taskData={taskData}
            isActive={activeTab === 'details'}
          />

          {/* Structured Submission (Flow) */}
              <CallInteractionForm
                taskData={taskData}
                formData={formData}
                setFormData={setFormData}
                toggleList={toggleList}
                handleFinalSubmit={handleFinalSubmit}
                isSubmitting={isSubmitting}
                isActive={activeTab === 'flow'}
                IndianCrops={taskData?.activity?.crops || IndianCrops}
                NACLProducts={taskData?.activity?.products || NACLProducts}
                NonPurchaseReasons={NonPurchaseReasons}
                isAIPanelExpanded={isAIPanelExpanded}
              />

          {/* Edge Hover Detector for AI Panel - Invisible trigger zone */}
          <div
            className="hidden lg:block fixed right-0 top-20 bottom-0 w-12 z-40"
            onMouseEnter={() => setIsAIPanelExpanded(true)}
          />

          {/* AI Copilot (AI) - Auto-collapsible with overlay */}
          <div
            className={`hidden lg:block fixed right-0 top-20 bottom-0 z-50 transition-transform duration-300 ease-in-out ${
              isAIPanelExpanded ? 'translate-x-0' : 'translate-x-full'
            }`}
            onMouseEnter={() => setIsAIPanelExpanded(true)}
            onMouseLeave={() => setIsAIPanelExpanded(false)}
          >
            <AICopilotPanel
              formData={formData}
              setFormData={setFormData}
              isActive={activeTab === 'ai'}
              taskData={taskData}
            />
          </div>

          {/* Mobile: Always show AI panel in tab view */}
          <div className="lg:hidden">
            <AICopilotPanel
              formData={formData}
              setFormData={setFormData}
              isActive={activeTab === 'ai'}
              taskData={taskData}
            />
          </div>

        </div>

        {/* Mobile Interaction Navigation */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-20 bg-white border-t border-slate-200 flex items-center justify-around z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] px-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-2xl transition-all ${activeTab === 'details' ? 'text-green-700 bg-green-50' : 'text-slate-400'}`}
          >
            <User size={22} fill={activeTab === 'details' ? 'currentColor' : 'none'} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Details</span>
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-2xl transition-all ${activeTab === 'flow' ? 'text-green-700 bg-green-50' : 'text-slate-400'}`}
          >
            <CheckCircle size={22} fill={activeTab === 'flow' ? 'currentColor' : 'none'} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Flow</span>
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex flex-col items-center gap-1.5 px-6 py-2 rounded-2xl transition-all ${activeTab === 'ai' ? 'text-green-700 bg-green-50' : 'text-slate-400'}`}
          >
            <Zap size={22} fill={activeTab === 'ai' ? 'currentColor' : 'none'} />
            <span className="text-[10px] font-black uppercase tracking-tighter">Copilot</span>
          </button>
        </div>
      </main>

      {/* Call Review Modal */}
      {taskData && (
        <CallReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          formData={formData}
          onFinalSubmit={handleFinalSubmit}
          isSubmitting={isSubmitting}
          callDuration={callDuration}
          farmerName={taskData.farmer.name}
        />
      )}
    </div>
  );
};

export default AgentWorkspace;
