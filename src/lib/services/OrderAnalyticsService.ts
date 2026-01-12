/**
 * Order Analytics Service
 * 
 * Business logic for order analytics, statistics, and reporting.
 * Handles revenue tracking, popular items analysis, and order metrics.
 * 
 * @module OrderAnalyticsService
 */

import prisma from '@/lib/db/client';
import { OrderStatus, OrderType } from '@prisma/client';

// ===== TYPES =====

export interface DateRange {
  start: Date;
  end: Date;
}

export interface OrderStatistics {
  totalOrders: number;
  ordersByStatus: Record<OrderStatus, number>;
  ordersByType: Record<OrderType, number>;
  completedOrders: number;
  cancelledOrders: number;
  pendingOrders: number;
  averageOrderValue: number;
}

export interface PaymentStatistics {
  totalRevenue: number;
  completedPayments: number;
  pendingPayments: number;
  failedPayments: number;
  refundedPayments: number;
  byMethod: Record<string, { count: number; amount: number }>;
}

export interface PopularItem {
  menuId: bigint;
  menuName: string;
  quantity: number;
  revenue: number;
  orderCount: number;
}

export interface RevenueByDate {
  date: string;
  revenue: number;
  orderCount: number;
}

export interface AnalyticsData {
  statistics: OrderStatistics;
  paymentStats: PaymentStatistics;
  popularItems: PopularItem[];
  revenueByDate: RevenueByDate[];
  peakHours: { hour: number; orderCount: number }[];
}

// ===== SERVICE CLASS =====

export class OrderAnalyticsService {
  /**
   * Get comprehensive analytics data for a date range
   */
  static async getAnalytics(
    merchantId: bigint,
    dateRange: DateRange
  ): Promise<AnalyticsData> {
    const [statistics, paymentStats, popularItems, revenueByDate, peakHours] =
      await Promise.all([
        this.getOrderStatistics(merchantId, dateRange),
        this.getPaymentStatistics(merchantId, dateRange),
        this.getPopularItems(merchantId, dateRange, 10),
        this.getRevenueByDate(merchantId, dateRange),
        this.getPeakHours(merchantId, dateRange),
      ]);

    return {
      statistics,
      paymentStats,
      popularItems,
      revenueByDate,
      peakHours,
    };
  }

  /**
   * Get order statistics
   */
  static async getOrderStatistics(
    merchantId: bigint,
    dateRange: DateRange
  ): Promise<OrderStatistics> {
    const orders = await prisma.order.findMany({
      where: {
        merchantId,
        placedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      select: {
        status: true,
        orderType: true,
        totalAmount: true,
      },
    });

    const totalOrders = orders.length;
    const ordersByStatus: Record<OrderStatus, number> = {
      PENDING: 0,
      ACCEPTED: 0,
      IN_PROGRESS: 0,
      READY: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    const ordersByType: Record<OrderType, number> = {
      DINE_IN: 0,
      TAKEAWAY: 0,
      DELIVERY: 0,
    };

    let totalAmount = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let pendingOrders = 0;

    orders.forEach((order) => {
      ordersByStatus[order.status]++;
      ordersByType[order.orderType]++;
      totalAmount += Number(order.totalAmount);

      if (order.status === 'COMPLETED') completedOrders++;
      if (order.status === 'CANCELLED') cancelledOrders++;
      if (order.status === 'PENDING') pendingOrders++;
    });

    const averageOrderValue = totalOrders > 0 ? totalAmount / totalOrders : 0;

    return {
      totalOrders,
      ordersByStatus,
      ordersByType,
      completedOrders,
      cancelledOrders,
      pendingOrders,
      averageOrderValue,
    };
  }

  /**
   * Get payment statistics
   */
  static async getPaymentStatistics(
    merchantId: bigint,
    dateRange: DateRange
  ): Promise<PaymentStatistics> {
    const payments = await prisma.payment.findMany({
      where: {
        order: {
          merchantId,
          placedAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
      },
      select: {
        status: true,
        paymentMethod: true,
        amount: true,
      },
    });

    let totalRevenue = 0;
    let completedPayments = 0;
    let pendingPayments = 0;
    let failedPayments = 0;
    let refundedPayments = 0;

    const byMethod: Record<string, { count: number; amount: number }> = {};

    payments.forEach((payment) => {
      const amount = Number(payment.amount);

      if (payment.status === 'COMPLETED') {
        totalRevenue += amount;
        completedPayments++;
      }
      if (payment.status === 'PENDING') pendingPayments++;
      if (payment.status === 'FAILED') failedPayments++;
      if (payment.status === 'REFUNDED') {
        refundedPayments++;
        totalRevenue -= amount; // Subtract refunds from revenue
      }

      // Track by payment method
      const method = payment.paymentMethod;
      if (!byMethod[method]) {
        byMethod[method] = { count: 0, amount: 0 };
      }
      byMethod[method].count++;
      if (payment.status === 'COMPLETED') {
        byMethod[method].amount += amount;
      }
    });

    return {
      totalRevenue,
      completedPayments,
      pendingPayments,
      failedPayments,
      refundedPayments,
      byMethod,
    };
  }

  /**
   * Get popular menu items
   */
  static async getPopularItems(
    merchantId: bigint,
    dateRange: DateRange,
    limit = 10
  ): Promise<PopularItem[]> {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          merchantId,
          placedAt: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
          status: 'COMPLETED', // Only count completed orders
        },
      },
      select: {
        menuId: true,
        quantity: true,
        subtotal: true,
        menuName: true,
      },
    });

    // Aggregate by menu
    const menuMap = new Map<
      string,
      { menuId: bigint; menuName: string; quantity: number; revenue: number; orderCount: number }
    >();

    orderItems.forEach((item) => {
      if (!item.menuId) return; // Skip items without menuId
      const menuId = item.menuId.toString();
      const existing = menuMap.get(menuId);

      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += Number(item.subtotal);
        existing.orderCount++;
      } else {
        menuMap.set(menuId, {
          menuId: item.menuId,
          menuName: item.menuName,
          quantity: item.quantity,
          revenue: Number(item.subtotal),
          orderCount: 1,
        });
      }
    });

    // Convert to array and sort by quantity
    const popularItems = Array.from(menuMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);

    return popularItems;
  }

  /**
   * Get revenue by date for charting
   */
  static async getRevenueByDate(
    merchantId: bigint,
    dateRange: DateRange
  ): Promise<RevenueByDate[]> {
    const orders = await prisma.order.findMany({
      where: {
        merchantId,
        placedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        payment: {
          is: {
            status: 'COMPLETED',
          },
        },
      },
      select: {
        placedAt: true,
        totalAmount: true,
      },
      orderBy: {
        placedAt: 'asc',
      },
    });

    // Group by date
    const revenueByDateMap = new Map<string, { revenue: number; orderCount: number }>();

    orders.forEach((order) => {
      const date = order.placedAt.toISOString().split('T')[0]; // YYYY-MM-DD
      const existing = revenueByDateMap.get(date);

      if (existing) {
        existing.revenue += Number(order.totalAmount);
        existing.orderCount++;
      } else {
        revenueByDateMap.set(date, {
          revenue: Number(order.totalAmount),
          orderCount: 1,
        });
      }
    });

    // Convert to array
    const revenueByDate = Array.from(revenueByDateMap.entries()).map(([date, data]) => ({
      date,
      revenue: data.revenue,
      orderCount: data.orderCount,
    }));

    return revenueByDate;
  }

  /**
   * Get peak hours (busiest times of day)
   */
  static async getPeakHours(
    merchantId: bigint,
    dateRange: DateRange
  ): Promise<{ hour: number; orderCount: number }[]> {
    const orders = await prisma.order.findMany({
      where: {
        merchantId,
        placedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      select: {
        placedAt: true,
      },
    });

    // Group by hour (0-23)
    const hourCounts = new Array(24).fill(0);

    orders.forEach((order) => {
      const hour = order.placedAt.getHours();
      hourCounts[hour]++;
    });

    // Convert to array of objects
    const peakHours = hourCounts.map((count, hour) => ({
      hour,
      orderCount: count,
    }));

    return peakHours;
  }

  /**
   * Get customer insights
   */
  static async getCustomerInsights(
    merchantId: bigint,
    dateRange: DateRange
  ): Promise<{
    totalCustomers: number;
    returningCustomers: number;
    newCustomers: number;
    topCustomers: Array<{ customerId: bigint; customerName: string; orderCount: number; totalSpent: number }>;
  }> {
    const orders = await prisma.order.findMany({
      where: {
        merchantId,
        placedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
        customerId: { not: null },
        status: 'COMPLETED',
      },
      select: {
        customerId: true,
        totalAmount: true,
        customer: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
    });

    const customerMap = new Map<
      string,
      { customerId: bigint; customerName: string; orderCount: number; totalSpent: number; isNew: boolean }
    >();

    orders.forEach((order) => {
      if (!order.customerId || !order.customer) return;

      const customerId = order.customerId.toString();
      const existing = customerMap.get(customerId);

      const isNew = order.customer.createdAt >= dateRange.start;

      if (existing) {
        existing.orderCount++;
        existing.totalSpent += Number(order.totalAmount);
      } else {
        customerMap.set(customerId, {
          customerId: order.customerId,
          customerName: order.customer.name,
          orderCount: 1,
          totalSpent: Number(order.totalAmount),
          isNew,
        });
      }
    });

    const customers = Array.from(customerMap.values());
    const totalCustomers = customers.length;
    const newCustomers = customers.filter((c) => c.isNew).length;
    const returningCustomers = customers.filter((c) => c.orderCount > 1).length;

    // Get top 10 customers by total spent
    const topCustomers = customers
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)
      .map((c) => ({
        customerId: c.customerId,
        customerName: c.customerName,
        orderCount: c.orderCount,
        totalSpent: c.totalSpent,
      }));

    return {
      totalCustomers,
      returningCustomers,
      newCustomers,
      topCustomers,
    };
  }
}
