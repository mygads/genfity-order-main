/**
 * Customer Reservation Detail API
 * GET /api/customer/reservations/:reservationId
 *
 * @security
 * - JWT Bearer token required (Customer token)
 * - Customer can only see their own reservation
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withCustomer, type CustomerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam } from '@/lib/utils/routeContext';
import { createOrderTrackingToken } from '@/lib/utils/orderTrackingToken';

export const GET = withCustomer(async (
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
      include: {
        merchant: {
          select: {
            name: true,
            code: true,
            timezone: true,
            currency: true,
          },
        },
        customer: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        order: {
          select: {
            orderNumber: true,
            orderType: true,
            status: true,
          },
        },
      },
    });

    if (!reservation) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Reservation not found' },
        { status: 404 }
      );
    }

    const order = reservation.order
      ? {
          orderNumber: reservation.order.orderNumber,
          mode:
            reservation.order.orderType === 'DINE_IN'
              ? 'dinein'
              : reservation.order.orderType === 'TAKEAWAY'
                ? 'takeaway'
                : 'delivery',
          status: reservation.order.status,
          trackingToken: createOrderTrackingToken({
            merchantCode: reservation.merchant.code,
            orderNumber: reservation.order.orderNumber,
          }),
        }
      : null;

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        ...reservation,
        order,
      }),
      message: 'Reservation retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Get customer reservation error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to load reservation',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
