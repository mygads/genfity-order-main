/**
 * Merchant Order Voucher Templates API
 *
 * GET  /api/merchant/order-vouchers/templates
 * POST /api/merchant/order-vouchers/templates
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

type CreateTemplateBody = {
  name?: string;
  description?: string | null;
  audience?: 'POS' | 'CUSTOMER' | 'BOTH';
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue?: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  maxUsesTotal?: number | null;
  maxUsesPerCustomer?: number | null;
  maxUsesPerOrder?: number;
  totalDiscountCap?: number | null;
  allowedOrderTypes?: Array<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>;
  daysOfWeek?: number[];
  startTime?: string | null;
  endTime?: string | null;
  includeAllItems?: boolean;
  scopedMenuIds?: Array<number | string>;
  scopedCategoryIds?: Array<number | string>;
  reportCategory?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive?: boolean;
  requiresCustomerLogin?: boolean;
};

function toOptionalNumber(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function toOptionalInt(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.floor(value);
}

function normalizeStringOrNull(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidTimeString(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hh, mm] = value.split(':').map((x) => Number.parseInt(x, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function normalizeOrderTypes(value: unknown): Array<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'> {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(['DINE_IN', 'TAKEAWAY', 'DELIVERY']);
  return value.filter((x): x is 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' => typeof x === 'string' && allowed.has(x));
}

function normalizeDaysOfWeek(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const out = value
    .map((x) => (typeof x === 'number' ? Math.floor(x) : NaN))
    .filter((x) => Number.isFinite(x) && x >= 0 && x <= 6);
  // Unique + stable
  return Array.from(new Set(out));
}

function normalizeBigIntIdArray(value: unknown): bigint[] {
  if (!Array.isArray(value)) return [];
  const out: bigint[] = [];
  for (const v of value) {
    const asString = typeof v === 'string' ? v : typeof v === 'number' ? String(Math.trunc(v)) : '';
    if (!/^\d+$/.test(asString)) continue;
    try {
      out.push(BigInt(asString));
    } catch {
      // ignore
    }
  }
  // Unique
  const uniq = new Set(out.map((x) => x.toString()));
  return Array.from(uniq).map((s) => BigInt(s));
}

async function handleGet(_req: NextRequest, context: AuthContext) {
  try {
    const merchantId = context.merchantId;
    if (!merchantId) {
      return NextResponse.json({ success: false, message: 'Merchant ID is required' }, { status: 400 });
    }

    const templates = await prisma.orderVoucherTemplate.findMany({
      where: { merchantId },
      include: {
        _count: { select: { codes: true, orderDiscounts: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(templates),
    });
  } catch (error) {
    console.error('Error listing order voucher templates:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve voucher templates' },
      { status: 500 }
    );
  }
}

async function handlePost(req: NextRequest, context: AuthContext) {
  try {
    const merchantId = context.merchantId;
    if (!merchantId) {
      return NextResponse.json({ success: false, message: 'Merchant ID is required' }, { status: 400 });
    }

    const body = (await req.json()) as CreateTemplateBody;

    const name = body.name?.trim();
    const audience = body.audience;
    const discountType = body.discountType;
    const discountValue = body.discountValue;

    const validAudiences = new Set(['POS', 'CUSTOMER', 'BOTH']);
    if (!name || !audience || !validAudiences.has(audience) || !discountType || typeof discountValue !== 'number' || !Number.isFinite(discountValue)) {
      return NextResponse.json({ success: false, message: 'Missing or invalid required fields' }, { status: 400 });
    }

    if (discountValue <= 0) {
      return NextResponse.json({ success: false, message: 'Discount value must be greater than 0' }, { status: 400 });
    }

    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      return NextResponse.json({ success: false, message: 'Percentage discount cannot exceed 100' }, { status: 400 });
    }

    const maxDiscountAmount = toOptionalNumber(body.maxDiscountAmount);
    const minOrderAmount = toOptionalNumber(body.minOrderAmount);

    if (minOrderAmount != null && minOrderAmount < 0) {
      return NextResponse.json({ success: false, message: 'minOrderAmount must be >= 0' }, { status: 400 });
    }

    const maxUsesTotal = toOptionalInt(body.maxUsesTotal);
    const maxUsesPerCustomer = toOptionalInt(body.maxUsesPerCustomer);
    const maxUsesPerOrder = 1;

    if (maxUsesTotal != null && maxUsesTotal < 1) {
      return NextResponse.json({ success: false, message: 'maxUsesTotal must be >= 1' }, { status: 400 });
    }
    if (maxUsesPerCustomer != null && maxUsesPerCustomer < 1) {
      return NextResponse.json({ success: false, message: 'maxUsesPerCustomer must be >= 1' }, { status: 400 });
    }
    if (!Number.isFinite(maxUsesPerOrder) || maxUsesPerOrder < 1) {
      return NextResponse.json({ success: false, message: 'maxUsesPerOrder must be >= 1' }, { status: 400 });
    }

    const totalDiscountCap = toOptionalNumber(body.totalDiscountCap);
    if (totalDiscountCap != null && totalDiscountCap < 0) {
      return NextResponse.json({ success: false, message: 'totalDiscountCap must be >= 0' }, { status: 400 });
    }

    const allowedOrderTypes = normalizeOrderTypes(body.allowedOrderTypes);
    const daysOfWeek = normalizeDaysOfWeek(body.daysOfWeek);

    const startTime = normalizeStringOrNull(body.startTime);
    const endTime = normalizeStringOrNull(body.endTime);
    if ((startTime && !endTime) || (!startTime && endTime)) {
      return NextResponse.json({ success: false, message: 'startTime and endTime must both be provided' }, { status: 400 });
    }
    if (startTime && !isValidTimeString(startTime)) {
      return NextResponse.json({ success: false, message: 'Invalid startTime (expected HH:MM)' }, { status: 400 });
    }
    if (endTime && !isValidTimeString(endTime)) {
      return NextResponse.json({ success: false, message: 'Invalid endTime (expected HH:MM)' }, { status: 400 });
    }

    const includeAllItems = typeof body.includeAllItems === 'boolean' ? body.includeAllItems : true;
    const scopedMenuIds = includeAllItems ? [] : normalizeBigIntIdArray(body.scopedMenuIds);
    const scopedCategoryIds = includeAllItems ? [] : normalizeBigIntIdArray(body.scopedCategoryIds);

    if (!includeAllItems) {
      if (scopedMenuIds.length > 0) {
        const count = await prisma.menu.count({ where: { merchantId, id: { in: scopedMenuIds }, deletedAt: null } });
        if (count !== scopedMenuIds.length) {
          return NextResponse.json({ success: false, message: 'Invalid scopedMenuIds' }, { status: 400 });
        }
      }
      if (scopedCategoryIds.length > 0) {
        const count = await prisma.menuCategory.count({ where: { merchantId, id: { in: scopedCategoryIds }, deletedAt: null } });
        if (count !== scopedCategoryIds.length) {
          return NextResponse.json({ success: false, message: 'Invalid scopedCategoryIds' }, { status: 400 });
        }
      }
    }

    const reportCategory = normalizeStringOrNull(body.reportCategory);

    const created = await prisma.orderVoucherTemplate.create({
      data: {
        merchantId,
        name,
        description: body.description?.trim() || null,
        audience,
        discountType,
        discountValue,
        maxDiscountAmount,
        minOrderAmount,
        maxUsesTotal,
        maxUsesPerCustomer,
        maxUsesPerOrder,
        totalDiscountCap,
        validFrom: body.validFrom ? new Date(body.validFrom) : null,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        isActive: body.isActive ?? true,
        requiresCustomerLogin: false,

        allowedOrderTypes,
        daysOfWeek,
        startTime,
        endTime,
        includeAllItems,
        reportCategory,
        menuScopes: includeAllItems
          ? undefined
          : {
              create: scopedMenuIds.map((menuId) => ({ menuId })),
            },
        categoryScopes: includeAllItems
          ? undefined
          : {
              create: scopedCategoryIds.map((categoryId) => ({ categoryId })),
            },
      },
    });

    return NextResponse.json(
      { success: true, data: serializeBigInt(created), message: 'Voucher template created' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating order voucher template:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create voucher template' },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const POST = withMerchant(handlePost);
