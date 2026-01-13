/**
 * Merchant Reservations API
 * GET /api/merchant/reservations
 *
 * Returns recent reservations (all statuses) for the current merchant.
 * Includes a derived displayStatus based on linked order status.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { getReservationDisplayStatus } from '@/lib/utils/reservationStatus';

async function handleGet(req: NextRequest, context: AuthContext) {
  try {
    const merchantId = context.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID not found in context' },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.max(1, Math.min(200, Number(limitParam) || 100));

    const reservations = await prisma.reservation.findMany({
      where: { merchantId },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        order: {
          select: {
            id: true,
            status: true,
            orderNumber: true,
            placedAt: true,
          },
        },
      },
      orderBy: [{ reservationDate: 'desc' }, { reservationTime: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    const serialized = serializeBigInt(reservations) as Array<Record<string, unknown>>;

    const data = serialized.map((r, idx) => {
      const original = reservations[idx];
      const orderStatus = original.order?.status ?? null;
      const displayStatus = getReservationDisplayStatus({
        status: original.status,
        orderStatus,
      });

      return {
        ...r,
        displayStatus,
      };
    });

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
    });
  } catch (error) {
    console.error('[GET /api/merchant/reservations] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
