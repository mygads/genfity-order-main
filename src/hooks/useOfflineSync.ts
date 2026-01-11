/**
 * useOfflineSync Hook
 * 
 * Manages offline mode for POS system:
 * - Detects online/offline network status
 * - Caches cart data in localStorage for persistence
 * - Queues orders when offline
 * - Syncs pending orders when back online
 * - Provides status indicators
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================
// TYPES
// ============================================

export interface PendingOrder {
  id: string;
  createdAt: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber?: string;
  notes?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  items: {
    menuId: number | string;
    menuName: string;
    menuPrice: number;
    quantity: number;
    notes?: string;
    addons?: {
      addonItemId: number | string;
      addonName: string;
      addonPrice: number;
      quantity: number;
    }[];
  }[];
  totalAmount: number;
}

export interface OfflineSyncState {
  isOnline: boolean;
  pendingOrders: PendingOrder[];
  isSyncing: boolean;
  lastSyncTime: Date | null;
  syncError: string | null;
}

export interface UseOfflineSyncReturn extends OfflineSyncState {
  addPendingOrder: (order: Omit<PendingOrder, 'id' | 'createdAt'>) => string;
  removePendingOrder: (orderId: string) => void;
  syncPendingOrders: () => Promise<void>;
  clearSyncError: () => void;
  pendingCount: number;
}

// Storage keys
const STORAGE_KEY_PENDING = 'pos_pending_orders';
const STORAGE_KEY_LAST_SYNC = 'pos_last_sync_time';

// ============================================
// HOOK
// ============================================

export function useOfflineSync(): UseOfflineSyncReturn {
  // State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  // Ref to prevent multiple syncs
  const syncingRef = useRef<boolean>(false);

  // ========================================
  // INITIALIZATION
  // ========================================

  // Load pending orders from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const storedOrders = localStorage.getItem(STORAGE_KEY_PENDING);
      if (storedOrders) {
        const parsed = JSON.parse(storedOrders);
        if (Array.isArray(parsed)) {
          setPendingOrders(parsed);
        }
      }

      const storedLastSync = localStorage.getItem(STORAGE_KEY_LAST_SYNC);
      if (storedLastSync) {
        setLastSyncTime(new Date(storedLastSync));
      }
    } catch (error) {
      console.error('[OfflineSync] Error loading from localStorage:', error);
    }

    // Set initial online status
    setIsOnline(navigator.onLine);
  }, []);

  // Save pending orders to localStorage when they change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY_PENDING, JSON.stringify(pendingOrders));
    } catch (error) {
      console.error('[OfflineSync] Error saving to localStorage:', error);
    }
  }, [pendingOrders]);

  // ========================================
  // ONLINE/OFFLINE DETECTION
  // ========================================

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      console.log('[OfflineSync] Network: Online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[OfflineSync] Network: Offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && pendingOrders.length > 0 && !syncingRef.current) {
      // Small delay to ensure network is stable
      const timer = setTimeout(() => {
        syncPendingOrders();
      }, 2000);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // ========================================
  // PENDING ORDER MANAGEMENT
  // ========================================

  /**
   * Add a new pending order (when offline or as backup)
   */
  const addPendingOrder = useCallback((order: Omit<PendingOrder, 'id' | 'createdAt'>): string => {
    const id = `pending-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newOrder: PendingOrder = {
      ...order,
      id,
      createdAt: new Date().toISOString(),
    };

    setPendingOrders(prev => [...prev, newOrder]);
    console.log('[OfflineSync] Added pending order:', id);
    return id;
  }, []);

  /**
   * Remove a pending order (after successful sync or manual delete)
   */
  const removePendingOrder = useCallback((orderId: string) => {
    setPendingOrders(prev => prev.filter(o => o.id !== orderId));
    console.log('[OfflineSync] Removed pending order:', orderId);
  }, []);

  /**
   * Clear sync error
   */
  const clearSyncError = useCallback(() => {
    setSyncError(null);
  }, []);

  // ========================================
  // SYNC LOGIC
  // ========================================

  /**
   * Sync all pending orders to server
   */
  const syncPendingOrders = useCallback(async () => {
    if (syncingRef.current || pendingOrders.length === 0 || !isOnline) {
      return;
    }

    syncingRef.current = true;
    setIsSyncing(true);
    setSyncError(null);

    console.log('[OfflineSync] Starting sync of', pendingOrders.length, 'orders');

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setSyncError('Not authenticated');
      setIsSyncing(false);
      syncingRef.current = false;
      return;
    }

    const successfulIds: string[] = [];
    const failedOrders: { order: PendingOrder; error: string }[] = [];

    for (const order of pendingOrders) {
      try {
        const response = await fetch('/api/merchant/orders/pos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            orderType: order.orderType,
            tableNumber: order.tableNumber,
            notes: order.notes,
            customer: order.customer,
            items: order.items.map(item => ({
              menuId: item.menuId,
              quantity: item.quantity,
              notes: item.notes,
              addons: item.addons?.map(a => ({
                addonItemId: a.addonItemId,
                quantity: a.quantity,
              })),
            })),
            offlineOrderId: order.id, // Send original ID for tracking
            offlineCreatedAt: order.createdAt, // Send original timestamp
          }),
        });

        const data = await response.json();

        if (data.success) {
          successfulIds.push(order.id);
          console.log('[OfflineSync] Successfully synced order:', order.id);
        } else {
          failedOrders.push({ order, error: data.message || 'Unknown error' });
          console.error('[OfflineSync] Failed to sync order:', order.id, data.message);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Network error';
        failedOrders.push({ order, error: errorMessage });
        console.error('[OfflineSync] Error syncing order:', order.id, error);
      }
    }

    // Remove successful orders
    if (successfulIds.length > 0) {
      setPendingOrders(prev => prev.filter(o => !successfulIds.includes(o.id)));
    }

    // Update last sync time
    const now = new Date();
    setLastSyncTime(now);
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, now.toISOString());

    // Set error if any failed
    if (failedOrders.length > 0) {
      setSyncError(`Failed to sync ${failedOrders.length} order(s)`);
    }

    setIsSyncing(false);
    syncingRef.current = false;

    console.log('[OfflineSync] Sync complete. Success:', successfulIds.length, 'Failed:', failedOrders.length);
  }, [pendingOrders, isOnline]);

  return {
    isOnline,
    pendingOrders,
    isSyncing,
    lastSyncTime,
    syncError,
    addPendingOrder,
    removePendingOrder,
    syncPendingOrders,
    clearSyncError,
    pendingCount: pendingOrders.length,
  };
}

// ============================================
// CART PERSISTENCE HELPER
// ============================================

const STORAGE_KEY_CART = 'pos_cart_data';

export interface CartPersistData {
  items: unknown[];
  orderType: 'DINE_IN' | 'TAKEAWAY';
  tableNumber: string;
  orderNotes: string;
  customerInfo: {
    name?: string;
    phone?: string;
    email?: string;
  };
  savedAt: string;
}

/**
 * Save cart data to localStorage
 */
export function saveCartToStorage(data: Omit<CartPersistData, 'savedAt'>): void {
  if (typeof window === 'undefined') return;
  
  try {
    const persistData: CartPersistData = {
      ...data,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY_CART, JSON.stringify(persistData));
  } catch (error) {
    console.error('[OfflineSync] Error saving cart:', error);
  }
}

/**
 * Load cart data from localStorage
 */
export function loadCartFromStorage(): CartPersistData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CART);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('[OfflineSync] Error loading cart:', error);
  }
  return null;
}

/**
 * Clear cart data from localStorage
 */
export function clearCartFromStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(STORAGE_KEY_CART);
  } catch (error) {
    console.error('[OfflineSync] Error clearing cart:', error);
  }
}
