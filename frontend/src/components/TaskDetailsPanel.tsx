import React from 'react';
import { MapPin, User, Layout, Phone, UserCircle } from 'lucide-react';

interface TaskDetailsPanelProps {
  taskData: {
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
    };
  } | null;
  isActive: boolean;
}

const TaskDetailsPanel: React.FC<TaskDetailsPanelProps> = ({ taskData, isActive }) => {
  return (
    <section className={`${isActive ? 'flex' : 'hidden'} lg:flex w-full lg:w-80 bg-white border-r border-slate-200 p-6 lg:p-8 flex-col gap-8 shrink-0 overflow-y-auto`}>
      {taskData ? (
        <>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
              Farmer Document
            </label>
            <div className="p-6 bg-green-50/50 rounded-3xl border border-green-100 space-y-4 shadow-inner">
              <div className="flex items-center gap-4">
                <div className="relative w-12 h-12 shrink-0">
                  {taskData.farmer.photoUrl ? (
                    <img
                      src={taskData.farmer.photoUrl}
                      alt={taskData.farmer.name}
                      className="w-12 h-12 rounded-2xl object-cover shadow-lg border-2 border-green-200 bg-green-100"
                      onError={(e) => {
                        // If photo fails, show standard profile icon
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-12 h-12 rounded-2xl bg-green-100 border-2 border-green-200 shadow-lg flex items-center justify-center ${taskData.farmer.photoUrl ? 'hidden' : ''}`}
                  >
                    <UserCircle className="w-10 h-10 text-green-700" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900">{taskData.farmer.name}</h4>
                  {taskData.farmer.mobileNumber && (
                    <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium mt-1">
                      <Phone size={12} className="text-green-600" /> {taskData.farmer.mobileNumber}
                    </p>
                  )}
                </div>
              </div>
              <div className="pt-4 border-t border-green-100 space-y-3">
                <p className="text-xs text-slate-600 flex items-center gap-2 font-medium">
                  <MapPin size={12} className="text-green-600" /> {taskData.farmer.location}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
              Activity Reference
            </label>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-5">
              <div className="space-y-2">
                <span className="text-[9px] font-black bg-indigo-700 text-white px-3 py-1 rounded-full uppercase shadow-sm inline-block">
                  {taskData.activity.type}
                </span>
                {(() => {
                  try {
                    const dateObj = new Date(taskData.activity.date);
                    const dateStr = dateObj.toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    });
                    const timeStr = dateObj.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    });
                    return (
                      <p className="text-[10px] font-bold text-slate-400">
                        {dateStr} • {timeStr}
                      </p>
                    );
                  } catch {
                    return (
                      <p className="text-[10px] font-bold text-slate-400">
                        {taskData.activity.date}
                      </p>
                    );
                  }
                })()}
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-white rounded-lg border border-slate-200">
                    <User size={12} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Field Officer</p>
                    <p className="text-xs font-bold text-slate-800">{taskData.activity.officer}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-white rounded-lg border border-slate-200">
                    <Layout size={12} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Territory</p>
                    <p className="text-xs font-bold text-slate-800">{taskData.activity.location}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full border-4 border-green-200 border-t-green-700 mx-auto flex items-center justify-center">
              <User className="text-green-700" size={32} />
            </div>
            <p className="font-bold text-green-800 text-lg">No Task Loaded</p>
            <p className="text-sm text-slate-500">Click "Load Tasks" in the header to fetch a task</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default TaskDetailsPanel;

