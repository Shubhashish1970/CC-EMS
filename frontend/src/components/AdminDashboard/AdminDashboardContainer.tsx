import React, { useState } from 'react';
import { BarChart3, Users, Activity as ActivityIcon, List } from 'lucide-react';
import ActivitySamplingView from './ActivitySamplingView';
import AgentQueueView from './AgentQueueView';
import TaskList from '../TaskList';

const AdminDashboardContainer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'activities' | 'queues' | 'tasks'>('activities');

  const tabs = [
    { id: 'activities' as const, label: 'Activity Sampling', icon: ActivityIcon },
    { id: 'queues' as const, label: 'Agent Queues', icon: Users },
    { id: 'tasks' as const, label: 'Task Management', icon: List },
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f1]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="text-green-700" size={24} />
            <div>
              <h1 className="text-2xl font-black text-slate-900">Admin Dashboard</h1>
              <p className="text-sm text-slate-600">Monitor activity sampling and agent queues</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-colors relative ${
                    activeTab === tab.id
                      ? 'text-green-700'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-700"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'activities' && <ActivitySamplingView />}
        {activeTab === 'queues' && <AgentQueueView />}
        {activeTab === 'tasks' && <TaskList />}
      </div>
    </div>
  );
};

export default AdminDashboardContainer;
