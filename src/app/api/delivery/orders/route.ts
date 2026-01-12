/**
 * Delivery Driver Orders API
 * GET /api/delivery/orders - List orders assigned to the authenticated driver
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withDelivery } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

export const GET = withDelivery(async (request: NextRequest, context: AuthContext) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const whereStatus = status
      ? { deliveryStatus: status as 'PENDING_ASSIGNMENT' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'FAILED' }
      : undefined;

    const orders = await prisma.order.findMany({
      where: {
        orderType: 'DELIVERY',
        deliveryDriverUserId: context.userId,
        ...(context.merchantId ? { merchantId: context.merchantId } : {}),
        ...(whereStatus || {}),
      },
      orderBy: { placedAt: 'desc' },
      include: {
        payment: {
          select: {
            paymentMethod: true,
            status: true,
            paidAt: true,
            amount: true,
          },
        },
        merchant: {
          select: {
            name: true,
            code: true,
            currency: true,
          },
        },
        customer: {
          select: {
            name: true,
            phone: true,
            email: true,
          },
        },
        orderItems: {
          select: { id: true },
        },
      },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(
        orders.map((o) => ({
          ...o,
          itemsCount: o.orderItems.length,
        }))
      ),
      message: 'Delivery orders retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting delivery orders:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve delivery orders',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
