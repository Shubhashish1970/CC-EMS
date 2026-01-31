import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Phone, Users, Settings, BarChart3, Megaphone, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ROLE_CONFIG: Record<string, { shortLabel: string; icon: React.ReactNode }> = {
  cc_agent: { shortLabel: 'Agent', icon: <Phone size={14} /> },
  team_lead: { shortLabel: 'Team Lead', icon: <Users size={14} /> },
  mis_admin: { shortLabel: 'Admin', icon: <Settings size={14} /> },
  core_sales_head: { shortLabel: 'Sales Head', icon: <BarChart3 size={14} /> },
  marketing_head: { shortLabel: 'Marketing', icon: <Megaphone size={14} /> },
};

/**
 * Header role switcher: shows current role; if user has multiple roles, shows a dropdown to switch without logging out.
 */
const HeaderRoleSwitcher: React.FC = () => {
  const { user, activeRole, switchRole, hasMultipleRoles } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!user) return null;

  const currentRole = activeRole || user.role;
  const displayLabel = (ROLE_CONFIG[currentRole]?.shortLabel || currentRole).replace('_', ' ');
  const roleLabelUppercase = displayLabel.toUpperCase();

  if (!hasMultipleRoles || !user.roles || user.roles.length <= 1) {
    return (
      <span className="text-xs text-slate-400 uppercase">
        {roleLabelUppercase}
      </span>
    );
  }

  const handleSelect = (role: string) => {
    switchRole(role);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-slate-400 uppercase hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded-lg px-2 py-1 -my-1 transition-colors"
        title="Switch role"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{roleLabelUppercase}</span>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[160px] py-1 bg-white border border-slate-200 rounded-xl shadow-lg"
          role="listbox"
        >
          {user.roles.map((role) => {
            const config = ROLE_CONFIG[role] || { shortLabel: role.replace('_', ' '), icon: <User size={14} /> };
            const isActive = role === currentRole;
            return (
              <button
                key={role}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(role)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                  isActive ? 'bg-lime-50 text-lime-800' : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-slate-500">{config.icon}</span>
                <span>{config.shortLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HeaderRoleSwitcher;
