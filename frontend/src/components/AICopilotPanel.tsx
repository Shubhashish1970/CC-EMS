import React, { useState } from 'react';
import { Zap, Send, Info, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Button from './shared/Button';
import { aiAPI, ExtractionContext } from '../services/api';
import { useToast } from '../context/ToastContext';

interface AICopilotPanelProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isActive: boolean;
  taskData?: any | null;
  onFarmerCommentsAutoFilled?: () => void; // Callback to reset edit flag
}

const AICopilotPanel: React.FC<AICopilotPanelProps> = ({ formData, setFormData, isActive, taskData, onFarmerCommentsAutoFilled }) => {
  const [scratchpad, setScratchpad] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { showError, showSuccess } = useToast();

  const handleMagicSync = async () => {
    if (!scratchpad.trim()) return;
    
    setIsSyncing(true);
    setError(null);
    setSuccess(false);

    try {
      // Build context from taskData for better AI extraction
      const context: ExtractionContext | undefined = taskData
        ? {
            farmerName: taskData.farmer?.name,
            activityType: taskData.activity?.type,
            crops: taskData.activity?.crops || [],
            products: taskData.activity?.products || [],
            territory: taskData.activity?.territory,
          }
        : undefined;

      const response = await aiAPI.extractData(scratchpad, context);

      if (response.success && response.data) {
        // Merge extracted data with existing form data
        setFormData((prev: any) => ({
          ...prev,
          ...response.data,
          // Ensure sentiment defaults to N/A if not provided
          sentiment: response.data.sentiment || 'N/A',
        }));
        
        // Reset edit flag if farmerComments was auto-filled
        if (response.data.farmerComments && onFarmerCommentsAutoFilled) {
          onFarmerCommentsAutoFilled();
        }
        
        setSuccess(true);
        showSuccess('Form fields populated successfully! Please review and edit as needed.');
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error('Failed to extract data from notes');
      }
    } catch (error: any) {
      console.error('AI Sync failed', error);
      
      let errorMessage = 'Failed to extract data from notes. Please try again.';
      
      if (error?.message) {
        if (error.message.includes('GEMINI_API_KEY')) {
          errorMessage = 'AI service is not configured. Please contact administrator.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      showError(errorMessage);
      
      // Clear error message after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className={`${isActive ? 'flex' : 'hidden'} lg:flex w-full lg:w-96 h-full bg-white border-l border-slate-200 shadow-2xl flex-col p-8 shrink-0 overflow-y-auto`}>
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
          <Zap size={18} className="text-green-600" fill="currentColor" />
          Notetaker
        </h3>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <textarea
          value={scratchpad}
          onChange={(e) => {
            setScratchpad(e.target.value);
            setError(null);
            setSuccess(false);
          }}
          className="flex-1 w-full p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] focus:ring-4 focus:ring-green-100 outline-none text-sm leading-relaxed resize-none font-medium placeholder:text-slate-300 italic shadow-inner"
          placeholder="Agent shorthand: 'Farmer Rao attended, high paddy recall. Bought Root Booster but not Insecticide due to price...'"
        />
        
        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <p className="flex-1">{error}</p>
          </div>
        )}
        
        {/* Success Message */}
        {success && (
          <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs">
            <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
            <p className="flex-1">Form fields populated successfully! Please review and edit as needed.</p>
          </div>
        )}
        
        <Button
          onClick={handleMagicSync}
          disabled={isSyncing || !scratchpad.trim()}
          variant={isSyncing ? 'secondary' : 'primary'}
          className="w-full"
        >
          {isSyncing ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              Processing...
            </>
          ) : (
            <>
              <Send size={18} />
              Process & Submit Notes
            </>
          )}
        </Button>
      </div>

      <div className="mt-8 p-6 bg-yellow-50 rounded-3xl border border-yellow-100 space-y-2">
        <div className="flex items-center gap-2 text-yellow-800">
          <Info size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Compliance Note</span>
        </div>
        <p className="text-[11px] text-yellow-700 leading-normal font-medium italic">
          PRD 7.4.5: Structured data (buttons) is mandatory. The Notetaker helps populate them faster but agent verification is required.
        </p>
      </div>
    </section>
  );
};

export default AICopilotPanel;

