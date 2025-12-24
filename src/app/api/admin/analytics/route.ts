/**
 * Analytics API Route
 * GET /api/admin/analytics
 * Access: SUPER_ADMIN only
 * 
 * Returns analytics data for dashboard charts
 * Aligned with database schema: multi-currency, order status, payment methods, timezone-aware
 * 
 * MIGRATED TO PRISMA ORM for better type safety and performance
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/db/client';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';

async function getAnalyticsHandler(
  request: NextRequest,
  _authContext: AuthContext
) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || 'month'; // month, year

  // Calculate date range
  const now = new Date();
  let startDate: Date;

  if (period === 'year') {
    startDate = new Date(now.getFullYear(), 0, 1); // Jan 1st
  } else {
    // Default: last 30 days
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 30);
  }

  // 1. Customer registrations using Customer table (separate from User)
  const customerRegistrations = await prisma.customer.count({
    where: {
      createdAt: {
        gte: startDate,
      },
    },
  });

  // 2. Most orders by merchant using Prisma groupBy
  const merchantOrderCounts = await prisma.order.groupBy({
    by: ['merchantId'],
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: 10,
  });

  // Get merchant details for top merchants
  const topMerchantIds = merchantOrderCounts.map((m: { merchantId: bigint }) => m.merchantId);
  const merchants = await prisma.merchant.findMany({
    where: {
      id: {
        in: topMerchantIds,
      },
    },
    select: {
      id: true,
      name: true,
      currency: true,
    },
  });

  const merchantsByOrders = merchantOrderCounts.map((item: { merchantId: bigint; _count: { id: number } }) => {
    const merchant = merchants.find((m: { id: bigint; name: string; currency: string }) => m.id === item.merchantId);
    return {
      merchantId: item.merchantId.toString(),
      merchantName: merchant?.name || 'Unknown',
      currency: merchant?.currency || 'AUD',
      orderCount: item._count.id,
    };
  });

  // 3. Most popular menu items by merchant - Complex aggregation
  // Using Prisma raw query for complex joins
  const merchantsByMenuPopularity = await prisma.$queryRaw<Array<{
    id: bigint;
    name: string;
    currency: string;
    item_count: bigint;
  }>>`
    SELECT 
      m.id,
      m.name,
      m.currency,
      CAST(COUNT(oi.id) AS BIGINT) as item_count
    FROM merchants m
    LEFT JOIN menus menu ON menu.merchant_id = m.id
    LEFT JOIN order_items oi ON oi.menu_id = menu.id
    LEFT JOIN orders o ON o.id = oi.order_id
      AND o.created_at >= ${startDate}
    GROUP BY m.id, m.name, m.currency
    ORDER BY item_count DESC
    LIMIT 10
  `;

  // 4. Revenue by merchant with currency - Prisma aggregate
  const merchantsWithRevenue = await prisma.merchant.findMany({
    select: {
      id: true,
      name: true,
      currency: true,
      orders: {
        where: {
          createdAt: {
            gte: startDate,
          },
          status: 'COMPLETED',
        },
        select: {
          totalAmount: true,
        },
      },
    },
  });

  const merchantsByRevenue = merchantsWithRevenue
    .map((merchant: { id: bigint; name: string; currency: string; orders: Array<{ totalAmount: number | { toString(): string } }> }) => ({
      merchantId: merchant.id.toString(),
      merchantName: merchant.name,
      currency: merchant.currency,
      revenue: merchant.orders.reduce(
        (sum: number, order: { totalAmount: number | { toString(): string } }) => sum + Number(order.totalAmount),
        0
      ),
    }))
    .filter((m: { revenue: number }) => m.revenue > 0)
    .sort((a: { revenue: number }, b: { revenue: number }) => b.revenue - a.revenue)
    .slice(0, 10);

  // 5. Merchant growth over time using Prisma raw query
  const merchantGrowth = await prisma.$queryRaw<Array<{
    month: Date;
    count: bigint;
  }>>`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      CAST(COUNT(*) AS BIGINT) as count
    FROM merchants
    WHERE created_at >= ${startDate}
    GROUP BY month
    ORDER BY month ASC
  `;

  // 6. Customer growth over time using Customer table
  const customerGrowth = await prisma.$queryRaw<Array<{
    month: Date;
    count: bigint;
  }>>`
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      CAST(COUNT(*) AS BIGINT) as count
    FROM customers
    WHERE created_at >= ${startDate}
    GROUP BY month
    ORDER BY month ASC
  `;

  // 7. Order status distribution
  const orderStatusDistribution = await prisma.order.groupBy({
    by: ['status'],
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
  });

  // 8. Payment method breakdown
  const paymentMethodBreakdown = await prisma.payment.groupBy({
    by: ['paymentMethod'],
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      amount: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
  });

  // 9. Payment status distribution
  const paymentStatusDistribution = await prisma.payment.groupBy({
    by: ['status'],
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      amount: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
  });

  // 10. Revenue by currency (multi-currency support)
  const revenueByCurrency = await prisma.$queryRaw<Array<{
    currency: string;
    total_revenue: number | { toString(): string };
    order_count: bigint;
  }>>`
    SELECT 
      m.currency,
      SUM(o.total_amount) as total_revenue,
      CAST(COUNT(o.id) AS BIGINT) as order_count
    FROM orders o
    INNER JOIN merchants m ON m.id = o.merchant_id
    WHERE o.created_at >= ${startDate}
      AND o.status = 'COMPLETED'
    GROUP BY m.currency
    ORDER BY total_revenue DESC
  `;

  // 11. Active merchants statistics
  const activeMerchants = await prisma.merchant.count({
    where: {
      isActive: true,
      isOpen: true,
    },
  });

  const totalMerchants = await prisma.merchant.count({
    where: {
      isActive: true,
    },
  });

  // 12. Order Type Distribution (DINE_IN vs TAKEAWAY)
  const orderTypeDistribution = await prisma.order.groupBy({
    by: ['orderType'],
    where: {
      createdAt: {
        gte: startDate,
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      totalAmount: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
  });

  // 13. Average order value by order type
  const avgOrderValueByType = await prisma.order.groupBy({
    by: ['orderType'],
    where: {
      createdAt: {
        gte: startDate,
      },
      status: 'COMPLETED',
    },
    _avg: {
      totalAmount: true,
    },
  });

  // Format data for response
  return successResponse(
    {
      // Existing metrics
      customerRegistrations,
      merchantsByOrders,
      merchantsByMenuPopularity: merchantsByMenuPopularity.map((row: { id: bigint; name: string; currency: string; item_count: bigint }) => ({
        merchantId: row.id.toString(),
        merchantName: row.name,
        currency: row.currency,
        itemCount: Number(row.item_count),
      })),
      merchantsByRevenue,
      merchantGrowth: merchantGrowth.map((row: { month: Date; count: bigint }) => ({
        month: row.month,
        count: Number(row.count),
      })),
      customerGrowth: customerGrowth.map((row: { month: Date; count: bigint }) => ({
        month: row.month,
        count: Number(row.count),
      })),

      // New metrics aligned with database schema
      orderStatusDistribution: orderStatusDistribution.map((row: { status: string; _count: { id: number } }) => ({
        status: row.status,
        count: row._count.id,
      })),
      paymentMethodBreakdown: paymentMethodBreakdown.map((row: { paymentMethod: string; _count: { id: number }; _sum: { amount: number | { toString(): string } | null } }) => ({
        method: row.paymentMethod,
        count: row._count.id,
        totalAmount: Number(row._sum.amount || 0),
      })),
      paymentStatusDistribution: paymentStatusDistribution.map((row: { status: string; _count: { id: number }; _sum: { amount: number | { toString(): string } | null } }) => ({
        status: row.status,
        count: row._count.id,
        totalAmount: Number(row._sum.amount || 0),
      })),
      revenueByCurrency: revenueByCurrency.map((row: { currency: string; total_revenue: number | { toString(): string }; order_count: bigint }) => ({
        currency: row.currency,
        totalRevenue: Number(row.total_revenue || 0),
        orderCount: Number(row.order_count),
      })),
      activeMerchants,
      totalMerchants,

      // Order Type Analytics
      orderTypeDistribution: orderTypeDistribution.map((row: { orderType: string; _count: { id: number }; _sum: { totalAmount: number | { toString(): string } | null } }) => ({
        type: row.orderType,
        count: row._count.id,
        totalRevenue: Number(row._sum.totalAmount || 0),
      })),
      avgOrderValueByType: avgOrderValueByType.map((row: { orderType: string; _avg: { totalAmount: number | { toString(): string } | null } }) => ({
        type: row.orderType,
        avgValue: Number(row._avg.totalAmount || 0),
      })),
    },
    'Analytics data retrieved successfully',
    200
  );
}

export const GET = withSuperAdmin(getAnalyticsHandler);
