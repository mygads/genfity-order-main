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
import balanceService from '@/lib/services/BalanceService';
import subscriptionHistoryService from '@/lib/services/SubscriptionHistoryService';
import CustomerPushService from '@/lib/services/CustomerPushService';
import { shouldSendCustomerEmail } from '@/lib/utils/emailGuards';

function redactEmailForLogs(email: string): string {
  const normalized = email.trim();
  const at = normalized.indexOf('@');
  if (at <= 0) return 'redacted';
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const safeLocal = local.length <= 2 ? `${local[0] ?? ''}*` : `${local[0]}***${local[local.length - 1]}`;
  return `${safeLocal}@${domain}`;
}

export class OrderManagementService {
  /**
   * Update admin-only note for an order.
   * - Customer notes (order.notes) remain read-only and unchanged
   * - Persists adminNote and a DB-stored combined kitchenNotes string
   */
  static async updateAdminNote(
    orderId: bigint,
    merchantId: bigint,
    adminNote: string | null,
  ): Promise<OrderWithDetails> {
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId,
      },
      select: {
        id: true,
        notes: true,
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const normalizedAdmin = (adminNote ?? '').trim();
    const nextAdminNote = normalizedAdmin.length > 0 ? normalizedAdmin : null;

    const customerNote = (order.notes ?? '').trim();
    const nextKitchenNotes = nextAdminNote
      ? (customerNote ? `${customerNote} - admin: ${nextAdminNote}` : `- admin: ${nextAdminNote}`)
      : null;

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        adminNote: nextAdminNote,
        kitchenNotes: nextKitchenNotes,
      },
      include: ORDER_DETAIL_INCLUDE,
    });

    // Prisma's payload inference can lose nested include typing when using shared include constants.
    // We include ORDER_DETAIL_INCLUDE (which includes addons), so the runtime shape matches OrderWithDetails.
    return updated as unknown as OrderWithDetails;
  }

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

    // Delivery completion guard:
    // A delivery order should only be marked COMPLETED after it is actually DELIVERED.
    // This prevents inconsistent states like COMPLETED but not delivered.
    const isDelivery = order.orderType === 'DELIVERY';
    if (data.status === 'COMPLETED' && isDelivery) {
      if (order.deliveryStatus !== 'DELIVERED') {
        throw new Error('Cannot transition order to COMPLETED before delivery status is DELIVERED');
      }
      // If driver marks delivery as DELIVERED, we auto-complete the order.
      // In that flow, the order might still be READY/IN_PROGRESS depending on merchant actions.
      // We intentionally allow completion here when the delivery is delivered.
    } else {
      const validationError = validateStatusTransition(order.status, data.status);
      if (validationError) {
        throw new Error(validationError);
      }
    }

    const shouldAutoMarkPaid = order.status === 'READY' && data.status === 'COMPLETED';
    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: data.status,
          ...(data.status === 'COMPLETED' && { completedAt: now }),
          ...(data.status === 'CANCELLED' && { cancelledAt: now }),
          ...(data.status === 'READY' && { actualReadyAt: now }),
          // Note: acceptedAt field doesn't exist in schema, status change is sufficient
        },
        include: {
          ...ORDER_DETAIL_INCLUDE,
          merchant: {
            select: {
              name: true,
              code: true,
              country: true,
              timezone: true,
              currency: true,
              address: true,
              phone: true,
              email: true,
              logoUrl: true,
              receiptSettings: true,
            },
          },
        },
      });

      if (shouldAutoMarkPaid) {
        const existingPayment = await tx.payment.findUnique({
          where: { orderId },
        });

        const defaultPaymentMethod: PaymentMethod =
          updatedOrder.orderType === 'DELIVERY'
            ? 'CASH_ON_DELIVERY'
            : 'CASH_ON_COUNTER';

        if (existingPayment) {
          await tx.payment.update({
            where: { orderId },
            data: {
              status: 'COMPLETED',
              paidAt: existingPayment.paidAt ?? now,
              paidByUserId: existingPayment.paidByUserId ?? data.userId,
            },
          });
        } else {
          await tx.payment.create({
            data: {
              orderId,
              amount: updatedOrder.totalAmount,
              paymentMethod: defaultPaymentMethod,
              status: 'COMPLETED',
              paidAt: now,
              paidByUserId: data.userId,
              notes: 'Auto-marked as paid when order was completed',
            },
          });
        }
      }

      return updatedOrder;
    });

    // Deduct order fee when order is ACCEPTED (for deposit mode subscription)
    if (data.status === 'ACCEPTED' && order.merchantId) {
      try {
        const deductResult = await balanceService.deductOrderFee(
          order.merchantId,
          orderId,
          order.orderNumber
        );
        console.log(`[Order ${order.orderNumber}] Balance deduction result:`, deductResult);
      } catch (deductError) {
        console.error(`[Order ${order.orderNumber}] Failed to deduct order fee:`, deductError);
        // Don't throw - fee deduction failure shouldn't block the status update
      }
    }

    // Send email notification when order is completed
    // - Online customer orders: have a real customer email
    // - POS walk-in orders: customer is null (no email)
    // - POS orders with placeholder/guest email: filtered out here
    const completedCustomerEmail = updated.customer?.email;
    if (data.status === 'COMPLETED') {
      if (!completedCustomerEmail) {
        console.warn(`[Order ${order.orderNumber}] Completed email skipped: missing customer email`);
      } else if (!shouldSendCustomerEmail(completedCustomerEmail)) {
        console.warn(
          `[Order ${order.orderNumber}] Completed email skipped: guest/placeholder email (${redactEmailForLogs(completedCustomerEmail)})`
        );
      } else {
        try {
          const sent = await emailService.sendOrderCompleted({
          to: completedCustomerEmail,
          customerName: updated.customer?.name || 'Customer',
          orderNumber: updated.orderNumber,
          merchantName: updated.merchant?.name || 'Restaurant',
          merchantCode: updated.merchant?.code || '',
          merchantLogoUrl: (updated.merchant as any)?.logoUrl,
          merchantAddress: (updated.merchant as any)?.address,
          merchantPhone: (updated.merchant as any)?.phone,
          merchantEmail: (updated.merchant as any)?.email,
          receiptSettings: (updated.merchant as any)?.receiptSettings,
          merchantCountry: updated.merchant?.country,
          merchantTimezone: updated.merchant?.timezone,
          currency: updated.merchant?.currency,
          orderType: updated.orderType as 'DINE_IN' | 'TAKEAWAY',
          tableNumber: updated.tableNumber,
          customerPhone: updated.customer?.phone,
          customerEmail: updated.customer?.email,
          items: updated.orderItems?.map((item: any) => ({
            menuName: item.menuName,
            quantity: item.quantity,
            unitPrice: Number(item.menuPrice),
            subtotal: Number(item.subtotal),
            notes: item.notes,
            addons: (item.addons || []).map((addon: any) => ({
              addonName: addon.addonName,
              addonPrice: Number(addon.addonPrice),
              quantity: addon.quantity,
              subtotal: Number(addon.subtotal),
            })),
          })) || [],
          subtotal: Number((updated as any).subtotal),
          taxAmount: Number((updated as any).taxAmount || 0),
          serviceChargeAmount: Number((updated as any).serviceChargeAmount || 0),
          packagingFeeAmount: Number((updated as any).packagingFeeAmount || 0),
          discountAmount: typeof (updated as any).discountAmount !== 'undefined' ? Number((updated as any).discountAmount) : undefined,
          totalAmount: Number(updated.totalAmount),
          paymentMethod: updated.payment?.paymentMethod || null,
          completedAt: updated.completedAt || new Date(),
        });

          if (sent) {
            console.log(`✅ [Order ${order.orderNumber}] Completed email sent to ${redactEmailForLogs(completedCustomerEmail)}`);
          } else {
            console.error(
              `❌ [Order ${order.orderNumber}] Completed email failed (EmailService returned false) for ${redactEmailForLogs(completedCustomerEmail)}`
            );
          }
        } catch (emailError) {
          console.error(`[Order ${order.orderNumber}] Failed to send order completed email:`, emailError);
          // Don't throw - email failure shouldn't block the status update
        }
      }
    }

    // Send push notification for customer order status updates
    const pushStatuses: ('PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED')[] = ['READY', 'COMPLETED', 'CANCELLED'];
    if (pushStatuses.includes(data.status as 'READY' | 'COMPLETED' | 'CANCELLED')) {
      try {
        // Get merchant code for notification URL
        const merchant = await prisma.merchant.findUnique({
          where: { id: order.merchantId },
          select: { code: true, name: true },
        });

        if (merchant) {
          const sentCount = await CustomerPushService.notifyOrderStatusChange(
            order.orderNumber,
            data.status as 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED',
            merchant.name,
            merchant.code,
            updated.customerId,
            updated.orderType as 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
          );
          console.log(`📱 [Order ${order.orderNumber}] Push notifications sent: ${sentCount}`);
        }
      } catch (pushError) {
        console.error(`[Order ${order.orderNumber}] Failed to send push notification:`, pushError);
        // Don't throw - push failure shouldn't block the status update
      }
    }

    // Check for low stock items when order is COMPLETED
    if (data.status === 'COMPLETED' && updated.orderItems && updated.orderItems.length > 0) {
      try {
        const StockAlertService = (await import('@/lib/services/StockAlertService')).default;
        const menuIds = updated.orderItems
          .map((item: { menuId: bigint | null }) => item.menuId)
          .filter((id: bigint | null): id is bigint => id !== null);

        if (menuIds.length > 0) {
          await StockAlertService.checkAfterOrder(updated.merchantId, menuIds);
        }
      } catch (stockError) {
        console.error(`[Order ${order.orderNumber}] Failed to check stock alerts:`, stockError);
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

      // ✅ Auto-update order status to ACCEPTED if currently PENDING
      // This ensures paid orders move to the next stage automatically
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });

      if (currentOrder?.status === 'PENDING') {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'ACCEPTED',
          },
        });
        console.log(`[OrderManagementService] Order ${orderId} auto-accepted after payment recorded`);
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
   * Confirm CASH_ON_DELIVERY payment was received.
   *
   * Sets Payment.status=COMPLETED and paidAt/paidByUserId.
   */
  static async confirmCashOnDeliveryPayment(
    orderId: bigint,
    userId: bigint,
    notes?: string
  ): Promise<{ order: OrderWithDetails; payment: Payment }> {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          totalAmount: true,
        },
      });

      if (!order) {
        throw new Error(`Order with ID ${orderId} not found`);
      }

      const existingPayment = await tx.payment.findUnique({
        where: { orderId },
      });

      if (existingPayment && existingPayment.paymentMethod !== 'CASH_ON_DELIVERY') {
        throw new Error('This order is not Cash on Delivery');
      }

      let payment: Payment;

      if (existingPayment) {
        payment = await tx.payment.update({
          where: { orderId },
          data: {
            status: 'COMPLETED',
            paidAt: new Date(),
            paidByUserId: userId,
            notes: notes ?? existingPayment.notes,
          },
        });
      } else {
        payment = await tx.payment.create({
          data: {
            orderId,
            amount: order.totalAmount,
            paymentMethod: 'CASH_ON_DELIVERY',
            status: 'COMPLETED',
            paidAt: new Date(),
            paidByUserId: userId,
            notes,
          },
        });
      }

      // If the order is still pending, accept it after payment.
      const currentOrder = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });

      if (currentOrder?.status === 'PENDING') {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'ACCEPTED',
          },
        });
      }

      const fullOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: ORDER_DETAIL_INCLUDE,
      });

      return { order: fullOrder!, payment };
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
