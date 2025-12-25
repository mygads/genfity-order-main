/**
 * Customer Analytics API
 * GET /api/merchant/analytics/customers - Customer segmentation, retention rates
 * 
 * Features:
 * - Customer segmentation (new, returning, VIP)
 * - Retention rates
 * - Customer lifetime value
 * - Order frequency distribution
 * - Customer growth trends
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';

interface CustomerAnalytics {
  summary: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    averageOrdersPerCustomer: number;
    averageLifetimeValue: number;
    retentionRate: number;
  };
  segmentation: {
    new: number; // 1 order
    casual: number; // 2-3 orders
    regular: number; // 4-9 orders
    vip: number; // 10+ orders
  };
  customerGrowth: Array<{
    date: string;
    newCustomers: number;
    totalCustomers: number;
  }>;
  orderFrequency: Array<{
    range: string;
    count: number;
    percentage: number;
  }>;
  topCustomers: Array<{
    customerId: string;
    customerName: string;
    customerPhone: string;
    totalOrders: number;
    totalSpent: number;
    averageOrder: number;
    lastOrderDate: string;
  }>;
  customerRetention: Array<{
    cohort: string;
    totalCustomers: number;
    month1: number;
    month2: number;
    month3: number;
  }>;
}

/**
 * GET /api/merchant/analytics/customers
 * Get customer analytics for merchant
 * 
 * Query params:
 * - period: 'month' | 'quarter' | 'year'
 */
export const GET = withMerchant(async (
  request: NextRequest,
  context: AuthContext
) => {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Fetch all completed orders with customer info
    const orders = await prisma.order.findMany({
      where: {
        merchantId: context.merchantId,
        status: 'COMPLETED',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: { placedAt: 'desc' },
    });

    // Group orders by customer
    const customerOrdersMap = new Map<string, {
      customerId: bigint;
      customerName: string;
      customerPhone: string;
      createdAt: Date;
      orders: Array<{ placedAt: Date; totalAmount: number }>;
    }>();

    orders.forEach(order => {
      if (order.customer) {
        const key = order.customer.id.toString();
        const existing = customerOrdersMap.get(key);
        
        if (existing) {
          existing.orders.push({
            placedAt: order.placedAt,
            totalAmount: decimalToNumber(order.totalAmount),
          });
        } else {
          customerOrdersMap.set(key, {
            customerId: order.customer.id,
            customerName: order.customer.name || 'Unknown',
            customerPhone: order.customer.phone || '',
            createdAt: order.customer.createdAt,
            orders: [{
              placedAt: order.placedAt,
              totalAmount: decimalToNumber(order.totalAmount),
            }],
          });
        }
      }
    });

    const customers = Array.from(customerOrdersMap.values());
    const totalCustomers = customers.length;

    // Filter customers in period
    const periodCustomers = customers.filter(c => 
      c.orders.some(o => o.placedAt >= startDate)
    );

    // New customers (first order in period)
    const newCustomers = customers.filter(c => c.createdAt >= startDate).length;

    // Returning customers (had orders before period)
    const returningCustomers = periodCustomers.filter(c => 
      c.orders.some(o => o.placedAt < startDate)
    ).length;

    // Average metrics
    const totalOrders = orders.length;
    const averageOrdersPerCustomer = totalCustomers > 0 ? totalOrders / totalCustomers : 0;
    
    const totalRevenue = orders.reduce((sum, o) => sum + decimalToNumber(o.totalAmount), 0);
    const averageLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    // Retention rate (customers who ordered again after first order)
    const repeatCustomers = customers.filter(c => c.orders.length > 1).length;
    const retentionRate = totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    // Customer segmentation
    const segmentation = {
      new: customers.filter(c => c.orders.length === 1).length,
      casual: customers.filter(c => c.orders.length >= 2 && c.orders.length <= 3).length,
      regular: customers.filter(c => c.orders.length >= 4 && c.orders.length <= 9).length,
      vip: customers.filter(c => c.orders.length >= 10).length,
    };

    // Customer growth trend (by day)
    const growthMap = new Map<string, { newCustomers: number; cumulative: number }>();
    const sortedCustomers = [...customers].sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );

    let cumulativeCount = 0;
    sortedCustomers.forEach(customer => {
      if (customer.createdAt >= startDate) {
        const date = customer.createdAt.toISOString().split('T')[0];
        const existing = growthMap.get(date);
        cumulativeCount++;
        
        if (existing) {
          existing.newCustomers++;
          existing.cumulative = cumulativeCount;
        } else {
          growthMap.set(date, { newCustomers: 1, cumulative: cumulativeCount });
        }
      }
    });

    const customerGrowth = Array.from(growthMap.entries())
      .map(([date, data]) => ({
        date,
        newCustomers: data.newCustomers,
        totalCustomers: data.cumulative,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Order frequency distribution
    const frequencyRanges = [
      { range: '1 order', min: 1, max: 1 },
      { range: '2-3 orders', min: 2, max: 3 },
      { range: '4-6 orders', min: 4, max: 6 },
      { range: '7-10 orders', min: 7, max: 10 },
      { range: '11+ orders', min: 11, max: Infinity },
    ];

    const orderFrequency = frequencyRanges.map(({ range, min, max }) => {
      const count = customers.filter(c => c.orders.length >= min && c.orders.length <= max).length;
      return {
        range,
        count,
        percentage: totalCustomers > 0 ? (count / totalCustomers) * 100 : 0,
      };
    });

    // Top customers
    const topCustomers = customers
      .map(c => {
        const totalSpent = c.orders.reduce((sum, o) => sum + o.totalAmount, 0);
        const sortedOrders = [...c.orders].sort((a, b) => b.placedAt.getTime() - a.placedAt.getTime());
        
        return {
          customerId: c.customerId.toString(),
          customerName: c.customerName,
          customerPhone: c.customerPhone,
          totalOrders: c.orders.length,
          totalSpent,
          averageOrder: c.orders.length > 0 ? totalSpent / c.orders.length : 0,
          lastOrderDate: sortedOrders[0]?.placedAt.toISOString() || '',
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 20);

    // Customer retention cohort (simplified - last 3 months)
    const cohortData: Array<{
      cohort: string;
      totalCustomers: number;
      month1: number;
      month2: number;
      month3: number;
    }> = [];

    for (let i = 2; i >= 0; i--) {
      const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const cohortCustomers = customers.filter(c => 
        c.createdAt >= cohortStart && c.createdAt <= cohortEnd
      );

      const month1End = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + 1, 0);
      const month2End = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + 2, 0);
      const month3End = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + 3, 0);

      const month1Active = cohortCustomers.filter(c =>
        c.orders.some(o => o.placedAt > cohortEnd && o.placedAt <= month1End)
      ).length;

      const month2Active = cohortCustomers.filter(c =>
        c.orders.some(o => o.placedAt > month1End && o.placedAt <= month2End)
      ).length;

      const month3Active = cohortCustomers.filter(c =>
        c.orders.some(o => o.placedAt > month2End && o.placedAt <= month3End)
      ).length;

      cohortData.push({
        cohort: cohortStart.toISOString().substring(0, 7),
        totalCustomers: cohortCustomers.length,
        month1: cohortCustomers.length > 0 ? (month1Active / cohortCustomers.length) * 100 : 0,
        month2: cohortCustomers.length > 0 ? (month2Active / cohortCustomers.length) * 100 : 0,
        month3: cohortCustomers.length > 0 ? (month3Active / cohortCustomers.length) * 100 : 0,
      });
    }

    const analytics: CustomerAnalytics = {
      summary: {
        totalCustomers,
        newCustomers,
        returningCustomers,
        averageOrdersPerCustomer,
        averageLifetimeValue,
        retentionRate,
      },
      segmentation,
      customerGrowth,
      orderFrequency,
      topCustomers,
      customerRetention: cohortData,
    };

    return NextResponse.json({
      success: true,
      data: serializeBigInt(analytics),
      meta: {
        period,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('Customer analytics error:', error);
    return NextResponse.json(
      { success: false, error: 'ANALYTICS_ERROR', message: 'Failed to fetch customer analytics' },
      { status: 500 }
    );
  }
});
