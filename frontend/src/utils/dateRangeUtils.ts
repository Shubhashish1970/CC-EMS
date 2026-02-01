/**
 * Shared date range utilities for the date picker used across:
 * ActivityEmsProgressView, ActivitySamplingView, AgentHistoryView, AgentAnalyticsView,
 * TaskList, TaskDashboardView, SamplingControlView, CallbackRequestView.
 *
 * Uses local date components (not toISOString()) so that YTD "1 Apr LY" is
 * consistently April 1st in all timezones.
 */

export type DateRangePreset =
  | 'Custom'
  | 'Today'
  | 'Yesterday'
  | 'This week (Sun - Today)'
  | 'Last 7 days'
  | 'Last week (Sun - Sat)'
  | 'Last 14 days'
  | 'Last 28 days'
  | 'Last 30 days'
  | 'Last 90 days'
  | 'YTD';

/** Format a Date as YYYY-MM-DD in local timezone (avoids UTC shift e.g. for YTD April 1). */
export function toISODateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format ISO date string for display (e.g. "31 Mar 2025"). */
export function formatPretty(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export interface PresetRangeResult {
  start: string;
  end: string;
}

/**
 * Get start/end dates for a preset. Uses local dates so YTD is always 1 Apr last year.
 * For Custom, pass the current custom range (customFrom, customTo); they are returned as-is.
 */
export function getPresetRange(
  preset: DateRangePreset,
  customFrom?: string,
  customTo?: string
): PresetRangeResult {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const day = today.getDay(); // 0 = Sunday

  switch (preset) {
    case 'Today':
      return { start: toISODateLocal(today), end: toISODateLocal(today) };
    case 'Yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: toISODateLocal(y), end: toISODateLocal(y) };
    }
    case 'This week (Sun - Today)': {
      const s = new Date(today);
      s.setDate(s.getDate() - day);
      return { start: toISODateLocal(s), end: toISODateLocal(today) };
    }
    case 'Last 7 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { start: toISODateLocal(s), end: toISODateLocal(today) };
    }
    case 'Last week (Sun - Sat)': {
      const lastSat = new Date(today);
      lastSat.setDate(lastSat.getDate() - (day + 1));
      const lastSun = new Date(lastSat);
      lastSun.setDate(lastSun.getDate() - 6);
      return { start: toISODateLocal(lastSun), end: toISODateLocal(lastSat) };
    }
    case 'Last 14 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 13);
      return { start: toISODateLocal(s), end: toISODateLocal(today) };
    }
    case 'Last 28 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 27);
      return { start: toISODateLocal(s), end: toISODateLocal(today) };
    }
    case 'Last 30 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { start: toISODateLocal(s), end: toISODateLocal(today) };
    }
    case 'Last 90 days': {
      const s = new Date(today);
      s.setDate(s.getDate() - 89);
      return { start: toISODateLocal(s), end: toISODateLocal(today) };
    }
    case 'YTD': {
      const apr1LY = new Date(today.getFullYear() - 1, 3, 1); // April 1, last year (month 3 = April)
      return { start: toISODateLocal(apr1LY), end: toISODateLocal(today) };
    }
    case 'Custom':
    default:
      return { start: customFrom ?? '', end: customTo ?? '' };
  }
}
