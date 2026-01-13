/**
 * Merchant Order Status Update API - Phase 1
 * PUT /api/merchant/orders/[orderId]/status - Update order status with validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { OrderManagementService } from '@/lib/services/OrderManagementService';
import { serializeBigInt } from '@/lib/utils/serializer';
import { OrderStatus } from '@prisma/client';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * PUT /api/merchant/orders/[orderId]/status
 * Update order status with validation
 * 
 * Body:
 * - status: OrderStatus (required)
 * - note?: string (optional)
 */
async function handlePut(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
) {
  try {
    const orderIdResult = await requireBigIntRouteParam(contextParams, 'orderId', 'Order ID is required');
    if (!orderIdResult.ok) {
      return NextResponse.json(orderIdResult.body, { status: orderIdResult.status });
    }

    const orderId = orderIdResult.value;
    const body = await req.json();

    if (!body.status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Status is required',
        },
        { status: 400 }
      );
    }

    // Validate status is valid OrderStatus enum
    if (!Object.values(OrderStatus).includes(body.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status. Valid values: ${Object.values(OrderStatus).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Update order status using OrderManagementService
    const order = await OrderManagementService.updateStatus(orderId, {
      status: body.status,
      userId: context.userId,
      note: body.note,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(order),
      message: `Order status updated to ${body.status}`,
    });
  } catch (error) {
    console.error('[PUT /api/merchant/orders/[orderId]/status] Error:', error);

    // Check if it's a validation error
    if (error instanceof Error && error.message.includes('Cannot transition')) {
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
        error: error instanceof Error ? error.message : 'Failed to update order status',
      },
      { status: 500 }
    );
  }
}

export const PUT = withMerchant(handlePut);
