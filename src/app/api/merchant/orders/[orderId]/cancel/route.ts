/**
 * Merchant Order Cancel API - Phase 1
 * POST /api/merchant/orders/[orderId]/cancel - Cancel order with reason
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { OrderManagementService } from '@/lib/services/OrderManagementService';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * POST /api/merchant/orders/[orderId]/cancel
 * Cancel order with reason
 * 
 * Body:
 * - reason: string (required) - Reason for cancellation
 */
async function handlePost(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
) {
  try {
    const orderIdResult = await requireBigIntRouteParam(contextParams, 'orderId');
    if (!orderIdResult.ok) {
      return NextResponse.json(orderIdResult.body, { status: orderIdResult.status });
    }
    const orderId = orderIdResult.value;
    const body = await req.json();

    // Validate required fields
    if (!body.reason) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cancellation reason is required',
        },
        { status: 400 }
      );
    }

    // Cancel order using OrderManagementService
    const order = await OrderManagementService.cancelOrder(orderId, {
      userId: context.userId,
      reason: body.reason,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(order),
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    console.error('[POST /api/merchant/orders/[orderId]/cancel] Error:', error);

    // Check if it's a validation error
    if (error instanceof Error && error.message.includes('Cannot cancel')) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel order',
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
