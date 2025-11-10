/**
 * localStorage utilities for cart management, auth, and customer data
 */

import type {
  Cart,
  CartItem,
  TableNumber,
  CustomerAuth,
} from '@/lib/types/customer';

// Storage keys
const STORAGE_KEYS = {
  CART_PREFIX: 'genfity_cart_',
  TABLE_PREFIX: 'genfity_table_',
  AUTH: 'genfity_customer_auth',
} as const;

/**
 * Get cart key for specific merchant
 */
function getCartKey(merchantCode: string): string {
  return `${STORAGE_KEYS.CART_PREFIX}${merchantCode}`;
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
 * Get cart for specific merchant
 */
export function getCart(merchantCode: string): Cart | null {
  if (typeof window === 'undefined') return null;

  try {
    const key = getCartKey(merchantCode);
    const data = localStorage.getItem(key);
    if (!data) return null;

    const cart = JSON.parse(data) as Cart;
    
    // Convert string IDs back to bigint
    cart.merchantId = BigInt(cart.merchantId);
    cart.items = cart.items.map(item => ({
      ...item,
      menuId: BigInt(item.menuId),
      addons: item.addons.map(addon => ({
        ...addon,
        id: BigInt(addon.id),
        addonItemId: BigInt(addon.addonItemId),
      })),
    }));

    return cart;
  } catch (error) {
    console.error('Error getting cart:', error);
    return null;
  }
}

/**
 * Save cart for specific merchant
 */
export function saveCart(cart: Cart): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getCartKey(cart.merchantCode);
    
    // Convert bigint to string for JSON serialization
    const serializable = {
      ...cart,
      merchantId: cart.merchantId.toString(),
      items: cart.items.map(item => ({
        ...item,
        menuId: item.menuId.toString(),
        addons: item.addons.map(addon => ({
          ...addon,
          id: addon.id.toString(),
          addonItemId: addon.addonItemId.toString(),
        })),
      })),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(key, JSON.stringify(serializable));
  } catch (error) {
    console.error('Error saving cart:', error);
  }
}

/**
 * Clear cart for specific merchant
 */
export function clearCart(merchantCode: string): void {
  if (typeof window === 'undefined') return;

  try {
    const key = getCartKey(merchantCode);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing cart:', error);
  }
}

/**
 * Add item to cart
 */
export function addToCart(
  merchantCode: string,
  merchantId: bigint,
  mode: 'dinein' | 'takeaway',
  item: CartItem,
  tableNumber?: string
): void {
  let cart = getCart(merchantCode);

  if (!cart) {
    cart = {
      merchantCode,
      merchantId,
      mode,
      tableNumber,
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // Update mode and table number if changed
  cart.mode = mode;
  cart.tableNumber = tableNumber;

  // Check if same item with same addons exists
  const existingIndex = cart.items.findIndex(
    (cartItem) =>
      cartItem.menuId === item.menuId &&
      JSON.stringify(cartItem.addons) === JSON.stringify(item.addons) &&
      cartItem.notes === item.notes
  );

  if (existingIndex >= 0) {
    // Update quantity
    cart.items[existingIndex].quantity += item.quantity;
    cart.items[existingIndex].subtotal =
      cart.items[existingIndex].price * cart.items[existingIndex].quantity +
      cart.items[existingIndex].addons.reduce(
        (sum, addon) => sum + addon.price * addon.quantity,
        0
      );
  } else {
    // Add new item
    cart.items.push(item);
  }

  saveCart(cart);
}

/**
 * Update cart item quantity
 */
export function updateCartItemQuantity(
  merchantCode: string,
  itemIndex: number,
  quantity: number
): void {
  const cart = getCart(merchantCode);
  if (!cart) return;

  if (quantity <= 0) {
    // Remove item
    cart.items.splice(itemIndex, 1);
  } else {
    // Update quantity and subtotal
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].subtotal =
      cart.items[itemIndex].price * quantity +
      cart.items[itemIndex].addons.reduce(
        (sum, addon) => sum + addon.price * addon.quantity,
        0
      );
  }

  saveCart(cart);
}

/**
 * Update cart item notes
 */
export function updateCartItemNotes(
  merchantCode: string,
  itemIndex: number,
  notes: string
): void {
  const cart = getCart(merchantCode);
  if (!cart) return;

  cart.items[itemIndex].notes = notes;
  saveCart(cart);
}

/**
 * Remove item from cart
 */
export function removeFromCart(merchantCode: string, itemIndex: number): void {
  const cart = getCart(merchantCode);
  if (!cart) return;

  cart.items.splice(itemIndex, 1);
  saveCart(cart);
}

/**
 * Get cart total
 */
export function getCartTotal(merchantCode: string): number {
  const cart = getCart(merchantCode);
  if (!cart) return 0;

  return cart.items.reduce((sum, item) => sum + item.subtotal, 0);
}

/**
 * Get cart item count
 */
export function getCartItemCount(merchantCode: string): number {
  const cart = getCart(merchantCode);
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
 * Get customer auth data
 */
export function getCustomerAuth(): CustomerAuth | null {
  if (typeof window === 'undefined') return null;

  try {
    const data = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (!data) return null;

    const auth = JSON.parse(data) as CustomerAuth;
    
    // Convert string ID back to bigint
    auth.user.id = BigInt(auth.user.id);

    // Check if token expired
    if (new Date(auth.expiresAt) < new Date()) {
      clearCustomerAuth();
      return null;
    }

    return auth;
  } catch (error) {
    console.error('Error getting customer auth:', error);
    return null;
  }
}

/**
 * Save customer auth data
 */
export function saveCustomerAuth(auth: CustomerAuth): void {
  if (typeof window === 'undefined') return;

  try {
    // Convert bigint to string for JSON serialization
    const serializable = {
      ...auth,
      user: {
        ...auth.user,
        id: auth.user.id.toString(),
      },
    };

    localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(serializable));
  } catch (error) {
    console.error('Error saving customer auth:', error);
  }
}

/**
 * Clear customer auth data
 */
export function clearCustomerAuth(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(STORAGE_KEYS.AUTH);
  } catch (error) {
    console.error('Error clearing customer auth:', error);
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
