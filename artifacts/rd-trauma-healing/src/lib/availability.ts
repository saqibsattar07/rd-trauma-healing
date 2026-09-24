import {
  addDays,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';

export interface AvailabilityConfig {
  /**
   * Available days of the week: 0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
   * By default, Rebecca accepts appointments Monday through Saturday.
   */
  workingDays: number[];
  /** Minimum notice in days (e.g., 1 day means tomorrow is the earliest available date) */
  minAdvanceDays: number;
  /** Maximum booking window in days (e.g., 60 days ahead) */
  maxAdvanceDays: number;
  /** Default available time slots for working days */
  defaultTimeSlots: string[];
  /** Specific dates that are blocked (holidays, personal time off) in YYYY-MM-DD format */
  blockedDates: string[];
  /** Custom time slots for specific dates in YYYY-MM-DD format */
  customSlotsByDate: Record<string, string[]>;
}

export const AVAILABILITY_CONFIG: AvailabilityConfig = {
  workingDays: [1, 2, 3, 4, 5, 6], // Monday through Saturday
  minAdvanceDays: 1, // Earliest request is tomorrow
  maxAdvanceDays: 60, // Up to 60 days in advance
  defaultTimeSlots: [
    '09:30',
    '11:00',
    '13:30',
    '15:00',
    '16:30',
    '18:00',
  ],
  blockedDates: [
    // Easily add holiday dates here e.g. '2026-12-25', '2026-01-01'
  ],
  customSlotsByDate: {
    // Example: '2026-10-15': ['10:00', '14:00']
  },
};

/**
 * Checks whether a given date is available for booking.
 */
export function isDateAvailable(date: Date, config: AvailabilityConfig = AVAILABILITY_CONFIG): boolean {
  const today = startOfDay(new Date());
  const target = startOfDay(date);
  const minDate = addDays(today, config.minAdvanceDays);
  const maxDate = addDays(today, config.maxAdvanceDays);

  // Must be between minDate and maxDate
  if (isBefore(target, minDate) || isAfter(target, maxDate)) {
    return false;
  }

  // Check if date is in blocked list
  const dateStr = format(target, 'yyyy-MM-dd');
  if (config.blockedDates.includes(dateStr)) {
    return false;
  }

  // Check if day of week is one of the working days
  const dayOfWeek = target.getDay();
  return config.workingDays.includes(dayOfWeek);
}

/**
 * Returns available time slots for a given date.
 */
export function getTimeSlotsForDate(date: Date, config: AvailabilityConfig = AVAILABILITY_CONFIG): string[] {
  if (!isDateAvailable(date, config)) {
    return [];
  }

  const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
  if (config.customSlotsByDate[dateStr]) {
    return config.customSlotsByDate[dateStr];
  }

  return config.defaultTimeSlots;
}

/**
 * Formats a date for clear patient display (e.g., "Thursday, 15 October 2026").
 */
export function formatDateDisplay(date: Date | null): string {
  if (!date) return '';
  return format(date, 'EEEE, d MMMM yyyy');
}

/**
 * Formats a 24-hour time string into a friendly format (e.g., "09:30" -> "9:30 AM").
 */
export function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = String(minutes).padStart(2, '0');
  return `${displayHours}:${displayMinutes} ${period}`;
}
