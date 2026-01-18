/**
 * Merchant Reports API Endpoint
 * Route: GET /api/merchant/reports
 * Access: MERCHANT_OWNER and MERCHANT_STAFF
 *
 * Prisma-only analytics for:
 * - Period comparisons
 * - Fees, discounts, vouchers
 * - Sales modes (order types, scheduled orders)
 * - Operational metrics
 * - Anomaly detection for revenue drops
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { decimalToNumber, serializeBigInt } from '@/lib/utils/serializer';
import { formatInTimeZone } from 'date-fns-tz';

export const dynamic = 'force-dynamic';

type DateRange = { start: Date; end: Date };

type OrderFilterInput = {
  orderTypes?: string[];
  statuses?: string[];
  paymentMethods?: string[];
  scheduledOnly?: boolean;
  voucherSources?: string[];
};

const POS_CUSTOM_PLACEHOLDER_MENU_NAME = '[POS] __CUSTOM_ITEM_PLACEHOLDER__';

const resolveDateRange = (period: string, startDate?: string | null, endDate?: string | null): {
  current: DateRange;
  previous: DateRange;
} => {
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
    currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    previousEnd = new Date(currentStart.getTime() - 1);
    previousStart = new Date(previousEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd },
  };
};

const parseList = (value?: string | null) => {
  if (!value) return undefined;
  const items = value.split(',').map((entry) => entry.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
};

const buildOrderFilters = (searchParams: URLSearchParams): OrderFilterInput => {
  const orderTypes = parseList(searchParams.get('orderType'));
  const statuses = parseList(searchParams.get('status'));
  const paymentMethods = parseList(searchParams.get('paymentMethod'));
  const voucherSources = parseList(searchParams.get('voucherSource'));
  const scheduledOnly = searchParams.get('scheduledOnly') === 'true';

  return { orderTypes, statuses, paymentMethods, voucherSources, scheduledOnly };
};

const buildOrderWhere = (
  merchantId: bigint,
  range: DateRange,
  filters: OrderFilterInput
) => {
  const where: Record<string, unknown> = {
    merchantId,
    placedAt: { gte: range.start, lte: range.end },
  };

  if (filters.orderTypes?.length) {
    where.orderType = { in: filters.orderTypes };
  }

  if (filters.statuses?.length) {
    where.status = { in: filters.statuses };
  }

  if (filters.scheduledOnly) {
    where.isScheduled = true;
  }

  if (filters.voucherSources?.length) {
    where.orderDiscounts = { some: { source: { in: filters.voucherSources } } };
  }

  if (filters.paymentMethods?.length) {
    where.payment = { is: { paymentMethod: { in: filters.paymentMethods } } };
  }

  return where;
};

const toDayKey = (date: Date, timezone: string) => formatInTimeZone(date, timezone, 'yyyy-MM-dd');

const computeDailySeries = (orders: any[], timezone: string) => {
  const map = new Map<string, { totalRevenue: number; totalOrders: number }>();
  orders.forEach((order) => {
    const key = toDayKey(order.placedAt, timezone);
    const current = map.get(key) || { totalRevenue: 0, totalOrders: 0 };
    map.set(key, {
      totalRevenue: current.totalRevenue + decimalToNumber(order.totalAmount),
      totalOrders: current.totalOrders + 1,
    });
  });

  return Array.from(map.entries())
    .map(([date, values]) => ({ date, ...values }))
    .sort((a, b) => a.date.localeCompare(b.date));
};

const computeAnomalies = (
  dailySeries: Array<{ date: string; totalRevenue: number }>,
  settings: { windowSize: number; stdDevMultiplier: number; minDropPct: number }
) => {
  const windowSize = Math.max(3, settings.windowSize);
  const stdMultiplier = Math.max(0.5, settings.stdDevMultiplier);
  const minDropPct = Math.max(0, settings.minDropPct);
  const anomalies: Array<{
    date: string;
    revenue: number;
    expected: number;
    deltaPct: number;
  }> = [];

  for (let index = 0; index < dailySeries.length; index += 1) {
    if (index < windowSize) continue;
    const window = dailySeries.slice(index - windowSize, index).map((item) => item.totalRevenue);
    const mean = window.reduce((sum, value) => sum + value, 0) / window.length;
    const variance = window.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / window.length;
    const std = Math.sqrt(variance);
    const current = dailySeries[index];

    if (mean <= 0) continue;
    const threshold = mean - stdMultiplier * std;
    if (current.totalRevenue < threshold) {
      const deltaPct = mean > 0 ? ((current.totalRevenue - mean) / mean) * 100 : 0;
      if (Math.abs(deltaPct) >= minDropPct) {
        anomalies.push({
          date: current.date,
          revenue: current.totalRevenue,
          expected: mean,
          deltaPct,
        });
      }
    }
  }

  return anomalies;
};

const summarizeOrders = (orders: any[]) => {
  const totalOrders = orders.length;
  const completedOrders = orders.filter((order) => order.status === 'COMPLETED');
  const cancelledOrders = orders.filter((order) => order.status === 'CANCELLED');
  const completedCount = completedOrders.length;

  const totals = completedOrders.reduce(
    (acc, order) => {
      acc.subtotal += decimalToNumber(order.subtotal);
      acc.totalRevenue += decimalToNumber(order.totalAmount);
      acc.tax += decimalToNumber(order.taxAmount);
      acc.service += decimalToNumber(order.serviceChargeAmount);
      acc.packaging += decimalToNumber(order.packagingFeeAmount);
      acc.delivery += decimalToNumber(order.deliveryFeeAmount);
      acc.discount += decimalToNumber(order.discountAmount);
      return acc;
    },
    {
      subtotal: 0,
      totalRevenue: 0,
      tax: 0,
      service: 0,
      packaging: 0,
      delivery: 0,
      discount: 0,
    }
  );

  const averageOrderValue = completedCount > 0 ? totals.totalRevenue / completedCount : 0;
  const completionRate = totalOrders > 0 ? (completedCount / totalOrders) * 100 : 0;

  return {
    totalOrders,
    completedOrders: completedCount,
    cancelledOrders: cancelledOrders.length,
    totalRevenue: totals.totalRevenue,
    subtotal: totals.subtotal,
    totalTax: totals.tax,
    totalServiceCharge: totals.service,
    totalPackagingFee: totals.packaging,
    totalDeliveryFee: totals.delivery,
    totalDiscount: totals.discount,
    netRevenue: totals.subtotal - totals.discount,
    averageOrderValue,
    completionRate,
  };
};

const buildOrderTypeBreakdown = (orders: any[]) => {
  const map = new Map<string, { count: number; revenue: number }>();
  orders.forEach((order) => {
    const key = order.orderType || 'UNKNOWN';
    const current = map.get(key) || { count: 0, revenue: 0 };
    map.set(key, {
      count: current.count + 1,
      revenue: current.revenue + decimalToNumber(order.totalAmount),
    });
  });
  return Array.from(map.entries()).map(([type, values]) => ({ type, ...values }));
};

const buildOrderStatusBreakdown = (orders: any[]) => {
  const map = new Map<string, number>();
  orders.forEach((order) => {
    map.set(order.status, (map.get(order.status) || 0) + 1);
  });
  return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
};

const buildPaymentBreakdown = (orders: any[]) => {
  const map = new Map<string, { count: number; revenue: number }>();
  orders.forEach((order) => {
    const method = order.payment?.paymentMethod || 'UNKNOWN';
    const current = map.get(method) || { count: 0, revenue: 0 };
    map.set(method, {
      count: current.count + 1,
      revenue: current.revenue + decimalToNumber(order.totalAmount),
    });
  });

  return Array.from(map.entries()).map(([method, values]) => ({
    method,
    count: values.count,
    revenue: values.revenue,
  }));
};

const buildVoucherSummary = (orders: any[]) => {
  const sourceMap = new Map<string, { count: number; amount: number }>();
  const templateMap = new Map<string, { label: string; count: number; amount: number }>();

  orders.forEach((order) => {
    (order.orderDiscounts || []).forEach((discount: any) => {
      const source = discount.source || 'UNKNOWN';
      const amount = decimalToNumber(discount.discountAmount);
      const current = sourceMap.get(source) || { count: 0, amount: 0 };
      sourceMap.set(source, { count: current.count + 1, amount: current.amount + amount });

      if (discount.voucherTemplateId || discount.label) {
        const key = discount.voucherTemplateId ? String(discount.voucherTemplateId) : discount.label;
        const existing = templateMap.get(key) || { label: discount.label || 'Voucher', count: 0, amount: 0 };
        templateMap.set(key, { label: existing.label, count: existing.count + 1, amount: existing.amount + amount });
      }
    });
  });

  return {
    bySource: Array.from(sourceMap.entries()).map(([source, values]) => ({ source, ...values })),
    topTemplates: Array.from(templateMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5),
  };
};

const buildTopMenuItems = (orders: any[]) => {
  const map = new Map<string, { key: string; name: string; quantity: number; revenue: number }>();
  orders.forEach((order) => {
    (order.orderItems || []).forEach((item: any) => {
      const menuName = item.menuName || item.menu?.name || 'Menu';
      const isCustom = item.menu?.name === POS_CUSTOM_PLACEHOLDER_MENU_NAME;
      const key = isCustom ? `CUSTOM::${menuName}` : String(item.menuId);
      const current = map.get(key) || { key, name: menuName, quantity: 0, revenue: 0 };
      map.set(key, {
        key,
        name: menuName,
        quantity: current.quantity + item.quantity,
        revenue: current.revenue + decimalToNumber(item.subtotal),
      });
    });
  });

  return Array.from(map.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);
};

const buildHourlyPerformance = (orders: any[], timezone: string) => {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, orderCount: 0, avgPrepTime: 0 }));
  const prepBuckets = new Map<number, number[]>();

  orders.forEach((order) => {
    const hour = Number.parseInt(formatInTimeZone(order.placedAt, timezone, 'H'), 10);
    const bucket = buckets[hour];
    bucket.orderCount += 1;

    if (order.completedAt) {
      const minutes = (order.completedAt.getTime() - order.placedAt.getTime()) / 60000;
      const list = prepBuckets.get(hour) || [];
      list.push(minutes);
      prepBuckets.set(hour, list);
    }
  });

  return buckets.map((bucket) => {
    const prepTimes = prepBuckets.get(bucket.hour) || [];
    const avgPrepTime = prepTimes.length > 0
      ? prepTimes.reduce((sum, value) => sum + value, 0) / prepTimes.length
      : 0;

    const targetPrepTime = 15;
    const prepTimeScore = Math.max(0, 100 - (avgPrepTime / targetPrepTime) * 100);
    const volumeScore = Math.min(100, bucket.orderCount * 10);
    const efficiency = (prepTimeScore + volumeScore) / 2;

    return {
      hour: bucket.hour,
      orderCount: bucket.orderCount,
      efficiency: Math.min(100, Math.max(0, efficiency)),
      avgPrepTime: avgPrepTime || null,
    };
  });
};

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    if (!context.merchantId) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant context not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const anomalyWindow = Number(searchParams.get('anomalyWindow') || 7);
    const anomalyStdDev = Number(searchParams.get('anomalyStdDev') || 2);
    const anomalyMinDropPct = Number(searchParams.get('anomalyMinDropPct') || 15);
    const filters = buildOrderFilters(searchParams);
    const { current, previous } = resolveDateRange(period, searchParams.get('startDate'), searchParams.get('endDate'));

    const merchant = await prisma.merchant.findUnique({
      where: { id: context.merchantId },
      select: { currency: true, timezone: true },
    });

    const timezone = merchant?.timezone || 'Asia/Jakarta';

    const include = {
      orderItems: {
        select: { menuId: true, menuName: true, quantity: true, subtotal: true, menu: { select: { name: true } } },
      },
      orderDiscounts: {
        select: { source: true, discountAmount: true, voucherTemplateId: true, label: true },
      },
      payment: { select: { paymentMethod: true, status: true } },
    };

    const currentOrders = await prisma.order.findMany({
      where: buildOrderWhere(context.merchantId, current, filters),
      include,
    });

    const previousOrders = await prisma.order.findMany({
      where: buildOrderWhere(context.merchantId, previous, filters),
      include,
    });

    const currentSummary = summarizeOrders(currentOrders);
    const previousSummary = summarizeOrders(previousOrders);

    const periodComparison = {
      metrics: [
        { label: 'Total Revenue', current: currentSummary.totalRevenue, previous: previousSummary.totalRevenue, format: 'currency' as const },
        { label: 'Net Revenue', current: currentSummary.netRevenue, previous: previousSummary.netRevenue, format: 'currency' as const },
        { label: 'Total Orders', current: currentSummary.totalOrders, previous: previousSummary.totalOrders, format: 'number' as const },
        { label: 'Avg. Order Value', current: currentSummary.averageOrderValue, previous: previousSummary.averageOrderValue, format: 'currency' as const },
        { label: 'Completion Rate', current: currentSummary.completionRate, previous: previousSummary.completionRate, format: 'decimal' as const },
      ],
    };

    const completedOrders = currentOrders.filter((order) => order.status === 'COMPLETED');
    const dailySeries = computeDailySeries(completedOrders, timezone);
    const anomalies = computeAnomalies(
      dailySeries.map((item) => ({ date: item.date, totalRevenue: item.totalRevenue })),
      {
        windowSize: Number.isFinite(anomalyWindow) ? anomalyWindow : 7,
        stdDevMultiplier: Number.isFinite(anomalyStdDev) ? anomalyStdDev : 2,
        minDropPct: Number.isFinite(anomalyMinDropPct) ? anomalyMinDropPct : 15,
      }
    );

    const voucherSummary = buildVoucherSummary(completedOrders);
    const orderTypeBreakdown = buildOrderTypeBreakdown(completedOrders);
    const orderStatusBreakdown = buildOrderStatusBreakdown(currentOrders);
    const paymentBreakdown = buildPaymentBreakdown(completedOrders);
    const topMenuItems = buildTopMenuItems(completedOrders);
    const hourlyPerformance = buildHourlyPerformance(currentOrders, timezone);

    const scheduledOrders = currentOrders.filter((order) => order.isScheduled);
    const scheduledRevenue = scheduledOrders
      .filter((order) => order.status === 'COMPLETED')
      .reduce((sum, order) => sum + decimalToNumber(order.totalAmount), 0);

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        period,
        dateRange: { current, previous },
        merchant: { currency: merchant?.currency || 'AUD', timezone },
        summary: currentSummary,
        periodComparison,
        voucherSummary,
        feesBreakdown: {
          tax: currentSummary.totalTax,
          serviceCharge: currentSummary.totalServiceCharge,
          packagingFee: currentSummary.totalPackagingFee,
          deliveryFee: currentSummary.totalDeliveryFee,
          discount: currentSummary.totalDiscount,
        },
        orderTypeBreakdown,
        orderStatusBreakdown,
        paymentBreakdown,
        scheduledSummary: {
          scheduledCount: scheduledOrders.length,
          scheduledRevenue,
        },
        dailyRevenue: dailySeries,
        anomalies,
        anomalySettings: {
          windowSize: Number.isFinite(anomalyWindow) ? anomalyWindow : 7,
          stdDevMultiplier: Number.isFinite(anomalyStdDev) ? anomalyStdDev : 2,
          minDropPct: Number.isFinite(anomalyMinDropPct) ? anomalyMinDropPct : 15,
        },
        topMenuItems,
        hourlyPerformance,
      }),
    });
  } catch (error) {
    console.error('Reports API Error:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch reports data' },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
