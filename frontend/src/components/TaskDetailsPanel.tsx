import React from 'react';
import { MapPin, User, Layout, Phone, UserCircle, Clock, CheckCircle, XCircle, MessageSquare, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CallLog {
  timestamp?: string;
  callStatus?: string;
  callDurationSeconds?: number;
  didAttend?: string | null;
  didRecall?: boolean | null;
  cropsDiscussed?: string[];
  productsDiscussed?: string[];
  hasPurchased?: boolean | null;
  willingToPurchase?: boolean | null;
  likelyPurchaseDate?: string;
  nonPurchaseReason?: string;
  purchasedProducts?: Array<{ product: string; quantity: string; unit: string }>;
  farmerComments?: string;
  sentiment?: 'Positive' | 'Negative' | 'Neutral' | 'N/A';
}

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
      location: string; // village
      territory: string;
      state?: string;
    };
    status?: string;
    callStartedAt?: string;
    callLog?: CallLog | null;
    updatedAt?: string;
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
                    <p className="text-[10px] text-slate-400 font-bold uppercase">FDA</p>
                    <p className="text-xs font-bold text-slate-800">{taskData.activity.officer}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-white rounded-lg border border-slate-200">
                    <User size={12} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">TM</p>
                    <p className="text-xs font-bold text-slate-800">{taskData.activity.tm || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-white rounded-lg border border-slate-200">
                    <MapPin size={12} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Village</p>
                    <p className="text-xs font-bold text-slate-800">{taskData.activity.location}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-white rounded-lg border border-slate-200">
                    <Layout size={12} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Territory</p>
                    <p className="text-xs font-bold text-slate-800">{taskData.activity.territory || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 bg-white rounded-lg border border-slate-200">
                    <MapPin size={12} className="text-slate-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">State</p>
                    <p className="text-xs font-bold text-slate-800">{taskData.activity.state || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Call Information - Show ALL fields for completed tasks */}
          {taskData.callLog && (
            <>
              {/* Call Status & Duration - Always show */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                  Call Information
                </label>
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                  {/* Outbound Status - Always show */}
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">1. Outbound Status</p>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-block ${
                      taskData.callLog.callStatus === 'Connected'
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-slate-200 text-slate-700 border border-slate-300'
                    }`}>
                      {taskData.callLog.callStatus || '-'}
                    </span>
                  </div>
                  
                  {taskData.callStartedAt && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 pt-2 border-t border-slate-200">
                      <Clock size={12} className="text-slate-400" />
                      <span className="font-medium">
                        Started: {new Date(taskData.callStartedAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </span>
                    </div>
                  )}
                  {taskData.callLog.callDurationSeconds !== undefined && taskData.callLog.callDurationSeconds > 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Clock size={12} className="text-slate-400" />
                      <span className="font-medium">
                        Duration: {Math.floor(taskData.callLog.callDurationSeconds / 60)}:{(taskData.callLog.callDurationSeconds % 60).toString().padStart(2, '0')}
                      </span>
                    </div>
                  )}
                  
                  {/* Meeting Attendance - Always show if call was Connected */}
                  {taskData.callLog.callStatus === 'Connected' && (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">2. Meeting Attendance</p>
                      <p className="text-xs font-bold text-slate-800">{taskData.callLog.didAttend || '-'}</p>
                    </div>
                  )}
                  
                  {/* Recall Content - Always show if call was Connected and didAttend was answered */}
                  {taskData.callLog.callStatus === 'Connected' && taskData.callLog.didAttend && 
                   (taskData.callLog.didAttend === 'Yes, I attended' || taskData.callLog.didAttend === "Don't recall") && (
                    <div className="pt-2 border-t border-slate-200">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">3. Do they recall the content?</p>
                      <p className="text-xs font-bold text-slate-800">
                        {taskData.callLog.didRecall !== null && taskData.callLog.didRecall !== undefined 
                          ? (taskData.callLog.didRecall ? 'Yes' : 'No')
                          : '-'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Products & Crops Discussed - Always show if recall was answered (Yes) */}
              {taskData.callLog.callStatus === 'Connected' && 
               taskData.callLog.didAttend && 
               (taskData.callLog.didAttend === 'Yes, I attended' || taskData.callLog.didAttend === "Don't recall") &&
               taskData.callLog.didRecall === true && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                    4. Products & Crops Discussed
                  </label>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Crops Identified</p>
                      {taskData.callLog.cropsDiscussed && taskData.callLog.cropsDiscussed.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {taskData.callLog.cropsDiscussed.map((crop, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200"
                            >
                              {crop}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">-</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">NACL Products Recalled</p>
                      {taskData.callLog.productsDiscussed && taskData.callLog.productsDiscussed.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {taskData.callLog.productsDiscussed.map((product, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium border border-indigo-200"
                            >
                              {product}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">-</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Commercial Conversion - Always show if crops/products were discussed */}
              {taskData.callLog.callStatus === 'Connected' && 
               taskData.callLog.didRecall === true &&
               ((taskData.callLog.cropsDiscussed && taskData.callLog.cropsDiscussed.length > 0) || 
                (taskData.callLog.productsDiscussed && taskData.callLog.productsDiscussed.length > 0)) && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                    5. Commercial Conversion
                  </label>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Have they purchased?</p>
                      {taskData.callLog.hasPurchased !== null && taskData.callLog.hasPurchased !== undefined ? (
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-block ${
                          taskData.callLog.hasPurchased
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {taskData.callLog.hasPurchased ? 'Yes' : 'No'}
                        </span>
                      ) : (
                        <p className="text-xs text-slate-500">-</p>
                      )}
                    </div>
                    {taskData.callLog.hasPurchased === true && (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Purchased Products</p>
                        {taskData.callLog.purchasedProducts && taskData.callLog.purchasedProducts.length > 0 ? (
                          <div className="space-y-2">
                            {taskData.callLog.purchasedProducts.map((item, idx) => (
                              <div key={idx} className="text-xs text-slate-700">
                                <span className="font-bold">{item.product}</span>
                                {item.quantity && (
                                  <>
                                    <span className="text-slate-400 mx-1">•</span>
                                    <span>{item.quantity} {item.unit}</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500">-</p>
                        )}
                      </div>
                    )}
                    {taskData.callLog.hasPurchased === false && (
                      <>
                        {taskData.callLog.willingToPurchase !== null && taskData.callLog.willingToPurchase !== undefined && (
                          <div className="pt-2 border-t border-slate-200">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Likely to buy in future?</p>
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-block ${
                              taskData.callLog.willingToPurchase
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : 'bg-red-100 text-red-700 border border-red-200'
                            }`}>
                              {taskData.callLog.willingToPurchase ? 'Yes' : 'No'}
                            </span>
                            {taskData.callLog.willingToPurchase === true && taskData.callLog.likelyPurchaseDate && (
                              <p className="text-xs text-slate-600 mt-2">
                                Likely Date: {new Date(taskData.callLog.likelyPurchaseDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            )}
                          </div>
                        )}
                        {taskData.callLog.nonPurchaseReason && (
                          <div className="pt-2 border-t border-slate-200">
                            <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Reason for non-purchase</p>
                            <p className="text-xs font-bold text-slate-800">{taskData.callLog.nonPurchaseReason}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Farmer Comments & Sentiment - Always show if callLog exists */}
              {taskData.callLog && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">
                    6. Farmer Feedback
                  </label>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageSquare size={14} className="text-slate-400" />
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Comments</p>
                      </div>
                      {taskData.callLog.farmerComments ? (
                        <p className="text-xs text-slate-700 whitespace-pre-wrap">{taskData.callLog.farmerComments}</p>
                      ) : (
                        <p className="text-xs text-slate-500">-</p>
                      )}
                    </div>
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center gap-2">
                        {taskData.callLog.sentiment === 'Positive' && <TrendingUp size={14} className="text-green-600" />}
                        {taskData.callLog.sentiment === 'Negative' && <TrendingDown size={14} className="text-red-600" />}
                        {taskData.callLog.sentiment === 'Neutral' && <Minus size={14} className="text-slate-600" />}
                        {!taskData.callLog.sentiment || taskData.callLog.sentiment === 'N/A' ? (
                          <Minus size={14} className="text-slate-400" />
                        ) : null}
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Sentiment</p>
                      </div>
                      {taskData.callLog.sentiment && taskData.callLog.sentiment !== 'N/A' ? (
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold inline-block mt-2 ${
                          taskData.callLog.sentiment === 'Positive'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : taskData.callLog.sentiment === 'Negative'
                            ? 'bg-red-100 text-red-700 border border-red-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {taskData.callLog.sentiment}
                        </span>
                      ) : (
                        <p className="text-xs text-slate-500 mt-2">-</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
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

