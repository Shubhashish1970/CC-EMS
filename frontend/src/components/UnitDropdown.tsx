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
        className="w-16 px-2 py-1.5 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-colors flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-green-500"
      >
        <span>{selectedUnit.label}</span>
        <ChevronDown 
          size={12} 
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-16 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {units.map((unit) => (
            <button
              key={unit.value}
              type="button"
              onClick={() => {
                onChange(unit.value);
                setIsOpen(false);
              }}
              className={`w-full px-2 py-1.5 text-xs font-medium text-left transition-colors ${
                value === unit.value
                  ? 'bg-green-50 text-green-700'
                  : 'text-slate-600 hover:bg-slate-50'
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


