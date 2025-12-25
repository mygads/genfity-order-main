/**
 * Sales Analytics API
 * GET /api/merchant/analytics/sales - Get revenue trends, top sellers, peak hours
 * 
 * Features:
 * - Revenue trends (daily, weekly, monthly)
 * - Top selling items
 * - Peak hours analysis
 * - Order statistics
 * - Payment method breakdown
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';

interface SalesAnalytics {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    completedOrders: number;
    cancelledOrders: number;
    completionRate: number;
  };
  revenueTrend: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  topSellingItems: Array<{
    menuId: string;
    menuName: string;
    quantity: number;
    revenue: number;
    percentage: number;
  }>;
  peakHours: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
  orderTypes: Array<{
    type: string;
    count: number;
    revenue: number;
    percentage: number;
  }>;
}

/**
 * GET /api/merchant/analytics/sales
 * Get sales analytics for merchant
 * 
 * Query params:
 * - period: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
 * - startDate: ISO date string (for custom period)
 * - endDate: ISO date string (for custom period)
 */
export const GET = withMerchant(async (
  request: NextRequest,
  context: AuthContext
) => {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (period) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date();
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        if (!customStart || !customEnd) {
          return NextResponse.json(
            { success: false, error: 'Invalid dates', message: 'Start and end dates required for custom period' },
            { status: 400 }
          );
        }
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Fetch all orders in date range
    const orders = await prisma.order.findMany({
      where: {
        merchantId: context.merchantId,
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        orderItems: {
          include: {
            menu: {
              select: { id: true, name: true },
            },
          },
        },
        payment: {
          select: { paymentMethod: true },
        },
      },
    });

    // Calculate summary
    const completedOrders = orders.filter(o => o.status === 'COMPLETED');
    const cancelledOrders = orders.filter(o => o.status === 'CANCELLED');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + decimalToNumber(o.totalAmount), 0);
    const averageOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;

    const summary = {
      totalRevenue,
      totalOrders: orders.length,
      averageOrderValue,
      completedOrders: completedOrders.length,
      cancelledOrders: cancelledOrders.length,
      completionRate: orders.length > 0 ? (completedOrders.length / orders.length) * 100 : 0,
    };

    // Revenue trend by day
    const revenueTrendMap = new Map<string, { revenue: number; orders: number }>();
    completedOrders.forEach(order => {
      const date = order.placedAt.toISOString().split('T')[0];
      const current = revenueTrendMap.get(date) || { revenue: 0, orders: 0 };
      revenueTrendMap.set(date, {
        revenue: current.revenue + decimalToNumber(order.totalAmount),
        orders: current.orders + 1,
      });
    });

    const revenueTrend = Array.from(revenueTrendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top selling items
    const itemSalesMap = new Map<string, { menuId: bigint; menuName: string; quantity: number; revenue: number }>();
    completedOrders.forEach(order => {
      order.orderItems.forEach(item => {
        if (item.menu) {
          const key = item.menu.id.toString();
          const current = itemSalesMap.get(key) || {
            menuId: item.menu.id,
            menuName: item.menu.name,
            quantity: 0,
            revenue: 0,
          };
          itemSalesMap.set(key, {
            ...current,
            quantity: current.quantity + item.quantity,
            revenue: current.revenue + decimalToNumber(item.subtotal),
          });
        }
      });
    });

    const totalItemRevenue = Array.from(itemSalesMap.values()).reduce((sum, item) => sum + item.revenue, 0);
    const topSellingItems = Array.from(itemSalesMap.values())
      .map(item => ({
        menuId: item.menuId.toString(),
        menuName: item.menuName,
        quantity: item.quantity,
        revenue: item.revenue,
        percentage: totalItemRevenue > 0 ? (item.revenue / totalItemRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Peak hours analysis
    const hourlyMap = new Map<number, { orders: number; revenue: number }>();
    for (let i = 0; i < 24; i++) {
      hourlyMap.set(i, { orders: 0, revenue: 0 });
    }
    completedOrders.forEach(order => {
      const hour = order.placedAt.getHours();
      const current = hourlyMap.get(hour)!;
      hourlyMap.set(hour, {
        orders: current.orders + 1,
        revenue: current.revenue + decimalToNumber(order.totalAmount),
      });
    });

    const peakHours = Array.from(hourlyMap.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => a.hour - b.hour);

    // Orders by status
    const statusMap = new Map<string, number>();
    orders.forEach(order => {
      statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);
    });

    const ordersByStatus = Array.from(statusMap.entries())
      .map(([status, count]) => ({
        status,
        count,
        percentage: orders.length > 0 ? (count / orders.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Payment methods breakdown
    const paymentMap = new Map<string, { count: number; revenue: number }>();
    completedOrders.forEach(order => {
      const method = order.payment?.paymentMethod || 'UNKNOWN';
      const current = paymentMap.get(method) || { count: 0, revenue: 0 };
      paymentMap.set(method, {
        count: current.count + 1,
        revenue: current.revenue + decimalToNumber(order.totalAmount),
      });
    });

    const paymentMethods = Array.from(paymentMap.entries())
      .map(([method, data]) => ({
        method,
        count: data.count,
        revenue: data.revenue,
        percentage: completedOrders.length > 0 ? (data.count / completedOrders.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Order types breakdown
    const typeMap = new Map<string, { count: number; revenue: number }>();
    completedOrders.forEach(order => {
      const type = order.orderType || 'UNKNOWN';
      const current = typeMap.get(type) || { count: 0, revenue: 0 };
      typeMap.set(type, {
        count: current.count + 1,
        revenue: current.revenue + decimalToNumber(order.totalAmount),
      });
    });

    const orderTypes = Array.from(typeMap.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        revenue: data.revenue,
        percentage: completedOrders.length > 0 ? (data.count / completedOrders.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    const analytics: SalesAnalytics = {
      summary,
      revenueTrend,
      topSellingItems,
      peakHours,
      ordersByStatus,
      paymentMethods,
      orderTypes,
    };

    return NextResponse.json({
      success: true,
      data: serializeBigInt(analytics),
      meta: {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('Sales analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'ANALYTICS_ERROR', message: 'Failed to fetch sales analytics' },
      { status: 500 }
    );
  }
});
