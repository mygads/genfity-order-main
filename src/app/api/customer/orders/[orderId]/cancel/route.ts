/**
 * Customer Cancel Order API
 * POST /api/customer/orders/:orderId/cancel
 *
 * @security
 * - JWT Bearer token required (Customer token)
 * - Customer can only cancel their own order
 *
 * @policy
 * - Only allowed when order status is PENDING
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withCustomer, type CustomerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam } from '@/lib/utils/routeContext';

export const POST = withCustomer(async (
  request: NextRequest,
  context: CustomerAuthContext,
  routeContext
) => {
  try {
    const idResult = await requireBigIntRouteParam(routeContext, 'orderId', 'Order ID is required');
    if (!idResult.ok) {
      return NextResponse.json(idResult.body, { status: idResult.status });
    }

    const orderId = idResult.value;

    const body = await request.json().catch(() => null);
    const reason = typeof body?.reason === 'string' && body.reason.trim().length > 0
      ? body.reason.trim()
      : 'Cancelled by customer';

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: context.customerId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'NOT_FOUND', message: 'Order not found', statusCode: 404 },
        { status: 404 }
      );
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_STATUS',
          message: 'Only pending orders can be cancelled',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason,
      },
      include: {
        merchant: {
          select: {
            name: true,
            code: true,
            currency: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated),
      message: 'Order cancelled successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Cancel order error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to cancel order',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
