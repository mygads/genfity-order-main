import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import orderService from '@/lib/services/OrderService';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * PUT /api/merchant/orders/:id
 * Update order status
 */
async function handlePut(
  req: NextRequest,
  authContext: AuthContext,
  routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await routeContext.params;
    if (!params?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_ORDER_ID',
          message: 'Order ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const orderId = BigInt(params.id);
    const body = await req.json();
    const { status } = body;

    if (!status) {
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

    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: authContext.userId },
      include: { merchant: true },
    });
    
    if (!merchantUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found for this user',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const order = await orderService.updateOrderStatus(
      orderId,
      status,
      authContext.userId, // Pass userId as updatedBy
      body.notes // Optional notes
    );

    console.log('[ORDER UPDATE] Order status updated:', order);

    return NextResponse.json({
      success: true,
      data: serializeBigInt(order),
      message: 'Order status updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('[ORDER UPDATE] Error updating order status:', error);
    console.error('[ORDER UPDATE] Error details:', error instanceof Error ? error.message : error);

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
