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
  AUTH: 'genfity_customer_auth',
  FAVORITES_PREFIX: 'genfity_favorites_',
} as const;

/**
 * Get cart key for specific merchant and mode
 */
function getCartKey(merchantCode: string, mode: 'dinein' | 'takeaway' = 'dinein'): string {
  return `${STORAGE_KEYS.CART_PREFIX}${merchantCode}_${mode}`;
}

/**
 * Get table number key for specific merchant
 */
function getTableKey(merchantCode: string): string {
  return `${STORAGE_KEYS.TABLE_PREFIX}${merchantCode}`;
}

// ============================================================================
// CART MANAGEMENT
// ============================================================================

/**
 * Get cart for specific merchant and mode
 * @param merchantCode - Merchant identifier
 * @param mode - Order mode (defaults to 'dinein')
 */
export function getCart(merchantCode: string, mode: 'dinein' | 'takeaway' = 'dinein'): LocalCart | null {
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
export function clearCart(merchantCode: string, mode: 'dinein' | 'takeaway' = 'dinein'): void {
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
export function getCartTotal(merchantCode: string, mode: 'dinein' | 'takeaway' = 'dinein'): number {
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
export function getCartItemCount(merchantCode: string, mode: 'dinein' | 'takeaway' = 'dinein'): number {
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
      console.log('🔐 [AUTH] No auth data in localStorage');
      return null;
    }

    const auth = JSON.parse(data) as CustomerAuth;

    // Check if customer object exists and has required data
    if (!auth.customer || !auth.customer.id) {
      console.log('🔐 [AUTH] Invalid auth data (missing customer), clearing auth');
      clearCustomerAuth();
      return null;
    }

    // Convert string ID back to bigint
    auth.customer.id = BigInt(auth.customer.id);

    // Check if token expired
    if (new Date(auth.expiresAt) < new Date()) {
      console.log('🔐 [AUTH] Token expired, clearing auth');
      clearCustomerAuth();
      return null;
    }

    console.log('🔐 [AUTH] Valid auth found:', {
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

    console.log('🔐 [AUTH] Auth saved to localStorage:', {
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
    console.log('🔐 [AUTH] Clearing customer auth from localStorage');
    localStorage.removeItem(STORAGE_KEYS.AUTH);

    // Dispatch custom event for auth change (logout)
    window.dispatchEvent(new Event('customerAuthChange'));
    console.log('🔐 [AUTH] Auth cleared and event dispatched');
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
