/**
 * GENFITY Global Cache Manager
 * 
 * A centralized cache invalidation system for SWR.
 * Handles related data invalidation when mutations occur.
 * 
 * @example
 * ```typescript
 * // After creating a new menu item
 * await cacheManager.invalidate('menu');
 * 
 * // After updating merchant profile
 * await cacheManager.invalidate('merchant');
 * 
 * // Invalidate multiple related caches
 * await cacheManager.invalidateMany(['menu', 'categories']);
 * ```
 */

import { mutate } from 'swr';

// Cache key prefixes for different data types
export const CACHE_KEYS = {
  // Dashboard
  DASHBOARD: '/api/admin/dashboard',
  
  // Merchant data
  MERCHANT_PROFILE: '/api/merchant/profile',
  MERCHANT_SETTINGS: '/api/merchant/settings',
  
  // Menu management
  MENU_LIST: '/api/merchant/menu',
  MENU_DETAIL: '/api/merchant/menu/',
  
  // Categories
  CATEGORIES: '/api/merchant/categories',
  ADDON_CATEGORIES: '/api/merchant/addon-categories',
  ADDON_ITEMS: '/api/merchant/addon-items',
  
  // Orders
  ORDERS_ACTIVE: '/api/merchant/orders/active',
  ORDERS_HISTORY: '/api/merchant/orders/history',
  ORDERS_QUEUE: '/api/merchant/orders/queue',
  
  // Staff
  STAFF: '/api/merchant/staff',
  
  // Revenue & Reports
  REVENUE: '/api/merchant/revenue',
  REPORTS: '/api/merchant/reports',
  
  // Super Admin
  ADMIN_MERCHANTS: '/api/admin/merchants',
  ADMIN_USERS: '/api/admin/users',
  ADMIN_ANALYTICS: '/api/admin/analytics',
} as const;

// Define relationships between cache types
const CACHE_RELATIONSHIPS: Record<string, string[]> = {
  // When menu changes, also update dashboard and categories (for counts)
  menu: [
    CACHE_KEYS.MENU_LIST,
    CACHE_KEYS.DASHBOARD,
    CACHE_KEYS.CATEGORIES,
  ],
  
  // When categories change, also update menu list (for category filters)
  categories: [
    CACHE_KEYS.CATEGORIES,
    CACHE_KEYS.MENU_LIST,
    CACHE_KEYS.DASHBOARD,
  ],
  
  // When addon categories change
  addonCategories: [
    CACHE_KEYS.ADDON_CATEGORIES,
    CACHE_KEYS.ADDON_ITEMS,
    CACHE_KEYS.MENU_LIST,
  ],
  
  // When addon items change
  addonItems: [
    CACHE_KEYS.ADDON_ITEMS,
    CACHE_KEYS.ADDON_CATEGORIES,
  ],
  
  // When orders change, update dashboard and order lists
  orders: [
    CACHE_KEYS.ORDERS_ACTIVE,
    CACHE_KEYS.ORDERS_HISTORY,
    CACHE_KEYS.ORDERS_QUEUE,
    CACHE_KEYS.DASHBOARD,
    CACHE_KEYS.REVENUE,
  ],
  
  // When staff changes
  staff: [
    CACHE_KEYS.STAFF,
    CACHE_KEYS.DASHBOARD,
  ],
  
  // When merchant profile changes
  merchant: [
    CACHE_KEYS.MERCHANT_PROFILE,
    CACHE_KEYS.MERCHANT_SETTINGS,
    CACHE_KEYS.DASHBOARD,
  ],
  
  // When revenue data changes
  revenue: [
    CACHE_KEYS.REVENUE,
    CACHE_KEYS.REPORTS,
    CACHE_KEYS.DASHBOARD,
  ],
  
  // Super admin - merchants
  adminMerchants: [
    CACHE_KEYS.ADMIN_MERCHANTS,
    CACHE_KEYS.DASHBOARD,
    CACHE_KEYS.ADMIN_ANALYTICS,
  ],
  
  // Super admin - users
  adminUsers: [
    CACHE_KEYS.ADMIN_USERS,
    CACHE_KEYS.DASHBOARD,
    CACHE_KEYS.ADMIN_ANALYTICS,
  ],
};

export type CacheType = keyof typeof CACHE_RELATIONSHIPS;

class CacheManager {
  private pendingInvalidations: Set<string> = new Set();
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceDelay = 100; // ms

  /**
   * Invalidate cache for a specific data type and all related caches
   * @param cacheType - The type of cache to invalidate
   */
  async invalidate(cacheType: CacheType): Promise<void> {
    const keysToInvalidate = CACHE_RELATIONSHIPS[cacheType] || [];
    
    for (const key of keysToInvalidate) {
      this.pendingInvalidations.add(key);
    }
    
    this.scheduleInvalidation();
  }

  /**
   * Invalidate multiple cache types at once
   * @param cacheTypes - Array of cache types to invalidate
   */
  async invalidateMany(cacheTypes: CacheType[]): Promise<void> {
    for (const type of cacheTypes) {
      const keysToInvalidate = CACHE_RELATIONSHIPS[type] || [];
      for (const key of keysToInvalidate) {
        this.pendingInvalidations.add(key);
      }
    }
    
    this.scheduleInvalidation();
  }

  /**
   * Invalidate a specific cache key directly
   * @param key - The cache key to invalidate
   */
  async invalidateKey(key: string): Promise<void> {
    this.pendingInvalidations.add(key);
    this.scheduleInvalidation();
  }

  /**
   * Invalidate all caches (use sparingly)
   */
  async invalidateAll(): Promise<void> {
    // Clear all SWR cache
    await mutate(
      () => true, // Match all keys
      undefined,
      { revalidate: true }
    );
  }

  /**
   * Invalidate cache with a pattern match
   * @param pattern - Regex pattern to match cache keys
   */
  async invalidatePattern(pattern: RegExp): Promise<void> {
    await mutate(
      (key) => typeof key === 'string' && pattern.test(key),
      undefined,
      { revalidate: true }
    );
  }

  /**
   * Debounced invalidation to batch multiple invalidations
   */
  private scheduleInvalidation(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      const keysToInvalidate = Array.from(this.pendingInvalidations);
      this.pendingInvalidations.clear();

      // Batch invalidate all pending keys
      await Promise.all(
        keysToInvalidate.map(key => 
          mutate(
            (cacheKey) => typeof cacheKey === 'string' && cacheKey.startsWith(key),
            undefined,
            { revalidate: true }
          )
        )
      );

      console.log('[CacheManager] Invalidated caches:', keysToInvalidate);
    }, this.debounceDelay);
  }

  /**
   * Prefetch data for a specific cache key
   * @param key - The cache key to prefetch
   * @param fetcher - The fetcher function
   */
  async prefetch<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
    try {
      const data = await fetcher();
      await mutate(key, data, { revalidate: false });
    } catch (error) {
      console.error('[CacheManager] Prefetch failed:', key, error);
    }
  }

  /**
   * Get the current cache state (for debugging)
   */
  getPendingInvalidations(): string[] {
    return Array.from(this.pendingInvalidations);
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Helper hooks for common patterns
export function useCacheInvalidation() {
  return {
    invalidateMenu: () => cacheManager.invalidate('menu'),
    invalidateCategories: () => cacheManager.invalidate('categories'),
    invalidateAddonCategories: () => cacheManager.invalidate('addonCategories'),
    invalidateAddonItems: () => cacheManager.invalidate('addonItems'),
    invalidateOrders: () => cacheManager.invalidate('orders'),
    invalidateStaff: () => cacheManager.invalidate('staff'),
    invalidateMerchant: () => cacheManager.invalidate('merchant'),
    invalidateRevenue: () => cacheManager.invalidate('revenue'),
    invalidateAdminMerchants: () => cacheManager.invalidate('adminMerchants'),
    invalidateAdminUsers: () => cacheManager.invalidate('adminUsers'),
    invalidateAll: () => cacheManager.invalidateAll(),
  };
}

export default cacheManager;
