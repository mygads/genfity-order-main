/**
 * localStorage utilities for cart management, auth, and customer data
 */

import type {
  TableNumber,
  CustomerAuth,
} from '@/lib/types/customer';
import type { LocalCart } from '@/lib/types/cart';

// Storage keys
const STORAGE_KEYS = {
  CART_PREFIX: 'genfity_cart_',
  TABLE_PREFIX: 'genfity_table_',
  RESERVATION_PREFIX: 'genfity_reservation_',
  AUTH: 'genfity_customer_auth',
  FAVORITES_PREFIX: 'genfity_favorites_',
  RECENT_ORDERS: 'genfity_recent_orders',
  PUSH_SUBSCRIPTION: 'genfity_push_subscription',
} as const;

const DEBUG_AUTH = process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true';
const authLog = (...args: unknown[]) => {
  if (DEBUG_AUTH) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

/**
 * Get cart key for specific merchant and mode
 */
function getCartKey(merchantCode: string, mode: 'dinein' | 'takeaway' | 'delivery' = 'dinein'): string {
  return `${STORAGE_KEYS.CART_PREFIX}${merchantCode}_${mode}`;
}

/**
 * Get table number key for specific merchant
 */
function getTableKey(merchantCode: string): string {
  return `${STORAGE_KEYS.TABLE_PREFIX}${merchantCode}`;
}

function getReservationKey(merchantCode: string): string {
  return `${STORAGE_KEYS.RESERVATION_PREFIX}${merchantCode}`;
}

export type StoredReservationDetails = {
  merchantCode: string;
  partySize: number;
  reservationDate: string; // YYYY-MM-DD
  reservationTime: string; // HH:MM
  setAt: string;
};

// ============================================================================
// CART MANAGEMENT
// ============================================================================

/**
 * Get cart for specific merchant and mode
 * @param merchantCode - Merchant identifier
 * @param mode - Order mode (defaults to 'dinein')
 */
export function getCart(merchantCode: string, mode: 'dinein' | 'takeaway' | 'delivery' = 'dinein'): LocalCart | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getCartKey(merchantCode, mode);
    const data = localStorage.getItem(key);
    if (!data) return null;

    const cart = JSON.parse(data) as LocalCart;
    return cart;
  } catch (error) {
    console.error('Error getting cart:', error);
    return null;
  }
}

/**
 * Save cart for specific merchant
 */
export function saveCart(cart: LocalCart): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getCartKey(cart.merchantCode, cart.mode);
    localStorage.setItem(key, JSON.stringify(cart));

    // Dispatch custom event for cross-component sync
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: cart }));
  } catch (error) {
    console.error('Error saving cart:', error);
  }
}

/**
 * Clear cart for specific merchant and mode
 */
export function clearCart(merchantCode: string, mode: 'dinein' | 'takeaway' | 'delivery' = 'dinein'): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getCartKey(merchantCode, mode);
    localStorage.removeItem(key);

    // Dispatch event
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: null }));
  } catch (error) {
    console.error('Error clearing cart:', error);
  }
}

/**
 * Get cart total price
 */
export function getCartTotal(merchantCode: string, mode: 'dinein' | 'takeaway' | 'delivery' = 'dinein'): number {
  const cart = getCart(merchantCode, mode);
  if (!cart) return 0;

  return cart.items.reduce((sum, item) => {
    const addonsTotal = item.addons?.reduce((addonSum, addon) => addonSum + addon.price, 0) || 0;
    return sum + (item.price + addonsTotal) * item.quantity;
  }, 0);
}

/**
 * Get cart item count
 */
export function getCartItemCount(merchantCode: string, mode: 'dinein' | 'takeaway' | 'delivery' = 'dinein'): number {
  const cart = getCart(merchantCode, mode);
  if (!cart) return 0;

  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

// ============================================================================
// TABLE NUMBER MANAGEMENT (for dine-in)
// ============================================================================

/**
 * Get saved table number for merchant
 */
export function getTableNumber(merchantCode: string): TableNumber | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getTableKey(merchantCode);
    const data = localStorage.getItem(key);
    if (!data) return null;

    return JSON.parse(data) as TableNumber;
  } catch (error) {
    console.error('Error getting table number:', error);
    return null;
  }
}

/**
 * Save table number for merchant
 */
export function saveTableNumber(
  merchantCode: string,
  tableNumber: string
): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getTableKey(merchantCode);
    const data: TableNumber = {
      merchantCode,
      tableNumber,
      setAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving table number:', error);
  }
}

/**
 * Clear table number for merchant
 */
export function clearTableNumber(merchantCode: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getTableKey(merchantCode);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing table number:', error);
  }
}

// ============================================================================
// RESERVATION DETAILS (customer reservation ordering flow)
// ============================================================================

export function getReservationDetails(merchantCode: string): StoredReservationDetails | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getReservationKey(merchantCode);
    const data = localStorage.getItem(key);
    if (!data) return null;
    return JSON.parse(data) as StoredReservationDetails;
  } catch (error) {
    console.error('Error getting reservation details:', error);
    return null;
  }
}

export function saveReservationDetails(
  merchantCode: string,
  details: { partySize: number; reservationDate: string; reservationTime: string }
): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getReservationKey(merchantCode);
    const payload: StoredReservationDetails = {
      merchantCode,
      partySize: Number(details.partySize),
      reservationDate: String(details.reservationDate),
      reservationTime: String(details.reservationTime),
      setAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.error('Error saving reservation details:', error);
  }
}

export function clearReservationDetails(merchantCode: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getReservationKey(merchantCode);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing reservation details:', error);
  }
}

// ============================================================================
// CUSTOMER AUTH MANAGEMENT
// ============================================================================

/**
 * Get customer auth data with debug logging
 */
export function getCustomerAuth(): CustomerAuth | null {
  if (typeof window === 'undefined') return null;

  try {
    const data = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!data) {
      authLog('🔐 [AUTH] No auth data in localStorage');
      return null;
    }

    const auth = JSON.parse(data) as CustomerAuth;

    // Check if customer object exists and has required data
    if (!auth.customer || !auth.customer.id) {
      authLog('🔐 [AUTH] Invalid auth data (missing customer), clearing auth');
      clearCustomerAuth();
      return null;
    }

    // Convert string ID back to bigint
    auth.customer.id = BigInt(auth.customer.id);

    // Check if token expired
    if (new Date(auth.expiresAt) < new Date()) {
      authLog('🔐 [AUTH] Token expired, clearing auth');
      clearCustomerAuth();
      return null;
    }

    authLog('🔐 [AUTH] Valid auth found:', {
      customerId: auth.customer.id.toString(),
      email: auth.customer.email,
      expiresAt: new Date(auth.expiresAt).toISOString(),
    });

    return auth;
  } catch (error) {
    console.error('🔐 [AUTH ERROR] Error getting customer auth:', error);
    return null;
  }
}

/**
 * Save customer auth data with debug logging
 */
export function saveCustomerAuth(auth: CustomerAuth): void {
  if (typeof window === 'undefined') return;

  try {
    // Convert bigint to string for JSON serialization
    const serializable = {
      ...auth,
      customer: {
        ...auth.customer,
        id: auth.customer.id.toString(),
      },
    };

    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(serializable));

    authLog('🔐 [AUTH] Auth saved to localStorage:', {
      customerId: auth.customer.id.toString(),
      email: auth.customer.email,
      expiresAt: new Date(auth.expiresAt).toISOString(),
    });

    // Dispatch custom event for auth change
    window.dispatchEvent(new Event('customerAuthChange'));
  } catch (error) {
    console.error('🔐 [AUTH ERROR] Error saving customer auth:', error);
  }
}

/**
 * Clear customer auth data with debug logging and event dispatch
 */
export function clearCustomerAuth(): void {
  if (typeof window === 'undefined') return;

  try {
    authLog('🔐 [AUTH] Clearing customer auth from localStorage');
    localStorage.removeItem(STORAGE_KEYS.AUTH);

    // Dispatch custom event for auth change (logout)
    window.dispatchEvent(new Event('customerAuthChange'));
    authLog('🔐 [AUTH] Auth cleared and event dispatched');
  } catch (error) {
    console.error('🔐 [AUTH ERROR] Error clearing customer auth:', error);
  }
}

/**
 * Check if customer is authenticated
 */
export function isCustomerAuthenticated(): boolean {
  return getCustomerAuth() !== null;
}

/**
 * Get customer access token
 */
export function getCustomerToken(): string | null {
  const auth = getCustomerAuth();
  return auth?.accessToken ?? null;
}

// ============================================================================
// FAVORITES MANAGEMENT
// ============================================================================

/**
 * Get favorites key for specific merchant
 */
function getFavoritesKey(merchantCode: string): string {
  return `${STORAGE_KEYS.FAVORITES_PREFIX}${merchantCode}`;
}

/**
 * Get all favorite menu IDs for a merchant
 */
export function getFavorites(merchantCode: string): string[] {
  if (typeof window === 'undefined') return [];

  try {
    const key = getFavoritesKey(merchantCode);
    const data = localStorage.getItem(key);
    if (!data) return [];
    return JSON.parse(data) as string[];
  } catch (error) {
    console.error('Error getting favorites:', error);
    return [];
  }
}

/**
 * Add a menu item to favorites
 */
export function addFavorite(merchantCode: string, menuId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const favorites = getFavorites(merchantCode);
    if (!favorites.includes(menuId)) {
      favorites.push(menuId);
      const key = getFavoritesKey(merchantCode);
      localStorage.setItem(key, JSON.stringify(favorites));

      // Dispatch custom event for cross-component sync
      window.dispatchEvent(new CustomEvent('favoritesUpdated', {
        detail: { merchantCode, menuId, action: 'add' }
      }));
    }
  } catch (error) {
    console.error('Error adding favorite:', error);
  }
}

/**
 * Remove a menu item from favorites
 */
export function removeFavorite(merchantCode: string, menuId: string): void {
  if (typeof window === 'undefined') return;

  try {
    const favorites = getFavorites(merchantCode);
    const index = favorites.indexOf(menuId);
    if (index > -1) {
      favorites.splice(index, 1);
      const key = getFavoritesKey(merchantCode);
      localStorage.setItem(key, JSON.stringify(favorites));

      // Dispatch custom event for cross-component sync
      window.dispatchEvent(new CustomEvent('favoritesUpdated', {
        detail: { merchantCode, menuId, action: 'remove' }
      }));
    }
  } catch (error) {
    console.error('Error removing favorite:', error);
  }
}

/**
 * Check if a menu item is favorited
 */
export function isFavorite(merchantCode: string, menuId: string): boolean {
  const favorites = getFavorites(merchantCode);
  return favorites.includes(menuId);
}

/**
 * Toggle favorite status for a menu item
 * Returns true if item is now favorited, false if unfavorited
 */
export function toggleFavorite(merchantCode: string, menuId: string): boolean {
  if (isFavorite(merchantCode, menuId)) {
    removeFavorite(merchantCode, menuId);
    return false;
  } else {
    addFavorite(merchantCode, menuId);
    return true;
  }
}

// ============================================================================
// RECENT ORDERS TRACKING (for push notifications)
// ============================================================================

interface RecentOrder {
  orderNumber: string;
  merchantCode: string;
  createdAt: string; // ISO string
  expiresAt: string; // ISO string - 24 hours from creation
}

const RECENT_ORDER_EXPIRY_HOURS = 24;

/**
 * Save a recent order for push notification tracking
 * Orders are stored for 24 hours
 */
export function saveRecentOrder(orderNumber: string, merchantCode: string): void {
  if (typeof window === 'undefined') return;

  try {
    const orders = getRecentOrders();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RECENT_ORDER_EXPIRY_HOURS * 60 * 60 * 1000);

    // Remove if already exists
    const filteredOrders = orders.filter(o => o.orderNumber !== orderNumber);

    // Add new order
    filteredOrders.push({
      orderNumber,
      merchantCode,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    localStorage.setItem(STORAGE_KEYS.RECENT_ORDERS, JSON.stringify(filteredOrders));

    // Clean up expired orders
    cleanExpiredOrders();
  } catch (error) {
    console.error('Error saving recent order:', error);
  }
}

/**
 * Get all recent orders (not expired)
 */
export function getRecentOrders(): RecentOrder[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEYS.RECENT_ORDERS);
    if (!data) return [];

    const orders = JSON.parse(data) as RecentOrder[];
    const now = new Date();

    // Filter out expired orders
    return orders.filter(order => new Date(order.expiresAt) > now);
  } catch (error) {
    console.error('Error getting recent orders:', error);
    return [];
  }
}

/**
 * Check if an order is in recent orders
 */
export function isRecentOrder(orderNumber: string): boolean {
  const orders = getRecentOrders();
  return orders.some(o => o.orderNumber === orderNumber);
}

/**
 * Remove expired orders from localStorage
 */
export function cleanExpiredOrders(): void {
  if (typeof window === 'undefined') return;

  try {
    const orders = getRecentOrders(); // This already filters expired
    localStorage.setItem(STORAGE_KEYS.RECENT_ORDERS, JSON.stringify(orders));
  } catch (error) {
    console.error('Error cleaning expired orders:', error);
  }
}

/**
 * Remove a specific order from recent orders
 */
export function removeRecentOrder(orderNumber: string): void {
  if (typeof window === 'undefined') return;

  try {
    const orders = getRecentOrders();
    const filteredOrders = orders.filter(o => o.orderNumber !== orderNumber);
    localStorage.setItem(STORAGE_KEYS.RECENT_ORDERS, JSON.stringify(filteredOrders));
  } catch (error) {
    console.error('Error removing recent order:', error);
  }
}

// ============================================================================
// PUSH SUBSCRIPTION MANAGEMENT
// ============================================================================

interface LocalPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  subscribedAt: string;
}

/**
 * Save push subscription to localStorage
 * Used as backup and for guest users
 */
export function savePushSubscription(subscription: PushSubscription): void {
  if (typeof window === 'undefined') return;

  try {
    const data: LocalPushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
        auth: arrayBufferToBase64(subscription.getKey('auth')),
      },
      subscribedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.PUSH_SUBSCRIPTION, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving push subscription:', error);
  }
}

/**
 * Get saved push subscription from localStorage
 */
export function getSavedPushSubscription(): LocalPushSubscription | null {
  if (typeof window === 'undefined') return null;

  try {
    const data = localStorage.getItem(STORAGE_KEYS.PUSH_SUBSCRIPTION);
    if (!data) return null;
    return JSON.parse(data) as LocalPushSubscription;
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
}

/**
 * Clear push subscription from localStorage
 */
export function clearPushSubscription(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.PUSH_SUBSCRIPTION);
  } catch (error) {
    console.error('Error clearing push subscription:', error);
  }
}

/**
 * Check if push notification is enabled
 */
export function isPushEnabled(): boolean {
  return getSavedPushSubscription() !== null;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

