/**
 * Sales Dashboard API
 * GET /api/merchant/reports/sales-dashboard
 * 
 * Features:
 * - Revenue trends (daily, weekly, monthly)
 * - Top selling items
 * - Peak hours analysis
 * - Order type breakdown
 * - Payment method breakdown
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import { decimalToNumber } from '@/lib/utils/serializer';

type Period = 'today' | 'week' | 'month' | 'year';

interface SalesDashboardData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    completedOrders: number;
    cancelledOrders: number;
    pendingOrders: number;
  };
  revenueTrend: Array<{
    date: string;
    revenue: number;
    orderCount: number;
  }>;
  topSellingItems: Array<{
    menuId: string;
    menuName: string;
    quantity: number;
    revenue: number;
    imageUrl: string | null;
  }>;
  peakHours: Array<{
    hour: number;
    orderCount: number;
    revenue: number;
  }>;
  orderTypeBreakdown: Array<{
    type: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
  paymentMethodBreakdown: Array<{
    method: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
  revenueComparison: {
    current: number;
    previous: number;
    percentageChange: number;
  };
}

async function handler(
  req: NextRequest,
  authContext: AuthContext
) {
  const { merchantId } = authContext;

  try {
    const { searchParams } = new URL(req.url);
    const period: Period = (searchParams.get('period') as Period) || 'month';

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 1);
        previousEndDate = new Date(startDate);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        previousStartDate = new Date(startDate);
        previousStartDate.setDate(previousStartDate.getDate() - 7);
        previousEndDate = new Date(startDate);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    // Get current period orders
    const orders = await prisma.order.findMany({
      where: {
        merchantId,
        placedAt: { gte: startDate },
      },
      include: {
        orderItems: true,
        payment: true,
      },
    });

    // Get previous period revenue for comparison
    const previousOrders = await prisma.order.findMany({
      where: {
        merchantId,
        placedAt: {
          gte: previousStartDate,
          lt: previousEndDate,
        },
        status: 'COMPLETED',
      },
      select: {
        totalAmount: true,
      },
    });

    // Calculate summary
    const completedOrders = orders.filter(o => o.status === 'COMPLETED');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + decimalToNumber(o.totalAmount), 0);
    const previousRevenue = previousOrders.reduce((sum, o) => sum + decimalToNumber(o.totalAmount), 0);

    const summary = {
      totalRevenue,
      totalOrders: orders.length,
      averageOrderValue: completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0,
      completedOrders: completedOrders.length,
      cancelledOrders: orders.filter(o => o.status === 'CANCELLED').length,
      pendingOrders: orders.filter(o => ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'READY'].includes(o.status)).length,
    };

    // Revenue trend (daily breakdown)
    const revenueTrendMap = new Map<string, { revenue: number; orderCount: number }>();
    completedOrders.forEach(order => {
      const date = order.placedAt.toISOString().split('T')[0];
      const existing = revenueTrendMap.get(date) || { revenue: 0, orderCount: 0 };
      revenueTrendMap.set(date, {
        revenue: existing.revenue + decimalToNumber(order.totalAmount),
        orderCount: existing.orderCount + 1,
      });
    });

    const revenueTrend = Array.from(revenueTrendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top selling items
    const itemSalesMap = new Map<string, {
      menuId: string;
      menuName: string;
      quantity: number;
      revenue: number;
    }>();

    completedOrders.forEach(order => {
      order.orderItems.forEach(item => {
        const key = item.menuId.toString();
        const existing = itemSalesMap.get(key) || {
          menuId: key,
          menuName: item.menuName,
          quantity: 0,
          revenue: 0,
        };
        itemSalesMap.set(key, {
          ...existing,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + decimalToNumber(item.subtotal),
        });
      });
    });

    // Get menu images for top items
    const topItemIds = Array.from(itemSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map(item => BigInt(item.menuId));

    const menuImages = await prisma.menu.findMany({
      where: { id: { in: topItemIds } },
      select: { id: true, imageUrl: true },
    });

    const imageMap = new Map(menuImages.map(m => [m.id.toString(), m.imageUrl]));

    const topSellingItems = Array.from(itemSalesMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
      .map(item => ({
        ...item,
        imageUrl: imageMap.get(item.menuId) || null,
      }));

    // Peak hours analysis
    const hourlyMap = new Map<number, { orderCount: number; revenue: number }>();
    completedOrders.forEach(order => {
      const hour = order.placedAt.getHours();
      const existing = hourlyMap.get(hour) || { orderCount: 0, revenue: 0 };
      hourlyMap.set(hour, {
        orderCount: existing.orderCount + 1,
        revenue: existing.revenue + decimalToNumber(order.totalAmount),
      });
    });

    const peakHours = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      ...(hourlyMap.get(hour) || { orderCount: 0, revenue: 0 }),
    }));

    // Order type breakdown
    const orderTypeMap = new Map<string, { count: number; revenue: number }>();
    completedOrders.forEach(order => {
      const type = order.orderType;
      const existing = orderTypeMap.get(type) || { count: 0, revenue: 0 };
      orderTypeMap.set(type, {
        count: existing.count + 1,
        revenue: existing.revenue + decimalToNumber(order.totalAmount),
      });
    });

    const totalTypeCount = completedOrders.length;
    const orderTypeBreakdown = Array.from(orderTypeMap.entries()).map(([type, data]) => ({
      type,
      ...data,
      percentage: totalTypeCount > 0 ? (data.count / totalTypeCount) * 100 : 0,
    }));

    // Payment method breakdown
    const paymentMethodMap = new Map<string, { count: number; revenue: number }>();
    completedOrders.forEach(order => {
      if (order.payment) {
        const method = order.payment.paymentMethod;
        const existing = paymentMethodMap.get(method) || { count: 0, revenue: 0 };
        paymentMethodMap.set(method, {
          count: existing.count + 1,
          revenue: existing.revenue + decimalToNumber(order.totalAmount),
        });
      }
    });

    const paymentMethodBreakdown = Array.from(paymentMethodMap.entries()).map(([method, data]) => ({
      method,
      ...data,
      percentage: totalTypeCount > 0 ? (data.count / totalTypeCount) * 100 : 0,
    }));

    // Revenue comparison
    const percentageChange = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : totalRevenue > 0 ? 100 : 0;

    const data: SalesDashboardData = {
      summary,
      revenueTrend,
      topSellingItems,
      peakHours,
      orderTypeBreakdown,
      paymentMethodBreakdown,
      revenueComparison: {
        current: totalRevenue,
        previous: previousRevenue,
        percentageChange,
      },
    };

    return NextResponse.json({
      success: true,
      data,
      meta: {
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Sales dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR', message: 'Failed to fetch sales dashboard' },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handler);
