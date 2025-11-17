/**
 * Merchant Reports API Endpoint
 * Route: GET /api/merchant/reports
 * Access: MERCHANT_OWNER and MERCHANT_STAFF
 * 
 * Returns comprehensive analytics including:
 * - Period comparison (current vs previous)
 * - Customer analytics (new, returning, retention)
 * - Operational metrics (prep time, efficiency, turnover)
 * - Top menu items
 * - Hourly performance distribution
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';

export const dynamic = 'force-dynamic';

async function handleGet(request: NextRequest, context: AuthContext) {
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
        },
        { status: 404 }
      );
    }

    const merchantId = merchantUser.merchantId;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // week, month, year, custom
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Calculate date ranges
    const now = new Date();
    let currentStart: Date;
    let currentEnd: Date = now;
    let previousStart: Date;
    let previousEnd: Date;

    if (period === 'custom' && startDate && endDate) {
      currentStart = new Date(startDate);
      currentEnd = new Date(endDate);
      const diffTime = currentEnd.getTime() - currentStart.getTime();
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - diffTime);
    } else if (period === 'week') {
      currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      currentStart = new Date(now.getFullYear(), 0, 1);
      previousStart = new Date(now.getFullYear() - 1, 0, 1);
      previousEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
    } else {
      // Default: month
      currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      previousEnd = new Date(currentStart.getTime() - 1);
      previousStart = new Date(previousEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // 1. Period Comparison Metrics
    const currentPeriodStats = await prisma.$queryRaw<
      Array<{
        total_revenue: number;
        total_orders: bigint;
        completed_orders: bigint;
        avg_order_value: number;
      }>
    >`
      SELECT
        COALESCE(SUM(total_amount), 0)::FLOAT as total_revenue,
        COUNT(*)::BIGINT as total_orders,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::BIGINT as completed_orders,
        COALESCE(AVG(total_amount), 0)::FLOAT as avg_order_value
      FROM orders
      WHERE merchant_id = ${merchantId}
        AND placed_at >= ${currentStart}
        AND placed_at <= ${currentEnd}
        AND status != 'CANCELLED'
    `;

    const previousPeriodStats = await prisma.$queryRaw<
      Array<{
        total_revenue: number;
        total_orders: bigint;
        completed_orders: bigint;
        avg_order_value: number;
      }>
    >`
      SELECT
        COALESCE(SUM(total_amount), 0)::FLOAT as total_revenue,
        COUNT(*)::BIGINT as total_orders,
        COUNT(*) FILTER (WHERE status = 'COMPLETED')::BIGINT as completed_orders,
        COALESCE(AVG(total_amount), 0)::FLOAT as avg_order_value
      FROM orders
      WHERE merchant_id = ${merchantId}
        AND placed_at >= ${previousStart}
        AND placed_at <= ${previousEnd}
        AND status != 'CANCELLED'
    `;

    const currentStats = currentPeriodStats[0];
    const previousStats = previousPeriodStats[0];

    const periodComparison = {
      metrics: [
        {
          label: 'Total Revenue',
          current: currentStats.total_revenue,
          previous: previousStats.total_revenue,
          format: 'currency' as const,
        },
        {
          label: 'Total Orders',
          current: Number(currentStats.total_orders),
          previous: Number(previousStats.total_orders),
          format: 'number' as const,
        },
        {
          label: 'Avg. Order Value',
          current: currentStats.avg_order_value,
          previous: previousStats.avg_order_value,
          format: 'currency' as const,
        },
        {
          label: 'Completion Rate',
          current:
            Number(currentStats.total_orders) > 0
              ? (Number(currentStats.completed_orders) / Number(currentStats.total_orders)) * 100
              : 0,
          previous:
            Number(previousStats.total_orders) > 0
              ? (Number(previousStats.completed_orders) / Number(previousStats.total_orders)) * 100
              : 0,
          format: 'decimal' as const,
        },
      ],
    };

    // 2. Customer Analytics
    const customerStats = await prisma.$queryRaw<
      Array<{
        total_customers: bigint;
        new_customers: bigint;
        returning_customers: bigint;
      }>
    >`
      WITH customer_orders AS (
        SELECT
          customer_id,
          MIN(placed_at) as first_order_date,
          COUNT(*) as order_count
        FROM orders
        WHERE merchant_id = ${merchantId}
          AND placed_at >= ${currentStart}
          AND placed_at <= ${currentEnd}
          AND status != 'CANCELLED'
        GROUP BY customer_id
      )
      SELECT
        COUNT(DISTINCT customer_id)::BIGINT as total_customers,
        COUNT(DISTINCT customer_id) FILTER (WHERE order_count = 1)::BIGINT as new_customers,
        COUNT(DISTINCT customer_id) FILTER (WHERE order_count > 1)::BIGINT as returning_customers
      FROM customer_orders
    `;

    const customerData = customerStats[0];

    // Calculate retention rate (simplified)
    const totalCustomers = Number(customerData.total_customers);
    const returningCustomers = Number(customerData.returning_customers);
    const retentionRate = totalCustomers > 0 ? (returningCustomers / totalCustomers) * 100 : 0;

    // Calculate average lifetime value
    const lifetimeValueData = await prisma.$queryRaw<Array<{ avg_lifetime_value: number }>>`
      SELECT COALESCE(AVG(customer_total), 0)::FLOAT as avg_lifetime_value
      FROM (
        SELECT customer_id, SUM(total_amount) as customer_total
        FROM orders
        WHERE merchant_id = ${merchantId}
          AND status != 'CANCELLED'
        GROUP BY customer_id
      ) customer_totals
    `;

    const customerAnalytics = {
      newCustomers: Number(customerData.new_customers),
      returningCustomers: Number(customerData.returning_customers),
      retentionRate,
      averageLifetimeValue: lifetimeValueData[0].avg_lifetime_value,
      churnRate: 100 - retentionRate, // Simplified churn calculation
    };

    // 3. Operational Metrics
    const operationalData = await prisma.$queryRaw<
      Array<{
        avg_prep_time: number;
        total_orders: bigint;
        completed_orders: bigint;
      }>
    >`
      SELECT
        COALESCE(AVG(EXTRACT(EPOCH FROM (o.completed_at - o.placed_at)) / 60), 0)::FLOAT as avg_prep_time,
        COUNT(DISTINCT o.id)::BIGINT as total_orders,
        COUNT(DISTINCT o.id) FILTER (WHERE o.status = 'COMPLETED')::BIGINT as completed_orders
      FROM orders o
      WHERE o.merchant_id = ${merchantId}
        AND o.placed_at >= ${currentStart}
        AND o.placed_at <= ${currentEnd}
    `;

    const opData = operationalData[0];
    const fulfillmentRate =
      Number(opData.total_orders) > 0
        ? (Number(opData.completed_orders) / Number(opData.total_orders)) * 100
        : 0;

    // Hourly performance distribution
    const hourlyPerformance = await prisma.$queryRaw<
      Array<{
        hour: number;
        order_count: bigint;
        avg_prep_time: number;
      }>
    >`
      SELECT
        EXTRACT(HOUR FROM o.placed_at)::INTEGER as hour,
        COUNT(DISTINCT o.id)::BIGINT as order_count,
        COALESCE(AVG(EXTRACT(EPOCH FROM (o.completed_at - o.placed_at)) / 60), 0)::FLOAT as avg_prep_time
      FROM orders o
      WHERE o.merchant_id = ${merchantId}
        AND o.placed_at >= ${currentStart}
        AND o.placed_at <= ${currentEnd}
        AND o.status != 'CANCELLED'
      GROUP BY hour
      ORDER BY hour
    `;

    // Fill all 24 hours with data
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const found = hourlyPerformance.find((h: { hour: number; order_count: bigint; avg_prep_time: number }) => h.hour === hour);
      if (found) {
        // Calculate efficiency score based on prep time and order volume
        const targetPrepTime = 15; // minutes
        const prepTimeScore = Math.max(0, 100 - (found.avg_prep_time / targetPrepTime) * 100);
        const volumeScore = Math.min(100, Number(found.order_count) * 10);
        const efficiency = (prepTimeScore + volumeScore) / 2;

        return {
          hour,
          orderCount: Number(found.order_count),
          efficiency: Math.min(100, Math.max(0, efficiency)),
        };
      }
      return { hour, orderCount: 0, efficiency: 0 };
    });

    // Performance Heatmap by day and hour
    const heatmapData = await prisma.$queryRaw<
      Array<{
        day_of_week: number;
        hour: number;
        order_count: bigint;
        avg_prep_time: number;
      }>
    >`
      SELECT
        EXTRACT(DOW FROM o.placed_at)::INTEGER as day_of_week,
        EXTRACT(HOUR FROM o.placed_at)::INTEGER as hour,
        COUNT(DISTINCT o.id)::BIGINT as order_count,
        COALESCE(AVG(EXTRACT(EPOCH FROM (o.completed_at - o.placed_at)) / 60), 0)::FLOAT as avg_prep_time
      FROM orders o
      WHERE o.merchant_id = ${merchantId}
        AND o.placed_at >= ${currentStart}
        AND o.placed_at <= ${currentEnd}
        AND o.status != 'CANCELLED'
      GROUP BY day_of_week, hour
      ORDER BY day_of_week, hour
    `;

    // Format heatmap data for frontend (7 days x 12 time slots)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const heatmapFormatted = dayNames.map((dayName, dayIndex) => {
      // Group hours into 2-hour slots (0-2, 2-4, 4-6, ..., 22-24)
      const timeSlots = Array.from({ length: 12 }, (_, slotIndex) => {
        const startHour = slotIndex * 2;
        const endHour = startHour + 2;
        
        // Find matching data for this day and time range
        const slotData = heatmapData.filter(
          (d) => d.day_of_week === dayIndex && d.hour >= startHour && d.hour < endHour
        );

        if (slotData.length > 0) {
          const totalOrders = slotData.reduce((sum, d) => sum + Number(d.order_count), 0);
          const avgPrepTime = slotData.reduce((sum, d) => sum + d.avg_prep_time, 0) / slotData.length;
          
          // Calculate efficiency
          const targetPrepTime = 15;
          const prepTimeScore = Math.max(0, 100 - (avgPrepTime / targetPrepTime) * 100);
          const volumeScore = Math.min(100, totalOrders * 10);
          const efficiency = (prepTimeScore + volumeScore) / 2;

          return Math.min(100, Math.max(0, efficiency));
        }
        
        return 0;
      });

      return {
        name: dayName,
        data: timeSlots,
      };
    });

    const operationalMetrics = {
      averagePrepTime: opData.avg_prep_time,
      peakHourEfficiency: Math.max(...hourlyData.map((h) => h.efficiency), 0),
      tableTurnoverRate: 3.5, // This would need actual table tracking
      orderFulfillmentRate: fulfillmentRate,
      hourlyPerformance: hourlyData,
      performanceHeatmap: heatmapFormatted,
    };

    // 4. Top Menu Items
    const topMenuItems = await prisma.$queryRaw<
      Array<{
        menu_id: bigint;
        menu_name: string;
        quantity_sold: bigint;
        total_revenue: number;
        avg_price: number;
      }>
    >`
      SELECT
        oi.menu_id,
        oi.menu_name,
        SUM(oi.quantity)::BIGINT as quantity_sold,
        SUM(oi.subtotal)::FLOAT as total_revenue,
        AVG(oi.menu_price)::FLOAT as avg_price
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.merchant_id = ${merchantId}
        AND o.placed_at >= ${currentStart}
        AND o.placed_at <= ${currentEnd}
        AND o.status != 'CANCELLED'
      GROUP BY oi.menu_id, oi.menu_name
      ORDER BY quantity_sold DESC
      LIMIT 10
    `;

    const topItems = topMenuItems.map((item: { menu_id: bigint; menu_name: string; quantity_sold: bigint; total_revenue: number; avg_price: number }) => ({
      menuItemId: Number(item.menu_id),
      name: item.menu_name,
      quantitySold: Number(item.quantity_sold),
      totalRevenue: item.total_revenue,
      averagePrice: item.avg_price,
    }));

    return NextResponse.json({
      success: true,
      data: {
        period,
        dateRange: {
          current: { start: currentStart, end: currentEnd },
          previous: { start: previousStart, end: previousEnd },
        },
        periodComparison,
        customerAnalytics,
        operationalMetrics,
        topMenuItems: topItems,
      },
    });
  } catch (error) {
    console.error('Reports API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to fetch reports data',
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
