/**
 * SpecialPriceService
 *
 * Service for managing special prices and computing active promo prices
 * for menu items. This replaces the legacy isPromo/promoPrice fields on Menu.
 *
 * SpecialPrice supports:
 * - Date range (startDate, endDate)
 * - Day of week filtering (applicableDays: 0=Sunday, 1=Monday, ..., 6=Saturday)
 * - Time-based promos (startTime, endTime) or all-day promos
 * - Linked to MenuBook for organized promo management
 */

import prisma from '@/lib/db/client';
import { decimalToNumber } from '@/lib/utils/serializer';

interface ActivePromoResult {
  menuId: bigint;
  promoPrice: number;
  specialPriceId: bigint;
  specialPriceName: string;
}

/**
 * Get the current time in HH:mm format
 */
function getCurrentTime(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Get today's date at midnight (for date comparisons)
 */
function getTodayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Check if a time string is within a time range
 * @param currentTime - Current time in HH:mm format
 * @param startTime - Start time in HH:mm format
 * @param endTime - End time in HH:mm format
 */
function isWithinTimeRange(
  currentTime: string,
  startTime: string | null,
  endTime: string | null
): boolean {
  if (!startTime || !endTime) return true; // If no time specified, treat as all day

  // Simple string comparison works for HH:mm format
  return currentTime >= startTime && currentTime <= endTime;
}

export class SpecialPriceService {
  /**
   * Get active promo price for a single menu item
   *
   * Checks:
   * - SpecialPrice.isActive = true
   * - Current date is within startDate and endDate
   * - Current day of week is in applicableDays
   * - If not isAllDay, current time is within startTime and endTime
   *
   * @param menuId - The menu item ID to check
   * @returns The promo price if active, null otherwise
   */
  static async getActivePromoPrice(menuId: bigint): Promise<number | null> {
    const result = await this.getActivePromoPrices([menuId]);
    return result.get(menuId.toString()) ?? null;
  }

  /**
   * Batch lookup for active promo prices for multiple menu items
   *
   * This is optimized to reduce database queries when checking
   * multiple menu items at once (e.g., menu listing page)
   *
   * @param menuIds - Array of menu item IDs to check
   * @returns Map of menuId (as string) to promo price
   */
  static async getActivePromoPrices(
    menuIds: bigint[]
  ): Promise<Map<string, number>> {
    if (menuIds.length === 0) {
      return new Map();
    }

    const today = getTodayDate();
    const currentDay = today.getDay(); // 0-6 (Sunday-Saturday)
    const currentTime = getCurrentTime();

    // Find all active special price items for the given menu IDs
    // that match the current date, day, and time criteria
    const activeItems = await prisma.specialPriceItem.findMany({
      where: {
        menuId: { in: menuIds },
        specialPrice: {
          isActive: true,
          startDate: { lte: today },
          endDate: { gte: today },
          applicableDays: { has: currentDay },
        },
      },
      include: {
        specialPrice: {
          select: {
            id: true,
            name: true,
            isAllDay: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    // Filter by time range (if not all-day) and build result map
    const result = new Map<string, number>();

    for (const item of activeItems) {
      const sp = item.specialPrice;

      // Skip if not within time range
      if (!sp.isAllDay) {
        if (!isWithinTimeRange(currentTime, sp.startTime, sp.endTime)) {
          continue;
        }
      }

      const menuIdStr = item.menuId.toString();

      // If multiple special prices apply to the same menu, take the lowest price
      const existingPrice = result.get(menuIdStr);
      const newPrice = decimalToNumber(item.promoPrice);

      if (existingPrice === undefined || newPrice < existingPrice) {
        result.set(menuIdStr, newPrice);
      }
    }

    return result;
  }

  /**
   * Get active promo prices for all menus of a merchant
   *
   * @param merchantId - The merchant ID
   * @returns Map of menuId (as string) to promo price
   */
  static async getActivePromoPricesForMerchant(
    merchantId: bigint
  ): Promise<Map<string, number>> {
    const today = getTodayDate();
    const currentDay = today.getDay();
    const currentTime = getCurrentTime();

    const activeItems = await prisma.specialPriceItem.findMany({
      where: {
        menu: {
          merchantId: merchantId,
          deletedAt: null,
        },
        specialPrice: {
          merchantId: merchantId,
          isActive: true,
          startDate: { lte: today },
          endDate: { gte: today },
          applicableDays: { has: currentDay },
        },
      },
      include: {
        specialPrice: {
          select: {
            id: true,
            isAllDay: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    const result = new Map<string, number>();

    for (const item of activeItems) {
      const sp = item.specialPrice;

      if (!sp.isAllDay) {
        if (!isWithinTimeRange(currentTime, sp.startTime, sp.endTime)) {
          continue;
        }
      }

      const menuIdStr = item.menuId.toString();
      const existingPrice = result.get(menuIdStr);
      const newPrice = decimalToNumber(item.promoPrice);

      if (existingPrice === undefined || newPrice < existingPrice) {
        result.set(menuIdStr, newPrice);
      }
    }

    return result;
  }

  /**
   * Get detailed active promo information for menu items
   *
   * @param menuIds - Array of menu item IDs to check
   * @returns Array of active promo details
   */
  static async getActivePromoDetails(
    menuIds: bigint[]
  ): Promise<ActivePromoResult[]> {
    if (menuIds.length === 0) {
      return [];
    }

    const today = getTodayDate();
    const currentDay = today.getDay();
    const currentTime = getCurrentTime();

    const activeItems = await prisma.specialPriceItem.findMany({
      where: {
        menuId: { in: menuIds },
        specialPrice: {
          isActive: true,
          startDate: { lte: today },
          endDate: { gte: today },
          applicableDays: { has: currentDay },
        },
      },
      include: {
        specialPrice: {
          select: {
            id: true,
            name: true,
            isAllDay: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    const results: ActivePromoResult[] = [];

    for (const item of activeItems) {
      const sp = item.specialPrice;

      if (!sp.isAllDay) {
        if (!isWithinTimeRange(currentTime, sp.startTime, sp.endTime)) {
          continue;
        }
      }

      results.push({
        menuId: item.menuId,
        promoPrice: decimalToNumber(item.promoPrice),
        specialPriceId: sp.id,
        specialPriceName: sp.name,
      });
    }

    return results;
  }

  /**
   * Check if a menu item currently has an active promo
   *
   * @param menuId - The menu item ID to check
   * @returns true if the menu has an active promo
   */
  static async hasActivePromo(menuId: bigint): Promise<boolean> {
    const price = await this.getActivePromoPrice(menuId);
    return price !== null;
  }

  /**
   * Get menu IDs that currently have active promos for a merchant
   *
   * @param merchantId - The merchant ID
   * @returns Set of menu IDs with active promos
   */
  static async getMenuIdsWithActivePromos(
    merchantId: bigint
  ): Promise<Set<string>> {
    const promoPrices = await this.getActivePromoPricesForMerchant(merchantId);
    return new Set(promoPrices.keys());
  }
}

export default SpecialPriceService;
