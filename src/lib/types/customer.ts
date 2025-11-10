/**
 * Customer-facing types for cart, orders, and customer data
 */

/**
 * Order mode type
 */
export type OrderMode = 'dinein' | 'takeaway';

/**
 * Cart item with selected addons
 */
export interface CartAddon {
  id: bigint;
  addonItemId: bigint;
  name: string;
  price: number;
  quantity: number;
}

/**
 * Menu item in cart
 */
export interface CartItem {
  menuId: bigint;
  menuName: string;
  price: number;
  quantity: number;
  notes?: string;
  addons: CartAddon[];
  subtotal: number; // price * quantity + addon prices
}

/**
 * Shopping cart for specific merchant
 */
export interface Cart {
  merchantCode: string;
  merchantId: bigint;
  mode: OrderMode;
  tableNumber?: string; // only for dinein mode
  items: CartItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Table number storage for dine-in mode
 */
export interface TableNumber {
  merchantCode: string;
  tableNumber: string;
  setAt: string;
}

/**
 * Customer auth data
 */
export interface CustomerAuth {
  accessToken: string;
  user: {
    id: bigint;
    name: string;
    email: string;
    phone?: string;
    role: 'CUSTOMER';
  };
  expiresAt: string;
}

/**
 * Merchant info for customer view
 */
export interface MerchantInfo {
  id: bigint;
  code: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  isActive: boolean;
  openingHours: MerchantOpeningHour[];
}

/**
 * Merchant opening hours
 */
export interface MerchantOpeningHour {
  id: bigint;
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  openTime?: string; // HH:mm format or null if closed
  closeTime?: string; // HH:mm format or null if closed
  isClosed: boolean;
  is24Hours: boolean;
}

/**
 * Menu category
 */
export interface MenuCategory {
  id: bigint;
  name: string;
  displayOrder: number;
}

/**
 * Menu item with addons
 */
export interface MenuItem {
  id: bigint;
  categoryId: bigint;
  categoryName: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  trackStock: boolean;
  stockQty?: number;
  addonCategories: AddonCategoryWithItems[];
}

/**
 * Addon category with items
 */
export interface AddonCategoryWithItems {
  id: bigint;
  name: string;
  description?: string;
  minSelection: number;
  maxSelection: number;
  items: AddonItem[];
}

/**
 * Addon item
 */
export interface AddonItem {
  id: bigint;
  name: string;
  price: number;
  isAvailable: boolean;
  trackStock: boolean;
  stockQty?: number;
}

/**
 * Order summary for customer
 */
export interface OrderSummary {
  id: bigint;
  orderNumber: string;
  merchantCode: string;
  merchantName: string;
  mode: OrderMode;
  tableNumber?: string;
  status: string;
  totalAmount: number;
  placedAt: string;
  items: OrderItemSummary[];
}

/**
 * Order item in summary
 */
export interface OrderItemSummary {
  id: bigint;
  menuName: string;
  quantity: number;
  price: number;
  notes?: string;
  addons: OrderAddonSummary[];
  subtotal: number;
}

/**
 * Order addon in summary
 */
export interface OrderAddonSummary {
  id: bigint;
  addonName: string;
  quantity: number;
  price: number;
}

/**
 * Customer order history item
 */
export interface OrderHistoryItem {
  id: bigint;
  orderNumber: string;
  merchantCode: string;
  merchantName: string;
  mode: OrderMode;
  status: string;
  totalAmount: number;
  placedAt: string;
}
