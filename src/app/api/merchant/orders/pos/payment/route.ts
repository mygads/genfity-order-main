/**
 * POS Payment Recording API
 * POST /api/merchant/orders/pos/payment - Record payment for POS order
 * 
 * Features:
 * - Record cash or card payment
 * - Calculate change for cash payments
 * - Update order status to COMPLETED
 * - Track payment details
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import { Prisma } from '@prisma/client';

/**
 * Payment Request Body Interface
 */
interface PaymentRequest {
  orderId: number | string;
  paymentMethod: 'CASH_ON_COUNTER' | 'CARD_ON_COUNTER' ;
  amountPaid?: number;
  changeAmount?: number;
  notes?: string;
}

/**
 * POST /api/merchant/orders/pos/payment
 * Record payment for a POS order
 */
async function handlePost(req: NextRequest, context: AuthContext) {
  try {
    const { merchantId, userId } = context;

    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant context not found',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Parse request body
    const body: PaymentRequest = await req.json();
    const { orderId, paymentMethod, amountPaid, changeAmount, notes } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Order ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (!paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Payment method is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate payment method
    const validMethods = ['CASH_ON_COUNTER', 'CARD_ON_COUNTER'];
    if (!validMethods.includes(paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const numericOrderId = typeof orderId === 'string' ? parseInt(orderId, 10) : orderId;

    // Find the order and verify it belongs to this merchant
    const order = await prisma.order.findFirst({
      where: {
        id: BigInt(numericOrderId),
        merchantId: BigInt(merchantId),
      },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        status: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found or does not belong to this merchant',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId: order.id },
    });

    if (existingPayment) {
      return NextResponse.json(
        {
          success: false,
          error: 'PAYMENT_EXISTS',
          message: 'Payment already recorded for this order',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const totalAmount = Number(order.totalAmount);
    const paidAmount = amountPaid !== undefined ? amountPaid : totalAmount;
    const change = changeAmount !== undefined ? changeAmount : Math.max(0, paidAmount - totalAmount);

    // Build payment metadata
    const metadata = {
      source: 'POS',
      paidAmount,
      changeAmount: change,
      notes: notes || '',
    };

    // Create payment record in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          amount: new Prisma.Decimal(totalAmount),
          paymentMethod: paymentMethod as 'CASH_ON_COUNTER' | 'CARD_ON_COUNTER' ,
          status: 'COMPLETED',
          paidByUserId: BigInt(userId),
          paidAt: new Date(),
          notes: notes || null,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });

      return payment;
    });

    console.log(`[POS Payment] Payment recorded for order ${order.orderNumber}: ${paymentMethod}, Amount: ${totalAmount}`);

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        paymentId: result.id,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: totalAmount,
        paymentMethod,
        paidAmount,
        changeAmount: change,
        status: 'COMPLETED',
      }),
    });

  } catch (error) {
    console.error('[POS Payment API] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to record payment',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
