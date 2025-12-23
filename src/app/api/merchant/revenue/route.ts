/**
 * Merchant Revenue API
 * GET /api/merchant/revenue - Get revenue reports
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';

/**
 * GET /api/merchant/revenue
 * Get comprehensive revenue analytics
 * Query params: startDate, endDate
 */
async function handleGet(req: NextRequest, context: AuthContext) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
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

    const { searchParams } = new URL(req.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // Default to last 30 days if not provided
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const merchantId = merchantUser.merchantId;

    // 1. Daily Revenue Report
    const dailyRevenue = await prisma.$queryRaw<Array<{
      date: Date;
      total_orders: bigint;
      total_revenue: number;
      total_tax: number;
      total_service_charge: number;
      total_packaging_fee: number;
      grand_total: number;
    }>>`
      SELECT 
        DATE(placed_at) as date,
        COUNT(*)::bigint as total_orders,
        SUM(subtotal)::numeric as total_revenue,
        SUM(tax_amount)::numeric as total_tax,
        SUM(COALESCE(service_charge_amount, 0))::numeric as total_service_charge,
        SUM(COALESCE(packaging_fee_amount, 0))::numeric as total_packaging_fee,
        SUM(total_amount)::numeric as grand_total
      FROM orders
      WHERE merchant_id = ${merchantId}
        AND status = 'COMPLETED'
        AND placed_at >= ${startDate}
        AND placed_at <= ${endDate}
      GROUP BY DATE(placed_at)
      ORDER BY date ASC
    `;

    // 2. Total Summary (use raw SQL to include new fee fields)
    const totalSummaryResult = await prisma.$queryRaw<Array<{
      total_orders: bigint;
      total_subtotal: number;
      total_tax: number;
      total_service_charge: number;
      total_packaging_fee: number;
      grand_total: number;
      avg_order_value: number;
    }>>`
      SELECT
        COUNT(*)::bigint as total_orders,
        COALESCE(SUM(subtotal), 0)::numeric as total_subtotal,
        COALESCE(SUM(tax_amount), 0)::numeric as total_tax,
        COALESCE(SUM(service_charge_amount), 0)::numeric as total_service_charge,
        COALESCE(SUM(packaging_fee_amount), 0)::numeric as total_packaging_fee,
        COALESCE(SUM(total_amount), 0)::numeric as grand_total,
        COALESCE(AVG(total_amount), 0)::numeric as avg_order_value
      FROM orders
      WHERE merchant_id = ${merchantId}
        AND status = 'COMPLETED'
        AND placed_at >= ${startDate}
        AND placed_at <= ${endDate}
    `;
    const totalSummary = totalSummaryResult[0];

    // 3. Order Status Breakdown
    const orderStatusBreakdown = await prisma.order.groupBy({
      by: ['status'],
      where: {
        merchantId,
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    // 4. Order Type Breakdown (DINE_IN vs TAKEAWAY)
    const orderTypeBreakdown = await prisma.order.groupBy({
      by: ['orderType'],
      where: {
        merchantId,
        status: 'COMPLETED',
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
    });

    // 5. Top Selling Menu Items
    const topMenuItems = await prisma.orderItem.groupBy({
      by: ['menuId', 'menuName'],
      where: {
        order: {
          merchantId,
          status: 'COMPLETED',
          placedAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          subtotal: 'desc',
        },
      },
      take: 10,
    });

    // 6. Hourly Distribution (peak hours)
    const hourlyDistribution = await prisma.$queryRaw<Array<{
      hour: number;
      order_count: bigint;
      total_revenue: number;
    }>>`
      SELECT 
        EXTRACT(HOUR FROM placed_at)::int as hour,
        COUNT(*)::bigint as order_count,
        SUM(total_amount)::numeric as total_revenue
      FROM orders
      WHERE merchant_id = ${merchantId}
        AND status = 'COMPLETED'
        AND placed_at >= ${startDate}
        AND placed_at <= ${endDate}
      GROUP BY EXTRACT(HOUR FROM placed_at)
      ORDER BY hour ASC
    `;

    // Format the response
    return NextResponse.json({
      success: true,
      data: {
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }, merchant: {
          currency: merchantUser.merchant.currency || 'AUD',
        }, summary: {
          totalOrders: Number(totalSummary.total_orders),
          totalRevenue: Number(totalSummary.total_subtotal) || 0,
          totalTax: Number(totalSummary.total_tax) || 0,
          totalServiceCharge: Number(totalSummary.total_service_charge) || 0,
          totalPackagingFee: Number(totalSummary.total_packaging_fee) || 0,
          grandTotal: Number(totalSummary.grand_total) || 0,
          averageOrderValue: Number(totalSummary.avg_order_value) || 0,
        },
        dailyRevenue: dailyRevenue.map(row => ({
          date: row.date.toISOString().split('T')[0],
          totalOrders: Number(row.total_orders),
          totalRevenue: Number(row.total_revenue),
          totalTax: Number(row.total_tax),
          totalServiceCharge: Number(row.total_service_charge),
          totalPackagingFee: Number(row.total_packaging_fee),
          grandTotal: Number(row.grand_total),
        })),
        orderStatusBreakdown: orderStatusBreakdown.map(item => ({
          status: item.status,
          count: item._count.id,
        })),
        orderTypeBreakdown: orderTypeBreakdown.map(item => ({
          type: item.orderType,
          count: item._count.id,
          revenue: Number(item._sum.totalAmount) || 0,
        })),
        topMenuItems: topMenuItems.map(item => ({
          menuId: item.menuId.toString(),
          menuName: item.menuName,
          totalQuantity: item._sum.quantity || 0,
          totalRevenue: Number(item._sum.subtotal) || 0,
        })),
        hourlyDistribution: hourlyDistribution.map(row => ({
          hour: row.hour,
          orderCount: Number(row.order_count),
          revenue: Number(row.total_revenue),
        })),
      },
      message: 'Revenue analytics retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting revenue:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve revenue data',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
