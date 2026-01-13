/**
 * Merchant Reservation Cancel API
 * PUT /api/merchant/reservations/[reservationId]/cancel
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

async function handlePut(_req: NextRequest, context: AuthContext, routeContext: RouteContext) {
  try {
    const reservationIdResult = await requireBigIntRouteParam(routeContext, 'reservationId', 'Reservation ID is required');
    if (!reservationIdResult.ok) {
      return NextResponse.json(reservationIdResult.body, { status: reservationIdResult.status });
    }

    const merchantId = context.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'Merchant ID not found in context' },
        { status: 400 }
      );
    }

    const reservation = await prisma.reservation.findFirst({
      where: {
        id: reservationIdResult.value,
        merchantId,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Reservation not found' },
        { status: 404 }
      );
    }

    if (reservation.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'Only pending reservations can be cancelled' },
        { status: 400 }
      );
    }

    const updated = await prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated),
      message: 'Reservation cancelled',
    });
  } catch (error) {
    console.error('[PUT /api/merchant/reservations/[reservationId]/cancel] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to cancel reservation' },
      { status: 500 }
    );
  }
}

export const PUT = withMerchant(handlePut);
