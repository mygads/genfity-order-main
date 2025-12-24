/**
 * Store Status Utility
 * 
 * @description
 * Unified utility functions for determining store open/close status.
 * Combines both manual toggle (isOpen) AND schedule-based hours (openingHours).
 * 
 * Priority:
 * 1. If isOpen === false (manual close), store is CLOSED
 * 2. Otherwise, check opening hours schedule
 * 3. If no schedule defined, use isOpen value (default true)
 */

export interface OpeningHour {
  dayOfWeek: number;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed: boolean;
  is24Hours?: boolean;
}

export interface MerchantStatus {
  isOpen?: boolean;          // Manual toggle from database
  openingHours?: OpeningHour[];
  timezone?: string;         // Merchant timezone for accurate time comparison
}

export interface ModeSchedule {
  isEnabled: boolean;        // isDineInEnabled or isTakeawayEnabled
  scheduleStart?: string | null;  // e.g., "10:00"
  scheduleEnd?: string | null;    // e.g., "22:00"
}

/**
 * Get current time in merchant's timezone
 * 
 * @param timezone - Merchant's timezone (e.g., "Australia/Sydney")
 * @returns Object with current day of week and time string
 */
export function getCurrentTimeInTimezone(timezone?: string): { dayOfWeek: number; currentTime: string } {
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  const now = new Date();
  
  // Get day of week in merchant's timezone
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
  });
  const dayString = dayFormatter.format(now);
  const dayMap: Record<string, number> = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  const dayOfWeek = dayMap[dayString] ?? now.getDay();
  
  // Get time in merchant's timezone (HH:MM format)
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const currentTime = timeFormatter.format(now);
  
  return { dayOfWeek, currentTime };
}

/**
 * Check if store is effectively open
 * Combines manual toggle (isOpen) AND schedule-based hours
 * 
 * @param merchant - Object with isOpen, openingHours, and optional timezone
 * @returns boolean - true if store is open, false if closed
 * 
 * Logic:
 * 1. If isOpen === false (manual close), return false
 * 2. If no openingHours defined, use isOpen value (default true)
 * 3. Otherwise check current time against schedule
 */
export function isStoreEffectivelyOpen(merchant: MerchantStatus): boolean {
  // Priority 1: Manual override - if explicitly closed
  if (merchant.isOpen === false) {
    return false;
  }
  
  // Priority 2: Check opening hours schedule
  const openingHours = merchant.openingHours;
  if (!openingHours || openingHours.length === 0) {
    // No schedule defined, use manual toggle (default true)
    return merchant.isOpen ?? true;
  }
  
  const { dayOfWeek, currentTime } = getCurrentTimeInTimezone(merchant.timezone);
  
  const todayHours = openingHours.find(h => h.dayOfWeek === dayOfWeek);
  
  // No hours defined for today
  if (!todayHours) {
    return false;
  }
  
  // Today is explicitly marked as closed
  if (todayHours.isClosed) {
    return false;
  }
  
  // 24 hours operation
  if (todayHours.is24Hours) {
    return true;
  }
  
  // Check time range
  if (todayHours.openTime && todayHours.closeTime) {
    return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
  }
  
  // If no time range specified, assume open
  return true;
}

/**
 * Check if a specific mode (Dine-In or Takeaway) is currently available
 * 
 * @param mode - Mode schedule configuration
 * @param timezone - Merchant's timezone
 * @returns boolean - true if mode is available now
 * 
 * Logic:
 * 1. If mode is disabled (isEnabled === false), return false
 * 2. If no schedule defined, mode is available
 * 3. Otherwise check current time against mode schedule
 */
export function isModeAvailable(mode: ModeSchedule, timezone?: string): boolean {
  // Mode is disabled
  if (!mode.isEnabled) {
    return false;
  }
  
  // No schedule defined, mode is available
  if (!mode.scheduleStart || !mode.scheduleEnd) {
    return true;
  }
  
  const { currentTime } = getCurrentTimeInTimezone(timezone);
  
  return currentTime >= mode.scheduleStart && currentTime <= mode.scheduleEnd;
}

/**
 * Check if current time is within a schedule range
 * 
 * @param scheduleStart - Start time (HH:MM format)
 * @param scheduleEnd - End time (HH:MM format)
 * @param timezone - Merchant's timezone
 * @returns boolean - true if within schedule
 */
export function isWithinSchedule(
  scheduleStart?: string | null,
  scheduleEnd?: string | null,
  timezone?: string
): boolean {
  if (!scheduleStart || !scheduleEnd) {
    return true; // No schedule means always available
  }
  
  const { currentTime } = getCurrentTimeInTimezone(timezone);
  
  return currentTime >= scheduleStart && currentTime <= scheduleEnd;
}

/**
 * Get store status text for display
 * 
 * @param merchant - Merchant status object
 * @returns Object with status text and whether store is open
 */
export function getStoreStatusText(merchant: MerchantStatus): { text: string; isOpen: boolean } {
  const isOpen = isStoreEffectivelyOpen(merchant);
  
  if (!isOpen) {
    // Check if manually closed
    if (merchant.isOpen === false) {
      return { text: 'Temporarily Closed', isOpen: false };
    }
    
    // Check if closed due to schedule
    const openingHours = merchant.openingHours;
    if (openingHours && openingHours.length > 0) {
      const { dayOfWeek } = getCurrentTimeInTimezone(merchant.timezone);
      const todayHours = openingHours.find(h => h.dayOfWeek === dayOfWeek);
      
      if (todayHours?.isClosed) {
        return { text: 'Closed Today', isOpen: false };
      }
      
      return { text: 'Currently Closed', isOpen: false };
    }
    
    return { text: 'Closed', isOpen: false };
  }
  
  return { text: 'Open Now', isOpen: true };
}

/**
 * Calculate minutes until store closes
 * 
 * @param openingHours - Array of opening hours
 * @param timezone - Merchant's timezone
 * @returns Number of minutes until close, or null if not applicable
 */
export function getMinutesUntilClose(
  openingHours?: OpeningHour[],
  timezone?: string
): number | null {
  if (!openingHours || openingHours.length === 0) {
    return null;
  }

  const { dayOfWeek, currentTime } = getCurrentTimeInTimezone(timezone);
  const todayHours = openingHours.find(h => h.dayOfWeek === dayOfWeek);

  // No hours for today or closed
  if (!todayHours || todayHours.isClosed) {
    return null;
  }

  // 24 hours operation - no closing time
  if (todayHours.is24Hours) {
    return null;
  }

  // Check if we have closing time
  if (!todayHours.closeTime) {
    return null;
  }

  // Parse times
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const [closeHour, closeMinute] = todayHours.closeTime.split(':').map(Number);

  // Calculate minutes
  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const closeTotalMinutes = closeHour * 60 + closeMinute;

  const minutesRemaining = closeTotalMinutes - currentTotalMinutes;

  // If already past closing time, return 0
  return minutesRemaining > 0 ? minutesRemaining : 0;
}

/**
 * Get next opening time for today or tomorrow
 * 
 * @param openingHours - Array of opening hours
 * @param timezone - Merchant's timezone
 * @returns String describing when store opens next, or null
 */
export function getNextOpeningTime(
  openingHours?: OpeningHour[],
  timezone?: string
): string | null {
  if (!openingHours || openingHours.length === 0) {
    return null;
  }

  const { dayOfWeek, currentTime } = getCurrentTimeInTimezone(timezone);
  const todayHours = openingHours.find(h => h.dayOfWeek === dayOfWeek);

  // Check if opens later today
  if (todayHours && !todayHours.isClosed && todayHours.openTime) {
    if (currentTime < todayHours.openTime) {
      return `Opens at ${todayHours.openTime}`;
    }
  }

  // Find next open day
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (let i = 1; i <= 7; i++) {
    const nextDay = (dayOfWeek + i) % 7;
    const nextDayHours = openingHours.find(h => h.dayOfWeek === nextDay);
    
    if (nextDayHours && !nextDayHours.isClosed) {
      if (nextDayHours.is24Hours) {
        return i === 1 ? 'Opens tomorrow' : `Opens ${dayNames[nextDay]}`;
      }
      if (nextDayHours.openTime) {
        return i === 1 
          ? `Opens tomorrow at ${nextDayHours.openTime}` 
          : `Opens ${dayNames[nextDay]} at ${nextDayHours.openTime}`;
      }
    }
  }

  return null;
}

