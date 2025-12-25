/**
 * Store Status Utility
 * 
 * @description
 * Unified utility functions for determining store open/close status.
 * Supports both manual override mode and schedule-based hours.
 * 
 * Mode Logic:
 * 1. If isManualOverride === true: Use isOpen value directly (force open/close)
 * 2. If isManualOverride === false: Follow opening hours schedule
 * 
 * Legacy Logic (when isManualOverride is undefined):
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
  isOpen?: boolean;              // Store open status
  isManualOverride?: boolean;    // When true, isOpen overrides schedule
  openingHours?: OpeningHour[];
  timezone?: string;             // Merchant timezone for accurate time comparison
}

export interface ModeSchedule {
  isEnabled: boolean;        // isDineInEnabled or isTakeawayEnabled
  scheduleStart?: string | null;  // e.g., "10:00"
  scheduleEnd?: string | null;    // e.g., "22:00"
}

// Per-day mode schedule from database
export interface PerDayModeSchedule {
  mode: 'DINE_IN' | 'TAKEAWAY';
  dayOfWeek: number;  // 0=Sunday, 6=Saturday
  startTime: string;  // HH:MM format
  endTime: string;    // HH:MM format
}

// Special hours for a specific date
export interface SpecialHour {
  date: string | Date;
  name?: string | null;
  isClosed: boolean;
  openTime?: string | null;
  closeTime?: string | null;
  isDineInEnabled?: boolean | null;
  isTakeawayEnabled?: boolean | null;
  dineInStartTime?: string | null;
  dineInEndTime?: string | null;
  takeawayStartTime?: string | null;
  takeawayEndTime?: string | null;
}

// Extended merchant status with new features
export interface ExtendedMerchantStatus extends MerchantStatus {
  isManualOverride?: boolean;    // When true, isOpen overrides schedule
  modeSchedules?: PerDayModeSchedule[];
  todaySpecialHour?: SpecialHour | null;
  // Global mode settings
  isDineInEnabled?: boolean;
  isTakeawayEnabled?: boolean;
  dineInScheduleStart?: string | null;
  dineInScheduleEnd?: string | null;
  takeawayScheduleStart?: string | null;
  takeawayScheduleEnd?: string | null;
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
 * Supports manual override mode and schedule-based hours
 * 
 * @param merchant - Object with isOpen, isManualOverride, openingHours, and optional timezone
 * @returns boolean - true if store is open, false if closed
 * 
 * Logic:
 * 1. If isManualOverride === true: Use isOpen value directly (force open/close)
 * 2. If isManualOverride === false or undefined: Check schedule
 *    - If no openingHours defined, use isOpen value (default true)
 *    - Otherwise check current time against schedule
 */
export function isStoreEffectivelyOpen(merchant: MerchantStatus): boolean {
  // Manual override mode - use isOpen value directly
  if (merchant.isManualOverride === true) {
    return merchant.isOpen ?? true;
  }
  
  // Auto mode - check opening hours schedule
  const openingHours = merchant.openingHours;
  if (!openingHours || openingHours.length === 0) {
    // No schedule defined, use isOpen value (default true)
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
 * Check if store should be open based on schedule only (ignoring manual override)
 * Used to determine if manual override is active
 */
export function isStoreOpenBySchedule(merchant: MerchantStatus): boolean {
  const openingHours = merchant.openingHours;
  if (!openingHours || openingHours.length === 0) {
    return true; // No schedule means always open
  }
  
  const { dayOfWeek, currentTime } = getCurrentTimeInTimezone(merchant.timezone);
  
  const todayHours = openingHours.find(h => h.dayOfWeek === dayOfWeek);
  
  if (!todayHours) {
    return false;
  }
  
  if (todayHours.isClosed) {
    return false;
  }
  
  if (todayHours.is24Hours) {
    return true;
  }
  
  if (todayHours.openTime && todayHours.closeTime) {
    return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
  }
  
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
 * @returns Object with status text, whether store is open, and if manual override is active
 */
export function getStoreStatusText(merchant: MerchantStatus): { 
  text: string; 
  isOpen: boolean; 
  isManualOverride: boolean;
  scheduledStatus: boolean; // What the status would be based on schedule
} {
  const isOpen = isStoreEffectivelyOpen(merchant);
  const scheduledStatus = isStoreOpenBySchedule(merchant);
  const isManualOverride = merchant.isManualOverride === true;
  
  if (!isOpen) {
    // Check if manually closed while schedule says open
    if (isManualOverride && scheduledStatus) {
      return { text: 'Manually Closed', isOpen: false, isManualOverride: true, scheduledStatus };
    }
    
    // Check if closed due to schedule
    const openingHours = merchant.openingHours;
    if (openingHours && openingHours.length > 0) {
      const { dayOfWeek } = getCurrentTimeInTimezone(merchant.timezone);
      const todayHours = openingHours.find(h => h.dayOfWeek === dayOfWeek);
      
      if (todayHours?.isClosed) {
        return { text: 'Closed Today', isOpen: false, isManualOverride, scheduledStatus };
      }
      
      return { text: 'Currently Closed', isOpen: false, isManualOverride, scheduledStatus };
    }
    
    return { text: 'Closed', isOpen: false, isManualOverride, scheduledStatus };
  }
  
  // Store is open
  if (isManualOverride && !scheduledStatus) {
    return { text: 'Manually Open', isOpen: true, isManualOverride: true, scheduledStatus };
  }
  
  return { text: 'Open Now', isOpen: true, isManualOverride, scheduledStatus };
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

// ============================================
// EXTENDED FUNCTIONS FOR PER-DAY SCHEDULES & SPECIAL HOURS
// ============================================

/**
 * Check if store is open considering special hours
 * Priority: Manual Override > Special Hours > Regular Opening Hours
 */
export function isStoreOpenWithSpecialHours(
  merchant: ExtendedMerchantStatus
): { isOpen: boolean; reason?: string; specialHourName?: string; isManualOverride?: boolean } {
  // Priority 1: Manual override - use isOpen value directly
  if (merchant.isManualOverride === true) {
    const isOpen = merchant.isOpen ?? true;
    const scheduledStatus = isStoreOpenBySchedule(merchant);
    
    if (isOpen && !scheduledStatus) {
      return { isOpen: true, reason: 'Manually Open', isManualOverride: true };
    }
    if (!isOpen && scheduledStatus) {
      return { isOpen: false, reason: 'Manually Closed', isManualOverride: true };
    }
    return { isOpen, isManualOverride: true };
  }

  const { dayOfWeek, currentTime } = getCurrentTimeInTimezone(merchant.timezone);

  // Priority 2: Check special hours for today
  if (merchant.todaySpecialHour) {
    const special = merchant.todaySpecialHour;
    
    // Completely closed for the day
    if (special.isClosed) {
      return { 
        isOpen: false, 
        reason: special.name ? `Closed for ${special.name}` : 'Closed Today',
        specialHourName: special.name || undefined
      };
    }

    // Check special opening hours
    if (special.openTime && special.closeTime) {
      const isWithin = currentTime >= special.openTime && currentTime <= special.closeTime;
      return { 
        isOpen: isWithin, 
        reason: isWithin ? `Open (${special.name || 'Special Hours'})` : 'Currently Closed',
        specialHourName: special.name || undefined
      };
    }
  }

  // Priority 3: Regular opening hours
  const openingHours = merchant.openingHours;
  if (openingHours && openingHours.length > 0) {
    const todayHours = openingHours.find(h => h.dayOfWeek === dayOfWeek);

    if (!todayHours) {
      return { isOpen: false, reason: 'Closed Today' };
    }

    if (todayHours.isClosed) {
      return { isOpen: false, reason: 'Closed Today' };
    }

    if (todayHours.is24Hours) {
      return { isOpen: true };
    }

    if (todayHours.openTime && todayHours.closeTime) {
      const isWithin = currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
      return { isOpen: isWithin, reason: isWithin ? undefined : 'Currently Closed' };
    }
  }

  // Default: open
  return { isOpen: true };
}

/**
 * Check if a mode is available considering per-day schedules and special hours
 * Priority: Special Hours > Per-Day Schedule > Global Schedule > Mode Enabled
 */
export function isModeAvailableWithSchedules(
  modeType: 'DINE_IN' | 'TAKEAWAY',
  merchant: ExtendedMerchantStatus
): { available: boolean; reason?: string; schedule?: { start: string; end: string } } {
  const { dayOfWeek, currentTime } = getCurrentTimeInTimezone(merchant.timezone);

  // Check global mode enabled
  const isEnabled = modeType === 'DINE_IN' 
    ? merchant.isDineInEnabled !== false 
    : merchant.isTakeawayEnabled !== false;

  if (!isEnabled) {
    return { 
      available: false, 
      reason: `${modeType === 'DINE_IN' ? 'Dine In' : 'Takeaway'} is not available` 
    };
  }

  // Priority 1: Check special hours mode override
  if (merchant.todaySpecialHour) {
    const special = merchant.todaySpecialHour;
    
    // Check if mode is disabled for this special day
    const modeEnabled = modeType === 'DINE_IN' 
      ? special.isDineInEnabled 
      : special.isTakeawayEnabled;
    
    if (modeEnabled === false) {
      return { 
        available: false, 
        reason: `${modeType === 'DINE_IN' ? 'Dine In' : 'Takeaway'} not available today` 
      };
    }

    // Check special mode schedule
    const startTime = modeType === 'DINE_IN' ? special.dineInStartTime : special.takeawayStartTime;
    const endTime = modeType === 'DINE_IN' ? special.dineInEndTime : special.takeawayEndTime;

    if (startTime && endTime) {
      const isWithin = currentTime >= startTime && currentTime <= endTime;
      return { 
        available: isWithin, 
        reason: isWithin ? undefined : `Available ${startTime} - ${endTime}`,
        schedule: { start: startTime, end: endTime }
      };
    }
  }

  // Priority 2: Check per-day mode schedule
  if (merchant.modeSchedules && merchant.modeSchedules.length > 0) {
    const daySchedule = merchant.modeSchedules.find(
      s => s.mode === modeType && s.dayOfWeek === dayOfWeek
    );

    if (daySchedule) {
      const isWithin = currentTime >= daySchedule.startTime && currentTime <= daySchedule.endTime;
      return { 
        available: isWithin, 
        reason: isWithin ? undefined : `Available ${daySchedule.startTime} - ${daySchedule.endTime}`,
        schedule: { start: daySchedule.startTime, end: daySchedule.endTime }
      };
    }
  }

  // Priority 3: Check global mode schedule
  const globalStart = modeType === 'DINE_IN' 
    ? merchant.dineInScheduleStart 
    : merchant.takeawayScheduleStart;
  const globalEnd = modeType === 'DINE_IN' 
    ? merchant.dineInScheduleEnd 
    : merchant.takeawayScheduleEnd;

  if (globalStart && globalEnd) {
    const isWithin = currentTime >= globalStart && currentTime <= globalEnd;
    return { 
      available: isWithin, 
      reason: isWithin ? undefined : `Available ${globalStart} - ${globalEnd}`,
      schedule: { start: globalStart, end: globalEnd }
    };
  }

  // No schedule restrictions - mode is available
  return { available: true };
}

/**
 * Get minutes until mode closes (considering all schedule types)
 */
export function getMinutesUntilModeCloses(
  modeType: 'DINE_IN' | 'TAKEAWAY',
  merchant: ExtendedMerchantStatus
): number | null {
  const { dayOfWeek, currentTime } = getCurrentTimeInTimezone(merchant.timezone);
  let endTime: string | null = null;

  // Priority 1: Special hours
  if (merchant.todaySpecialHour) {
    const special = merchant.todaySpecialHour;
    const specialEndTime = modeType === 'DINE_IN' ? special.dineInEndTime : special.takeawayEndTime;
    endTime = specialEndTime ?? null;
    if (!endTime) {
      endTime = special.closeTime ?? null;
    }
  }

  // Priority 2: Per-day schedule
  if (!endTime && merchant.modeSchedules && merchant.modeSchedules.length > 0) {
    const daySchedule = merchant.modeSchedules.find(
      s => s.mode === modeType && s.dayOfWeek === dayOfWeek
    );
    if (daySchedule) {
      endTime = daySchedule.endTime;
    }
  }

  // Priority 3: Global schedule
  if (!endTime) {
    endTime = modeType === 'DINE_IN' 
      ? merchant.dineInScheduleEnd || null 
      : merchant.takeawayScheduleEnd || null;
  }

  if (!endTime) return null;

  // Calculate minutes
  const [currentHour, currentMinute] = currentTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);

  const currentTotalMinutes = currentHour * 60 + currentMinute;
  const endTotalMinutes = endHour * 60 + endMinute;

  const minutesRemaining = endTotalMinutes - currentTotalMinutes;
  return minutesRemaining > 0 ? minutesRemaining : 0;
}

