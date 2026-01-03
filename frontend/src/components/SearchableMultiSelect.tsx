import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search, Check } from 'lucide-react';

interface SearchableMultiSelectProps {
  label: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
  color: 'green' | 'indigo';
  placeholder?: string;
  activityItems?: string[]; // Items from activity to highlight
}

const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  label,
  items,
  selected,
  onToggle,
  color,
  placeholder = 'Search and select...',
  activityItems = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter items based on search query
  const filteredItems = items.filter((item) =>
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = (item: string) => {
    onToggle(item);
    // Keep dropdown open for multiple selections
  };

  const isActivityItem = (item: string) => activityItems.includes(item);
  const isSelected = (item: string) => selected.includes(item);

  const getButtonStyle = (item: string) => {
    const selected = isSelected(item);
    const isActivity = isActivityItem(item);
    
    if (selected) {
      return color === 'green'
        ? 'bg-green-700 text-white border-green-700'
        : 'bg-indigo-700 text-white border-indigo-700';
    }
    
    if (isActivity) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    
    return 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50';
  };

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {label}
      </label>

      {/* Selected Items Display */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selected.map((item) => (
            <span
              key={item}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 ${
                color === 'green'
                  ? 'bg-green-700 text-white border-green-700'
                  : 'bg-indigo-700 text-white border-indigo-700'
              }`}
            >
              <span>{item}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(item);
                }}
                className="hover:bg-white/20 rounded-full p-0.5 transition-all"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-4 py-2.5 rounded-lg border text-left text-sm font-medium flex items-center justify-between transition-all ${
            isOpen
              ? 'border-green-500 ring-2 ring-green-200'
              : 'border-slate-200 hover:border-slate-300'
          } ${selected.length === 0 ? 'text-slate-500' : 'text-slate-700'}`}
        >
          <span className="flex items-center gap-2">
            <Search size={16} className="text-slate-400" />
            <span>{selected.length > 0 ? `${selected.length} selected` : placeholder}</span>
          </span>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-slate-200">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            {/* Items List */}
            <div className="overflow-y-auto max-h-48">
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500">
                  No items found
                </div>
              ) : (
                filteredItems.map((item) => {
                  const selected = isSelected(item);
                  const isActivity = isActivityItem(item);
                  
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleToggle(item)}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium border-b border-slate-100 last:border-b-0 flex items-center justify-between transition-colors ${getButtonStyle(item)}`}
                    >
                      <div className="flex items-center gap-2">
                        {selected && (
                          <Check size={16} className={color === 'green' ? 'text-white' : 'text-white'} />
                        )}
                        <span>{item}</span>
                        {isActivity && !selected && (
                          <span className="text-[10px] text-blue-600 font-bold">(from activity)</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Activity Items Hint */}
            {activityItems.length > 0 && (
              <div className="p-2 border-t border-slate-200 bg-blue-50">
                <p className="text-[10px] text-blue-700 font-bold">
                  💡 Items marked "(from activity)" are from the Field Officer's report
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableMultiSelect;

