/**
 * StyledSelect – STANDARD single-select dropdown for the application.
 *
 * Do not use native <select> elements; they use OS/browser styling (e.g. dark
 * dropdown panel) and break the theme. Use this component for all single-value
 * dropdowns: filters, pagination, form fields, etc.
 *
 * See frontend/UI_STANDARDS.md for full UI standards.
 */
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface StyledSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

const StyledSelect: React.FC<StyledSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className = '',
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  // Position dropdown when open (for portal – avoids parent overflow clipping).
  // Flip above the trigger when not enough space below (e.g. ROWS selector in pagination at bottom of page).
  const DROPDOWN_MAX_HEIGHT = 280;
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = typeof window !== 'undefined' ? window.innerHeight - rect.bottom - 8 : DROPDOWN_MAX_HEIGHT;
    const openAbove = spaceBelow < Math.min(DROPDOWN_MAX_HEIGHT, 200);
    setDropdownStyle({
      position: 'fixed',
      ...(openAbove
        ? { bottom: typeof window !== 'undefined' ? window.innerHeight - rect.top + 4 : undefined, top: undefined }
        : { top: rect.bottom + 4 }
      ),
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [isOpen]);

  // Close dropdown when clicking outside (trigger or dropdown)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inTrigger && !inDropdown) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full min-h-12 px-4 py-3 text-left
          bg-white border rounded-xl
          flex items-center justify-between gap-2
          transition-all duration-200
          min-w-0
          ${error 
            ? 'border-red-300 focus:border-red-500' 
            : isOpen 
              ? 'border-lime-400 ring-2 ring-lime-400/20' 
              : 'border-slate-200 hover:border-lime-300'
          }
          ${disabled 
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
            : 'cursor-pointer focus:ring-2 focus:ring-lime-400 focus:border-lime-400'
          }
          focus:outline-none
        `}
      >
        <span className={`text-sm flex-1 min-w-0 text-left whitespace-normal break-words ${selectedOption ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={18} 
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown Menu – rendered in portal; options list is scrollable when long */}
      {typeof document !== 'undefined' && isOpen && !disabled && createPortal(
        <div
          ref={dropdownRef}
          style={{
            ...dropdownStyle,
            maxHeight: 280,
          }}
          className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden flex flex-col"
        >
          <div
            className="overflow-y-auto overscroll-contain flex-1 min-h-0"
            style={{
              maxHeight: 260,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full px-4 py-3 text-left flex items-center justify-between gap-2 text-sm font-medium
                    transition-colors duration-150 whitespace-normal
                    ${isSelected 
                      ? 'bg-lime-50 text-lime-800' 
                      : 'text-slate-700 hover:bg-slate-50'
                    }
                  `}
                >
                  <span className="min-w-0 break-words flex-1">{option.label}</span>
                  {isSelected && (
                    <Check size={16} className="text-lime-600 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StyledSelect;
