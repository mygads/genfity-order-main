/**
 * POS Order History API
 * GET /api/merchant/orders/pos/history?today=true
 *
 * Returns today's POS-visible orders for the authenticated merchant.
 *
 * Security:
 * - Merchant authentication required (MERCHANT_OWNER / MERCHANT_STAFF)
 *
 * Notes:
 * - "today" is evaluated using server local date boundaries.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

function getTodayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start, end };
}

async function handleGet(req: NextRequest, context: AuthContext) {
  try {
    const { merchantId } = context;

    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant context not found',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const url = new URL(req.url);
    const todayOnly = url.searchParams.get('today') === 'true';
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 200, 1), 500) : 200;

    const where: any = {
      merchantId: BigInt(merchantId),
    };

    if (todayOnly) {
      const { start, end } = getTodayRange();
      where.placedAt = {
        gte: start,
        lt: end,
      };
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        orderItems: {
          include: {
            addons: true,
          },
        },
        customer: {
          select: {
            name: true,
            phone: true,
          },
        },
        payment: true,
      },
      orderBy: {
        placedAt: 'desc',
      },
      take: limit,
    });

    const mapped = orders.map((order) => {
      const payment = order.payment as any;
      const metadata = (payment?.metadata || {}) as any;

      const amountPaid =
        typeof metadata.paidAmount === 'number'
          ? metadata.paidAmount
          : typeof metadata.paidAmount === 'string'
            ? parseFloat(metadata.paidAmount)
            : undefined;

      const changeAmount =
        typeof metadata.changeAmount === 'number'
          ? metadata.changeAmount
          : typeof metadata.changeAmount === 'string'
            ? parseFloat(metadata.changeAmount)
            : 0;

      const requestedPaymentMethod =
        typeof metadata.requestedPaymentMethod === 'string' ? metadata.requestedPaymentMethod : undefined;

      const paymentMethod = requestedPaymentMethod || payment?.paymentMethod || undefined;
      const paymentStatus = payment?.status === 'COMPLETED' ? 'PAID' : 'UNPAID';

      return {
        id: order.id.toString(),
        orderNumber: order.orderNumber,
        orderType: order.orderType,
        status: order.status,
        paymentStatus,
        paymentMethod,
        tableNumber: order.tableNumber,
        customerName: order.customer?.name || undefined,
        customerPhone: order.customer?.phone || undefined,
        subtotal: Number(order.subtotal),
        taxAmount: Number(order.taxAmount),
        serviceChargeAmount: Number(order.serviceChargeAmount),
        packagingFeeAmount: Number(order.packagingFeeAmount),
        totalAmount: Number(order.totalAmount),
        discountAmount: typeof (order as any).discountAmount !== 'undefined' ? Number((order as any).discountAmount) : undefined,
        amountPaid: amountPaid ?? (payment?.amount ? Number(payment.amount) : undefined),
        changeAmount,
        createdAt: order.placedAt.toISOString(),
        paidAt: payment?.paidAt ? new Date(payment.paidAt).toISOString() : undefined,
        items: (order.orderItems || []).map((item) => ({
          id: item.id.toString(),
          menuName: item.menuName,
          quantity: item.quantity,
          unitPrice: Number(item.menuPrice),
          subtotal: Number(item.subtotal),
          notes: item.notes || undefined,
          addons: (item.addons || []).map((addon) => ({
            addonName: addon.addonName,
            addonPrice: Number(addon.addonPrice),
            quantity: addon.quantity,
            subtotal: Number(addon.subtotal),
          })),
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(mapped),
      statusCode: 200,
    });
  } catch (error) {
    console.error('[GET /api/merchant/orders/pos/history] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch POS order history',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
