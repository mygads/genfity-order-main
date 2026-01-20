/**
 * Public Order Wait Time Estimate API
 * GET /api/public/orders/[orderNumber]/wait-time?token=...
 *
 * Returns a dynamic wait time estimate derived from:
 * - Recent completed orders for the same merchant (prep duration)
 * - Current queue size (orders ahead)
 *
 * Hard cap: 60 minutes (to avoid over-promising).
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { verifyOrderTrackingToken } from '@/lib/utils/orderTrackingToken';
import type { RouteContext } from '@/lib/utils/routeContext';
import type { OrderStatus, OrderType } from '@prisma/client';
import { fromZonedTime } from 'date-fns-tz';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function minutesBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (1000 * 60);
}

type CacheEntry = {
  value: number;
  expiresAt: number;
};

const BASE_PREP_CACHE_TTL_MS = 2 * 60 * 1000;
const basePrepMinutesCache = new Map<string, CacheEntry>();

function getCacheKey(merchantId: bigint, orderType: OrderType): string {
  return `${merchantId.toString()}:${orderType}`;
}

function pruneCacheIfNeeded() {
  if (basePrepMinutesCache.size <= 500) return;
  basePrepMinutesCache.clear();
}

function parseScheduledAt(input: {
  scheduledDate: string | null;
  scheduledTime: string | null;
  timezone: string;
}): Date | null {
  const dateStr = input.scheduledDate ? String(input.scheduledDate).slice(0, 10) : null;
  const timeStr = input.scheduledTime ? String(input.scheduledTime).slice(0, 5) : null;
  if (!dateStr || !timeStr) return null;

  const localDateTime = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(localDateTime.getTime())) return null;

  try {
    return fromZonedTime(localDateTime, input.timezone);
  } catch {
    return null;
  }
}

async function tryComputeBasePrepMinutesFromStatusLog(
  merchantId: bigint,
  orderType: OrderType
): Promise<number | null> {
  const historyModel = (prisma as any)?.orderStatusHistory;
  if (!historyModel || typeof historyModel.findMany !== 'function') return null;

  try {
    const recent = await prisma.order.findMany({
      where: {
        merchantId,
        orderType,
        status: 'COMPLETED',
      },
      select: {
        id: true,
      },
      orderBy: { placedAt: 'desc' },
      take: 60,
    });

    const orderIds = recent.map((o) => o.id);
    if (orderIds.length === 0) return null;

    const rawEntries: any[] = await historyModel.findMany({
      where: {
        orderId: { in: orderIds },
      },
    });

    if (!Array.isArray(rawEntries) || rawEntries.length === 0) return null;

    const byOrderId = new Map<string, any[]>();
    for (const entry of rawEntries) {
      const id = entry?.orderId;
      if (id === undefined || id === null) continue;
      const key = String(id);
      const list = byOrderId.get(key) ?? [];
      list.push(entry);
      byOrderId.set(key, list);
    }

    // Re-fetch recent orders with timestamps for duration calculation.
    const recentWithTimes = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
      },
      select: {
        id: true,
        placedAt: true,
        actualReadyAt: true,
        completedAt: true,
      },
      take: 60,
    });

    const samples: number[] = [];
    for (const row of recentWithTimes) {
      const key = String(row.id);
      const entries = byOrderId.get(key);
      if (!entries || entries.length === 0) continue;

      const sorted = [...entries]
        .map((e) => ({
          status: (e?.toStatus ?? e?.status ?? null) as string | null,
          createdAt: e?.createdAt ? new Date(e.createdAt) : null,
        }))
        .filter((e) => e.createdAt && !Number.isNaN(e.createdAt.getTime()))
        .sort((a, b) => (a.createdAt!.getTime() - b.createdAt!.getTime()));

      if (sorted.length === 0) continue;

      const start = sorted[0].createdAt ?? row.placedAt;
      const ready =
        sorted.find((e) => e.status === 'READY')?.createdAt ??
        sorted.find((e) => e.status === 'COMPLETED')?.createdAt ??
        row.actualReadyAt ??
        row.completedAt;

      if (!ready) continue;
      const minutes = minutesBetween(start, ready);
      if (!Number.isFinite(minutes)) continue;
      if (minutes < 2) continue;
      if (minutes > 120) continue;

      samples.push(minutes);
    }

    const med = median(samples);
    if (med !== null && samples.length >= 5) {
      return clamp(Math.round(med), 5, 60);
    }

    return null;
  } catch {
    return null;
  }
}

async function computeBasePrepMinutes(merchantId: bigint, orderType: OrderType): Promise<number> {
  // If a status-transition log model exists in the future, prefer it.
  const fromHistory = await tryComputeBasePrepMinutesFromStatusLog(merchantId, orderType);
  if (fromHistory !== null) return fromHistory;

  // Use recent completed orders; prefer actualReadyAt, fallback to completedAt.
  const recent = await prisma.order.findMany({
    where: {
      merchantId,
      orderType,
      status: 'COMPLETED',
      OR: [{ actualReadyAt: { not: null } }, { completedAt: { not: null } }],
    },
    select: {
      placedAt: true,
      actualReadyAt: true,
      completedAt: true,
    },
    orderBy: { placedAt: 'desc' },
    take: 60,
  });

  const samples: number[] = [];
  for (const row of recent) {
    const end = row.actualReadyAt ?? row.completedAt;
    if (!end) continue;
    const minutes = minutesBetween(row.placedAt, end);

    // Filter extreme outliers (bad data / forgotten status updates).
    if (!Number.isFinite(minutes)) continue;
    if (minutes < 2) continue;
    if (minutes > 120) continue;

    samples.push(minutes);
  }

  // If we have enough data, use median (robust to outliers).
  const med = median(samples);
  if (med !== null && samples.length >= 5) {
    return clamp(Math.round(med), 5, 60);
  }

  // Fallback default when history is insufficient.
  return 20;
}

async function getBasePrepMinutesCached(merchantId: bigint, orderType: OrderType): Promise<number> {
  pruneCacheIfNeeded();
  const key = getCacheKey(merchantId, orderType);
  const now = Date.now();
  const cached = basePrepMinutesCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const value = await computeBasePrepMinutes(merchantId, orderType);
  basePrepMinutesCache.set(key, { value, expiresAt: now + BASE_PREP_CACHE_TTL_MS });
  return value;
}

async function computeQueueAhead(merchantId: bigint, orderType: OrderType, placedAt: Date): Promise<number> {
  return prisma.order.count({
    where: {
      merchantId,
      orderType,
      status: { in: ['PENDING', 'ACCEPTED', 'IN_PROGRESS'] },
      placedAt: { lt: placedAt },
    },
  });
}

function isFinalStatus(status: OrderStatus): boolean {
  return status === 'READY' || status === 'COMPLETED' || status === 'CANCELLED';
}

export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;

  try {
    const { orderNumber } = params;
    const token = request.nextUrl.searchParams.get('token') || '';

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Order number is required' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: { orderNumber },
      select: {
        orderNumber: true,
        status: true,
        orderType: true,
        placedAt: true,
        updatedAt: true,
        isScheduled: true,
        scheduledDate: true,
        scheduledTime: true,
        merchant: { select: { id: true, code: true, timezone: true } },
      },
    });

    if (!order || !order.merchant?.code) {
      return NextResponse.json(
        { success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' },
        { status: 404 }
      );
    }

    const ok = token
      ? verifyOrderTrackingToken({
          token,
          merchantCode: order.merchant.code,
          orderNumber: order.orderNumber,
        })
      : false;

    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found' },
        { status: 404 }
      );
    }

    if (isFinalStatus(order.status)) {
      return NextResponse.json({
        success: true,
        data: {
          minMinutes: 0,
          maxMinutes: 0,
          cappedAt60: false,
          queueAhead: 0,
          basePrepMinutes: null,
          status: order.status,
        },
      });
    }

    const merchantId = order.merchant.id;
    const basePrepMinutes = await getBasePrepMinutesCached(merchantId, order.orderType);

    const now = new Date();
    const tz = order.merchant.timezone || 'UTC';
    const scheduledAt = order.isScheduled
      ? parseScheduledAt({
          scheduledDate: order.scheduledDate ?? null,
          scheduledTime: order.scheduledTime ?? null,
          timezone: tz,
        })
      : null;

    const queueAhead =
      order.status === 'PENDING' || order.status === 'ACCEPTED'
        ? await computeQueueAhead(merchantId, order.orderType, order.placedAt)
        : 0;

    const queuePosition = order.status === 'PENDING' || order.status === 'ACCEPTED' ? queueAhead + 1 : null;

    // Scheduled orders: estimate centered around scheduled time (avoid subtracting long pre-schedule elapsed time).
    if (
      scheduledAt &&
      scheduledAt.getTime() > now.getTime() &&
      (order.status === 'PENDING' || order.status === 'ACCEPTED')
    ) {
      const minutesUntilScheduled = clamp(Math.round(minutesBetween(now, scheduledAt)), 0, 60);
      const slack = clamp(Math.round(basePrepMinutes * 0.25), 2, 15);
      const minMinutes = clamp(minutesUntilScheduled - slack, 0, 60);
      const maxMinutes = clamp(minutesUntilScheduled + slack, minMinutes, 60);

      return NextResponse.json({
        success: true,
        data: {
          minMinutes,
          maxMinutes,
          cappedAt60: maxMinutes >= 60,
          queueAhead: 0,
          queuePosition: null,
          basePrepMinutes,
          status: order.status,
          isScheduled: true,
        },
      });
    }

    // Queue multiplier: pending is most sensitive; accepted slightly less; in-progress uses single-order estimate.
    const multiplier =
      order.status === 'PENDING'
        ? queueAhead + 1
        : order.status === 'ACCEPTED'
          ? Math.max(1, Math.ceil((queueAhead + 1) * 0.7))
          : 1;

    const rawTotal = basePrepMinutes * multiplier;
    const totalEstimateMinutes = clamp(Math.round(rawTotal), 5, 60);

    // Elapsed time: for IN_PROGRESS, use last status update as a best-effort start; otherwise use placedAt.
    const elapsedFrom = order.status === 'IN_PROGRESS' ? order.updatedAt : order.placedAt;
    const elapsed = Math.max(0, minutesBetween(elapsedFrom, now));

    const remaining = clamp(Math.round(totalEstimateMinutes - elapsed), 0, 60);

    if (remaining <= 0) {
      return NextResponse.json({
        success: true,
        data: {
          minMinutes: 0,
          maxMinutes: 0,
          cappedAt60: totalEstimateMinutes >= 60,
          queueAhead,
          queuePosition,
          basePrepMinutes,
          status: order.status,
          isScheduled: false,
        },
      });
    }

    const minMinutes = clamp(Math.round(remaining * 0.75), 1, 60);
    const maxMinutes = clamp(Math.round(remaining * 1.25), minMinutes, 60);

    return NextResponse.json({
      success: true,
      data: {
        minMinutes,
        maxMinutes,
        cappedAt60: maxMinutes >= 60,
        queueAhead,
        queuePosition,
        basePrepMinutes,
        status: order.status,
        isScheduled: false,
      },
    });
  } catch (error) {
    console.error('Error computing order wait time:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to estimate wait time' },
      { status: 500 }
    );
  }
}
