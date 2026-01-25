import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall, Loader2, ArrowRight, Leaf, Phone, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Module {
  code: string;
  name: string;
  fullName: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
}

const ModuleSelection: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);

  useEffect(() => {
    // Available modules - can be expanded in the future
    const availableModules: Module[] = [
      {
        code: 'ems',
        name: 'EMS',
        fullName: 'Engagement Management System',
        description: 'Connect with farmers through intelligent call management. Track field activities, follow up on visits, and build lasting relationships.',
        icon: <Phone size={28} />,
        features: [
          'Smart call routing & queuing',
          'Real-time farmer insights',
          'Activity tracking & follow-ups',
          'Performance analytics',
        ],
      },
    ];

    setModules(availableModules);
    setSelectedModule(availableModules[0]?.code || null);
    setIsLoading(false);
  }, []);

  const handleModuleSelect = (moduleCode: string) => {
    navigate(`/workspace/${moduleCode}`, { replace: true });
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

  const currentModule = modules.find(m => m.code === selectedModule);

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

          {/* Bottom Section - Stacked Boxes */}
          <div className="p-6 pt-0">
            <div className="grid grid-cols-4 gap-3 h-48">
              {/* Box 1 - Image */}
              <div className="rounded-2xl overflow-hidden relative group">
                <img 
                  src="https://images.unsplash.com/photo-1605000797499-95a51c5269ae?q=80&w=400" 
                  alt="Farmer in field"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>

              {/* Box 2 - Stat (White) */}
              <div className="bg-white rounded-2xl p-4 flex flex-col justify-between relative group hover:shadow-lg transition-shadow">
                <div className="absolute top-3 right-3 w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                  <ExternalLink size={14} className="text-slate-600" />
                </div>
                <div>
                  <p className="text-4xl font-black text-slate-900">10K+</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">Farmers Reached</p>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Building lasting relationships with farmers across multiple territories.
                </p>
              </div>

              {/* Box 3 - Image */}
              <div className="rounded-2xl overflow-hidden relative group">
                <img 
                  src="https://images.unsplash.com/photo-1574943320219-553eb213f72d?q=80&w=400" 
                  alt="Agriculture"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>

              {/* Box 4 - Stat (Lime) */}
              <div className="bg-lime-400 rounded-2xl p-4 flex flex-col justify-between relative group hover:bg-lime-500 transition-colors">
                <div className="absolute top-3 right-3 w-8 h-8 bg-lime-500 rounded-full flex items-center justify-center group-hover:bg-lime-600 transition-colors">
                  <ExternalLink size={14} className="text-slate-900" />
                </div>
                <div>
                  <p className="text-4xl font-black text-slate-900">95%</p>
                  <p className="text-sm font-bold text-slate-800 mt-1">Success Rate</p>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  Delivering excellent engagement outcomes and farmer satisfaction.
                </p>
              </div>
            </div>

            {/* Second Row */}
            <div className="grid grid-cols-4 gap-3 h-32 mt-3">
              {/* Box 5 - Stat (Small White) */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex flex-col justify-center border border-white/10">
                <p className="text-2xl font-black text-lime-400">50+</p>
                <p className="text-xs text-slate-400 font-semibold">Territories</p>
              </div>

              {/* Box 6 - Image */}
              <div className="col-span-2 rounded-2xl overflow-hidden relative group">
                <img 
                  src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=800" 
                  alt="Farm landscape"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              </div>

              {/* Box 7 - Stat (Small White) */}
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex flex-col justify-center border border-white/10">
                <p className="text-2xl font-black text-lime-400">24/7</p>
                <p className="text-xs text-slate-400 font-semibold">Support</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Module Selection */}
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
          <div className="max-w-md mx-auto w-full">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl lg:text-3xl font-black text-slate-900 mb-2">Select Workspace</h2>
              <p className="text-slate-500">Choose a module to start your work session</p>
            </div>

            {/* Module Cards */}
            <div className="space-y-4">
              {modules.map((module) => (
                <div
                  key={module.code}
                  onClick={() => setSelectedModule(module.code)}
                  className={`relative bg-white rounded-2xl border-2 p-6 cursor-pointer transition-all duration-200 ${
                    selectedModule === module.code
                      ? 'border-lime-500 shadow-lg shadow-lime-500/10'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {/* Selection Indicator */}
                  {selectedModule === module.code && (
                    <div className="absolute top-4 right-4 w-6 h-6 bg-lime-500 rounded-full flex items-center justify-center">
                      <CheckCircle size={16} className="text-white" />
                    </div>
                  )}

                  {/* Icon & Name */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${
                      selectedModule === module.code
                        ? 'bg-lime-500 text-slate-900'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {module.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-slate-900">{module.name}</h3>
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{module.fullName}</p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">{module.description}</p>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-2">
                    {module.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-1.5 h-1.5 bg-lime-500 rounded-full" />
                        {feature}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Enter Button */}
            {currentModule && (
              <button
                onClick={() => handleModuleSelect(currentModule.code)}
                className="w-full mt-6 px-6 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-lg shadow-slate-900/20 hover:shadow-xl hover:shadow-slate-900/30"
              >
                Enter {currentModule.name} Workspace
                <ArrowRight size={18} />
              </button>
            )}

            {/* Empty State */}
            {modules.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <PhoneCall size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-700 font-semibold mb-1">No modules available</p>
                <p className="text-sm text-slate-500">Please contact your administrator</p>
              </div>
            )}
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
