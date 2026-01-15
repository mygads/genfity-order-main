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
    type?: 'MENU' | 'CUSTOM';
    menuId: number | string;
    menuName: string;
    menuPrice: number;
    customName?: string;
    customPrice?: number;
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
  updatePendingOrder: (orderId: string, order: Omit<PendingOrder, 'id' | 'createdAt'>) => void;
  removePendingOrder: (orderId: string) => void;
  syncPendingOrders: () => Promise<void>;
  clearSyncError: () => void;
  syncConflicts: OfflineOrderSyncConflict[];
  clearSyncConflicts: () => void;
  applyConflictResolutions: (resolutions: OfflineOrderConflictResolution[]) => void;
  pendingCount: number;
}

export interface OfflineSyncOptions {
  merchantId?: string | null;
  pendingOrdersExpiryDays?: number;
}

export type OfflineOrderConflictKind =
  | 'MENU_MISSING'
  | 'MENU_INACTIVE'
  | 'ADDON_MISSING'
  | 'PRICE_CHANGED';

export interface OfflineOrderItemConflict {
  kind: OfflineOrderConflictKind;
  menuId: string;
  menuName: string;
  addonItemId?: string;
  addonName?: string;
  localPrice?: number;
  serverPrice?: number;
  message: string;
}

export interface OfflineOrderSyncConflict {
  orderId: string;
  createdAt: string;
  orderType: 'DINE_IN' | 'TAKEAWAY';
  conflicts: OfflineOrderItemConflict[];
}

export type OfflineOrderConflictResolutionAction =
  | { action: 'REMOVE_ITEM'; menuId: string }
  | { action: 'REMOVE_ADDON'; menuId: string; addonItemId: string }
  | { action: 'USE_SERVER_PRICE'; menuId: string; serverPrice: number };

export interface OfflineOrderConflictResolution {
  orderId: string;
  actions: OfflineOrderConflictResolutionAction[];
}

const STORAGE_NAMESPACE = 'pos';
const CART_SCHEMA_VERSION = 2;
const DEFAULT_PENDING_EXPIRY_DAYS = 7;

function buildStorageKey(base: string, merchantId?: string | null): string {
  const scope = merchantId || 'global';
  return `${STORAGE_NAMESPACE}:${base}:${scope}:v${CART_SCHEMA_VERSION}`;
}

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function isExpired(isoDate: string, expiryDays: number): boolean {
  const createdAt = new Date(isoDate);
  if (Number.isNaN(createdAt.getTime())) return false;
  const cutoff = Date.now() - expiryDays * 24 * 60 * 60 * 1000;
  return createdAt.getTime() < cutoff;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function calculatePendingOrderTotal(order: Pick<PendingOrder, 'items'>): number {
  const total = order.items.reduce((sum, item) => {
    const itemBase = item.menuPrice * item.quantity;
    const addonsTotal = (item.addons || []).reduce((addonSum, addon) => addonSum + addon.addonPrice * addon.quantity, 0);
    return sum + itemBase + addonsTotal;
  }, 0);
  return round2(total);
}

function normalizePendingItems(items: PendingOrder['items']): PendingOrder['items'] {
  // Smart merge: same menuId + notes + same addons => combine quantities.
  const keyForItem = (item: PendingOrder['items'][number]): string => {
    const kind = item.type || 'MENU';
    if (kind === 'CUSTOM') {
      const name = (item.customName || item.menuName || '').trim();
      const price = typeof item.customPrice === 'number' ? item.customPrice : item.menuPrice;
      return `CUSTOM::${name}::${price}::${item.notes || ''}`;
    }

    const normalizedAddons = (item.addons || [])
      .slice()
      .sort((a, b) => a.addonItemId.toString().localeCompare(b.addonItemId.toString()))
      .map(a => `${a.addonItemId}:${a.quantity}`)
      .join('|');
    return `MENU::${item.menuId.toString()}::${item.notes || ''}::${normalizedAddons}`;
  };

  const merged = new Map<string, PendingOrder['items'][number]>();

  for (const item of items) {
    const key = keyForItem(item);
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        ...item,
        addons: (item.addons || []).map(a => ({ ...a })),
      });
      continue;
    }

    existing.quantity += item.quantity;
    // Merge addon quantities for same addon ids
    const existingAddons = existing.addons || [];
    const addonMap = new Map(existingAddons.map(a => [a.addonItemId.toString(), a] as const));
    for (const addon of item.addons || []) {
      const existingAddon = addonMap.get(addon.addonItemId.toString());
      if (existingAddon) {
        existingAddon.quantity += addon.quantity;
      } else {
        (existing.addons ||= []).push({ ...addon });
      }
    }
  }

  return Array.from(merged.values());
}

// ============================================
// HOOK
// ============================================

export function useOfflineSync(options: OfflineSyncOptions = {}): UseOfflineSyncReturn {
  const { merchantId = null, pendingOrdersExpiryDays = DEFAULT_PENDING_EXPIRY_DAYS } = options;

  // State
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncConflicts, setSyncConflicts] = useState<OfflineOrderSyncConflict[]>([]);
  
  // Ref to prevent multiple syncs
  const syncingRef = useRef<boolean>(false);

  // ========================================
  // INITIALIZATION
  // ========================================

  // Load pending orders from localStorage on mount / merchant change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const pendingKey = buildStorageKey('pending_orders', merchantId);
      const lastSyncKey = buildStorageKey('last_sync_time', merchantId);

      const scoped = safeParseJson<PendingOrder[]>(localStorage.getItem(pendingKey));
      if (scoped && Array.isArray(scoped)) {
        const cleaned = scoped.filter(o => !isExpired(o.createdAt, pendingOrdersExpiryDays));
        setPendingOrders(cleaned);
        if (cleaned.length !== scoped.length) {
          localStorage.setItem(pendingKey, JSON.stringify(cleaned));
        }
      } else {
        // One-time migration from legacy unscoped key
        const legacy = safeParseJson<PendingOrder[]>(localStorage.getItem('pos_pending_orders'));
        if (legacy && Array.isArray(legacy) && legacy.length > 0) {
          const cleaned = legacy.filter(o => !isExpired(o.createdAt, pendingOrdersExpiryDays));
          setPendingOrders(cleaned);
          localStorage.setItem(pendingKey, JSON.stringify(cleaned));
          localStorage.removeItem('pos_pending_orders');
        }
      }

      const storedLastSync = localStorage.getItem(lastSyncKey) || localStorage.getItem('pos_last_sync_time');
      if (storedLastSync) setLastSyncTime(new Date(storedLastSync));
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
      const pendingKey = buildStorageKey('pending_orders', merchantId);
      const cleaned = pendingOrders.filter(o => !isExpired(o.createdAt, pendingOrdersExpiryDays));

      if (cleaned.length !== pendingOrders.length) {
        setPendingOrders(cleaned);
        return;
      }

      localStorage.setItem(pendingKey, JSON.stringify(cleaned));
    } catch (error) {
      console.error('[OfflineSync] Error saving to localStorage:', error);
    }
  }, [pendingOrders, merchantId, pendingOrdersExpiryDays]);

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
    const normalizedItems = normalizePendingItems(order.items);
    const newOrder: PendingOrder = {
      ...order,
      id,
      createdAt: new Date().toISOString(),
      items: normalizedItems,
      totalAmount: calculatePendingOrderTotal({ items: normalizedItems }),
    };

    setPendingOrders(prev => [...prev, newOrder]);
    console.log('[OfflineSync] Added pending order:', id);
    return id;
  }, []);

  /**
   * Update an existing pending order (manual edit)
   */
  const updatePendingOrder = useCallback((orderId: string, order: Omit<PendingOrder, 'id' | 'createdAt'>) => {
    setPendingOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const normalizedItems = normalizePendingItems(order.items);
      return {
        ...o,
        ...order,
        items: normalizedItems,
        totalAmount: round2(order.totalAmount ?? calculatePendingOrderTotal({ items: normalizedItems })),
      };
    }));
    console.log('[OfflineSync] Updated pending order:', orderId);
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

  const clearSyncConflicts = useCallback(() => {
    setSyncConflicts([]);
  }, []);

  const applyConflictResolutions = useCallback((resolutions: OfflineOrderConflictResolution[]) => {
    setPendingOrders(prev => {
      const next = prev.map(order => {
        const resolution = resolutions.find(r => r.orderId === order.id);
        if (!resolution) return order;

        const actionsByMenuId = new Map<string, OfflineOrderConflictResolutionAction[]>();
        for (const action of resolution.actions) {
          const key = action.menuId;
          actionsByMenuId.set(key, [...(actionsByMenuId.get(key) || []), action]);
        }

        const updatedItems = order.items
          .map(item => {
            const menuId = item.menuId.toString();
            const actions = actionsByMenuId.get(menuId) || [];

            if (actions.some(a => a.action === 'REMOVE_ITEM')) return null;

            const updated = { ...item, addons: (item.addons || []).map(a => ({ ...a })) };

            for (const act of actions) {
              if (act.action === 'USE_SERVER_PRICE') {
                updated.menuPrice = act.serverPrice;
              }
              if (act.action === 'REMOVE_ADDON') {
                updated.addons = updated.addons.filter(a => a.addonItemId.toString() !== act.addonItemId);
              }
            }

            return updated;
          })
          .filter(Boolean) as PendingOrder['items'];

        const normalizedItems = normalizePendingItems(updatedItems);
        const totalAmount = calculatePendingOrderTotal({ items: normalizedItems });

        return {
          ...order,
          items: normalizedItems,
          totalAmount,
        };
      });
      return next;
    });

    setSyncConflicts([]);
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

    // Clear previous conflicts
    setSyncConflicts([]);

    // Preflight: fetch latest menu snapshot to detect offline conflicts
    type MenuSnapshotItem = {
      id: number | string;
      name: string;
      price: number;
      promoPrice: number | null;
      isActive: boolean;
      addonCategories: Array<{ addonItems: Array<{ id: number | string; name: string; price: number; isActive: boolean }> }>;
    };
    type MenuSnapshot = { menuItems: MenuSnapshotItem[] };

    const menuMap = new Map<string, { name: string; price: number; isActive: boolean }>();
    const addonMap = new Map<string, { name: string; price: number; isActive: boolean }>();

    try {
      const menuRes = await fetch('/api/merchant/pos/menu', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const menuData = await menuRes.json();
      if (menuRes.ok && menuData?.success && menuData?.data) {
        const snapshot = menuData.data as MenuSnapshot;
        for (const item of snapshot.menuItems || []) {
          const effectivePrice = (item.promoPrice ?? item.price) as number;
          menuMap.set(item.id.toString(), {
            name: item.name,
            price: round2(effectivePrice),
            isActive: Boolean(item.isActive),
          });
          for (const cat of item.addonCategories || []) {
            for (const addon of cat.addonItems || []) {
              addonMap.set(addon.id.toString(), {
                name: addon.name,
                price: round2(addon.price),
                isActive: Boolean(addon.isActive),
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('[OfflineSync] Menu snapshot fetch failed, skipping preflight conflict detection:', error);
    }

    const successfulIds: string[] = [];
    const failedOrders: { order: PendingOrder; error: string }[] = [];

    const conflictsFound: OfflineOrderSyncConflict[] = [];

    for (const order of pendingOrders) {
      try {
        // Detect conflicts if we have menu snapshot
        if (menuMap.size > 0) {
          const orderConflicts: OfflineOrderItemConflict[] = [];

          for (const item of order.items) {
            if ((item.type || 'MENU') === 'CUSTOM') {
              continue;
            }
            const menuId = item.menuId.toString();
            const menu = menuMap.get(menuId);

            if (!menu) {
              orderConflicts.push({
                kind: 'MENU_MISSING',
                menuId,
                menuName: item.menuName,
                message: `Menu item "${item.menuName}" is no longer available (missing).`,
              });
              continue;
            }

            if (!menu.isActive) {
              orderConflicts.push({
                kind: 'MENU_INACTIVE',
                menuId,
                menuName: menu.name,
                message: `Menu item "${menu.name}" is no longer active.`,
              });
            }

            if (Math.abs(menu.price - item.menuPrice) > 0.001) {
              orderConflicts.push({
                kind: 'PRICE_CHANGED',
                menuId,
                menuName: menu.name,
                localPrice: item.menuPrice,
                serverPrice: menu.price,
                message: `Price changed for "${menu.name}" (${item.menuPrice} → ${menu.price}).`,
              });
            }

            for (const addon of item.addons || []) {
              const addonId = addon.addonItemId.toString();
              const serverAddon = addonMap.get(addonId);
              if (!serverAddon || !serverAddon.isActive) {
                orderConflicts.push({
                  kind: 'ADDON_MISSING',
                  menuId,
                  menuName: menu.name,
                  addonItemId: addonId,
                  addonName: addon.addonName,
                  message: `Addon "${addon.addonName}" is no longer available.`,
                });
              }
            }
          }

          if (orderConflicts.length > 0) {
            conflictsFound.push({
              orderId: order.id,
              createdAt: order.createdAt,
              orderType: order.orderType,
              conflicts: orderConflicts,
            });
            // Skip syncing this order until conflicts are resolved
            continue;
          }
        }

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
            items: order.items.map(item => {
              const kind = item.type || 'MENU';
              if (kind === 'CUSTOM') {
                return {
                  type: 'CUSTOM' as const,
                  customName: (item.customName || item.menuName || '').trim(),
                  customPrice: typeof item.customPrice === 'number' ? item.customPrice : item.menuPrice,
                  quantity: item.quantity,
                  notes: item.notes,
                };
              }

              return {
                type: 'MENU' as const,
                menuId: item.menuId,
                quantity: item.quantity,
                notes: item.notes,
                addons: item.addons?.map(a => ({
                  addonItemId: a.addonItemId,
                  quantity: a.quantity,
                })),
              };
            }),
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

    if (conflictsFound.length > 0) {
      setSyncConflicts(conflictsFound);
      setSyncError('Conflicts detected in pending orders. Review required.');
    }

    // Remove successful orders
    if (successfulIds.length > 0) {
      setPendingOrders(prev => prev.filter(o => !successfulIds.includes(o.id)));
    }

    // Update last sync time (only when we actually attempted sync)
    if (successfulIds.length > 0 || failedOrders.length > 0) {
      const now = new Date();
      setLastSyncTime(now);
      const lastSyncKey = buildStorageKey('last_sync_time', merchantId);
      localStorage.setItem(lastSyncKey, now.toISOString());
      localStorage.removeItem('pos_last_sync_time');
    }

    // Set error if any failed (keep conflict error if present)
    if (failedOrders.length > 0 && conflictsFound.length === 0) {
      setSyncError(`Failed to sync ${failedOrders.length} order(s)`);
    }

    setIsSyncing(false);
    syncingRef.current = false;

    console.log('[OfflineSync] Sync complete. Success:', successfulIds.length, 'Failed:', failedOrders.length);
  }, [pendingOrders, isOnline, merchantId]);

  return {
    isOnline,
    pendingOrders,
    isSyncing,
    lastSyncTime,
    syncError,
    addPendingOrder,
    updatePendingOrder,
    removePendingOrder,
    syncPendingOrders,
    clearSyncError,
    syncConflicts,
    clearSyncConflicts,
    applyConflictResolutions,
    pendingCount: pendingOrders.length,
  };
}

// ============================================
// CART PERSISTENCE HELPER
// ============================================

const LEGACY_STORAGE_KEY_CART = 'pos_cart_data';

export interface CartPersistData {
  version: number;
  merchantId?: string | null;
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
export function saveCartToStorage(
  data: Omit<CartPersistData, 'savedAt' | 'version'>,
  merchantId?: string | null
): void {
  if (typeof window === 'undefined') return;
  
  try {
    const persistData: CartPersistData = {
      ...data,
      version: CART_SCHEMA_VERSION,
      merchantId: merchantId || null,
      savedAt: new Date().toISOString(),
    };
    const key = buildStorageKey('cart_data', merchantId);
    localStorage.setItem(key, JSON.stringify(persistData));
    localStorage.removeItem(LEGACY_STORAGE_KEY_CART);
  } catch (error) {
    console.error('[OfflineSync] Error saving cart:', error);
  }
}

/**
 * Load cart data from localStorage
 */
export function loadCartFromStorage(merchantId?: string | null): CartPersistData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = buildStorageKey('cart_data', merchantId);
    const scoped = safeParseJson<CartPersistData>(localStorage.getItem(key));
    if (scoped) return scoped;

    // Legacy fallback
    const legacy = safeParseJson<CartPersistData>(localStorage.getItem(LEGACY_STORAGE_KEY_CART));
    if (legacy) {
      // If merchantId is known, only load legacy if it was not scoped previously
      return legacy;
    }
  } catch (error) {
    console.error('[OfflineSync] Error loading cart:', error);
  }
  return null;
}

/**
 * Clear cart data from localStorage
 */
export function clearCartFromStorage(merchantId?: string | null): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = buildStorageKey('cart_data', merchantId);
    localStorage.removeItem(key);
    localStorage.removeItem(LEGACY_STORAGE_KEY_CART);
  } catch (error) {
    console.error('[OfflineSync] Error clearing cart:', error);
  }
}
