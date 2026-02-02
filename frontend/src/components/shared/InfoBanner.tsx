import React from 'react';
import { Info } from 'lucide-react';

export interface InfoBannerProps {
  /** Bold title line (optional) */
  title?: React.ReactNode;
  /** Body content. Use string or JSX. */
  children: React.ReactNode;
  /** Optional additional class for the wrapper */
  className?: string;
}

/**
 * Consistent blue info banner for contextual messages across the app.
 * Use for "User Management - Call Centre Only", reassign notes, and similar info.
 */
const InfoBanner: React.FC<InfoBannerProps> = ({ title, children, className = '' }) => {
  return (
    <div
      className={`bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 ${className}`}
      role="status"
      aria-live="polite"
    >
      <Info size={20} className="text-blue-600 flex-shrink-0 mt-0.5" aria-hidden />
      <div className="text-sm text-blue-900 min-w-0">
        {title != null && <p className="font-bold mb-1">{title}</p>}
        <div className="text-blue-700">{children}</div>
      </div>
    </div>
  );
};

export default InfoBanner;
