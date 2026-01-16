import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

async function handleGet(req: NextRequest, context: AuthContext) {
  try {
    const { merchantId } = context;
    if (!merchantId) {
      return NextResponse.json({ success: false, error: 'MERCHANT_ID_REQUIRED' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const orderNumberRaw = searchParams.get('orderNumber');
    const orderNumber = orderNumberRaw?.trim();

    if (!orderNumber) {
      return NextResponse.json({ success: false, error: 'ORDER_NUMBER_REQUIRED' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        merchantId,
        orderNumber,
      },
      select: {
        id: true,
        orderNumber: true,
      },
    });

    if (!order) {
      return NextResponse.json({ success: false, error: 'ORDER_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        orderId: order.id,
        orderNumber: order.orderNumber,
      }),
    });
  } catch (error) {
    console.error('[GET /api/merchant/orders/resolve] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve order',
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
