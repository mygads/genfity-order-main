/**
 * Merchant Order Payment API - Phase 1
 * POST /api/merchant/orders/[id]/payment - Record payment (create or update Payment record)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { OrderManagementService } from '@/lib/services/OrderManagementService';
import { serializeBigInt } from '@/lib/utils/serializer';
import { PaymentMethod } from '@prisma/client';

/**
 * POST /api/merchant/orders/[id]/payment
 * Record payment (create or update Payment record)
 * 
 * Body:
 * - paymentMethod: PaymentMethod (required)
 * - amount: number (required)
 * - note?: string (optional)
 */
async function handlePost(
  req: NextRequest,
  context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const orderIdString = params?.id || '0';
    const orderId = BigInt(orderIdString);
    const body = await req.json();

    // Validate orderId
    if (orderId === BigInt(0)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid order ID',
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.paymentMethod) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment method is required',
        },
        { status: 400 }
      );
    }

    if (!body.amount || typeof body.amount !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Valid amount is required',
        },
        { status: 400 }
      );
    }

    // Validate payment method is valid PaymentMethod enum
    if (!Object.values(PaymentMethod).includes(body.paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid payment method. Valid values: ${Object.values(PaymentMethod).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Record payment using OrderManagementService
    const result = await OrderManagementService.recordPayment(orderId, {
      paymentMethod: body.paymentMethod,
      amount: body.amount,
      userId: context.userId,
      notes: body.note || body.notes,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(result),
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('[POST /api/merchant/orders/[id]/payment] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record payment',
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
