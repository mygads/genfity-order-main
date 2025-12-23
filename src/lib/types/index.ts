/**
 * TypeScript Types for GENFITY Online Ordering
 * Export Prisma types and custom interfaces
 */

// Re-export Prisma types
export type {
  User,
  UserSession,
  MerchantUser,
  Merchant,
  MerchantOpeningHour,
  MenuCategory,
  Menu,
  AddonCategory,
  AddonItem,
  MenuAddonCategory,
  Order,
  OrderItem,
  OrderItemAddon,
  // OrderStatusHistory removed
  UserRole,
  MerchantRole,
  SessionStatus,
  OrderType,
  OrderStatus,
} from '@prisma/client';
