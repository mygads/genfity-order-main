/**
 * GENFITY - Cart Types for localStorage
 * 
 * Simplified cart types for client-side cart management.
 * These types are used for localStorage and client state.
 * 
 * When submitting order, these will be transformed to match
 * server-side types (CartItem, Cart from customer.ts)
 */

/**
 * Addon selected by customer (localStorage version)
 */
export interface LocalCartAddon {
  id: number;
  name: string;
  price: number;
}

/**
 * Cart item in localStorage
 */
export interface LocalCartItem {
  cartItemId: string; // Unique ID for this cart item (not menuId)
  menuId: number;
  menuName: string;
  price: number;
  quantity: number;
  notes?: string;
  addons?: LocalCartAddon[];
}

/**
 * Shopping cart stored in localStorage
 */
export interface LocalCart {
  merchantCode: string;
  mode: "dinein" | "takeaway";
  tableNumber?: string;
  items: LocalCartItem[];
  generalNotes?: string; // General notes for the entire order
}
