/**
 * Merchant Order Voucher Settings API
 *
 * GET /api/merchant/order-vouchers/settings
 * PUT /api/merchant/order-vouchers/settings
 *
 * Stores lightweight feature flags under Merchant.features.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { mergeFeatures } from '@/lib/utils/mergeFeatures';

type SettingsResponse = {
  customerVouchersEnabled: boolean;
  posDiscountsEnabled: boolean;
};

function readEffectiveCustomerVouchersEnabled(features: unknown): boolean {
  const posDiscountsEnabled = readPosDiscountsEnabled(features);
  const customerEnabled = readCustomerVouchersEnabled(features);
  return posDiscountsEnabled && customerEnabled;
}

function readCustomerVouchersEnabled(features: unknown): boolean {
  const obj = features && typeof features === 'object' && !Array.isArray(features) ? (features as Record<string, unknown>) : null;
  const orderVouchers = obj?.orderVouchers;
  const ov = orderVouchers && typeof orderVouchers === 'object' && !Array.isArray(orderVouchers)
    ? (orderVouchers as Record<string, unknown>)
    : null;

  const value = ov?.customerEnabled;
  if (value === undefined) return false; // default OFF when unset
  return Boolean(value);
}

function readPosDiscountsEnabled(features: unknown): boolean {
  const obj = features && typeof features === 'object' && !Array.isArray(features) ? (features as Record<string, unknown>) : null;
  const orderVouchers = obj?.orderVouchers;
  const ov = orderVouchers && typeof orderVouchers === 'object' && !Array.isArray(orderVouchers)
    ? (orderVouchers as Record<string, unknown>)
    : null;

  const value = ov?.posDiscountsEnabled;
  if (value === undefined) return false; // default OFF when unset
  return Boolean(value);
}

function writeCustomerVouchersEnabled(features: unknown, enabled: boolean): Prisma.InputJsonValue {
  return mergeFeatures(features, {
    orderVouchers: {
      customerEnabled: enabled,
    },
  }) as Prisma.InputJsonValue;
}

function writePosDiscountsEnabled(features: unknown, enabled: boolean): Prisma.InputJsonValue {
  return mergeFeatures(features, {
    orderVouchers: {
      posDiscountsEnabled: enabled,
    },
  }) as Prisma.InputJsonValue;
}

export const GET = withMerchant(async (_req: NextRequest, context: AuthContext) => {
  const { merchantId } = context;

  if (!merchantId) {
    return NextResponse.json(
      { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant context not found', statusCode: 400 },
      { status: 400 }
    );
  }

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { features: true },
  });

  const posDiscountsEnabled = readPosDiscountsEnabled(merchant?.features);
  const customerVouchersEnabled = readEffectiveCustomerVouchersEnabled(merchant?.features);

  const data: SettingsResponse = { customerVouchersEnabled, posDiscountsEnabled };

  return NextResponse.json({ success: true, data, statusCode: 200 });
});

export const PUT = withMerchant(async (req: NextRequest, context: AuthContext) => {
  const { merchantId } = context;

  if (!merchantId) {
    return NextResponse.json(
      { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant context not found', statusCode: 400 },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({} as any));
  const nextEnabled = typeof body?.customerVouchersEnabled === 'boolean' ? body.customerVouchersEnabled : null;
  const nextPosDiscountsEnabled = typeof body?.posDiscountsEnabled === 'boolean' ? body.posDiscountsEnabled : null;

  if (nextEnabled === null && nextPosDiscountsEnabled === null) {
    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'At least one of customerVouchersEnabled or posDiscountsEnabled is required',
        statusCode: 400,
      },
      { status: 400 }
    );
  }

  const current = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: { features: true },
  });

  const currentCustomerEnabledRaw = readCustomerVouchersEnabled(current?.features);
  const currentPosDiscountsEnabled = readPosDiscountsEnabled(current?.features);

  const intendedPosDiscountsEnabled = nextPosDiscountsEnabled !== null ? nextPosDiscountsEnabled : currentPosDiscountsEnabled;

  // Customer vouchers require POS discounts to be enabled.
  // - If caller explicitly tries to enable customer vouchers while POS discounts are disabled -> error.
  // - If POS discounts are being turned OFF, automatically turn customer vouchers OFF to keep settings consistent.
  if (!intendedPosDiscountsEnabled && nextEnabled === true) {
    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'POS discounts must be enabled before enabling customer vouchers',
        statusCode: 400,
      },
      { status: 400 }
    );
  }

  let nextFeatures: Prisma.InputJsonValue = (current?.features as Prisma.InputJsonValue) ?? ({} as Prisma.InputJsonValue);
  if (nextEnabled !== null) {
    nextFeatures = writeCustomerVouchersEnabled(nextFeatures, nextEnabled);
  }
  if (nextPosDiscountsEnabled !== null) {
    nextFeatures = writePosDiscountsEnabled(nextFeatures, nextPosDiscountsEnabled);
  }

  // If POS discounts are disabled (either already disabled or being disabled now), ensure customer vouchers are OFF.
  if (!intendedPosDiscountsEnabled && currentCustomerEnabledRaw) {
    nextFeatures = writeCustomerVouchersEnabled(nextFeatures, false);
  }

  const updated = await prisma.merchant.update({
    where: { id: merchantId },
    data: { features: nextFeatures },
    select: { features: true },
  });

  const posDiscountsEnabled = readPosDiscountsEnabled(updated.features);
  const customerVouchersEnabled = readEffectiveCustomerVouchersEnabled(updated.features);

  const data: SettingsResponse = { customerVouchersEnabled, posDiscountsEnabled };
  return NextResponse.json({ success: true, data, statusCode: 200 });
});
