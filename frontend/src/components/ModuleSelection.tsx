import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Leaf, Phone, ArrowUpRight, ClipboardList, Truck, Headphones } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Module {
  code: string;
  name: string;
  fullName: string;
  description: string;
  icon: React.ReactNode;
  variant: 'lime' | 'white' | 'dark';
  available: boolean;
}

const ModuleSelection: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    // Available modules/workspaces
    const availableModules: Module[] = [
      {
        code: 'ems',
        name: 'EMS',
        fullName: 'Engagement Management',
        description: 'Farmer calls & follow-ups',
        icon: <Phone size={24} />,
        variant: 'lime',
        available: true,
      },
      {
        code: 'dms',
        name: 'DMS',
        fullName: 'Distribution Management',
        description: 'Supply chain & logistics',
        icon: <Truck size={24} />,
        variant: 'white',
        available: false,
      },
      {
        code: 'surveys',
        name: 'Surveys',
        fullName: 'Field Surveys',
        description: 'Data collection & insights',
        icon: <ClipboardList size={24} />,
        variant: 'dark',
        available: false,
      },
      {
        code: 'inbound',
        name: 'Inbound',
        fullName: 'Inbound Support',
        description: 'Customer queries & help',
        icon: <Headphones size={24} />,
        variant: 'white',
        available: false,
      },
    ];

    setModules(availableModules);
    setIsLoading(false);
  }, []);

  const handleModuleClick = (module: Module) => {
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
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-20 w-96 h-96 bg-lime-500 rounded-full blur-3xl" />
          <div className="absolute bottom-40 right-20 w-80 h-80 bg-lime-400 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Top Section - Logo & Content */}
          <div className="flex-1 p-12 flex flex-col justify-center">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-lime-500 rounded-xl flex items-center justify-center shadow-lg shadow-lime-500/20">
                <Leaf className="text-slate-900" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Kweka Reach</h1>
                <p className="text-xs text-lime-400 font-semibold uppercase tracking-wider">Farmer Engagement Platform</p>
              </div>
            </div>

            {/* Mission Statement */}
            <div className="max-w-lg">
              <p className="text-lime-400 font-bold text-sm uppercase tracking-widest mb-4">Welcome Back, {user?.name?.split(' ')[0] || 'User'}</p>
              <h2 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6">
                Empowering Agricultural Excellence
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed">
                With intelligent tools and real-time insights, we help you connect with farmers, 
                track engagements, and drive sustainable growth across your territories.
              </p>
            </div>
          </div>

          {/* Bottom Section - Decorative Stacked Boxes */}
          <div className="p-6 pt-0">
            <div className="grid grid-cols-4 gap-3 h-40">
              {/* Box 1 - Image */}
              <div className="rounded-2xl overflow-hidden relative">
                <img 
                  src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=400" 
                  alt="Farmer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>

              {/* Box 2 - Stat */}
              <div className="bg-white rounded-2xl p-3 flex flex-col justify-between">
                <p className="text-3xl font-black text-slate-900">10K+</p>
                <div>
                  <p className="text-xs font-bold text-slate-700">Farmers Reached</p>
                  <p className="text-[10px] text-slate-500 mt-1">Across all territories</p>
                </div>
              </div>

              {/* Box 3 - Image */}
              <div className="rounded-2xl overflow-hidden relative">
                <img 
                  src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?q=80&w=400" 
                  alt="Agriculture"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>

              {/* Box 4 - Stat (Lime) */}
              <div className="bg-lime-400 rounded-2xl p-3 flex flex-col justify-between">
                <p className="text-3xl font-black text-slate-900">95%</p>
                <div>
                  <p className="text-xs font-bold text-slate-800">Success Rate</p>
                  <p className="text-[10px] text-slate-700 mt-1">Engagement outcomes</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Workspace Selection */}
      <div className="w-full lg:w-1/2 bg-slate-50 flex flex-col">
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
        <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center">
          <div className="max-w-lg mx-auto w-full">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 mb-2">Select Workspace</h2>
              <p className="text-slate-500">Choose a module to start your work session</p>
            </div>

            {/* Workspace Grid - Stacked Boxes Style */}
            <div className="grid grid-cols-2 gap-4">
              {modules.map((module) => (
                <div
                  key={module.code}
                  onClick={() => handleModuleClick(module)}
                  className={`relative rounded-2xl p-5 transition-all duration-300 cursor-pointer ${
                    module.available
                      ? 'hover:shadow-xl hover:scale-[1.02]'
                      : 'opacity-50 cursor-not-allowed'
                  } ${
                    module.variant === 'lime'
                      ? 'bg-lime-400 hover:bg-lime-500'
                      : module.variant === 'dark'
                      ? 'bg-slate-800'
                      : 'bg-white border border-slate-200 hover:border-slate-300'
                  }`}
                  style={{ minHeight: '160px' }}
                >
                  {/* Arrow Icon */}
                  <div className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center ${
                    module.variant === 'lime'
                      ? 'bg-lime-500'
                      : module.variant === 'dark'
                      ? 'bg-slate-700'
                      : 'bg-slate-100'
                  }`}>
                    <ArrowUpRight size={16} className={
                      module.variant === 'dark' ? 'text-lime-400' : 'text-slate-900'
                    } />
                  </div>

                  {/* Coming Soon Badge */}
                  {!module.available && (
                    <div className={`absolute top-4 left-4 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      module.variant === 'dark' 
                        ? 'bg-slate-700 text-slate-400' 
                        : 'bg-slate-200 text-slate-500'
                    }`}>
                      Coming Soon
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex flex-col h-full justify-end">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                      module.variant === 'lime'
                        ? 'bg-lime-500 text-slate-900'
                        : module.variant === 'dark'
                        ? 'bg-slate-700 text-lime-400'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {module.icon}
                    </div>

                    {/* Name */}
                    <h3 className={`text-xl font-black mb-0.5 ${
                      module.variant === 'dark' ? 'text-white' : 'text-slate-900'
                    }`}>
                      {module.name}
                    </h3>
                    
                    {/* Full Name */}
                    <p className={`text-xs font-semibold mb-1 ${
                      module.variant === 'lime'
                        ? 'text-slate-700'
                        : module.variant === 'dark'
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}>
                      {module.fullName}
                    </p>

                    {/* Description */}
                    <p className={`text-[11px] ${
                      module.variant === 'lime'
                        ? 'text-slate-600'
                        : module.variant === 'dark'
                        ? 'text-slate-500'
                        : 'text-slate-400'
                    }`}>
                      {module.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
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
