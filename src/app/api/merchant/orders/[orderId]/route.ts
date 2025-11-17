/**
 * Merchant Order Detail API - Phase 1
 * GET /api/merchant/orders/[orderId] - Get single order with full details
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { OrderManagementService } from '@/lib/services/OrderManagementService';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/merchant/orders/[orderId]
 * Get single order with full details (payment, items with addons, customer)
 */
async function handleGet(
  req: NextRequest,
  authContext: AuthContext,
  routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await routeContext.params;
    if (!params?.orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order ID is required',
        },
        { status: 400 }
      );
    }

    const orderId = BigInt(params.orderId);
    const { merchantId } = authContext;

    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Merchant ID is required',
        },
        { status: 400 }
      );
    }

    // Fetch order with full details
    const order = await OrderManagementService.getOrderById(orderId, merchantId);

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'Order not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt(order),
    });
  } catch (error) {
    console.error('[GET /api/merchant/orders/[orderId]] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch order',
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
