'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef, useMemo } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { extractAddonDataFromMenus, type CachedAddonCategory } from '@/lib/utils/addonExtractor';

/**
 * GENFITY - Customer Data Context (SWR-Powered)
 * 
 * @description
 * Centralized data management for customer-facing pages using SWR.
 * Provides shared access to merchant, menus, categories, and addon data.
 * 
 * Benefits:
 * - Single source of truth across customer pages
 * - Automatic background refresh (stale-while-revalidate)
 * - Instant navigation (show cached data while revalidating)
 * - sessionStorage persistence for page refreshes
 * - Deduplication of requests
 * - Focus revalidation
 * 
 * @specification copilot-instructions.md - Performance Optimization
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  stockQty: number | null;
  categoryId: string | null;
  categories: Array<{ id: string; name: string }>;
  isActive: boolean;
  trackStock: boolean;
  isPromo?: boolean;
  isSpicy?: boolean;
  isBestSeller?: boolean;
  isSignature?: boolean;
  isRecommended?: boolean;
  promoPrice?: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
}

export interface OpeningHour {
  id: string;
  merchantId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MerchantInfo {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  description: string;
  isActive: boolean;
  isOpen?: boolean;
  timezone?: string;
  currency: string;
  enableTax: boolean;
  taxPercentage: number;
  enableServiceCharge?: boolean;
  serviceChargePercent?: number;
  enablePackagingFee?: boolean;
  packagingFeeAmount?: number;
  subscriptionStatus?: string;
  subscriptionSuspendReason?: string | null;
  isDineInEnabled?: boolean;
  isTakeawayEnabled?: boolean;
  dineInLabel?: string | null;
  takeawayLabel?: string | null;
  dineInScheduleStart?: string | null;
  dineInScheduleEnd?: string | null;
  takeawayScheduleStart?: string | null;
  takeawayScheduleEnd?: string | null;
  openingHours: OpeningHour[];
}

// Stock update for real-time updates
export interface StockUpdate {
  menuId: string;
  stockQty: number | null;
  addonItems?: Array<{
    id: string;
    stockQty: number | null;
  }>;
}

interface CustomerDataContextType {
  // Current merchant code
  merchantCode: string | null;
  
  // Core data
  merchantInfo: MerchantInfo | null;
  menus: MenuItem[];
  categories: Category[];
  addonCache: Record<string, CachedAddonCategory[]>;
  
  // Status flags
  isInitialized: boolean;
  isLoading: boolean;
  isValidating: boolean; // SWR: true when revalidating in background
  error: string | null;
  
  // Actions
  initializeData: (code: string, initialData?: InitialData) => void;
  refreshData: (code: string) => Promise<void>;
  clearData: () => void;
  updateStockFromSSE: (stockUpdates: StockUpdate[]) => void;
  
  // Preload helpers
  preloadViewOrder: () => void;
  preloadPayment: () => void;
}

interface InitialData {
  merchant?: MerchantInfo | null;
  categories?: Category[];
  menus?: MenuItem[];
}

// ============================================
// CONTEXT CREATION
// ============================================

const CustomerDataContext = createContext<CustomerDataContextType | undefined>(undefined);

// ============================================
// SESSION STORAGE HELPERS
// ============================================

const CACHE_KEYS = {
  merchant: (code: string) => `merchant_info_${code}`,
  menus: (code: string) => `menus_${code}`,
  categories: (code: string) => `categories_${code}`,
  addons: (code: string) => `addons_cache_${code}`,
};

/**
 * Read data from sessionStorage synchronously
 * Called during initialization to avoid loading flash
 */
function readFromSessionStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
  } catch (error) {
    console.warn(`Failed to read ${key} from sessionStorage:`, error);
  }
  return null;
}

/**
 * Write data to sessionStorage
 */
function writeToSessionStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Failed to write ${key} to sessionStorage:`, error);
  }
}

// ============================================
// SWR FETCHER
// ============================================

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
};

// ============================================
// SWR CONFIG
// ============================================

const SWR_CONFIG = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 10000, // Dedupe requests within 10s
  errorRetryCount: 3,
  errorRetryInterval: 5000,
};

// ============================================
// PROVIDER COMPONENT
// ============================================

interface CustomerDataProviderProps {
  children: ReactNode;
}

export function CustomerDataProvider({ children }: CustomerDataProviderProps) {
  const [merchantCode, setMerchantCode] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Store initial ISR data for SWR fallback
  const initialDataRef = useRef<InitialData | null>(null);
  const initializingRef = useRef<string | null>(null);

  // ============================================
  // SWR HOOKS - Only fetch when merchantCode is set
  // ============================================

  // Merchant Info SWR
  const {
    data: merchantData,
    error: merchantError,
    isValidating: isMerchantValidating,
    isLoading: isMerchantLoading,
  } = useSWR(
    merchantCode ? `/api/public/merchants/${merchantCode}` : null,
    fetcher,
    {
      ...SWR_CONFIG,
      refreshInterval: 30000, // Refresh every 30s
      fallbackData: initialDataRef.current?.merchant 
        ? { success: true, data: initialDataRef.current.merchant }
        : readFromSessionStorage<{ success: boolean; data: MerchantInfo }>(CACHE_KEYS.merchant(merchantCode || '')),
      onSuccess: (data) => {
        if (data?.success && merchantCode) {
          writeToSessionStorage(CACHE_KEYS.merchant(merchantCode), data);
        }
      },
    }
  );

  // Menus SWR
  const {
    data: menusData,
    error: menusError,
    isValidating: isMenusValidating,
    isLoading: isMenusLoading,
  } = useSWR(
    merchantCode ? `/api/public/merchants/${merchantCode}/menus` : null,
    fetcher,
    {
      ...SWR_CONFIG,
      refreshInterval: 15000, // Refresh every 15s (stock updates)
      fallbackData: initialDataRef.current?.menus?.length
        ? { success: true, data: initialDataRef.current.menus }
        : undefined,
      onSuccess: (data) => {
        if (data?.success && merchantCode) {
          const activeItems = processMenuData(data.data);
          writeToSessionStorage(CACHE_KEYS.menus(merchantCode), { success: true, data: activeItems });
          
          // Update addon cache
          const newAddonCache = extractAddonDataFromMenus(data.data);
          writeToSessionStorage(CACHE_KEYS.addons(merchantCode), newAddonCache);
        }
      },
    }
  );

  // Categories SWR
  const {
    data: categoriesData,
    error: categoriesError,
    isValidating: isCategoriesValidating,
    isLoading: isCategoriesLoading,
  } = useSWR(
    merchantCode ? `/api/public/merchants/${merchantCode}/categories` : null,
    fetcher,
    {
      ...SWR_CONFIG,
      refreshInterval: 60000, // Refresh every 60s (categories change less often)
      fallbackData: initialDataRef.current?.categories?.length
        ? { success: true, data: initialDataRef.current.categories }
        : undefined,
      onSuccess: (data) => {
        if (data?.success && merchantCode) {
          const sorted = data.data.sort((a: Category, b: Category) => a.sortOrder - b.sortOrder);
          writeToSessionStorage(CACHE_KEYS.categories(merchantCode), { success: true, data: sorted });
        }
      },
    }
  );

  // ============================================
  // PROCESS DATA
  // ============================================

  const processMenuData = useCallback((rawMenus: MenuItem[]): MenuItem[] => {
    return rawMenus
      .filter((item: MenuItem) => item.isActive)
      .map((item: MenuItem) => ({
        ...item,
        price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
      }));
  }, []);

  // Memoized processed data
  const merchantInfo = useMemo(() => {
    return merchantData?.success ? merchantData.data : null;
  }, [merchantData]);

  const menus = useMemo(() => {
    if (!menusData?.success) return [];
    return processMenuData(menusData.data);
  }, [menusData, processMenuData]);

  const categories = useMemo(() => {
    if (!categoriesData?.success) return [];
    return categoriesData.data.sort((a: Category, b: Category) => a.sortOrder - b.sortOrder);
  }, [categoriesData]);

  const addonCache = useMemo(() => {
    if (!menusData?.success) {
      // Fallback to sessionStorage
      if (merchantCode) {
        const cached = readFromSessionStorage<Record<string, CachedAddonCategory[]>>(
          CACHE_KEYS.addons(merchantCode)
        );
        return cached || {};
      }
      return {};
    }
    return extractAddonDataFromMenus(menusData.data);
  }, [menusData, merchantCode]);

  // Combined status
  const isLoading = isMerchantLoading || isMenusLoading || isCategoriesLoading;
  const isValidating = isMerchantValidating || isMenusValidating || isCategoriesValidating;
  const error = merchantError?.message || menusError?.message || categoriesError?.message || null;

  // ============================================
  // INITIALIZE DATA
  // ============================================

  const initializeData = useCallback((code: string, initialData?: InitialData) => {
    // Skip if already initialized for this merchant
    if (merchantCode === code && isInitialized) {
      console.log('✅ [CUSTOMER DATA] Already initialized for:', code);
      return;
    }
    
    // Skip if currently initializing
    if (initializingRef.current === code) {
      console.log('⏳ [CUSTOMER DATA] Already initializing for:', code);
      return;
    }
    
    initializingRef.current = code;
    console.log('🔄 [CUSTOMER DATA] Initializing with SWR for merchant:', code);

    // Store ISR initial data for SWR fallback
    if (initialData?.merchant || initialData?.menus?.length || initialData?.categories?.length) {
      console.log('✅ [CUSTOMER DATA] Using ISR initial data as SWR fallback');
      initialDataRef.current = initialData;
      
      // Also write to sessionStorage as backup
      if (initialData.merchant) {
        writeToSessionStorage(CACHE_KEYS.merchant(code), { success: true, data: initialData.merchant });
      }
      if (initialData.categories?.length) {
        writeToSessionStorage(CACHE_KEYS.categories(code), { success: true, data: initialData.categories });
      }
      if (initialData.menus?.length) {
        writeToSessionStorage(CACHE_KEYS.menus(code), { success: true, data: initialData.menus });
        const newAddonCache = extractAddonDataFromMenus(initialData.menus);
        writeToSessionStorage(CACHE_KEYS.addons(code), newAddonCache);
      }
    }

    // Set merchant code to trigger SWR hooks
    setMerchantCode(code);
    setIsInitialized(true);
    initializingRef.current = null;
  }, [merchantCode, isInitialized]);

  // ============================================
  // REFRESH DATA (Force Revalidate)
  // ============================================

  const refreshData = useCallback(async (code: string) => {
    if (!code) return;
    
    console.log('🔄 [CUSTOMER DATA] Force refreshing data...');
    
    // Trigger SWR revalidation for all keys
    await Promise.all([
      globalMutate(`/api/public/merchants/${code}`),
      globalMutate(`/api/public/merchants/${code}/menus`),
      globalMutate(`/api/public/merchants/${code}/categories`),
    ]);
    
    console.log('✅ [CUSTOMER DATA] Refresh triggered');
  }, []);

  // ============================================
  // CLEAR DATA
  // ============================================

  const clearData = useCallback(() => {
    setMerchantCode(null);
    setIsInitialized(false);
    initialDataRef.current = null;
  }, []);

  // ============================================
  // UPDATE STOCK FROM SSE (Real-time updates)
  // ============================================

  const updateStockFromSSE = useCallback((stockUpdates: StockUpdate[]) => {
    if (!merchantCode || !menusData?.success) return;
    
    console.log('📡 [SSE] Updating stock in real-time:', stockUpdates.length, 'items');
    
    // Update the SWR cache optimistically
    globalMutate(
      `/api/public/merchants/${merchantCode}/menus`,
      (currentData: { success: boolean; data: MenuItem[] } | undefined) => {
        if (!currentData?.success) return currentData;
        
        const updatedMenus = currentData.data.map(menu => {
          const update = stockUpdates.find(u => u.menuId === menu.id);
          if (update) {
            return { ...menu, stockQty: update.stockQty };
          }
          return menu;
        });
        
        return { ...currentData, data: updatedMenus };
      },
      { revalidate: false } // Don't refetch, just update cache
    );
  }, [merchantCode, menusData?.success]);

  // ============================================
  // PRELOAD HELPERS (Hover-based prefetch)
  // ============================================

  const preloadViewOrder = useCallback(() => {
    if (!merchantCode) return;
    // Prefetch is already done by SWR, but we can warm the cache
    console.log('📦 [PRELOAD] View order data ready (from SWR cache)');
  }, [merchantCode]);

  const preloadPayment = useCallback(() => {
    if (!merchantCode) return;
    // Payment page uses merchantInfo which is already cached
    console.log('💳 [PRELOAD] Payment data ready (from SWR cache)');
  }, [merchantCode]);

  // ============================================
  // CONTEXT VALUE
  // ============================================

  const value: CustomerDataContextType = {
    merchantCode,
    merchantInfo,
    menus,
    categories,
    addonCache,
    isInitialized,
    isLoading,
    isValidating,
    error,
    initializeData,
    refreshData,
    clearData,
    updateStockFromSSE,
    preloadViewOrder,
    preloadPayment,
  };

  return (
    <CustomerDataContext.Provider value={value}>
      {children}
    </CustomerDataContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================

/**
 * Hook to access customer data context with SWR
 * 
 * Usage:
 * ```tsx
 * const { 
 *   merchantInfo, 
 *   menus, 
 *   categories, 
 *   isInitialized,
 *   isValidating,  // true when background refresh is happening
 *   preloadViewOrder,
 *   preloadPayment,
 * } = useCustomerData();
 * 
 * // Initialize on mount (if not already initialized)
 * useEffect(() => {
 *   initializeData(merchantCode);
 * }, [merchantCode]);
 * 
 * // Data is instantly available if already cached
 * // isValidating tells you if fresh data is being fetched
 * if (!isInitialized) return <Skeleton />;
 * ```
 */
export function useCustomerData() {
  const context = useContext(CustomerDataContext);
  if (context === undefined) {
    throw new Error('useCustomerData must be used within a CustomerDataProvider');
  }
  return context;
}
