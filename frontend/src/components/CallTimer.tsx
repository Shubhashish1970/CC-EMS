import React from 'react';

interface CallTimerProps {
  duration: number;
}

const CallTimer: React.FC<CallTimerProps> = ({ duration }) => {
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-2xl border border-green-200 text-[11px] font-black uppercase">
      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
      {minutes}m {seconds}s
    </div>
  );
};

export default CallTimer;

