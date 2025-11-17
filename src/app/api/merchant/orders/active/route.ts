/**
 * Merchant Active Orders API - Phase 1
 * GET /api/merchant/orders/active - Get only active orders (not COMPLETED or CANCELLED)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { OrderManagementService } from '@/lib/services/OrderManagementService';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/merchant/orders/active
 * Get only active orders (PENDING, ACCEPTED, IN_PROGRESS, READY)
 * Useful for:
 * - Kanban board display
 * - Kitchen display system
 * - Real-time order monitoring
 */
async function handleGet(req: NextRequest, context: AuthContext) {
  try {
    const merchantId = context.merchantId;
    
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Merchant ID not found in context',
        },
        { status: 400 }
      );
    }

    // Fetch active orders using OrderManagementService
    const orders = await OrderManagementService.getActiveOrders(merchantId);

    return NextResponse.json({
      success: true,
      data: serializeBigInt(orders),
      count: orders.length,
    });
  } catch (error) {
    console.error('[GET /api/merchant/orders/active] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch active orders',
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
