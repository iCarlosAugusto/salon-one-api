import { parseTime, formatTime, calculateDuration } from './time.utils';

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface SlotGenerationOptions {
  startTime: string;
  endTime: string;
  interval: number; // in minutes
}

/**
 * Generate all possible time slots within a time range
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  interval: number,
): string[] {
  const slots: string[] = [];
  let currentMinutes = parseTime(startTime);
  const endMinutes = parseTime(endTime);

  while (currentMinutes < endMinutes) {
    slots.push(formatTime(currentMinutes));
    currentMinutes += interval;
  }

  return slots;
}

/**
 * Get occupied time slots from appointments
 */
export function getOccupiedSlots(
  appointments: Array<{ startTime: string; endTime: string }>,
  interval: number,
): Set<string> {
  const occupied = new Set<string>();

  for (const appointment of appointments) {
    const startMinutes = parseTime(appointment.startTime);
    const endMinutes = parseTime(appointment.endTime);

    // Mark all slots from start to end as occupied
    let current = startMinutes;
    while (current < endMinutes) {
      occupied.add(formatTime(current));
      current += interval;
    }
  }

  return occupied;
}

/**
 * Calculate end time based on start time and duration
 */
export function calculateEndTime(startTime: string, duration: number): string {
  const startMinutes = parseTime(startTime);
  const endMinutes = startMinutes + duration;
  return formatTime(endMinutes);
}

/**
 * Check if enough consecutive slots are available for a service
 */
export function hasConsecutiveFreeSlots(
  allSlots: string[],
  occupiedSlots: Set<string>,
  startSlotIndex: number,
  requiredSlots: number,
): boolean {
  for (let i = 0; i < requiredSlots; i++) {
    const slotIndex = startSlotIndex + i;
    
    // Check if we have enough slots left
    if (slotIndex >= allSlots.length) {
      return false;
    }

    // Check if slot is occupied
    if (occupiedSlots.has(allSlots[slotIndex])) {
      return false;
    }
  }

  return true;
}

/**
 * Filter available slots that can accommodate the service duration
 */
export function getAvailableSlots(
  allSlots: string[],
  occupiedSlots: Set<string>,
  serviceDuration: number,
  interval: number,
): string[] {
  const available: string[] = [];
  const requiredSlots = Math.ceil(serviceDuration / interval);

  for (let i = 0; i < allSlots.length; i++) {
    const slot = allSlots[i];

    // Skip if this slot is occupied
    if (occupiedSlots.has(slot)) {
      continue;
    }

    // Check if there are enough consecutive free slots
    if (hasConsecutiveFreeSlots(allSlots, occupiedSlots, i, requiredSlots)) {
      available.push(slot);
    }
  }

  return available;
}

/**
 * Get detailed slot information (available/occupied)
 */
export function getDetailedSlots(
  allSlots: string[],
  occupiedSlots: Set<string>,
): TimeSlot[] {
  return allSlots.map((time) => ({
    time,
    available: !occupiedSlots.has(time),
  }));
}

/**
 * Calculate required slots for a service duration
 */
export function calculateRequiredSlots(duration: number, interval: number): number {
  return Math.ceil(duration / interval);
}

/**
 * Check if a time slot can accommodate a service
 */
export function canAccommodateService(
  slotTime: string,
  serviceDuration: number,
  maxEndTime: string,
): boolean {
  const endTime = calculateEndTime(slotTime, serviceDuration);
  const endMinutes = parseTime(endTime);
  const maxEndMinutes = parseTime(maxEndTime);

  return endMinutes <= maxEndMinutes;
}

