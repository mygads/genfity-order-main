/**
 * Customer Display types
 * Shared between POS, admin orders, and the customer display screen.
 */

export type CustomerDisplayMode = 'CART' | 'ORDER_REVIEW' | 'THANK_YOU' | 'IDLE';

export interface CustomerDisplayAddon {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CustomerDisplayItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  notes?: string;
  addons?: CustomerDisplayAddon[];
}

export interface CustomerDisplayTotals {
  subtotal: number;
  taxAmount: number;
  serviceChargeAmount: number;
  packagingFeeAmount: number;
  deliveryFeeAmount: number;
  discountAmount: number;
  totalAmount: number;
  itemCount: number;
  quantityCount: number;
}

export interface CustomerDisplayCartPayload {
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableNumber?: string;
  customerName?: string;
  notes?: string;
  items: CustomerDisplayItem[];
  totals: CustomerDisplayTotals;
}

export interface CustomerDisplayOrderPayload {
  orderNumber: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableNumber?: string;
  customerName?: string;
  paymentStatus?: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | string;
  items: CustomerDisplayItem[];
  totals: CustomerDisplayTotals;
}

export interface CustomerDisplayThankYouPayload {
  orderNumber: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableNumber?: string;
  customerName?: string;
}

export interface CustomerDisplaySessionPayload {
  cart?: CustomerDisplayCartPayload;
  order?: CustomerDisplayOrderPayload;
  thankYou?: CustomerDisplayThankYouPayload;
}

export interface CustomerDisplaySessionState {
  mode: CustomerDisplayMode;
  payload: CustomerDisplaySessionPayload | null;
  updatedAt?: string | null;
  staffName?: string | null;
  userId?: string | null;
  sessionId?: string | null;
  isLocked?: boolean;
}

export interface CustomerDisplayPayload {
  cart?: CustomerDisplayCartPayload;
  order?: CustomerDisplayOrderPayload;
  thankYou?: CustomerDisplayThankYouPayload;
  sessions?: Record<string, CustomerDisplaySessionState>;
}

export interface CustomerDisplayState {
  mode: CustomerDisplayMode;
  payload: CustomerDisplayPayload | null;
  isLocked?: boolean;
  updatedAt?: string | null;
}
