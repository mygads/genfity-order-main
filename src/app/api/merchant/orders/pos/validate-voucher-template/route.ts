/**
 * POS Voucher Template Validation API (Merchant)
 * POST /api/merchant/orders/pos/validate-voucher-template
 *
 * Validates a POS voucher template against an existing POS order (by orderId)
 * and returns the computed discount amount.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import { computeVoucherDiscount } from '@/lib/services/OrderVoucherService';
import { CustomError } from '@/lib/constants/errors';

interface ValidateVoucherTemplateRequest {
  orderId: number | string;
  voucherTemplateId: number | string;
}

export const POST = withMerchant(async (req: NextRequest, context: AuthContext) => {
  try {
    const { merchantId } = context;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant context not found', statusCode: 400 },
        { status: 400 }
      );
    }

    const body: ValidateVoucherTemplateRequest = await req.json();

    const rawOrderId = body?.orderId;
    const orderIdNumeric = typeof rawOrderId === 'string' ? Number(rawOrderId) : rawOrderId;

    if (!orderIdNumeric || !Number.isFinite(orderIdNumeric)) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'orderId is required', statusCode: 400 },
        { status: 400 }
      );
    }

    const rawTemplateId = body?.voucherTemplateId;
    const templateIdNumeric = typeof rawTemplateId === 'string' ? Number(rawTemplateId) : rawTemplateId;

    if (!templateIdNumeric || !Number.isFinite(templateIdNumeric)) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'voucherTemplateId is required', statusCode: 400 },
        { status: 400 }
      );
    }

    const order = await prisma.order.findFirst({
      where: {
        id: BigInt(orderIdNumeric),
        merchantId: BigInt(merchantId),
      },
      select: {
        id: true,
        orderType: true,
        subtotal: true,
        orderItems: {
          select: {
            menuId: true,
            subtotal: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'ORDER_NOT_FOUND', message: 'Order not found', statusCode: 404 },
        { status: 404 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: BigInt(merchantId) },
      select: { currency: true, timezone: true },
    });

    const computed = await computeVoucherDiscount({
      merchantId: BigInt(merchantId),
      merchantCurrency: merchant?.currency || 'AUD',
      merchantTimezone: merchant?.timezone || 'Australia/Sydney',
      audience: 'POS',
      orderType: order.orderType,
      subtotal: Number(order.subtotal),
      items: (order.orderItems || []).map((i) => ({
        menuId: i.menuId,
        subtotal: Number(i.subtotal),
      })),
      voucherTemplateId: BigInt(templateIdNumeric),
      customerId: null,
      orderIdForStacking: order.id,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        templateId: computed.templateId,
        codeId: computed.codeId,
        label: computed.label,
        discountAmount: computed.discountAmount,
        eligibleSubtotal: computed.eligibleSubtotal,
      }),
      message: 'Voucher valid',
      statusCode: 200,
    });
  } catch (error) {
    console.error('[POST /api/merchant/orders/pos/validate-voucher-template] Error:', error);

    if (error instanceof CustomError) {
      return NextResponse.json(
        {
          success: false,
          error: error.errorCode,
          message: error.message,
          statusCode: error.statusCode,
          ...(error.details ? { details: serializeBigInt(error.details) } : {}),
        },
        { status: error.statusCode }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to validate voucher';
    return NextResponse.json(
      { success: false, error: 'VALIDATION_ERROR', message, statusCode: 400 },
      { status: 400 }
    );
  }
});
