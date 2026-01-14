/**
 * POS Refund/Void API
 * POST /api/merchant/orders/pos/refund
 *
 * Refunds (or voids) a POS order after verifying the merchant delete PIN.
 *
 * Behavior:
 * - Requires merchant authentication
 * - Verifies merchant delete PIN (hashed)
 * - Cancels the order (OrderStatus.CANCELLED)
 * - Updates payment status:
 *   - COMPLETED -> REFUNDED
 *   - PENDING/FAILED -> CANCELLED
 * - Best-effort restores menu stock for tracked items
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

interface RefundRequestBody {
  orderId: number | string;
  deletePin: string;
  reason?: string;
}

function toBigIntId(value: unknown): bigint | null {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    // Only accept base-10 numeric strings
    if (!/^\d+$/.test(trimmed)) return null;
    try {
      return BigInt(trimmed);
    } catch {
      return null;
    }
  }
  return null;
}

async function handlePost(req: NextRequest, context: AuthContext) {
  try {
    const { merchantId, userId } = context;

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

    const body = (await req.json()) as RefundRequestBody;

    const orderId = toBigIntId(body.orderId);
    const pin = typeof body.deletePin === 'string' ? body.deletePin.trim() : '';

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Order ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (!pin) {
      return NextResponse.json(
        {
          success: false,
          error: 'PIN_REQUIRED',
          message: 'Delete PIN is required to refund/void an order',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, deletePin: true },
    });

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    if (!merchant.deletePin) {
      return NextResponse.json(
        {
          success: false,
          error: 'PIN_NOT_SET',
          message: 'Delete PIN is not configured for this merchant',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const isPinValid = await bcrypt.compare(pin, merchant.deletePin);
    if (!isPinValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PIN',
          message: 'Invalid PIN',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        merchantId: merchant.id,
      },
      include: {
        orderItems: {
          select: {
            menuId: true,
            quantity: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          error: 'ORDER_NOT_FOUND',
          message: 'Order not found or does not belong to this merchant',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Idempotent behavior
    const alreadyCancelled = order.status === 'CANCELLED';
    const paymentAny = order.payment as any;
    const alreadyRefunded = paymentAny?.status === 'REFUNDED';

    const refundReason = typeof body.reason === 'string' ? body.reason.trim() : '';

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = alreadyCancelled
        ? order
        : await tx.order.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' },
          });

      let updatedPayment = paymentAny ?? null;

      if (paymentAny) {
        if (!alreadyRefunded) {
          const nextStatus =
            paymentAny.status === 'COMPLETED'
              ? 'REFUNDED'
              : paymentAny.status === 'PENDING' || paymentAny.status === 'FAILED'
                ? 'CANCELLED'
                : paymentAny.status;

          const existingMetadata = (paymentAny.metadata || {}) as Record<string, unknown>;
          const nextMetadata = {
            ...existingMetadata,
            refundedByUserId: userId?.toString?.() ?? String(userId),
            refundedAt: new Date().toISOString(),
            refundReason: refundReason || undefined,
            source: (existingMetadata as any).source || 'POS',
          };

          updatedPayment = await tx.payment.update({
            where: { orderId: order.id },
            data: {
              status: nextStatus,
              metadata: nextMetadata as Prisma.InputJsonValue,
            },
          });
        }
      }

      return { order: updatedOrder, payment: updatedPayment };
    });

    // Best-effort restore stock for menus (POS decrements menu stock only)
    for (const item of order.orderItems) {
      try {
        const menu = await prisma.menu.findUnique({
          where: { id: item.menuId },
          select: { id: true, trackStock: true, stockQty: true },
        });

        if (menu?.trackStock && menu.stockQty !== null) {
          await prisma.menu.update({
            where: { id: menu.id },
            data: {
              stockQty: menu.stockQty + item.quantity,
              isActive: true,
            },
          });
        }
      } catch (stockError) {
        console.error('[POS REFUND] Stock restore failed (non-critical):', stockError);
      }
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        order: updated.order,
        payment: updated.payment,
      }),
      message: alreadyCancelled && (alreadyRefunded || !paymentAny) ? 'Order already voided' : 'Order refunded/voided successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('[POST /api/merchant/orders/pos/refund] Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to refund/void order',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
