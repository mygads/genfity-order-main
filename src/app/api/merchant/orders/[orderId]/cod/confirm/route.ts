import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { OrderManagementService } from '@/lib/services/OrderManagementService';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

export const POST = withMerchant(async (
  req: NextRequest,
  context: AuthContext,
  routeContext: RouteContext
) => {
  try {
    const orderIdResult = await requireBigIntRouteParam(routeContext, 'orderId', 'Invalid orderId');
    if (!orderIdResult.ok) {
      return NextResponse.json(orderIdResult.body, { status: orderIdResult.status });
    }

    const orderId = orderIdResult.value;
    const body = await req.json().catch(() => ({} as any));

    const id = orderId;

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        merchantId: true,
        orderType: true,
        payment: {
          select: { paymentMethod: true, status: true },
        },
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

    if (order.payment?.paymentMethod && order.payment.paymentMethod !== 'CASH_ON_DELIVERY') {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'This order is not Cash on Delivery',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (order.payment?.status === 'COMPLETED') {
      return NextResponse.json(
        {
          success: true,
          data: serializeBigInt({ order, payment: order.payment }),
          message: 'Payment already completed',
          statusCode: 200,
        },
        { status: 200 }
      );
    }

    const result = await OrderManagementService.confirmCashOnDeliveryPayment(
      id,
      context.userId,
      body?.notes
    );

    return NextResponse.json(
      {
        success: true,
        data: serializeBigInt(result),
        message: 'Cash on Delivery payment confirmed',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error confirming COD payment (merchant):', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Failed to confirm cash payment',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
