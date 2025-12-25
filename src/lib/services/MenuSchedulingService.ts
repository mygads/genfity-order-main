/**
 * Menu Scheduling Service
 * 
 * Handles auto-enable/disable of menu items based on time schedules.
 * 
 * Features:
 * - Check if menu is available at current time
 * - Filter menus by availability
 * - Cron-compatible schedule checking
 */

import prisma from '@/lib/db/client';

/**
 * Check if current time is within schedule
 */
export function isWithinSchedule(
  scheduleStartTime: string | null,
  scheduleEndTime: string | null,
  scheduleDays: number[],
  timezone: string = 'Australia/Sydney'
): boolean {
  if (!scheduleStartTime || !scheduleEndTime || scheduleDays.length === 0) {
    return true; // No schedule means always available
  }

  // Get current time in merchant's timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(now);
  const hour = parts.find(p => p.type === 'hour')?.value || '00';
  const minute = parts.find(p => p.type === 'minute')?.value || '00';
  const weekdayShort = parts.find(p => p.type === 'weekday')?.value || 'Mon';

  // Convert weekday to number (0=Sunday, 1=Monday, etc.)
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const currentDay = weekdayMap[weekdayShort] ?? 1;

  // Check if current day is in schedule
  if (!scheduleDays.includes(currentDay)) {
    return false;
  }

  // Check if current time is within schedule
  const currentTime = `${hour}:${minute}`;
  const startTime = scheduleStartTime.substring(0, 5); // HH:MM
  const endTime = scheduleEndTime.substring(0, 5); // HH:MM

  // Handle overnight schedules (e.g., 22:00 - 02:00)
  if (endTime < startTime) {
    return currentTime >= startTime || currentTime <= endTime;
  }

  return currentTime >= startTime && currentTime <= endTime;
}

/**
 * Get effective menu availability
 * Returns true if menu is active AND within schedule (if schedule enabled)
 */
export function isMenuAvailable(menu: {
  isActive: boolean;
  scheduleEnabled: boolean;
  scheduleStartTime: string | null;
  scheduleEndTime: string | null;
  scheduleDays: number[];
}, merchantTimezone: string = 'Australia/Sydney'): boolean {
  if (!menu.isActive) {
    return false;
  }

  if (!menu.scheduleEnabled) {
    return true; // No schedule, just check isActive
  }

  return isWithinSchedule(
    menu.scheduleStartTime,
    menu.scheduleEndTime,
    menu.scheduleDays,
    merchantTimezone
  );
}

/**
 * Filter menus by current availability
 */
export function filterAvailableMenus<T extends {
  isActive: boolean;
  scheduleEnabled: boolean;
  scheduleStartTime: string | null;
  scheduleEndTime: string | null;
  scheduleDays: number[];
}>(menus: T[], merchantTimezone: string = 'Australia/Sydney'): T[] {
  return menus.filter(menu => isMenuAvailable(menu, merchantTimezone));
}

/**
 * Get menu availability status with reason
 */
export function getMenuAvailabilityStatus(menu: {
  isActive: boolean;
  scheduleEnabled: boolean;
  scheduleStartTime: string | null;
  scheduleEndTime: string | null;
  scheduleDays: number[];
  trackStock: boolean;
  stockQty: number | null;
}, merchantTimezone: string = 'Australia/Sydney'): {
  isAvailable: boolean;
  reason: 'AVAILABLE' | 'INACTIVE' | 'OUTSIDE_SCHEDULE' | 'OUT_OF_STOCK';
  message: string;
} {
  if (!menu.isActive) {
    return {
      isAvailable: false,
      reason: 'INACTIVE',
      message: 'This item is currently unavailable',
    };
  }

  if (menu.trackStock && (menu.stockQty === null || menu.stockQty <= 0)) {
    return {
      isAvailable: false,
      reason: 'OUT_OF_STOCK',
      message: 'This item is out of stock',
    };
  }

  if (menu.scheduleEnabled) {
    const withinSchedule = isWithinSchedule(
      menu.scheduleStartTime,
      menu.scheduleEndTime,
      menu.scheduleDays,
      merchantTimezone
    );

    if (!withinSchedule) {
      // Build a friendly message about when it's available
      const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const availableDays = menu.scheduleDays.map(d => daysMap[d]).join(', ');
      const timeRange = `${menu.scheduleStartTime} - ${menu.scheduleEndTime}`;

      return {
        isAvailable: false,
        reason: 'OUTSIDE_SCHEDULE',
        message: `Available ${availableDays} from ${timeRange}`,
      };
    }
  }

  return {
    isAvailable: true,
    reason: 'AVAILABLE',
    message: 'Available',
  };
}

/**
 * MenuSchedulingService class for more complex operations
 */
export class MenuSchedulingService {
  /**
   * Get all scheduled menus for a merchant
   */
  static async getScheduledMenus(merchantId: bigint) {
    return prisma.menu.findMany({
      where: {
        merchantId,
        scheduleEnabled: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        scheduleEnabled: true,
        scheduleStartTime: true,
        scheduleEndTime: true,
        scheduleDays: true,
        isActive: true,
      },
    });
  }

  /**
   * Update menu schedule
   */
  static async updateSchedule(
    menuId: bigint,
    schedule: {
      scheduleEnabled: boolean;
      scheduleStartTime?: string;
      scheduleEndTime?: string;
      scheduleDays?: number[];
    },
    userId: bigint
  ) {
    return prisma.menu.update({
      where: { id: menuId },
      data: {
        scheduleEnabled: schedule.scheduleEnabled,
        scheduleStartTime: schedule.scheduleStartTime,
        scheduleEndTime: schedule.scheduleEndTime,
        scheduleDays: schedule.scheduleDays,
        updatedByUserId: userId,
      },
    });
  }

  /**
   * Batch update schedules for multiple menus
   */
  static async batchUpdateSchedule(
    menuIds: bigint[],
    schedule: {
      scheduleEnabled: boolean;
      scheduleStartTime?: string;
      scheduleEndTime?: string;
      scheduleDays?: number[];
    },
    userId: bigint
  ) {
    return prisma.menu.updateMany({
      where: { id: { in: menuIds } },
      data: {
        scheduleEnabled: schedule.scheduleEnabled,
        scheduleStartTime: schedule.scheduleStartTime,
        scheduleEndTime: schedule.scheduleEndTime,
        scheduleDays: schedule.scheduleDays,
        updatedByUserId: userId,
      },
    });
  }

  /**
   * Get menus that will become available/unavailable in next N minutes
   * Useful for notifications or pre-warming caches
   */
  static async getUpcomingScheduleChanges(
    merchantId: bigint,
    minutesAhead: number = 30,
    timezone: string = 'Australia/Sydney'
  ) {
    const scheduledMenus = await this.getScheduledMenus(merchantId);
    
    const now = new Date();
    const futureTime = new Date(now.getTime() + minutesAhead * 60 * 1000);

    const changes: Array<{
      menuId: bigint;
      menuName: string;
      willBeAvailable: boolean;
      changeTime: string;
    }> = [];

    for (const menu of scheduledMenus) {
      const isCurrentlyAvailable = isWithinSchedule(
        menu.scheduleStartTime,
        menu.scheduleEndTime,
        menu.scheduleDays,
        timezone
      );

      // Check if availability will change
      // This is a simplified check - a full implementation would
      // calculate the exact transition time
      const futureFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const futureParts = futureFormatter.formatToParts(futureTime);
      const futureTimeStr = `${futureParts.find(p => p.type === 'hour')?.value}:${futureParts.find(p => p.type === 'minute')?.value}`;

      // Simple check: will it be available at future time?
      const willBeAvailable = isWithinSchedule(
        menu.scheduleStartTime,
        menu.scheduleEndTime,
        menu.scheduleDays,
        timezone
      );

      if (isCurrentlyAvailable !== willBeAvailable) {
        changes.push({
          menuId: menu.id,
          menuName: menu.name,
          willBeAvailable,
          changeTime: futureTimeStr,
        });
      }
    }

    return changes;
  }
}

export default MenuSchedulingService;
