import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sliders, List, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SamplingControlView from './SamplingControlView';
import TaskDashboardView from './TaskDashboardView';

const TeamLeadDashboardContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sampling' | 'tasks'>('sampling');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const tabs = [
    { id: 'sampling' as const, label: 'Sampling Control', icon: Sliders },
    { id: 'tasks' as const, label: 'Task Management', icon: List },
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f1]">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">Team Lead</h1>
              <p className="text-sm text-slate-600">Sampling control and queue management</p>
            </div>

            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <UserIcon size={16} className="text-slate-400" />
                  <span className="font-medium">{user.name}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-xs text-slate-500 uppercase">{user.role.replace('_', ' ')}</span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-all"
                title="Logout"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors relative ${
                    activeTab === tab.id ? 'text-green-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                  {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'sampling' && <SamplingControlView />}
        {activeTab === 'tasks' && <TaskDashboardView />}
      </div>
    </div>
  );
};

export default TeamLeadDashboardContainer;

