/**
 * Date and time utility functions
 */

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a time to a readable string
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format date and time together
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
}

/**
 * Get relative time string (e.g., "in 5 minutes", "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 1) return 'just now';
  
  if (diffMins > 0) {
    if (diffMins < 60) return `in ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    if (diffHours < 24) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
  } else {
    const absMins = Math.abs(diffMins);
    const absHours = Math.abs(diffHours);
    const absDays = Math.abs(diffDays);
    
    if (absMins < 60) return `${absMins} minute${absMins > 1 ? 's' : ''} ago`;
    if (absHours < 24) return `${absHours} hour${absHours > 1 ? 's' : ''} ago`;
    return `${absDays} day${absDays > 1 ? 's' : ''} ago`;
  }
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() < Date.now();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.getTime() > Date.now();
}

/**
 * Get duration in minutes between two dates
 */
export function getDurationMinutes(start: Date | string, end: Date | string): number {
  const startDate = typeof start === 'string' ? new Date(start) : start;
  const endDate = typeof end === 'string' ? new Date(end) : end;
  return Math.round((endDate.getTime() - startDate.getTime()) / 60000);
}

/**
 * Format duration in human readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${mins} min`;
}

/**
 * Generate time slots for a given day (as string times like "09:00")
 */
export function generateTimeSlots(
  date: Date,
  intervalMinutes: number = 30,
  startHour: number = 6,
  endHour: number = 23,
  includePast: boolean = true
): string[] {
  const slots: string[] = [];
  const start = new Date(date);
  start.setHours(startHour, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(endHour, 0, 0, 0);
  
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  while (start <= end) {
    if (includePast || !isToday || start > now) {
      const hours = start.getHours().toString().padStart(2, '0');
      const mins = start.getMinutes().toString().padStart(2, '0');
      slots.push(`${hours}:${mins}`);
    }
    start.setMinutes(start.getMinutes() + intervalMinutes);
  }
  
  return slots;
}

/**
 * Parse time string (e.g. "14:30" or "02:30 PM") into Date on baseDate
 */
export function parseTimeString(baseDate: Date, timeStr: string): Date {
  const d = new Date(baseDate);
  const trimmed = timeStr.trim();
  const hasAmPm = /am|pm/i.test(trimmed);

  if (hasAmPm) {
    const parts = trimmed.split(/\s+/);
    const timePart = parts[0] || '00:00';
    const ampm = (parts[1] || 'AM').toUpperCase();
    let [hours, minutes] = timePart.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    d.setHours(hours || 0, minutes || 0, 0, 0);
  } else {
    const [hours, minutes] = trimmed.split(':').map(Number);
    d.setHours(hours || 0, minutes || 0, 0, 0);
  }

  return d;
}

/**
 * Check if two time ranges overlap
 */
export function doTimeRangesOverlap(
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string
): boolean {
  const s1 = typeof start1 === 'string' ? new Date(start1) : start1;
  const e1 = typeof end1 === 'string' ? new Date(end1) : end1;
  const s2 = typeof start2 === 'string' ? new Date(start2) : start2;
  const e2 = typeof end2 === 'string' ? new Date(end2) : end2;
  
  return s1 < e2 && s2 < e1;
}
