/**
 * Order Repository
 * Handles order-related database operations
 */

import prisma from '@/lib/db/client';
import { OrderStatus, OrderType } from '@prisma/client';

export class OrderRepository {
  /**
   * Create new order with items and addons (transaction)
   */
  async createOrder(orderData: {
    merchantId: bigint;
    customerId?: bigint;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    orderType: 'DINE_IN' | 'TAKEAWAY';
    tableNumber?: string;
    status?: string;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    notes?: string;
    qrCodeUrl?: string;
    items: Array<{
      menuId: bigint;
      menuName: string;
      menuPrice: number;
      quantity: number;
      subtotal: number;
      notes?: string;
      addons?: Array<{
        addonItemId: bigint;
        addonName: string;
        addonPrice: number;
        quantity: number;
        subtotal: number;
      }>;
    }>;
  }) {
    return prisma.$transaction(async (tx) => {
      // Create order
      const order = await tx.order.create({
        data: {
          merchantId: orderData.merchantId,
          customerId: orderData.customerId,
          orderNumber: orderData.orderNumber,
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          customerPhone: orderData.customerPhone,
          orderType: orderData.orderType,
          tableNumber: orderData.tableNumber,
          status: orderData.status as OrderStatus,
          subtotal: orderData.subtotal,
          taxAmount: orderData.taxAmount,
          totalAmount: orderData.totalAmount,
          notes: orderData.notes,
          qrCodeUrl: orderData.qrCodeUrl,
        },
      });

      // Create order items
      for (const item of orderData.items) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            menuId: item.menuId,
            menuName: item.menuName,
            menuPrice: item.menuPrice,
            quantity: item.quantity,
            subtotal: item.subtotal,
            notes: item.notes,
          },
        });

        // Create addon items if any
        if (item.addons && item.addons.length > 0) {
          for (const addon of item.addons) {
            await tx.orderItemAddon.create({
              data: {
                orderItemId: orderItem.id,
                addonItemId: addon.addonItemId,
                addonName: addon.addonName,
                addonPrice: addon.addonPrice,
                quantity: addon.quantity,
                subtotal: addon.subtotal,
              },
            });
          }
        }
      }

      // Create initial status history
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: orderData.status as OrderStatus,
          note: 'Order placed',
        },
      });

      return order;
    });
  }

  /**
   * Find order by ID
   */
  async findById(id: bigint) {
    return prisma.order.findUnique({
      where: { id },
      include: {
        merchant: true,
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        orderItems: {
          include: {
            menu: true,
            addons: {
              include: {
                addonItem: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  /**
   * Find order by order number
   */
  async findByOrderNumber(orderNumber: string) {
    return prisma.order.findFirst({
      where: { orderNumber },
      include: {
        merchant: true,
        orderItems: {
          include: {
            addons: true,
          },
        },
        statusHistory: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  /**
   * Find orders by merchant
   */
  async findByMerchant(
    merchantId: bigint,
    filters?: {
      status?: string;
      orderType?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    return prisma.order.findMany({
      where: {
        merchantId,
        ...(filters?.status && { status: filters.status as OrderStatus }),
        ...(filters?.orderType && { orderType: filters.orderType as OrderType }),
        ...(filters?.startDate &&
          filters?.endDate && {
            placedAt: {
              gte: filters.startDate,
              lte: filters.endDate,
            },
          }),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        orderItems: {
          include: {
            addons: true,
          },
        },
      },
      orderBy: {
        placedAt: 'desc',
      },
    });
  }

  /**
   * Find orders by customer
   */
  async findByCustomer(customerId: bigint) {
    return prisma.order.findMany({
      where: { customerId },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        orderItems: {
          include: {
            addons: true,
          },
        },
      },
      orderBy: {
        placedAt: 'desc',
      },
    });
  }

  /**
   * Update order status
   */
  async updateStatus(
    orderId: bigint,
    newStatus: string,
    changedByUserId?: bigint,
    note?: string
  ) {
    return prisma.$transaction(async (tx) => {
      // Get current order
      const order = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new Error('Order not found');
      }

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: newStatus as OrderStatus,
        },
      });

      // Create status history entry
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: newStatus as OrderStatus,
          changedByUserId,
          note,
        },
      });

      return updatedOrder;
    });
  }

  /**
   * Get order status history
   */
  async getStatusHistory(orderId: bigint) {
    return prisma.orderStatusHistory.findMany({
      where: { orderId },
      include: {
        changedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get revenue report
   */
  async getRevenueReport(merchantId: bigint, startDate: Date, endDate: Date) {
    return prisma.order.groupBy({
      by: ['placedAt'],
      where: {
        merchantId,
        status: 'COMPLETED',
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });
  }

  /**
   * Get total revenue
   */
  async getTotalRevenue(
    merchantId: bigint,
    startDate?: Date,
    endDate?: Date
  ) {
    const result = await prisma.order.aggregate({
      where: {
        merchantId,
        status: 'COMPLETED',
        ...(startDate &&
          endDate && {
            placedAt: {
              gte: startDate,
              lte: endDate,
            },
          }),
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    return {
      totalRevenue: result._sum.totalAmount || 0,
      totalOrders: result._count.id || 0,
    };
  }

  /**
   * Generate unique order number
   */
  async generateOrderNumber(merchantId: bigint): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Get count of orders today for this merchant
    const count = await prisma.order.count({
      where: {
        merchantId,
        placedAt: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
    });

    // Format: ORD-YYYYMMDD-XXXX (e.g., ORD-20251109-0001)
    const orderNum = `ORD-${dateStr}-${String(count + 1).padStart(4, '0')}`;
    return orderNum;
  }
}

const orderRepository = new OrderRepository();
export default orderRepository;
