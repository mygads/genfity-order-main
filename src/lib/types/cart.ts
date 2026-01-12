/**
 * GENFITY - Cart Types for localStorage
 * 
 * @specification copilot-instructions.md - Type Safety & Decimal Handling
 * 
 * @description
 * Simplified cart types for client-side cart management.
 * These types are used for localStorage and client state.
 * 
 * When submitting order, these will be transformed to match
 * server-side types (CartItem, Cart from customer.ts)
 * 
 * ✅ PRICE TYPE HANDLING:
 * - Database: DECIMAL(10, 2) - PostgreSQL
 * - Prisma: Decimal object - ORM layer
 * - API Response: number - Converted via decimalToNumber()
 * - Frontend: number - JavaScript calculations
 * - Display: string - Formatted via formatCurrency()
 * 
 * Flow:
 * 1. DB (DECIMAL) → Prisma (Decimal) → API (decimalToNumber) → number
 * 2. Frontend receives number, stores in cart as number
 * 3. When submitting order, sends number back to API
 * 4. API converts to Decimal before saving to DB
 */

/**
 * Addon selected by customer (localStorage version)
 * 
 * @property {number} id - Addon item ID (from database)
 * @property {string} name - Addon item name
 * @property {number} price - Addon price (converted from Decimal via API)
 */
export interface LocalCartAddon {
  id: number;
  name: string;
  price: number; // ✅ Always number (from API decimalToNumber conversion)
}

/**
 * Cart item in localStorage
 * 
 * @property {string} cartItemId - Unique cart item ID (generated client-side)
 * @property {number} menuId - Menu item ID (from database)
 * @property {string} menuName - Menu item name
 * @property {number} price - Menu price (converted from Decimal via API)
 * @property {number} quantity - Item quantity
 * @property {string} [notes] - Optional customer notes
 * @property {LocalCartAddon[]} [addons] - Optional selected addons
 */
export interface LocalCartItem {
  cartItemId: string; // Unique ID for this cart item (not menuId)
  menuId: number;
  menuName: string;
  price: number; // ✅ Always number (from API decimalToNumber conversion)
  quantity: number;
  notes?: string;
  addons?: LocalCartAddon[];
}

/**
 * Shopping cart stored in localStorage
 * 
 * @property {string} merchantCode - Merchant code (e.g., "KOPI001")
 * @property {"dinein" | "takeaway"} mode - Order type
 * @property {string} [tableNumber] - Table number (dine-in only)
 * @property {LocalCartItem[]} items - Cart items
 * @property {string} [generalNotes] - General notes for entire order
 */
export interface LocalCart {
  merchantCode: string;
  mode: "dinein" | "takeaway" | "delivery";
  tableNumber?: string;
  items: LocalCartItem[];
  generalNotes?: string; // General notes for the entire order
}
