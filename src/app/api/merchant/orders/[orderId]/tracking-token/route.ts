import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { createOrderTrackingToken } from '@/lib/utils/orderTrackingToken';
import type { RouteContext } from '@/lib/utils/routeContext';

/**
 * Mint tracking token for an order (merchant-authenticated).
 *
 * Why: client-side receipt printing cannot access ORDER_TRACKING_TOKEN_SECRET,
 * so we mint tokens server-side under merchant authorization.
 */
export const GET = withMerchant(async (
  _req: NextRequest,
  auth: AuthContext,
  routeContext: RouteContext
) => {
  try {
    const params = await routeContext.params;
    const orderIdRaw = params?.orderId || '';

    let orderId: bigint;
    try {
      orderId = BigInt(orderIdRaw);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid orderId',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...(auth.merchantId ? { merchantId: auth.merchantId } : {}),
      },
      select: {
        orderNumber: true,
        merchant: {
          select: {
            code: true,
          },
        },
      },
    });

    if (!order || !order.merchant?.code) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const token = createOrderTrackingToken({
      merchantCode: order.merchant.code,
      orderNumber: order.orderNumber,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          trackingToken: token,
        },
        message: 'Tracking token minted successfully',
        statusCode: 200,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Mint tracking token error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to mint tracking token',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
