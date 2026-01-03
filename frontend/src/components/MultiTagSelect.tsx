import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface MultiTagSelectProps {
  label: string;
  items: string[]; // Master list from API
  selected: string[];
  onToggle: (item: string) => void;
  color: 'green' | 'indigo';
  activityItems?: string[]; // Items from activity to show first
}

const MultiTagSelect: React.FC<MultiTagSelectProps> = ({ 
  label, 
  items, 
  selected, 
  onToggle, 
  color,
  activityItems = []
}) => {
  const [showAddInput, setShowAddInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  // Show ALL activity items first (regardless of master list)
  const activityItemsList = activityItems || [];
  const otherItems = items.filter(item => !activityItems.includes(item));
  
  // Custom items (selected items not in master list and not in activity)
  // Use case-insensitive comparison to avoid duplicates, but preserve original case
  const itemsLower = items.map(i => i.toLowerCase());
  const activityItemsLower = activityItems.map(i => i.toLowerCase());
  const customItems = selected.filter(item => {
    const itemLower = item.toLowerCase();
    return !itemsLower.includes(itemLower) && !activityItemsLower.includes(itemLower);
  });

  // Get all selected items in the order they were added (from selected array)
  // This ensures custom items appear in left-to-right order as they were added
  const selectedInOrder = selected.filter(item => {
    const itemLower = item.toLowerCase();
    // Include items that are either:
    // 1. In activity items (will be shown first separately)
    // 2. In master items but not in activity (will be shown after activity items)
    // 3. Custom items (will be shown last, in order)
    return true; // We'll filter and organize in the render
  });

  const handleAddCustom = () => {
    if (customValue.trim() && !selected.includes(customValue.trim())) {
      onToggle(customValue.trim());
      setCustomValue('');
      setShowAddInput(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustom();
    } else if (e.key === 'Escape') {
      setShowAddInput(false);
      setCustomValue('');
    }
  };

  const getButtonStyle = (item: string, isSelected: boolean, isActivity: boolean, isCustom: boolean) => {
    const baseStyle = `px-4 py-2 rounded-full text-xs font-medium border transition-all active:scale-95 min-h-[32px] flex items-center gap-2`;
    
    if (isSelected) {
      const selectedStyle = color === 'green'
        ? 'bg-green-700 text-white border-green-700 shadow-md'
        : 'bg-indigo-700 text-white border-indigo-700 shadow-md';
      return `${baseStyle} ${selectedStyle}`;
    } else {
      // Activity items have a subtle blue background when not selected
      if (isActivity) {
        return `${baseStyle} bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100`;
      }
      return `${baseStyle} bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300`;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {label}
        </label>
        {!showAddInput && (
          <button
            onClick={() => setShowAddInput(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-full hover:bg-slate-50 transition-all"
            title="Add custom item"
          >
            <Plus size={14} />
            Add
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* Activity Items First (highlighted) - Show all activity items, selected or not */}
        {activityItemsList.length > 0 && (
          <>
            {activityItemsList.map((item) => {
              const isSelected = selected.some(s => s.toLowerCase() === item.toLowerCase());
              return (
                <button
                  key={item}
                  onClick={() => onToggle(item)}
                  className={getButtonStyle(item, isSelected, true, false)}
                >
                  <span className="font-medium">{item}</span>
                </button>
              );
            })}
            {/* Separator if there are other selected items */}
            {selected.some(s => {
              const sLower = s.toLowerCase();
              return !activityItemsLower.includes(sLower);
            }) && (
              <div className="w-full h-px bg-slate-200 my-1" />
            )}
          </>
        )}

        {/* Show all other selected items in the order they were added (left to right) */}
        {selected
          .filter(item => {
            const itemLower = item.toLowerCase();
            // Exclude activity items (already shown above)
            return !activityItemsLower.includes(itemLower);
          })
          .map((item) => {
            const isSelected = true; // All items in selected array are selected
            const itemLower = item.toLowerCase();
            const isInMaster = itemsLower.includes(itemLower);
            const isCustom = !isInMaster;
            
            return (
              <button
                key={`${item}-${selected.indexOf(item)}`} // Unique key with index to preserve order
                onClick={() => onToggle(item)}
                className={getButtonStyle(item, isSelected, false, isCustom)}
              >
                <span className="font-medium">{item}</span>
                {isCustom && (
                  <span className="text-[8px] opacity-70 font-normal">(custom)</span>
                )}
              </button>
            );
          })}
        
        {/* Add Input with Searchable Dropdown - Compact Pill Style */}
        {showAddInput && (
          <div className="relative inline-block">
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <input
                  type="text"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onBlur={(e) => {
                    // Don't close if clicking on dropdown
                    if (!e.relatedTarget || !e.relatedTarget.closest('.dropdown-suggestions')) {
                      setTimeout(() => {
                        if (!customValue.trim()) {
                          setShowAddInput(false);
                        }
                      }, 200);
                    }
                  }}
                  placeholder="Search or type..."
                  className="px-3 py-1.5 text-xs font-medium border border-slate-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[120px] max-w-[200px]"
                  autoFocus
                />
                {/* Show matching master items as suggestions */}
                {customValue.trim() && (
                  <div className="dropdown-suggestions absolute z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-32 overflow-y-auto min-w-[200px]">
                    {items
                      .filter(item => 
                        item.toLowerCase().includes(customValue.toLowerCase()) &&
                        !activityItemsLower.includes(item.toLowerCase()) &&
                        !selected.some(s => s.toLowerCase() === item.toLowerCase())
                      )
                      .slice(0, 5)
                      .map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            onToggle(item); // Use master item (uppercase) when selecting from dropdown
                            setCustomValue('');
                            setShowAddInput(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs font-medium hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                        >
                          {item}
                        </button>
                      ))}
                    {items.filter(item => 
                      item.toLowerCase().includes(customValue.toLowerCase()) &&
                      !activityItemsLower.includes(item.toLowerCase()) &&
                      !selected.some(s => s.toLowerCase() === item.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-500 italic font-normal">
                        Press Enter to add "{customValue}" (will preserve your typing)
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={handleAddCustom}
                disabled={!customValue.trim() || selected.includes(customValue.trim())}
                className={`px-3 py-1.5 rounded-full text-xs font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                  color === 'green' 
                    ? 'bg-green-700 text-white' 
                    : 'bg-indigo-700 text-white'
                }`}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddInput(false);
                  setCustomValue('');
                }}
                className="p-1 text-slate-400 hover:text-slate-600 transition-all rounded-full hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Activity Items Hint */}
      {activityItems.length > 0 && (
        <p className="text-[10px] text-blue-600 font-medium italic">
          💡 Items highlighted in blue are from the Field Officer's activity report
        </p>
      )}
    </div>
  );
};

export default MultiTagSelect;
