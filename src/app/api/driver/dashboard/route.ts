/**
 * Driver Dashboard API
 * GET /api/driver/dashboard
 *
 * Dedicated endpoint for DELIVERY role dashboard data.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withDelivery } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

type HistoryFilter = 'today' | 'yesterday' | '7d' | 'all';

function getHistoryDateRange(filter: HistoryFilter): { from: Date | null; to: Date | null } {
  const now = new Date();

  if (filter === 'all') {
    return { from: null, to: null };
  }

  if (filter === '7d') {
    const from = new Date(now);
    from.setDate(from.getDate() - 7);
    return { from, to: null };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  if (filter === 'yesterday') {
    const from = new Date(start);
    from.setDate(from.getDate() - 1);

    const to = new Date(start);
    return { from, to };
  }

  return { from: start, to: end };
}

export const GET = withDelivery(async (req: NextRequest, context: AuthContext) => {
  try {
    const driverId = context.userId;

    const url = new URL(req.url);
    const filter = (url.searchParams.get('history') as HistoryFilter | null) ?? 'today';
    const historyFilter: HistoryFilter = ['today', 'yesterday', '7d', 'all'].includes(filter) ? filter : 'today';
    const { from: historyFrom, to: historyTo } = getHistoryDateRange(historyFilter);

    const selectBase = {
      id: true,
      orderNumber: true,
      status: true,
      placedAt: true,
      deliveryStatus: true,
      deliveryAddress: true,
      deliveryUnit: true,
      deliveryLatitude: true,
      deliveryLongitude: true,
      deliveryDeliveredAt: true,
      totalAmount: true,
      payment: {
        select: {
          status: true,
          paymentMethod: true,
          amount: true,
          paidAt: true,
        },
      },
      merchant: {
        select: {
          id: true,
          code: true,
          name: true,
          currency: true,
        },
      },
      customer: {
        select: {
          name: true,
          phone: true,
        },
      },
      _count: {
        select: {
          orderItems: true,
        },
      },
    } as const;

    const [activeDeliveriesRaw, historyDeliveriesRaw] = await Promise.all([
      prisma.order.findMany({
        where: {
          orderType: 'DELIVERY',
          deliveryDriverUserId: driverId,
          deliveryStatus: { in: ['ASSIGNED', 'PICKED_UP'] },
          status: { not: 'CANCELLED' },
        },
        orderBy: [{ placedAt: 'asc' }],
        take: 50,
        select: selectBase,
      }),
      prisma.order.findMany({
        where: {
          orderType: 'DELIVERY',
          deliveryDriverUserId: driverId,
          deliveryStatus: { in: ['DELIVERED', 'FAILED'] },
          status: { not: 'CANCELLED' },
          ...(historyFrom
            ? {
                updatedAt: {
                  gte: historyFrom,
                  ...(historyTo ? { lt: historyTo } : null),
                },
              }
            : null),
        },
        orderBy: [{ deliveryDeliveredAt: 'desc' }, { updatedAt: 'desc' }],
        take: 50,
        select: selectBase,
      }),
    ]);

    const priority: Record<string, number> = {
      PICKED_UP: 0,
      ASSIGNED: 1,
    };
    const activeDeliveries = [...activeDeliveriesRaw].sort((a, b) => {
      const ap = priority[a.deliveryStatus ?? ''] ?? 99;
      const bp = priority[b.deliveryStatus ?? ''] ?? 99;
      if (ap !== bp) return ap - bp;
      return new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime();
    });

    const merchantFromOrders = (activeDeliveries[0] ?? historyDeliveriesRaw[0])?.merchant ?? null;

    const assignedCount = activeDeliveries.filter((o) => o.deliveryStatus === 'ASSIGNED').length;
    const pickedUpCount = activeDeliveries.filter((o) => o.deliveryStatus === 'PICKED_UP').length;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const deliveredTodayCount = await prisma.order.count({
      where: {
        orderType: 'DELIVERY',
        deliveryDriverUserId: driverId,
        deliveryStatus: 'DELIVERED',
        deliveryDeliveredAt: { gte: todayStart },
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        role: 'DELIVERY',
        merchant: merchantFromOrders,
        stats: {
          assignedCount,
          pickedUpCount,
          deliveredTodayCount,
        },
        historyFilter: historyFilter,
        activeDeliveries: activeDeliveries.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          deliveryStatus: o.deliveryStatus,
          deliveryAddress: o.deliveryAddress,
          deliveryUnit: o.deliveryUnit,
          deliveryLatitude: o.deliveryLatitude,
          deliveryLongitude: o.deliveryLongitude,
          itemsCount: o._count.orderItems,
          placedAt: o.placedAt,
          customer: o.customer,
          merchant: o.merchant,
          orderStatus: o.status,
          totalAmount: o.totalAmount,
          payment: o.payment,
        })),
        historyDeliveries: historyDeliveriesRaw.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          deliveryStatus: o.deliveryStatus,
          deliveryAddress: o.deliveryAddress,
          deliveryUnit: o.deliveryUnit,
          deliveryLatitude: o.deliveryLatitude,
          deliveryLongitude: o.deliveryLongitude,
          itemsCount: o._count.orderItems,
          placedAt: o.placedAt,
          deliveryDeliveredAt: o.deliveryDeliveredAt,
          customer: o.customer,
          merchant: o.merchant,
          orderStatus: o.status,
          totalAmount: o.totalAmount,
          payment: o.payment,
        })),
      }),
    });
  } catch (error) {
    console.error('[GET /api/driver/dashboard] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to load driver dashboard',
      },
      { status: 500 }
    );
  }
});
