import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface UnitDropdownProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const UnitDropdown: React.FC<UnitDropdownProps> = ({ value, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const units = [
    { value: 'kg', label: 'Kg' },
    { value: 'gms', label: 'gms' },
    { value: 'lt', label: 'lt' },
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedUnit = units.find(u => u.value === value) || units[0];

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-12 px-4 py-3 text-sm font-medium border border-slate-200 rounded-xl bg-white text-slate-900 hover:border-lime-300 transition-colors flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-lime-400 focus:border-lime-400 min-w-[72px]"
      >
        <span>{selectedUnit.label}</span>
        <ChevronDown 
          size={18} 
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[72px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {units.map((unit) => (
            <button
              key={unit.value}
              type="button"
              onClick={() => {
                onChange(unit.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-3 text-sm font-medium text-left transition-colors ${
                value === unit.value
                  ? 'bg-lime-50 text-lime-800'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {unit.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default UnitDropdown;


