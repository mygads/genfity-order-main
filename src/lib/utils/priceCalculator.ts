/**
 * GENFITY - Unified Price Calculation Utility
 * 
 * @specification copilot-instructions.md - Code Quality Standards
 * 
 * @description
 * Centralized price calculation to ensure consistency across all pages:
 * - view-order page
 * - payment page
 * - order-summary-cash page
 * 
 * Formula:
 * 1. subtotal = sum of (item.price + addons) * quantity
 * 2. serviceCharge = subtotal * 5%
 * 3. tax = (subtotal + serviceCharge) * merchantTaxPercentage%
 * 4. total = subtotal + serviceCharge + tax
 */

import Decimal from 'decimal.js';

export interface PriceBreakdown {
  subtotal: string;
  serviceCharge: string;
  tax: string;
  total: string;
}

interface CartItem {
  price: number;
  quantity: number;
  addons?: Array<{ price: number }>;
}

/**
 * ✅ FIXED: Single function with merchant tax percentage parameter
 * 
 * @param subtotal - Base subtotal amount
 * @param merchantTaxPercentage - Tax % from merchant settings (default 10%)
 * @returns Price breakdown with service charge, tax, and total
 */
export function calculatePriceBreakdown(
  subtotal: number,
  merchantTaxPercentage: number = 10
): PriceBreakdown {
  // Convert to Decimal for precise calculations
  const subtotalDecimal = new Decimal(subtotal);

  // 1. Service Charge (5%)
  const serviceCharge = subtotalDecimal.times(0.05);

  // 2. Tax (merchant-specific percentage on subtotal + service charge)
  const taxableAmount = subtotalDecimal.plus(serviceCharge);
  const taxRate = new Decimal(merchantTaxPercentage).dividedBy(100);
  const tax = taxableAmount.times(taxRate);

  // 3. Total Amount
  const total = subtotalDecimal.plus(serviceCharge).plus(tax);

  console.log('💰 [PRICE CALC] Breakdown:', {
    subtotal: subtotalDecimal.toFixed(2),
    serviceCharge: serviceCharge.toFixed(2),
    taxPercentage: `${merchantTaxPercentage}%`,
    tax: tax.toFixed(2),
    total: total.toFixed(2),
  });

  return {
    subtotal: subtotalDecimal.toFixed(2),
    serviceCharge: serviceCharge.toFixed(2),
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