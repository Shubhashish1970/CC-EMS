import React from 'react';

interface BinaryToggleProps {
  label: string;
  value: boolean | null;
  onChange: (value: boolean | null) => void;
}

const BinaryToggle: React.FC<BinaryToggleProps> = ({ label, value, onChange }) => {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">
        {label}
      </span>
      <div className="flex gap-2.5">
        <button
          onClick={() => onChange(value === true ? null : true)}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all border aspect-[2.2/1] min-h-[44px] flex items-center justify-center ${
            value === true
              ? 'bg-green-700 text-white border-green-700 shadow-md shadow-green-700/20'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          Yes
        </button>
        <button
          onClick={() => onChange(value === false ? null : false)}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all border aspect-[2.2/1] min-h-[44px] flex items-center justify-center ${
            value === false
              ? 'bg-red-700 text-white border-red-700 shadow-md shadow-red-700/20'
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
};

export default BinaryToggle;

