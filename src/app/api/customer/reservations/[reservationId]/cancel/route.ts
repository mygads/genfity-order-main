/**
 * Customer Cancel Reservation API
 * POST /api/customer/reservations/:reservationId/cancel
 *
 * @security
 * - JWT Bearer token required (Customer token)
 * - Customer can only cancel their own reservation
 *
 * @policy
 * - Only allowed when reservation status is PENDING
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withCustomer, type CustomerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam } from '@/lib/utils/routeContext';

export const POST = withCustomer(async (
  _request: NextRequest,
  context: CustomerAuthContext,
  routeContext
) => {
  try {
    const idResult = await requireBigIntRouteParam(routeContext, 'reservationId', 'Reservation ID is required');
    if (!idResult.ok) {
      return NextResponse.json(idResult.body, { status: idResult.status });
    }

    const id = idResult.value;

    const reservation = await prisma.reservation.findFirst({
      where: {
        id,
        customerId: context.customerId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Reservation not found', statusCode: 404 },
        { status: 404 }
      );
    }

    if (reservation.status !== 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATUS',
          message: 'Only pending reservations can be cancelled',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
      include: {
        merchant: {
          select: {
            name: true,
            code: true,
            timezone: true,
            currency: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated),
      message: 'Reservation cancelled successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Cancel reservation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to cancel reservation',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
