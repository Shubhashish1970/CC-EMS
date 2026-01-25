import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Leaf, Phone, ArrowUpRight, BarChart3, Users, Settings, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Module {
  code: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  stat?: string;
  statLabel?: string;
  variant: 'image' | 'white' | 'lime' | 'dark';
  imageUrl?: string;
  size?: 'normal' | 'wide';
  available: boolean;
}

const ModuleSelection: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    // Available modules/processes - each box is a clickable module
    const availableModules: Module[] = [
      {
        code: 'ems',
        name: 'EMS',
        description: 'Farmer engagement & call management',
        icon: <Phone size={24} />,
        stat: '10K+',
        statLabel: 'Farmers Reached',
        variant: 'lime',
        size: 'normal',
        available: true,
      },
      {
        code: 'analytics',
        name: 'Analytics',
        description: 'Performance insights & reporting',
        icon: <BarChart3 size={24} />,
        stat: '95%',
        statLabel: 'Success Rate',
        variant: 'white',
        size: 'normal',
        available: false,
      },
      {
        code: 'crm',
        name: 'CRM',
        description: 'Customer relationship management',
        icon: <Users size={24} />,
        stat: '50+',
        statLabel: 'Territories',
        variant: 'dark',
        size: 'normal',
        available: false,
      },
      {
        code: 'admin',
        name: 'Admin',
        description: 'System configuration & settings',
        icon: <Settings size={24} />,
        variant: 'white',
        size: 'normal',
        available: false,
      },
      {
        code: 'reports',
        name: 'Reports',
        description: 'Generate & export detailed reports',
        icon: <FileText size={24} />,
        stat: '24/7',
        statLabel: 'Available',
        variant: 'lime',
        size: 'normal',
        available: false,
      },
    ];

    setModules(availableModules);
    setIsLoading(false);
  }, []);

  const handleModuleSelect = (module: Module) => {
    if (!module.available) return;
    navigate(`/workspace/${module.code}`, { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <Loader2 className="animate-spin text-lime-500 mx-auto mb-4" size={32} />
          <p className="text-slate-400 font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Hero Section */}
      <div className="hidden lg:flex lg:w-2/5 bg-slate-900 relative overflow-hidden flex-col">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-96 h-96 bg-lime-500 rounded-full blur-3xl" />
          <div className="absolute bottom-40 right-20 w-80 h-80 bg-lime-400 rounded-full blur-3xl" />
        </div>

        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=2070)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-slate-900/95" />

        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-12 h-12 bg-lime-500 rounded-xl flex items-center justify-center shadow-lg shadow-lime-500/20">
              <Leaf className="text-slate-900" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Kweka Reach</h1>
              <p className="text-xs text-lime-400 font-semibold uppercase tracking-wider">Farmer Engagement Platform</p>
            </div>
          </div>

          {/* Mission Statement */}
          <div className="my-auto">
            <p className="text-lime-400 font-bold text-sm uppercase tracking-widest mb-4">Welcome Back, {user?.name?.split(' ')[0] || 'User'}</p>
            <h2 className="text-4xl font-black text-white leading-tight mb-6">
              Empowering Agricultural Excellence
            </h2>
            <p className="text-base text-slate-300 leading-relaxed">
              With intelligent tools and real-time insights, we help you connect with farmers, 
              track engagements, and drive sustainable growth across your territories.
            </p>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 mt-auto">
            <div className="w-10 h-10 bg-lime-500/20 rounded-full flex items-center justify-center">
              <span className="text-lime-400 font-bold text-sm">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </span>
            </div>
            <div>
              <p className="text-white font-semibold">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-400 uppercase">{user?.role?.replace('_', ' ') || 'Agent'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Stacked Module Boxes */}
      <div className="w-full lg:w-3/5 bg-slate-50 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden bg-slate-900 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lime-500 rounded-xl flex items-center justify-center">
              <Leaf className="text-slate-900" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black text-white">Kweka Reach</h1>
              <p className="text-[10px] text-lime-400 uppercase tracking-wider">Farmer Engagement</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-black text-slate-900 mb-2">Select Workspace</h2>
            <p className="text-slate-500">Choose a process to start your work session</p>
          </div>

          {/* Stacked Boxes Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((module) => (
              <div
                key={module.code}
                onClick={() => handleModuleSelect(module)}
                className={`relative rounded-2xl p-5 transition-all duration-300 ${
                  module.available
                    ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02]'
                    : 'cursor-not-allowed opacity-60'
                } ${
                  module.variant === 'lime'
                    ? 'bg-lime-400 hover:bg-lime-500'
                    : module.variant === 'dark'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 hover:border-slate-300'
                }`}
                style={{ minHeight: '180px' }}
              >
                {/* Arrow Icon */}
                <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  module.variant === 'lime'
                    ? 'bg-lime-500 group-hover:bg-lime-600'
                    : module.variant === 'dark'
                    ? 'bg-slate-700'
                    : 'bg-slate-100'
                }`}>
                  <ArrowUpRight size={16} className={
                    module.variant === 'lime' || module.variant === 'dark'
                      ? 'text-slate-900'
                      : 'text-slate-500'
                  } />
                </div>

                {/* Coming Soon Badge */}
                {!module.available && (
                  <div className="absolute top-4 left-4 px-2 py-1 bg-slate-200 rounded-full">
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Coming Soon</span>
                  </div>
                )}

                {/* Content */}
                <div className="flex flex-col h-full justify-between">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                    module.variant === 'lime'
                      ? 'bg-lime-500'
                      : module.variant === 'dark'
                      ? 'bg-slate-700'
                      : 'bg-slate-100'
                  }`}>
                    <div className={
                      module.variant === 'lime'
                        ? 'text-slate-900'
                        : module.variant === 'dark'
                        ? 'text-lime-400'
                        : 'text-slate-600'
                    }>
                      {module.icon}
                    </div>
                  </div>

                  {/* Stat (if available) */}
                  {module.stat && (
                    <div className="mb-2">
                      <p className={`text-3xl font-black ${
                        module.variant === 'lime'
                          ? 'text-slate-900'
                          : module.variant === 'dark'
                          ? 'text-white'
                          : 'text-slate-900'
                      }`}>
                        {module.stat}
                      </p>
                      {module.statLabel && (
                        <p className={`text-xs font-semibold ${
                          module.variant === 'lime'
                            ? 'text-slate-700'
                            : module.variant === 'dark'
                            ? 'text-slate-400'
                            : 'text-slate-500'
                        }`}>
                          {module.statLabel}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Name & Description */}
                  <div className="mt-auto">
                    <h3 className={`text-lg font-black mb-1 ${
                      module.variant === 'lime'
                        ? 'text-slate-900'
                        : module.variant === 'dark'
                        ? 'text-white'
                        : 'text-slate-900'
                    }`}>
                      {module.name}
                    </h3>
                    <p className={`text-xs leading-relaxed ${
                      module.variant === 'lime'
                        ? 'text-slate-700'
                        : module.variant === 'dark'
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}>
                      {module.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 text-center border-t border-slate-200">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Kweka Reach. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModuleSelection;
