import React, { useState } from 'react';
import { Zap, Send, Info, Loader2 } from 'lucide-react';
import Button from './shared/Button';

interface AICopilotPanelProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  isActive: boolean;
  taskData?: any | null;
}

const AICopilotPanel: React.FC<AICopilotPanelProps> = ({ formData, setFormData, isActive, taskData }) => {
  const [scratchpad, setScratchpad] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleMagicSync = async () => {
    if (!scratchpad.trim()) return;
    setIsSyncing(true);
    try {
      // TODO: Move to backend API endpoint in Phase 3
      // For now, this is a placeholder that will be enhanced
      const response = await fetch('/api/ai/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({ notes: scratchpad }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setFormData((prev: any) => ({ ...prev, ...data.data }));
        }
      }
    } catch (error) {
      console.error('AI Sync failed', error);
      // Fallback: Simple pattern matching for demo
      const lowerNotes = scratchpad.toLowerCase();
      if (lowerNotes.includes('purchased') || lowerNotes.includes('bought')) {
        setFormData((prev: any) => ({ ...prev, hasPurchased: true }));
      }
      if (lowerNotes.includes('attended')) {
        setFormData((prev: any) => ({ ...prev, didAttend: 'Yes, I attended' }));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className={`${isActive ? 'flex' : 'hidden'} lg:flex w-full lg:w-96 h-full bg-white border-l border-slate-200 shadow-2xl flex-col p-8 shrink-0 overflow-y-auto`}>
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
          <Zap size={18} className="text-green-600" fill="currentColor" />
          AI Copilot
        </h3>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <textarea
          value={scratchpad}
          onChange={(e) => setScratchpad(e.target.value)}
          className="flex-1 w-full p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] focus:ring-4 focus:ring-green-100 outline-none text-sm leading-relaxed resize-none font-medium placeholder:text-slate-300 italic shadow-inner"
          placeholder="Agent shorthand: 'Farmer Rao attended, high paddy recall. Bought Root Booster but not Insecticide due to price...'"
        />
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
              Populate Form via AI
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
          PRD 7.4.5: Structured data (buttons) is mandatory. The AI Copilot helps populate them faster but agent verification is required.
        </p>
      </div>
    </section>
  );
};

export default AICopilotPanel;

