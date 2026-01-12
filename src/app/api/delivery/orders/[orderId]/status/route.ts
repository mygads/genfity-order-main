/**
 * Delivery Driver Order Status API
 * PUT /api/delivery/orders/[orderId]/status - Update delivery status for assigned order
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withDelivery } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

const ALLOWED_STATUS = ['PICKED_UP', 'DELIVERED', 'FAILED'] as const;

type AllowedStatus = (typeof ALLOWED_STATUS)[number];

export const PUT = withDelivery(async (request: NextRequest, context: AuthContext, routeContext) => {
  try {
    const { orderId } = await routeContext.params;
    const body = await request.json();

    const nextStatus = body?.deliveryStatus as AllowedStatus | undefined;
    if (!nextStatus || !ALLOWED_STATUS.includes(nextStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: `deliveryStatus must be one of: ${ALLOWED_STATUS.join(', ')}`,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: BigInt(orderId) },
      select: {
        id: true,
        merchantId: true,
        orderType: true,
        deliveryDriverUserId: true,
        deliveryStatus: true,
      },
    });

    if (!order || order.orderType !== 'DELIVERY') {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Delivery order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    if (context.merchantId && order.merchantId !== context.merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'You do not have access to this order',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    if (order.deliveryDriverUserId !== context.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Order is not assigned to you',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    const updateData: Record<string, unknown> = {
      deliveryStatus: nextStatus,
    };

    if (nextStatus === 'DELIVERED') {
      updateData.deliveryDeliveredAt = new Date();
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated),
      message: 'Delivery status updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating delivery status:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to update delivery status',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
