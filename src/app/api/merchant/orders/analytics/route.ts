/**
 * GET /api/merchant/orders/analytics
 * 
 * Get comprehensive analytics data for orders including statistics,
 * revenue tracking, popular items, and charts data.
 * 
 * Query Parameters:
 * - startDate: ISO date string (default: 30 days ago)
 * - endDate: ISO date string (default: now)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import { OrderAnalyticsService } from '@/lib/services/OrderAnalyticsService';
import { serializeBigInt } from '@/lib/utils/serializer';

export const GET = withMerchant(async (req: NextRequest, authContext) => {
  try {
    const { merchantId } = authContext;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID required' },
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

    // Get analytics data
    const analyticsData = await OrderAnalyticsService.getAnalytics(merchantId, {
      start: startDate,
      end: endDate,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(analyticsData),
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch analytics data',
      },
      { status: 500 }
    );
  }
});
