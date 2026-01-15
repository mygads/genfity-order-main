/**
 * Customer Voucher Validation API
 * POST /api/customer/vouchers/validate
 *
 * Validates a voucher code for the current (authenticated) customer and returns
 * the computed discount amount for the provided cart items.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withCustomer, CustomerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { computeVoucherDiscount } from '@/lib/services/OrderVoucherService';
import { CustomError } from '@/lib/constants/errors';

type ItemCandidate = { menuId: bigint | null; subtotal: number };
type NormalizedItem = { menuId: bigint; subtotal: number };

function toBigIntOrNull(value: unknown): bigint | null {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isInteger(value)) return BigInt(value);
    if (typeof value === 'string' && value.trim() !== '') return BigInt(value);
    return null;
  } catch {
    return null;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toNumberOrNaN(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return Number.NaN;
}

export const POST = withCustomer(async (request: NextRequest, context: CustomerAuthContext) => {
  try {
    const body = await request.json();

    const merchantCode = typeof body.merchantCode === 'string' ? body.merchantCode.trim() : '';
    const voucherCode = typeof body.voucherCode === 'string' ? body.voucherCode.trim().toUpperCase() : '';
    const orderType = body.orderType as 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    const items = Array.isArray(body.items) ? body.items : [];

    if (!merchantCode) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'merchantCode is required', statusCode: 400 },
        { status: 400 }
      );
    }

    if (!voucherCode) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'voucherCode is required', statusCode: 400 },
        { status: 400 }
      );
    }

    if (!orderType || !['DINE_IN', 'TAKEAWAY', 'DELIVERY'].includes(orderType)) {
      return NextResponse.json(
        { success: false, error: 'VALIDATION_ERROR', message: 'orderType is required', statusCode: 400 },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { code: merchantCode },
      select: { id: true, currency: true, timezone: true, isActive: true },
    });

    if (!merchant || merchant.isActive === false) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found', statusCode: 404 },
        { status: 404 }
      );
    }

    const normalizedItems: NormalizedItem[] = items
      .map((raw: unknown): ItemCandidate => {
        const obj = isPlainObject(raw) ? raw : {};
        const menuId = toBigIntOrNull(obj.menuId);
        const subtotal = toNumberOrNaN(obj.subtotal);
        return { menuId, subtotal };
      })
      .filter((i: ItemCandidate): i is NormalizedItem => i.menuId !== null && Number.isFinite(i.subtotal) && i.subtotal > 0)
      .map((i: NormalizedItem) => ({ menuId: i.menuId, subtotal: i.subtotal }));

    const subtotal = normalizedItems.reduce((sum, i) => sum + i.subtotal, 0);

    const computed = await computeVoucherDiscount({
      merchantId: merchant.id,
      merchantCurrency: merchant.currency || 'AUD',
      merchantTimezone: merchant.timezone || 'Australia/Sydney',
      audience: 'CUSTOMER',
      orderType,
      subtotal,
      items: normalizedItems,
      voucherCode,
      customerId: context.customerId,
      orderIdForStacking: null,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        templateId: computed.templateId,
        codeId: computed.codeId,
        label: computed.label,
        discountType: computed.discountType,
        discountValue: computed.discountValue,
        discountAmount: computed.discountAmount,
        eligibleSubtotal: computed.eligibleSubtotal,
      }),
      message: 'Voucher valid',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Validate customer voucher error:', error);
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
