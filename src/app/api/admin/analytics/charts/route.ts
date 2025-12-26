/**
 * Super Admin Charts Data API
 * GET /api/admin/analytics/charts - Get chart-specific data for dashboard
 * 
 * Query Parameters:
 * - period: '7d' | '30d' | '90d' | '1y' (default: '30d')
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';

interface RevenueDataPoint {
  date: string;
  revenue: number;
  orderCount: number;
}

interface CustomerGrowthPoint {
  date: string;
  newCustomers: number;
  totalCustomers: number;
}

interface ActivityHeatmapPoint {
  dayOfWeek: number;
  hour: number;
  orderCount: number;
}

interface CurrencyRevenue {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
}

async function handleGet(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || '30d';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let groupBy: 'day' | 'week' | 'month' = 'day';

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        groupBy = 'week';
        break;
      case '1y':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        groupBy = 'month';
        break;
      case '30d':
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        groupBy = 'day';
        break;
    }

    // Get revenue data over time with currency info from merchant
    const orders = await prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'COMPLETED',
      },
      select: {
        createdAt: true,
        totalAmount: true,
        merchant: {
          select: {
            currency: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date and currency
    const revenueByDate = new Map<string, { revenue: number; orderCount: number }>();
    const revenueByDateIdr = new Map<string, { revenue: number; orderCount: number }>();
    const revenueByDateAud = new Map<string, { revenue: number; orderCount: number }>();

    // Track totals by currency
    let totalRevenueIdr = 0;
    let totalOrdersIdr = 0;
    let totalRevenueAud = 0;
    let totalOrdersAud = 0;

    for (const order of orders) {
      let dateKey: string;
      const currency = order.merchant?.currency || 'IDR';
      const amount = Number(order.totalAmount);

      if (groupBy === 'month') {
        dateKey = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        // Get week start (Monday)
        const d = new Date(order.createdAt);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(d.setDate(diff));
        dateKey = weekStart.toISOString().split('T')[0];
      } else {
        dateKey = order.createdAt.toISOString().split('T')[0];
      }

      // Update combined revenue
      const existing = revenueByDate.get(dateKey) || { revenue: 0, orderCount: 0 };
      existing.revenue += amount;
      existing.orderCount += 1;
      revenueByDate.set(dateKey, existing);

      // Update currency-specific revenue
      if (currency === 'IDR') {
        const existingIdr = revenueByDateIdr.get(dateKey) || { revenue: 0, orderCount: 0 };
        existingIdr.revenue += amount;
        existingIdr.orderCount += 1;
        revenueByDateIdr.set(dateKey, existingIdr);
        totalRevenueIdr += amount;
        totalOrdersIdr += 1;
      } else {
        const existingAud = revenueByDateAud.get(dateKey) || { revenue: 0, orderCount: 0 };
        existingAud.revenue += amount;
        existingAud.orderCount += 1;
        revenueByDateAud.set(dateKey, existingAud);
        totalRevenueAud += amount;
        totalOrdersAud += 1;
      }
    }

    // Fill in missing dates with zero values
    const revenueData: RevenueDataPoint[] = [];
    const currentDate = new Date(startDate);

    if (groupBy === 'day') {
      while (currentDate <= now) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const data = revenueByDate.get(dateKey);
        revenueData.push({
          date: dateKey,
          revenue: data?.revenue || 0,
          orderCount: data?.orderCount || 0,
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (groupBy === 'week') {
      // Move to Monday
      const day = currentDate.getDay();
      const diff = currentDate.getDate() - day + (day === 0 ? -6 : 1);
      currentDate.setDate(diff);

      while (currentDate <= now) {
        const dateKey = currentDate.toISOString().split('T')[0];
        const data = revenueByDate.get(dateKey);
        revenueData.push({
          date: dateKey,
          revenue: data?.revenue || 0,
          orderCount: data?.orderCount || 0,
        });
        currentDate.setDate(currentDate.getDate() + 7);
      }
    } else {
      // Month
      currentDate.setDate(1);
      while (currentDate <= now) {
        const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const data = revenueByDate.get(dateKey);
        revenueData.push({
          date: dateKey,
          revenue: data?.revenue || 0,
          orderCount: data?.orderCount || 0,
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    // Get customer growth data
    const customers = await prisma.customer.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get total customers before start date
    const totalBeforeStart = await prisma.customer.count({
      where: {
        createdAt: { lt: startDate },
      },
    });

    // Group customers by date
    const customersByDate = new Map<string, number>();

    for (const customer of customers) {
      const dateKey = customer.createdAt.toISOString().split('T')[0];
      customersByDate.set(dateKey, (customersByDate.get(dateKey) || 0) + 1);
    }

    // Fill in missing dates
    const customerGrowth: CustomerGrowthPoint[] = [];
    const customerDate = new Date(startDate);
    let runningTotal = totalBeforeStart;

    while (customerDate <= now) {
      const dateKey = customerDate.toISOString().split('T')[0];
      const newCustomers = customersByDate.get(dateKey) || 0;
      runningTotal += newCustomers;
      customerGrowth.push({
        date: dateKey,
        newCustomers,
        totalCustomers: runningTotal,
      });
      customerDate.setDate(customerDate.getDate() + 1);
    }

    // Get activity heatmap data (orders by day of week and hour) - last 30 days
    const heatmapStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const heatmapOrders = await prisma.order.findMany({
      where: {
        createdAt: { gte: heatmapStartDate },
      },
      select: {
        createdAt: true,
      },
    });

    // Create heatmap grid (7 days x 24 hours)
    const heatmap = new Map<string, number>();

    for (const order of heatmapOrders) {
      const dayOfWeek = order.createdAt.getDay(); // 0-6 (Sunday-Saturday)
      const hour = order.createdAt.getHours(); // 0-23
      const key = `${dayOfWeek}-${hour}`;
      heatmap.set(key, (heatmap.get(key) || 0) + 1);
    }

    // Convert to array
    const activityHeatmap: ActivityHeatmapPoint[] = [];
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${day}-${hour}`;
        activityHeatmap.push({
          dayOfWeek: day,
          hour,
          orderCount: heatmap.get(key) || 0,
        });
      }
    }

    // Get summary stats
    const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = revenueData.reduce((sum, d) => sum + d.orderCount, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalNewCustomers = customerGrowth.reduce((sum, d) => sum + d.newCustomers, 0);

    // Currency-specific summaries
    const revenueByCurrency: { IDR: CurrencyRevenue; AUD: CurrencyRevenue } = {
      IDR: {
        totalRevenue: totalRevenueIdr,
        totalOrders: totalOrdersIdr,
        avgOrderValue: totalOrdersIdr > 0 ? totalRevenueIdr / totalOrdersIdr : 0,
      },
      AUD: {
        totalRevenue: totalRevenueAud,
        totalOrders: totalOrdersAud,
        avgOrderValue: totalOrdersAud > 0 ? totalRevenueAud / totalOrdersAud : 0,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        period,
        revenueData,
        customerGrowth,
        activityHeatmap,
        summary: {
          totalRevenue,
          totalOrders,
          avgOrderValue,
          totalNewCustomers,
          currentTotalCustomers: runningTotal,
        },
        revenueByCurrency,
      },
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}

export const GET = withSuperAdmin(handleGet);
