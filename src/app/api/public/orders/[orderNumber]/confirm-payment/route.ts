/**
 * Customer payment confirmation API
 * POST /api/public/orders/[orderNumber]/confirm-payment
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import { verifyOrderTrackingToken } from '@/lib/utils/orderTrackingToken';
import type { RouteContext } from '@/lib/utils/routeContext';

export async function POST(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  try {
    const { orderNumber } = params;
    const token = request.nextUrl.searchParams.get('token') || '';

    if (!orderNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Order number is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const note = typeof body?.note === 'string' ? body.note.trim() : '';

    const order = await prisma.order.findFirst({
      where: { orderNumber },
      include: {
        merchant: { select: { id: true, code: true } },
        payment: true,
      },
    });

    if (!order || !order.merchant) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const ok = token
      ? verifyOrderTrackingToken({
          token,
          merchantCode: order.merchant.code,
          orderNumber: order.orderNumber,
        })
      : false;

    if (!ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    if (!order.payment) {
      return NextResponse.json(
        {
          success: false,
          error: 'PAYMENT_NOT_FOUND',
          message: 'Payment record not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const paymentMethod = String(order.payment.paymentMethod || '').toUpperCase();
    if (!['MANUAL_TRANSFER', 'QRIS', 'ONLINE'].includes(paymentMethod)) {
      return NextResponse.json(
        {
          success: false,
          error: 'PAYMENT_METHOD_NOT_SUPPORTED',
          message: 'This payment method does not require confirmation',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const paymentSettings = await prisma.merchantPaymentSettings.findUnique({
      where: { merchantId: order.merchant.id },
      select: { requirePaymentProof: true },
    });
    const requirePaymentProof = paymentSettings?.requirePaymentProof === true;
    if (requirePaymentProof && !order.payment.customerProofUrl) {
      return NextResponse.json(
        {
          success: false,
          error: 'PAYMENT_PROOF_REQUIRED',
          message: 'Payment proof is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.payment.update({
      where: { id: order.payment.id },
      data: {
        customerPaidAt: new Date(),
        customerPaymentNote: note
          ? `${order.payment.customerPaymentNote ? `${order.payment.customerPaymentNote} | ` : ''}${note}`
          : order.payment.customerPaymentNote,
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated),
      message: 'Payment confirmation saved',
      statusCode: 200,
    });
  } catch (error) {
    console.error('❌ [API] Confirm payment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to confirm payment',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
