/**
 * Time utility functions for working with time strings and durations
 */

export interface TimeRange {
  start: string;
  end: string;
}

/**
 * Parse time string (HH:MM) to minutes since midnight
 */
export function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Format minutes since midnight to time string (HH:MM)
 */
export function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Check if a time is within a range
 */
export function isTimeWithinRange(
  time: string,
  startRange: string,
  endRange: string,
): boolean {
  const timeMinutes = parseTime(time);
  const startMinutes = parseTime(startRange);
  const endMinutes = parseTime(endRange);

  return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
}

/**
 * Check if two time ranges overlap
 */
export function doTimeRangesOverlap(
  range1: TimeRange,
  range2: TimeRange,
): boolean {
  const start1 = parseTime(range1.start);
  const end1 = parseTime(range1.end);
  const start2 = parseTime(range2.start);
  const end2 = parseTime(range2.end);

  return (
    (start1 >= start2 && start1 < end2) ||
    (end1 > start2 && end1 <= end2) ||
    (start1 <= start2 && end1 >= end2)
  );
}

/**
 * Calculate duration between two times in minutes
 */
export function calculateDuration(startTime: string, endTime: string): number {
  return parseTime(endTime) - parseTime(startTime);
}

/**
 * Get day name from day number
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayOfWeek];
}

/**
 * Get day number from day name
 */
export function getDayNumber(dayName: string): number {
  const days: Record<string, number> = {
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  };
  return days[dayName.toLowerCase()];
}

/**
 * Validate time format (HH:MM)
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

