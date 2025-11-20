/**
 * GENFITY - Unified Price Calculation Utility
 * 
 * @specification copilot-instructions.md - Code Quality Standards & Type Safety
 * 
 * @description
 * Centralized price calculation to ensure consistency across all pages:
 * - view-order page
 * - payment page
 * - order-summary-cash page
 * 
 * Formula:
 * 1. subtotal = sum of (item.price + addons) * quantity
 * 2. tax = subtotal * merchantTaxPercentage%
 * 3. total = subtotal + tax
 * 
 * ✅ PRICE TYPE HANDLING:
 * - Input: number (already converted from Decimal by API)
 * - Calculation: Decimal.js (for precision)
 * - Output: string (2 decimal places, ready for display)
 * 
 * Why Decimal.js?
 * - JavaScript number has floating point precision issues
 * - Example: 0.1 + 0.2 !== 0.3 in JavaScript
 * - Decimal.js ensures accurate currency calculations
 * 
 * @example
 * ```typescript
 * // Items from cart (prices already converted to number)
 * const items = [
 *   { price: 5.50, quantity: 2, addons: [{ price: 1.00 }] }
 * ];
 * 
 * const subtotal = calculateCartSubtotal(items); // 13.00
 * const breakdown = calculatePriceBreakdown(subtotal, 10); // { subtotal: "13.00", tax: "1.30", total: "14.30" }
 * ```
 */

import Decimal from 'decimal.js';

export interface PriceBreakdown {
  subtotal: string;
  tax: string;
  total: string;
}

/**
 * Cart item interface for price calculations
 * 
 * @property {number} price - Item base price (from API, already number)
 * @property {number} quantity - Item quantity
 * @property {Array} [addons] - Optional addons with prices
 */
interface CartItem {
  price: number; // ✅ Always number (from API decimalToNumber conversion)
  quantity: number;
  addons?: Array<{ price: number }>; // ✅ Always number
}

/**
 * ✅ Calculate price breakdown with tax only (no service charge)
 * 
 * @param subtotal - Base subtotal amount
 * @param merchantTaxPercentage - Tax % from merchant settings (default 10%)
 * @returns Price breakdown with tax and total
 */
export function calculatePriceBreakdown(
  subtotal: number,
  merchantTaxPercentage: number = 10
): PriceBreakdown {
  // Convert to Decimal for precise calculations
  const subtotalDecimal = new Decimal(subtotal);

  // 1. Tax (merchant-specific percentage on subtotal)
  const taxRate = new Decimal(merchantTaxPercentage).dividedBy(100);
  const tax = subtotalDecimal.times(taxRate);

  // 2. Total Amount
  const total = subtotalDecimal.plus(tax);

  console.log('💰 [PRICE CALC] Breakdown:', {
    subtotal: subtotalDecimal.toFixed(2),
    taxPercentage: `${merchantTaxPercentage}%`,
    tax: tax.toFixed(2),
    total: total.toFixed(2),
  });

  return {
    subtotal: subtotalDecimal.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
  };
}

/**
 * Calculate subtotal from cart items
 * 
 * @param items - Cart items array
 * @param merchantTaxPercentage - Tax % (optional, for full breakdown)
 * @returns Subtotal number OR full breakdown if tax % provided
 */
export function calculateCartSubtotal(items: CartItem[]): number;
export function calculateCartSubtotal(items: CartItem[], merchantTaxPercentage: number): PriceBreakdown;
export function calculateCartSubtotal(
  items: CartItem[],
  merchantTaxPercentage?: number
): number | PriceBreakdown {
  const subtotal = items.reduce((sum, item) => {
    const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    const itemSubtotal = itemPrice * item.quantity;

    // Add addon prices
    const addonTotal = (item.addons || []).reduce((addonSum, addon) => {
      const addonPrice = typeof addon.price === 'string' ? parseFloat(addon.price) : addon.price;
      return addonSum + addonPrice;
    }, 0);

    return sum + itemSubtotal + (addonTotal * item.quantity);
  }, 0);

  console.log('📊 [CART CALC] Subtotal from items:', {
    itemCount: items.length,
    subtotal: subtotal.toFixed(2),
  });

  // ✅ If tax percentage provided, return full breakdown
  if (merchantTaxPercentage !== undefined) {
    return calculatePriceBreakdown(subtotal, merchantTaxPercentage);
  }

  // ✅ Otherwise, return only subtotal
  return subtotal;
}

/**
 * @deprecated Use calculateCartSubtotal(items, taxPercentage) instead
 */
export function calculateCartTotal(
  items: CartItem[],
  merchantTaxPercentage: number = 10
): PriceBreakdown {
  console.warn('⚠️ calculateCartTotal is deprecated. Use calculateCartSubtotal(items, taxPercentage) instead.');
  return calculateCartSubtotal(items, merchantTaxPercentage) as PriceBreakdown;
}