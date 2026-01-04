/**
 * Order Management Service - Phase 1
 * 
 * Business logic for Order Management System
 * Reference: /docs/ORDER_MANAGEMENT_SYSTEM_GUIDE.md Section 12
 * 
 * Key Features:
 * - No OrderStatusHistory (uses timestamps)
 * - Customer data from User relation (no duplicate fields)
 * - Payment table support (1:1 relation)
 * - orderNumber for payment verification
 */

import prisma from '@/lib/db/client';
import { OrderStatus, PaymentMethod, Payment, OrderType, Prisma } from '@prisma/client';
import {
  OrderFilters,
  OrderWithDetails,
  OrderListItem,
  RecordPaymentData,
  UpdateOrderStatusData,
  CancelOrderData,
  OrderStats,
  buildOrderWhereInput,
  ORDER_DETAIL_INCLUDE,
  ORDER_LIST_INCLUDE,
  ORDER_KITCHEN_INCLUDE,
  PaymentVerificationResult,
} from '@/lib/types/order';
import { validateStatusTransition } from '@/lib/utils/orderStatusRules';
import emailService from '@/lib/services/EmailService';

export class OrderManagementService {
  /**
   * Fetch merchant orders with filters and pagination
   * @param merchantId - Merchant ID
   * @param filters - Order filters including optional includeItems for kitchen display
   */
  static async getOrders(
    merchantId: bigint,
    filters: OrderFilters = {}
  ): Promise<{ orders: OrderListItem[] | OrderWithDetails[]; total: number }> {
    const where = buildOrderWhereInput(merchantId, filters);

    // Use kitchen include if includeItems is true (for kitchen display)
    const includeConfig = filters.includeItems ? ORDER_KITCHEN_INCLUDE : ORDER_LIST_INCLUDE;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: includeConfig,
        orderBy: {
          placedAt: 'desc',
        },
        ...(filters.limit && {
          take: filters.limit,
          skip: ((filters.page || 1) - 1) * filters.limit,
        }),
      }),
      prisma.order.count({ where }),
    ]);

    return {
      orders: orders as (OrderListItem[] | OrderWithDetails[]),
      total,
    };
  }

  /**
   * Get single order with full details
   */
  static async getOrderById(
    orderId: bigint,
    merchantId: bigint
  ): Promise<OrderWithDetails | null> {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId,
      },
      include: ORDER_DETAIL_INCLUDE,
    });

    return order as OrderWithDetails | null;
  }

  /**
   * Get only active orders (not COMPLETED or CANCELLED)
   */
  static async getActiveOrders(merchantId: bigint): Promise<OrderListItem[]> {
    const orders = await prisma.order.findMany({
      where: {
        merchantId,
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
      },
      include: ORDER_LIST_INCLUDE,
      orderBy: {
        placedAt: 'asc',
      },
    });

    return orders as OrderListItem[];
  }

  /**
   * Update order status with validation
   */
  static async updateStatus(
    orderId: bigint,
    data: UpdateOrderStatusData
  ): Promise<OrderWithDetails> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const validationError = validateStatusTransition(order.status, data.status);
    if (validationError) {
      throw new Error(validationError);
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: data.status,
        ...(data.status === 'COMPLETED' && { completedAt: new Date() }),
        ...(data.status === 'CANCELLED' && { cancelledAt: new Date() }),
        ...(data.status === 'READY' && { actualReadyAt: new Date() }),
      },
      include: {
        ...ORDER_DETAIL_INCLUDE,
        merchant: {
          select: {
            name: true,
          },
        },
      },
    });

    // Send email notification when order is completed
    if (data.status === 'COMPLETED' && updated.customer?.email) {
      try {
        await emailService.sendOrderCompleted({
          to: updated.customer.email,
          customerName: updated.customer?.name || 'Customer',
          orderNumber: updated.orderNumber,
          merchantName: updated.merchant?.name || 'Restaurant',
          orderType: updated.orderType as 'DINE_IN' | 'TAKEAWAY',
          items: updated.orderItems?.map((item: { menuName: string; quantity: number; menuPrice: { toNumber: () => number } }) => ({
            name: item.menuName,
            quantity: item.quantity,
            price: Number(item.menuPrice),
          })) || [],
          total: Number(updated.totalAmount),
          completedAt: updated.completedAt || new Date(),
        });
        console.log(`✅ Order completed email sent to ${updated.customer.email}`);
      } catch (emailError) {
        console.error('❌ Failed to send order completed email:', emailError);
        // Don't throw - email failure shouldn't block the status update
      }
    }

    return updated as unknown as OrderWithDetails;
  }

  /**
   * Cancel order
   */
  static async cancelOrder(
    orderId: bigint,
    data: CancelOrderData
  ): Promise<OrderWithDetails> {
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: data.reason,
      },
      include: ORDER_DETAIL_INCLUDE,
    });

    return updated as unknown as OrderWithDetails;
  }

  /**
   * Verify orderNumber for payment
   */
  static async verifyOrderNumber(
    orderNumber: string,
    merchantId: bigint
  ): Promise<PaymentVerificationResult | null> {
    const order = await prisma.order.findFirst({
      where: {
        orderNumber,
        merchantId,
      },
      include: ORDER_DETAIL_INCLUDE,
    });

    if (!order) {
      return null;
    }

    return {
      order: order as unknown as OrderWithDetails,
      payment: order.payment || null,
    };
  }

  /**
   * Record payment (create or update Payment record)
   */
  static async recordPayment(
    orderId: bigint,
    data: RecordPaymentData
  ): Promise<{ order: OrderWithDetails; payment: Payment }> {
    const result = await prisma.$transaction(async (tx) => {
      // Validate order exists first
      const orderExists = await tx.order.findUnique({
        where: { id: orderId },
        select: { id: true },
      });

      if (!orderExists) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      const existingPayment = await tx.payment.findUnique({
        where: { orderId },
      });

      let payment;

      if (existingPayment) {
        payment = await tx.payment.update({
          where: { orderId },
          data: {
            status: 'COMPLETED',
            paymentMethod: data.paymentMethod,
            paidAt: new Date(),
            paidByUserId: data.userId,
            notes: data.notes,
            amount: data.amount,
          },
        });
      } else {
        payment = await tx.payment.create({
          data: {
            orderId: orderId,
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            status: 'COMPLETED',
            paidAt: new Date(),
            paidByUserId: data.userId,
            notes: data.notes,
          },
        });
      }

      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: ORDER_DETAIL_INCLUDE,
      });

      return { order: order!, payment };
    });

    return result as unknown as { order: OrderWithDetails; payment: Payment };
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(
    merchantId: bigint,
    startDate?: string,
    endDate?: string
  ): Promise<OrderStats> {
    const where: Prisma.OrderWhereInput = {
      merchantId,
      ...(startDate || endDate ? {
        placedAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      } : {}),
    };

    const orders = await prisma.order.findMany({
      where,
      include: {
        payment: true,
        orderItems: {
          include: {
            menu: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const totalOrders = orders.length;

    const ordersByStatus = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<OrderStatus, number>);

    const ordersByType = orders.reduce((acc, order) => {
      acc[order.orderType] = (acc[order.orderType] || 0) + 1;
      return acc;
    }, {} as Record<OrderType, number>);

    const completedPayments = orders.filter(o => o.payment?.status === 'COMPLETED').length;
    const pendingPayments = orders.filter(o => !o.payment || o.payment.status === 'PENDING').length;
    const totalRevenue = orders
      .filter(o => o.payment?.status === 'COMPLETED')
      .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const byMethod = orders.reduce((acc, order) => {
      if (order.payment && order.payment.status === 'COMPLETED') {
        const method = order.payment.paymentMethod;
        if (!acc[method]) {
          acc[method] = { count: 0, amount: 0 };
        }
        acc[method].count++;
        acc[method].amount += Number(order.totalAmount);
      }
      return acc;
    }, {} as Record<PaymentMethod, { count: number; amount: number }>);

    const averageOrderValue = totalOrders > 0 ? totalRevenue / completedPayments : 0;

    const itemCounts = orders.flatMap(o => o.orderItems).reduce((acc, item) => {
      if (!item.menuId) return acc; // Skip items without menuId
      const key = item.menuId.toString();
      if (!acc[key]) {
        acc[key] = {
          menuId: item.menuId,
          menuName: item.menuName,
          orderCount: 0,
          totalQuantity: 0,
          totalRevenue: 0,
        };
      }
      acc[key].orderCount++;
      acc[key].totalQuantity += item.quantity;
      acc[key].totalRevenue += Number(item.subtotal);
      return acc;
    }, {} as Record<string, { menuId: bigint; menuName: string; totalQuantity: number; totalRevenue: number; orderCount: number }>);

    const popularItems = Object.values(itemCounts)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 10);

    return {
      totalOrders,
      ordersByStatus,
      ordersByType,
      paymentStats: {
        totalRevenue,
        completedPayments,
        pendingPayments,
        byMethod,
      },
      averageOrderValue,
      popularItems,
    };
  }
}
