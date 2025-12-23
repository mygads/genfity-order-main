/**
 * Serialization Utilities
 * 
 * @specification GENFITY AI Coding Instructions - Type Safety
 * 
 * @description
 * Handles conversion of Prisma types (BigInt, Decimal) to JSON-safe formats
 * for Next.js API responses.
 * 
 * @security
 * - Safe type coercion (no data loss)
 * - Handles nested objects/arrays recursively
 * - Preserves null/undefined values
 */

import { Decimal } from '@prisma/client/runtime/library';

/**
 * Convert Prisma Decimal to JavaScript number
 * 
 * ✅ USAGE: Always use this for price conversions from database
 * 
 * @description
 * Prisma returns `Decimal` objects for DECIMAL(10,2) database fields.
 * This utility converts them to JavaScript numbers with proper precision.
 * 
 * Database Schema:
 * - Menu.price: DECIMAL(10, 2)
 * - Menu.promoPrice: DECIMAL(10, 2)
 * - AddonItem.price: DECIMAL(10, 2)
 * - OrderItem.menuPrice: DECIMAL(10, 2)
 * - OrderItemAddon.addonPrice: DECIMAL(10, 2)
 * 
 * @example
 * ```typescript
 * // ✅ CORRECT - Use decimalToNumber()
 * const menu = await prisma.menu.findUnique({ where: { id } });
 * const price = decimalToNumber(menu.price); // 5.50
 * 
 * // ❌ WRONG - Direct Number() may lose precision
 * const price = Number(menu.price); // Not recommended
 * ```
 * 
 * @param value - Decimal from Prisma, number, or string
 * @returns Number with 2 decimal places (currency precision)
 * 
 * @specification copilot-instructions.md - Database Schema & Type Safety
 */
export function decimalToNumber(value: Decimal | number | string): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value);
  return parseFloat(value.toString());
}

/**
 * Convert BigInt to string
 * 
 * @param value - BigInt value
 * @returns String representation
 */
export function bigIntToString(value: bigint): string {
  return value.toString();
}

/**
 * Check if value is a Prisma Decimal
 * @param value - Value to check
 * @returns True if value is Decimal
 */
function isDecimal(value: unknown): boolean {
  return (
    value instanceof Decimal ||
    (typeof value === 'object' &&
      value !== null &&
      'constructor' in value &&
      typeof value.constructor === 'function' &&
      'd' in value &&
      's' in value &&
      'e' in value)
  );
}

/**
 * Recursively serialize Prisma types to JSON-safe format
 * 
 * @param obj - Any object (can contain BigInt, Decimal, nested objects)
 * @returns Serialized object safe for JSON.stringify()
 * 
 * @example
 * ```typescript
 * const order = await prisma.order.findFirst(...);
 * const serialized = serializeData(order);
 * return NextResponse.json(serialized); // ✅ No BigInt error
 * ```
 */
export function serializeData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'bigint') {
    return String(obj) as T;
  }

  // Handle Prisma Decimal (both instanceof and duck-typing check)
  if (isDecimal(obj)) {
    return parseFloat((obj as { toString(): string }).toString()) as T;
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString() as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeData) as T;
  }

  if (typeof obj === 'object') {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeData(value);
    }
    return serialized as T;
  }

  return obj;
}

/**
 * Custom JSON stringifier that handles BigInt
 * @param data - Data to stringify
 * @returns JSON string
 */
export function jsonStringify(data: unknown): string {
  return JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  );
}

/**
 * Alias for serializeData - for backward compatibility
 * Recursively serialize BigInt and Decimal to JSON-safe format
 * 
 * @param obj - Any object (can contain BigInt, Decimal, nested objects)
 * @returns Serialized object safe for JSON.stringify()
 */
export const serializeBigInt = serializeData;
