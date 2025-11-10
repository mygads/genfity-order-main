/**
 * Merchant Order Status Update API
 * PUT /api/merchant/orders/[id]/status - Update order status
 */

import { NextRequest, NextResponse } from 'next/server';
import orderService from '@/lib/services/OrderService';
import { withMerchant } from '@/lib/middleware/auth';
import { ValidationError, NotFoundError } from '@/lib/constants/errors';
import type { AuthContext } from '@/lib/types/auth';

/**
 * PUT /api/merchant/orders/[id]/status
 * Update order status with validation
 */
async function handlePut(
  req: NextRequest,
  context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const orderId = BigInt(params?.id || '0');
    const body = await req.json();

    if (!body.status) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Status is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Update order status
    const order = await orderService.updateOrderStatus(
      orderId,
      body.status,
      context.userId,
      body.notes
    );

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order status updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating order status:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.message,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: error.message,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to update order status',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const PUT = withMerchant(handlePut);
