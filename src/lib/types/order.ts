/**
 * Order Management Type Definitions
 * 
 * TypeScript types and interfaces for Order Management System
 * Reference: /docs/ORDER_MANAGEMENT_SYSTEM_GUIDE.md
 */

import { Order, OrderItem, OrderItemAddon, Payment, User, OrderStatus, OrderType, PaymentStatus, PaymentMethod } from '@prisma/client';
import { Prisma } from '@prisma/client';

// ===== ORDER WITH RELATIONS =====

/**
 * Order with payment relation (1:1)
 * Used for checking payment status quickly
 */
export type OrderWithPayment = Order & {
  payment?: Payment | null;
};

/**
 * Order with customer relation
 * Used for displaying customer info
 */
export type OrderWithCustomer = Order & {
  customer?: Pick<User, 'id' | 'name' | 'email' | 'phone'> | null;
};

/**
 * Order item with addons
 */
export type OrderItemWithAddons = OrderItem & {
  addons: OrderItemAddon[];
  menu?: {
    id: bigint;
    name: string;
    imageUrl?: string | null;
  } | null;
};

/**
 * Full order with all relations
 * Used in order detail page and API responses
 */
export type OrderWithDetails = Order & {
  payment?: (Payment & { paidByUser?: Pick<User, 'id' | 'name' | 'email'> | null }) | null;
  customer?: Pick<User, 'id' | 'name' | 'email' | 'phone'> | null;
  orderItems: OrderItemWithAddons[];
};

/**
 * Order with minimal relations for list view
 */
export type OrderListItem = Order & {
  payment?: Pick<Payment, 'id' | 'status' | 'paymentMethod' | 'paidAt'> | null;
  customer?: Pick<User, 'id' | 'name' | 'phone'> | null;
  _count?: {
    orderItems: number;
  };
};

// ===== PAYMENT TYPES =====

/**
 * Payment with user relation (who recorded the payment)
 */
export type PaymentWithUser = Payment & {
  paidBy?: Pick<User, 'id' | 'name' | 'email'> | null;
};

/**
 * Data for recording payment
 */
export interface RecordPaymentData {
  paymentMethod: PaymentMethod;
  amount: number;
  userId: bigint; // Staff who recorded payment
  notes?: string;
}

/**
 * Payment verification result
 */
export interface PaymentVerificationResult {
  order: OrderWithDetails;
  payment: Payment | null;
}

// ===== FILTER & QUERY TYPES =====

/**
 * Order filters for queries
 */
export interface OrderFilters {
  status?: OrderStatus | OrderStatus[]; // Support single or multiple statuses
  paymentStatus?: PaymentStatus;
  orderType?: OrderType;
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
  since?: number;     // Timestamp for real-time polling
  page?: number;
  limit?: number;
  includeItems?: boolean; // Include full orderItems for kitchen display
}

/**
 * Order statistics
 */
export interface OrderStats {
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  ordersByType: Record<OrderType, number>;
  paymentStats: {
    totalRevenue: number;
    completedPayments: number;
    pendingPayments: number;
    byMethod: Record<PaymentMethod, {
      count: number;
      amount: number;
    }>;
  };
  averageOrderValue: number;
  popularItems: Array<{
    menuId: bigint;
    menuName: string;
    orderCount: number;
    totalQuantity: number;
  }>;
}

// ===== ORDER UPDATE TYPES =====

/**
 * Data for updating order status
 */
export interface UpdateOrderStatusData {
  status: OrderStatus;
  note?: string;
  userId: bigint; // User who made the change
}

/**
 * Data for cancelling order
 */
export interface CancelOrderData {
  reason: string;
  userId: bigint; // User who cancelled
}

// ===== API RESPONSE TYPES =====

/**
 * Paginated order list response
 */
export interface PaginatedOrdersResponse {
  data: OrderListItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Order detail response
 */
export interface OrderDetailResponse {
  order: OrderWithDetails;
}

/**
 * Order statistics response
 */
export interface OrderStatsResponse {
  stats: OrderStats;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

// ===== KANBAN BOARD TYPES =====

/**
 * Orders grouped by status for Kanban board
 */
export type OrdersByStatus = Partial<Record<OrderStatus, OrderListItem[]>>;

/**
 * Kanban column data
 */
export interface KanbanColumn {
  status: OrderStatus;
  label: string;
  orders: OrderListItem[];
  count: number;
}

// ===== ORDER TIMESTAMPS =====

/**
 * Order timestamps for simple timeline
 * (Alternative to OrderStatusHistory - simpler approach)
 */
export interface OrderTimestamps {
  placedAt: Date;        // Order placed (PENDING)
  updatedAt: Date;       // Last update
  estimatedReadyAt?: Date | null; // Estimated ready time
  actualReadyAt?: Date | null;    // Actual ready time (READY)
  completedAt?: Date | null;      // Completion time (COMPLETED)
  cancelledAt?: Date | null;      // Cancellation time (CANCELLED)
}

// ===== PRISMA WHERE INPUT HELPERS =====

/**
 * Build Prisma where clause for order filters
 */
export function buildOrderWhereInput(
  merchantId: bigint,
  filters: OrderFilters
): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = {
    merchantId,
  };

  // Support single status or array of statuses (for kitchen display efficiency)
  if (filters.status) {
    where.status = Array.isArray(filters.status)
      ? { in: filters.status }
      : filters.status;
  }

  if (filters.paymentStatus) {
    where.payment = {
      status: filters.paymentStatus,
    };
  }

  if (filters.orderType) {
    where.orderType = filters.orderType;
  }

  if (filters.startDate || filters.endDate) {
    where.placedAt = {
      ...(filters.startDate && { gte: new Date(filters.startDate) }),
      ...(filters.endDate && { lte: new Date(filters.endDate) }),
    };
  }

  // For real-time polling - get orders updated since timestamp
  if (filters.since) {
    where.updatedAt = {
      gte: new Date(filters.since),
    };
  }

  return where;
}

// ===== ORDER INCLUDE OPTIONS =====

/**
 * Include options for full order details
 */
export const ORDER_DETAIL_INCLUDE: Prisma.OrderInclude = {
  payment: {
    include: {
      paidBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  },
  orderItems: {
    include: {
      addons: {
        include: {
          addonItem: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      menu: {
        select: {
          id: true,
          name: true,
          imageUrl: true,
        },
      },
    },
  },
} as const;

/**
 * Include options for order list view (minimal data)
 */
export const ORDER_LIST_INCLUDE: Prisma.OrderInclude = {
  payment: {
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      paidAt: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
  _count: {
    select: {
      orderItems: true,
    },
  },
} as const;

/**
 * Include options for kitchen display (includes full orderItems for cooks)
 */
export const ORDER_KITCHEN_INCLUDE: Prisma.OrderInclude = {
  payment: {
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      paidAt: true,
    },
  },
  customer: {
    select: {
      id: true,
      name: true,
      phone: true,
    },
  },
  orderItems: {
    include: {
      addons: {
        include: {
          addonItem: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  },
} as const;
