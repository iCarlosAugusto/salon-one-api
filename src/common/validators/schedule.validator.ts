import { parseTime, calculateDuration, getDayName, doTimeRangesOverlap, TimeRange } from '../utils/time.utils';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface ConflictResult {
  hasConflicts: boolean;
  conflicts: string[];
}

export interface ScheduleData {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface SalonOperatingHours {
  monday?: { open: string; close: string; closed: boolean };
  tuesday?: { open: string; close: string; closed: boolean };
  wednesday?: { open: string; close: string; closed: boolean };
  thursday?: { open: string; close: string; closed: boolean };
  friday?: { open: string; close: string; closed: boolean };
  saturday?: { open: string; close: string; closed: boolean };
  sunday?: { open: string; close: string; closed: boolean };
}

/**
 * Validate schedule times (start < end, duration constraints)
 */
export function validateScheduleTimes(schedule: ScheduleData): ValidationResult {
  const start = parseTime(schedule.startTime);
  const end = parseTime(schedule.endTime);

  // Start must be before end
  if (start >= end) {
    return {
      valid: false,
      error: 'Start time must be before end time',
    };
  }

  // Calculate duration
  const duration = calculateDuration(schedule.startTime, schedule.endTime);

  // Minimum shift duration (2 hours)
  if (duration < 120) {
    return {
      valid: false,
      error: 'Shift must be at least 2 hours long',
    };
  }

  // Maximum shift duration (12 hours)
  if (duration > 720) {
    return {
      valid: false,
      error: 'Shift cannot exceed 12 hours',
    };
  }

  return { valid: true };
}

/**
 * Validate schedule is within salon operating hours
 */
export function validateScheduleWithinSalonHours(
  schedule: ScheduleData,
  salonOperatingHours: SalonOperatingHours,
): ValidationResult {
  const dayName = getDayName(schedule.dayOfWeek) as keyof SalonOperatingHours;
  const salonHours = salonOperatingHours[dayName];

  // Check if salon has operating hours for this day
  if (!salonHours) {
    return {
      valid: false,
      error: `No operating hours defined for ${dayName}`,
    };
  }

  // Check if salon is closed that day
  if (salonHours.closed) {
    return {
      valid: false,
      error: `Salon is closed on ${dayName}`,
    };
  }

  const employeeStart = parseTime(schedule.startTime);
  const employeeEnd = parseTime(schedule.endTime);
  const salonOpen = parseTime(salonHours.open);
  const salonClose = parseTime(salonHours.close);

  // Check if employee start time is before salon opening
  if (employeeStart < salonOpen) {
    return {
      valid: false,
      error: `Employee start time (${schedule.startTime}) is before salon opens (${salonHours.open}) on ${dayName}`,
    };
  }

  // Check if employee end time is after salon closing
  if (employeeEnd > salonClose) {
    return {
      valid: false,
      error: `Employee end time (${schedule.endTime}) is after salon closes (${salonHours.close}) on ${dayName}`,
    };
  }

  return { valid: true };
}

/**
 * Detect schedule conflicts (overlapping times)
 */
export function detectScheduleConflicts(
  newSchedule: ScheduleData,
  existingSchedules: ScheduleData[],
): ConflictResult {
  const conflicts: string[] = [];

  for (const existing of existingSchedules) {
    // Check same day
    if (existing.dayOfWeek !== newSchedule.dayOfWeek) {
      continue;
    }

    // Skip if same schedule (for updates)
    if (existing.id && newSchedule.id && existing.id === newSchedule.id) {
      continue;
    }

    // Check time overlap
    const overlap = doTimeRangesOverlap(
      { start: newSchedule.startTime, end: newSchedule.endTime },
      { start: existing.startTime, end: existing.endTime },
    );

    if (overlap) {
      conflicts.push(
        `Overlaps with existing schedule: ${existing.startTime} - ${existing.endTime}`,
      );
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Validate service duration
 */
export function validateServiceDuration(duration: number): ValidationResult {
  if (duration < 5) {
    return {
      valid: false,
      error: 'Service duration must be at least 5 minutes',
    };
  }

  if (duration > 480) {
    return {
      valid: false,
      error: 'Service duration cannot exceed 8 hours (480 minutes)',
    };
  }

  // Duration should be in 5-minute increments
  if (duration % 5 !== 0) {
    return {
      valid: false,
      error: 'Service duration must be in 5-minute increments',
    };
  }

  return { valid: true };
}

/**
 * Validate service price
 */
export function validateServicePrice(price: number): ValidationResult {
  if (price <= 0) {
    return {
      valid: false,
      error: 'Service price must be greater than zero',
    };
  }

  if (price > 9999999.99) {
    return {
      valid: false,
      error: 'Service price is too high',
    };
  }

  return { valid: true };
}

