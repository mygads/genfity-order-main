/**
 * PaymentService
 * 
 * Service layer for payment operations
 * Handles payment recording, verification, and validation
 */

import prisma from '@/lib/db/client';
import type { Payment, PaymentMethod, PaymentStatus, Order } from '@prisma/client';
import type { OrderWithDetails, PaymentVerificationResult } from '@/lib/types/order';
import { ORDER_DETAIL_INCLUDE } from '@/lib/types/order';

export interface RecordPaymentData {
  orderId: bigint;
  paymentMethod: PaymentMethod;
  amount: number;
  paidByUserId: bigint;
  notes?: string;
}

export class PaymentService {
  /**
   * Record payment for an order
   * Creates or updates Payment record
   * Updates order status to COMPLETED if payment successful
   */
  static async recordPayment(
    data: RecordPaymentData
  ): Promise<{ order: Order; payment: Payment }> {
    const { orderId, paymentMethod, amount, paidByUserId, notes } = data;

    // Validate amount
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    if (amount < Number(order.totalAmount)) {
      throw new Error(
        `Payment amount (${amount}) cannot be less than order total (${order.totalAmount})`
      );
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId },
    });

    // Record payment in transaction
    const result = await prisma.$transaction(async (tx) => {
      let payment: Payment;

      if (existingPayment) {
        // Update existing payment
        payment = await tx.payment.update({
          where: { orderId },
          data: {
            status: 'COMPLETED',
            paymentMethod,
            paidAt: new Date(),
            paidByUserId,
            notes,
            amount,
          },
        });
      } else {
        // Create new payment record
        payment = await tx.payment.create({
          data: {
            orderId,
            amount,
            paymentMethod,
            status: 'COMPLETED',
            paidAt: new Date(),
            paidByUserId,
            notes,
          },
        });
      }

      // Update order status to COMPLETED
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      return { order: updatedOrder, payment };
    });

    return result;
  }

  /**
   * Verify orderNumber and get order details
   * Used for payment verification at cashier
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
      payment: order.payment,
    };
  }

  /**
   * Get payment by order ID
   */
  static async getPaymentByOrderId(orderId: bigint): Promise<Payment | null> {
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: {
        paidBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return payment;
  }

  /**
   * Get all payments for a merchant (with filters)
   */
  static async getPayments(
    merchantId: bigint,
    filters?: {
      status?: PaymentStatus;
      paymentMethod?: PaymentMethod;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      page?: number;
    }
  ): Promise<Payment[]> {
    const where: {
      order?: {
        merchantId: bigint;
      };
      status?: PaymentStatus;
      paymentMethod?: PaymentMethod;
      paidAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {
      order: {
        merchantId,
      },
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    if (filters?.startDate || filters?.endDate) {
      where.paidAt = {
        ...(filters.startDate && { gte: filters.startDate }),
        ...(filters.endDate && { lte: filters.endDate }),
      };
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderType: true,
            tableNumber: true,
            totalAmount: true,
          },
        },
        paidBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        paidAt: 'desc',
      },
      ...(filters?.limit && {
        take: filters.limit,
        skip: ((filters.page || 1) - 1) * filters.limit,
      }),
    });

    return payments;
  }

  /**
   * Cancel payment (for refunds)
   * Updates payment status to CANCELLED
   */
  static async cancelPayment(
    orderId: bigint,
    userId: bigint,
    reason?: string
  ): Promise<Payment> {
    const payment = await prisma.payment.update({
      where: { orderId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Cancelled: ${reason}` : 'Payment cancelled',
        updatedAt: new Date(),
      },
    });

    // Also update order status back to previous state
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'READY', // Or appropriate status
        completedAt: null,
      },
    });

    return payment;
  }

  /**
   * Validate payment data before recording
   */
  static validatePaymentData(data: RecordPaymentData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.orderId || data.orderId <= 0) {
      errors.push('Invalid order ID');
    }

    if (!data.paymentMethod) {
      errors.push('Payment method is required');
    }

    if (data.amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!data.paidByUserId || data.paidByUserId <= 0) {
      errors.push('Invalid staff user ID');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
