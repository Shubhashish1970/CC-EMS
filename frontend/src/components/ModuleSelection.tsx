import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, Loader2, ArrowRight, Activity, Leaf } from 'lucide-react';
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
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    // Hardcoded modules for now (Option 1 approach)
    // In the future, this will fetch from API
    const availableModules: Module[] = [
      {
        code: 'ems',
        name: 'EMS',
        description: 'Farmer follow-up calls for field activities',
        icon: <Activity size={32} />,
        color: 'lime',
      },
    ];

    setModules(availableModules);
    setIsLoading(false);

    // Auto-redirect if only one module after 5 seconds
    // This allows users to see the landing page before redirecting
    if (availableModules.length === 1) {
      // Start countdown from 5
      setCountdown(5);
      
      // Update countdown every second
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(countdownInterval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      // Redirect after 5 seconds
      const redirectTimer = setTimeout(() => {
        navigate('/workspace/ems', { replace: true });
      }, 5000); // 5 second delay to show the landing page
      
      return () => {
        clearTimeout(redirectTimer);
        clearInterval(countdownInterval);
      };
    }
  }, [navigate]);

  const handleModuleSelect = (moduleCode: string) => {
    navigate(`/workspace/${moduleCode}`, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="animate-spin text-lime-600 mx-auto mb-4" size={32} />
          <p className="text-slate-600 font-medium">Loading modules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-lime-500 rounded-xl flex items-center justify-center">
              <Leaf className="text-slate-900" size={24} />
            </div>
          </div>
          <span className="text-xs font-black text-lime-400 uppercase tracking-[0.2em]">Kweka Reach</span>
          <h1 className="text-3xl font-black text-white mb-2 mt-1">Select Module</h1>
          <p className="text-slate-400">Choose a module to start working</p>
          {countdown !== null && countdown > 0 && (
            <p className="text-sm text-lime-400 font-medium mt-2">
              Auto-redirecting to {modules[0]?.name} in {countdown} second{countdown !== 1 ? 's' : ''}...
            </p>
          )}
        </div>

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <div
              key={module.code}
              onClick={() => handleModuleSelect(module.code)}
              className="bg-slate-800 rounded-2xl border-2 border-slate-700 p-8 cursor-pointer hover:border-lime-500 hover:shadow-xl hover:shadow-lime-500/10 transition-all duration-200 transform hover:scale-[1.02] group"
            >
              {/* Icon */}
              <div className="flex items-center justify-center w-16 h-16 bg-lime-500/20 rounded-2xl mb-4 group-hover:bg-lime-500 transition-colors">
                <div className="text-lime-400 group-hover:text-slate-900 transition-colors">
                  {module.icon || <PhoneCall size={32} />}
                </div>
              </div>

              {/* Module Name */}
              <h2 className="text-2xl font-black text-white mb-2">{module.name}</h2>

              {/* Description */}
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">{module.description}</p>

              {/* Enter Button */}
              <div className="flex items-center gap-2 text-lime-400 font-bold group-hover:text-lime-300">
                <span>Enter</span>
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {/* Empty State (shouldn't show if modules exist, but good to have) */}
        {modules.length === 0 && (
          <div className="text-center py-20 bg-slate-800 rounded-2xl border border-slate-700">
            <PhoneCall size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-300 font-medium text-lg mb-2">No modules available</p>
            <p className="text-sm text-slate-500">Please contact your administrator</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleSelection;
