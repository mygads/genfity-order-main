/**
 * POS Voucher Templates API (Merchant)
 * GET /api/merchant/orders/pos/voucher-templates
 *
 * Lists active POS-audience voucher templates for selection in POS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

export const GET = withMerchant(async (_req: NextRequest, context: AuthContext) => {
  const { merchantId } = context;

  if (!merchantId) {
    return NextResponse.json(
      { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant context not found', statusCode: 400 },
      { status: 400 }
    );
  }

  const now = new Date();

  const templates = await prisma.orderVoucherTemplate.findMany({
    where: {
      merchantId,
      audience: { in: ['POS', 'BOTH'] },
      isActive: true,
      OR: [{ validFrom: null }, { validFrom: { lte: now } }],
      AND: [{ OR: [{ validUntil: null }, { validUntil: { gte: now } }] }],
    },
    select: {
      id: true,
      name: true,
      description: true,
      discountType: true,
      discountValue: true,
      maxDiscountAmount: true,
      minOrderAmount: true,
      validFrom: true,
      validUntil: true,
      includeAllItems: true,
      reportCategory: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({
    success: true,
    data: serializeBigInt(templates),
    statusCode: 200,
  });
});
