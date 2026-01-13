/**
 * Customer Reservation History API
 * GET /api/customer/reservations - Get all reservations for authenticated customer
 *
 * @security
 * - JWT Bearer token required (Customer token)
 * - Customer can only see their own reservations
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withCustomer, type CustomerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { createOrderTrackingToken } from '@/lib/utils/orderTrackingToken';

export const GET = withCustomer(async (
  _request: NextRequest,
  context: CustomerAuthContext,
) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        customerId: context.customerId,
      },
      include: {
        merchant: {
          select: {
            name: true,
            code: true,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formatted = reservations.map((r) => {
      const preorder = (r as any).preorder as any;
      const preorderItems: any[] = Array.isArray(preorder?.items) ? preorder.items : [];
      const itemsCount = preorderItems.reduce((sum, it) => sum + Math.max(0, Number(it?.quantity) || 0), 0);

      return {
        id: r.id,
        merchantName: r.merchant.name,
        merchantCode: r.merchant.code,
        status: r.status,
        partySize: r.partySize,
        reservationDate: r.reservationDate,
        reservationTime: r.reservationTime,
        itemsCount,
        order: r.order
          ? {
              orderNumber: r.order.orderNumber,
              mode:
                r.order.orderType === 'DINE_IN'
                  ? 'dinein'
                  : r.order.orderType === 'TAKEAWAY'
                    ? 'takeaway'
                    : 'delivery',
              status: r.order.status,
              trackingToken: createOrderTrackingToken({
                merchantCode: r.merchant.code,
                orderNumber: r.order.orderNumber,
              }),
            }
          : null,
        createdAt: r.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(formatted),
      message: 'Reservations retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Get customer reservations error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to load reservation history',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
