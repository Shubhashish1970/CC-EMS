import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, Loader2, ArrowRight, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Module {
  code: string;
  name: string;
  description: string;
  icon?: React.ReactNode;
  color?: string;
}

const ModuleSelection: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    // Hardcoded modules for now (Option 1 approach)
    // In the future, this will fetch from API
    const availableModules: Module[] = [
      {
        code: 'ems',
        name: 'EMS',
        description: 'Farmer follow-up calls for field activities',
        icon: <Activity size={32} />,
        color: 'green',
      },
    ];

    setModules(availableModules);
    setIsLoading(false);

    // Auto-redirect if only one module (Option A: immediate redirect)
    // This happens after a brief moment to allow component to mount
    if (availableModules.length === 1) {
      const redirectTimer = setTimeout(() => {
        navigate('/workspace/ems', { replace: true });
      }, 50); // Very brief delay to prevent flash
      
      return () => clearTimeout(redirectTimer);
    }
  }, [navigate]);

  const handleModuleSelect = (moduleCode: string) => {
    navigate(`/workspace/${moduleCode}`, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f5f1]">
        <div className="text-center">
          <Loader2 className="animate-spin text-green-700 mx-auto mb-4" size={32} />
          <p className="text-slate-600 font-medium">Loading modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f1] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-black text-slate-900 mb-2">Select Module</h1>
          <p className="text-slate-600">Choose a module to start working</p>
        </div>

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <div
              key={module.code}
              onClick={() => handleModuleSelect(module.code)}
              className="bg-white rounded-2xl border-2 border-slate-200 p-8 cursor-pointer hover:border-green-500 hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] group"
            >
              {/* Icon */}
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4 group-hover:bg-green-700 transition-colors">
                <div className="text-green-700 group-hover:text-white transition-colors">
                  {module.icon || <PhoneCall size={32} />}
                </div>
              </div>

              {/* Module Name */}
              <h2 className="text-2xl font-black text-slate-900 mb-2">{module.name}</h2>

              {/* Description */}
              <p className="text-slate-600 text-sm mb-6 leading-relaxed">{module.description}</p>

              {/* Enter Button */}
              <div className="flex items-center gap-2 text-green-700 font-bold group-hover:text-green-800">
                <span>Enter</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {/* Empty State (shouldn't show if modules exist, but good to have) */}
        {modules.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <PhoneCall size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium text-lg mb-2">No modules available</p>
            <p className="text-sm text-slate-500">Please contact your administrator</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleSelection;
