/**
 * Merchant Order Stats API - Enhanced for Phase 6
 * GET /api/merchant/orders/stats - Get comprehensive order statistics and analytics
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { OrderAnalyticsService } from '@/lib/services/OrderAnalyticsService';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/merchant/orders/stats
 * Get comprehensive order and payment statistics
 * 
 * Query Params:
 * - startDate?: string (ISO date) - Start of date range (default: 30 days ago)
 * - endDate?: string (ISO date) - End of date range (default: now)
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

    const { searchParams } = new URL(req.url);
    
    // Parse date range (default: last 30 days)
    const endDate = searchParams.get('endDate')
      ? new Date(searchParams.get('endDate')!)
      : new Date();
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get statistics using new analytics service
    const [orderStats, paymentStats] = await Promise.all([
      OrderAnalyticsService.getOrderStatistics(merchantId, {
        start: startDate,
        end: endDate,
      }),
      OrderAnalyticsService.getPaymentStatistics(merchantId, {
        start: startDate,
        end: endDate,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        orders: serializeBigInt(orderStats),
        payments: serializeBigInt(paymentStats),
      },
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('[GET /api/merchant/orders/stats] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch order stats',
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
