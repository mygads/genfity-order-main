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
import { OrderStatus, OrderType, PaymentMethod, Prisma } from '@prisma/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';
import { formatInTimeZone } from 'date-fns-tz';

interface SalesAnalytics {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    averageOrderValue: number;
    completedOrders: number;
    cancelledOrders: number;
    completionRate: number;
  };
  customerMetrics: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    repeatPurchaseRate: number;
    averageOrdersPerCustomer: number;
  };
  cohortRetention: Array<{
    cohortMonth: string;
    size: number;
    month1: number;
    month2: number;
    month3: number;
  }>;
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
  categoryMix: Array<{
    category: string;
    revenue: number;
    quantity: number;
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
    if (!context.merchantId) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_REQUIRED', message: 'Merchant context required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const scope = searchParams.get('scope') || 'merchant';
    const includeGroup = scope === 'group';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');
    const orderTypeFilters = searchParams.get('orderType')?.split(',').map((value) => value.trim()).filter(Boolean);
    const statuses = searchParams.get('status')?.split(',').map((value) => value.trim()).filter(Boolean);
    const paymentMethodsFilter = searchParams.get('paymentMethod')?.split(',').map((value) => value.trim()).filter(Boolean);
    const scheduledOnly = searchParams.get('scheduledOnly') === 'true';

    if (includeGroup && context.role !== 'MERCHANT_OWNER') {
      return NextResponse.json(
        { success: false, error: 'FORBIDDEN', message: 'Owner access required for group analytics' },
        { status: 403 }
      );
    }

    const validOrderTypes = new Set(Object.values(OrderType));
    const normalizedOrderTypes = orderTypeFilters?.filter((value): value is OrderType => validOrderTypes.has(value as OrderType));
    const validOrderStatuses = new Set(Object.values(OrderStatus));
    const normalizedStatuses = statuses?.filter((value): value is OrderStatus => validOrderStatuses.has(value as OrderStatus));
    const validPaymentMethods = new Set(Object.values(PaymentMethod));
    const normalizedPaymentMethods = paymentMethodsFilter?.filter((value): value is PaymentMethod =>
      validPaymentMethods.has(value as PaymentMethod)
    );

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

    const merchant = await prisma.merchant.findUnique({
      where: { id: context.merchantId },
      select: { id: true, parentMerchantId: true, timezone: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
        { status: 404 }
      );
    }

    const mainMerchantId = merchant.parentMerchantId ?? merchant.id;
    const groupMerchants = includeGroup
      ? await prisma.merchant.findMany({
          where: {
            OR: [{ id: mainMerchantId }, { parentMerchantId: mainMerchantId }],
          },
          select: { id: true, timezone: true },
        })
      : [{ id: merchant.id, timezone: merchant.timezone }];

    const merchantIds = groupMerchants.map((item) => item.id);
    const mainTimezone = groupMerchants.find((item) => item.id === mainMerchantId)?.timezone;
    const timezone = mainTimezone || merchant.timezone || 'Asia/Jakarta';

    // Fetch all orders in date range
    const orderInclude = {
      orderItems: {
        include: {
          menu: {
            select: { id: true, name: true, category: { select: { name: true } } },
          },
        },
      },
      payment: {
        select: { paymentMethod: true },
      },
      customer: { select: { id: true } },
    } satisfies Prisma.OrderInclude;

    type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

    const orders: OrderWithRelations[] = await prisma.order.findMany({
      where: {
        merchantId: { in: merchantIds },
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(normalizedOrderTypes?.length ? { orderType: { in: normalizedOrderTypes } } : {}),
        ...(normalizedStatuses?.length ? { status: { in: normalizedStatuses } } : {}),
        ...(scheduledOnly ? { isScheduled: true } : {}),
        ...(normalizedPaymentMethods?.length
          ? {
              payment: {
                is: { paymentMethod: { in: normalizedPaymentMethods } },
              },
            }
          : {}),
      },
      include: orderInclude,
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

    // Customer metrics
    const customerOrderMap = new Map<string, Date[]>();
    completedOrders.forEach((order) => {
      if (!order.customer?.id) return;
      const key = order.customer.id.toString();
      const list = customerOrderMap.get(key) || [];
      list.push(order.placedAt);
      customerOrderMap.set(key, list);
    });

    const totalCustomers = customerOrderMap.size;
    let repeatCustomers = 0;
    let totalOrdersByCustomers = 0;

    customerOrderMap.forEach((dates) => {
      const sorted = dates.sort((a, b) => a.getTime() - b.getTime());
      totalOrdersByCustomers += sorted.length;
      if (sorted.length > 1) repeatCustomers += 1;
    });

    const customerIds = Array.from(customerOrderMap.keys()).map((value) => BigInt(value));
    const customerFirstOrders = customerIds.length
      ? await prisma.order.groupBy({
          by: ['customerId'],
          where: {
            merchantId: { in: merchantIds },
            customerId: { in: customerIds },
            status: 'COMPLETED',
          },
          _min: { placedAt: true },
          _count: { _all: true },
        })
      : [];

    let newCustomers = 0;
    let returningCustomers = 0;
    customerFirstOrders.forEach((row) => {
      if (!row._min.placedAt) return;
      if (row._min.placedAt >= startDate && row._min.placedAt <= endDate) {
        newCustomers += 1;
      } else {
        returningCustomers += 1;
      }
    });

    const customerMetrics = {
      totalCustomers,
      newCustomers,
      returningCustomers,
      repeatPurchaseRate: totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0,
      averageOrdersPerCustomer: totalCustomers > 0 ? totalOrdersByCustomers / totalCustomers : 0,
    };

    // Cohort retention (monthly cohorts)
    const cohortStart = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
    const cohortOrders = await prisma.order.findMany({
      where: {
        merchantId: { in: merchantIds },
        placedAt: { gte: cohortStart, lte: endDate },
        status: 'COMPLETED',
      },
      select: { customerId: true, placedAt: true },
    });

    const cohortMap = new Map<string, Set<string>>();
    const customerMonthOrders = new Map<string, Set<string>>();
    cohortOrders.forEach((order) => {
      if (!order.customerId) return;
      const customerId = order.customerId.toString();
      const monthKey = formatInTimeZone(order.placedAt, timezone, 'yyyy-MM');
      const customerMonths = customerMonthOrders.get(customerId) || new Set<string>();
      customerMonths.add(monthKey);
      customerMonthOrders.set(customerId, customerMonths);
    });

    customerMonthOrders.forEach((months, customerId) => {
      const sortedMonths = Array.from(months.values()).sort();
      if (sortedMonths.length === 0) return;
      const cohortMonth = sortedMonths[0];
      const cohortSet = cohortMap.get(cohortMonth) || new Set<string>();
      cohortSet.add(customerId);
      cohortMap.set(cohortMonth, cohortSet);
    });

    const cohortRetention = Array.from(cohortMap.entries())
      .map(([cohortMonth, cohortCustomers]) => {
        const cohortSize = cohortCustomers.size;
        const [year, month] = cohortMonth.split('-').map(Number);
        const baseDate = new Date(year, (month || 1) - 1, 1);
        const toMonthKey = (date: Date) =>
          `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const month1 = toMonthKey(new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1));
        const month2 = toMonthKey(new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 1));
        const month3 = toMonthKey(new Date(baseDate.getFullYear(), baseDate.getMonth() + 3, 1));

        const retention = { month1: 0, month2: 0, month3: 0 };

        cohortCustomers.forEach((customerId) => {
          const months = customerMonthOrders.get(customerId);
          if (!months) return;
          if (months.has(month1)) retention.month1 += 1;
          if (months.has(month2)) retention.month2 += 1;
          if (months.has(month3)) retention.month3 += 1;
        });

        return {
          cohortMonth,
          size: cohortSize,
          month1: cohortSize > 0 ? (retention.month1 / cohortSize) * 100 : 0,
          month2: cohortSize > 0 ? (retention.month2 / cohortSize) * 100 : 0,
          month3: cohortSize > 0 ? (retention.month3 / cohortSize) * 100 : 0,
        };
      })
      .sort((a, b) => b.cohortMonth.localeCompare(a.cohortMonth))
      .slice(0, 6)
      .reverse();

    // Revenue trend by day
    const revenueTrendMap = new Map<string, { revenue: number; orders: number }>();
    completedOrders.forEach(order => {
      const date = formatInTimeZone(order.placedAt, timezone, 'yyyy-MM-dd');
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
    // Note: POS custom items are stored using a hidden placeholder Menu record, but the real name/price
    // are stored on OrderItem.menuName/menuPrice. We group custom items by their stored name.
    const POS_CUSTOM_PLACEHOLDER_MENU_NAME = '[POS] __CUSTOM_ITEM_PLACEHOLDER__';
    const itemSalesMap = new Map<string, { key: string; menuName: string; quantity: number; revenue: number }>();
    completedOrders.forEach(order => {
      order.orderItems.forEach(item => {
        if (!item.menu) return;

        const isCustom = item.menu.name === POS_CUSTOM_PLACEHOLDER_MENU_NAME;
        const displayName = (item.menuName || item.menu.name) as string;

        // For normal menu items, aggregate by menuId.
        // For custom items, aggregate by name so they don't all merge together.
        const key = isCustom ? `CUSTOM::${displayName}` : item.menu.id.toString();

        const current = itemSalesMap.get(key) || {
          key,
          menuName: displayName,
          quantity: 0,
          revenue: 0,
        };

        itemSalesMap.set(key, {
          ...current,
          quantity: current.quantity + item.quantity,
          revenue: current.revenue + decimalToNumber(item.subtotal),
        });
      });
    });

    const totalItemRevenue = Array.from(itemSalesMap.values()).reduce((sum, item) => sum + item.revenue, 0);
    const topSellingItems = Array.from(itemSalesMap.values())
      .map(item => ({
        menuId: item.key,
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
      const hour = Number.parseInt(formatInTimeZone(order.placedAt, timezone, 'H'), 10);
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

    const orderTypesData = Array.from(typeMap.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        revenue: data.revenue,
        percentage: completedOrders.length > 0 ? (data.count / completedOrders.length) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Category mix
    const categoryMap = new Map<string, { revenue: number; quantity: number }>();
    completedOrders.forEach((order) => {
      order.orderItems.forEach((item) => {
        const categoryName = item.menu?.category?.name || 'Uncategorized';
        const current = categoryMap.get(categoryName) || { revenue: 0, quantity: 0 };
        categoryMap.set(categoryName, {
          revenue: current.revenue + decimalToNumber(item.subtotal),
          quantity: current.quantity + item.quantity,
        });
      });
    });

    const totalCategoryRevenue = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.revenue, 0);
    const categoryMix = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        revenue: data.revenue,
        quantity: data.quantity,
        percentage: totalCategoryRevenue > 0 ? (data.revenue / totalCategoryRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const analytics: SalesAnalytics = {
      summary,
      customerMetrics,
      cohortRetention,
      revenueTrend,
      topSellingItems,
      peakHours,
      ordersByStatus,
      paymentMethods,
      orderTypes: orderTypesData,
      categoryMix,
    };

    return NextResponse.json({
      success: true,
      data: serializeBigInt(analytics),
      meta: {
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timezone,
        scope: includeGroup ? 'group' : 'merchant',
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
