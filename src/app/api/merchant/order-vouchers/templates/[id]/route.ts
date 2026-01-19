/**
 * Merchant Order Voucher Template API
 *
 * GET /api/merchant/order-vouchers/templates/:id
 * PUT /api/merchant/order-vouchers/templates/:id
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam } from '@/lib/utils/routeContext';
import type { Prisma } from '@prisma/client';

type UpdateTemplateBody = {
  audience?: 'POS' | 'CUSTOMER' | 'BOTH';
  name?: string;
  description?: string | null;
  discountType?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue?: number;
  isActive?: boolean;
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
  const uniq = new Set(out.map((x) => x.toString()));
  return Array.from(uniq).map((s) => BigInt(s));
}

async function handleGet(_req: NextRequest, context: AuthContext, routeContext: { params: Promise<Record<string, string>> }) {
  try {
    const idParam = await requireBigIntRouteParam(routeContext, 'id');
    if (!idParam.ok) {
      return NextResponse.json(idParam.body, { status: idParam.status });
    }

    const merchantId = context.merchantId;
    if (!merchantId) {
      return NextResponse.json({ success: false, message: 'Merchant ID is required' }, { status: 400 });
    }

    const templateId = idParam.value;

    const template = await prisma.orderVoucherTemplate.findFirst({
      where: { id: templateId, merchantId },
      include: {
        _count: { select: { codes: true, orderDiscounts: true } },
        menuScopes: { include: { menu: { select: { id: true, name: true } } } },
        categoryScopes: { include: { category: { select: { id: true, name: true } } } },
      },
    });

    if (!template) {
      return NextResponse.json({ success: false, message: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: serializeBigInt(template) });
  } catch (error) {
    console.error('Error fetching order voucher template:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve voucher template' }, { status: 500 });
  }
}

async function handlePut(req: NextRequest, context: AuthContext, routeContext: { params: Promise<Record<string, string>> }) {
  try {
    const idParam = await requireBigIntRouteParam(routeContext, 'id');
    if (!idParam.ok) {
      return NextResponse.json(idParam.body, { status: idParam.status });
    }

    const merchantId = context.merchantId;
    if (!merchantId) {
      return NextResponse.json({ success: false, message: 'Merchant ID is required' }, { status: 400 });
    }

    const templateId = idParam.value;

    const existing = await prisma.orderVoucherTemplate.findFirst({
      where: { id: templateId, merchantId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: 'Template not found' }, { status: 404 });
    }
    const body = (await req.json()) as UpdateTemplateBody;

    const discountValue = typeof body.discountValue === 'number' && Number.isFinite(body.discountValue) ? body.discountValue : undefined;
    if (discountValue !== undefined && discountValue <= 0) {
      return NextResponse.json({ success: false, message: 'Discount value must be greater than 0' }, { status: 400 });
    }
    if (body.discountType === 'PERCENTAGE' && discountValue !== undefined && discountValue > 100) {
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
    if (maxUsesPerOrder !== undefined && (!Number.isFinite(maxUsesPerOrder) || maxUsesPerOrder < 1)) {
      return NextResponse.json({ success: false, message: 'maxUsesPerOrder must be >= 1' }, { status: 400 });
    }

    const totalDiscountCap = toOptionalNumber(body.totalDiscountCap);
    if (totalDiscountCap != null && totalDiscountCap < 0) {
      return NextResponse.json({ success: false, message: 'totalDiscountCap must be >= 0' }, { status: 400 });
    }

    const allowedOrderTypes = body.allowedOrderTypes ? normalizeOrderTypes(body.allowedOrderTypes) : undefined;
    const daysOfWeek = body.daysOfWeek ? normalizeDaysOfWeek(body.daysOfWeek) : undefined;

    const startTime = body.startTime === undefined ? undefined : normalizeStringOrNull(body.startTime);
    const endTime = body.endTime === undefined ? undefined : normalizeStringOrNull(body.endTime);
    if ((startTime && !endTime) || (!startTime && endTime)) {
      return NextResponse.json({ success: false, message: 'startTime and endTime must both be provided' }, { status: 400 });
    }
    if (startTime && !isValidTimeString(startTime)) {
      return NextResponse.json({ success: false, message: 'Invalid startTime (expected HH:MM)' }, { status: 400 });
    }
    if (endTime && !isValidTimeString(endTime)) {
      return NextResponse.json({ success: false, message: 'Invalid endTime (expected HH:MM)' }, { status: 400 });
    }

    const includeAllItems = typeof body.includeAllItems === 'boolean' ? body.includeAllItems : undefined;
    const reportCategory = body.reportCategory === undefined ? undefined : normalizeStringOrNull(body.reportCategory);

    const shouldUpdateScopes =
      includeAllItems !== undefined || body.scopedMenuIds !== undefined || body.scopedCategoryIds !== undefined;

    const scopedMenuIds = includeAllItems === true ? [] : normalizeBigIntIdArray(body.scopedMenuIds);
    const scopedCategoryIds = includeAllItems === true ? [] : normalizeBigIntIdArray(body.scopedCategoryIds);

    if (shouldUpdateScopes && includeAllItems === false) {
      if (scopedMenuIds.length > 0) {
        const count = await prisma.menu.count({
          where: { merchantId, id: { in: scopedMenuIds }, deletedAt: null },
        });
        if (count !== scopedMenuIds.length) {
          return NextResponse.json({ success: false, message: 'Invalid scopedMenuIds' }, { status: 400 });
        }
      }
      if (scopedCategoryIds.length > 0) {
        const count = await prisma.menuCategory.count({
          where: { merchantId, id: { in: scopedCategoryIds }, deletedAt: null },
        });
        if (count !== scopedCategoryIds.length) {
          return NextResponse.json({ success: false, message: 'Invalid scopedCategoryIds' }, { status: 400 });
        }
      }
    }

    const data: Prisma.OrderVoucherTemplateUpdateInput = {
      audience:
        body.audience === 'POS' || body.audience === 'CUSTOMER' || body.audience === 'BOTH' ? body.audience : undefined,
      name: typeof body.name === 'string' ? body.name.trim() : undefined,
      description:
        typeof body.description === 'string'
          ? body.description.trim()
          : body.description === null
            ? null
            : undefined,
      discountType: body.discountType === 'PERCENTAGE' || body.discountType === 'FIXED_AMOUNT' ? body.discountType : undefined,
      discountValue: discountValue !== undefined ? discountValue : undefined,
      isActive: typeof body.isActive === 'boolean' ? body.isActive : undefined,
      maxDiscountAmount: body.maxDiscountAmount === null || typeof body.maxDiscountAmount === 'number' ? maxDiscountAmount : undefined,
      minOrderAmount: body.minOrderAmount === null || typeof body.minOrderAmount === 'number' ? minOrderAmount : undefined,
      maxUsesTotal: body.maxUsesTotal === null || typeof body.maxUsesTotal === 'number' ? maxUsesTotal : undefined,
      maxUsesPerCustomer:
        body.maxUsesPerCustomer === null || typeof body.maxUsesPerCustomer === 'number' ? maxUsesPerCustomer : undefined,
      maxUsesPerOrder,
      totalDiscountCap: body.totalDiscountCap === null || typeof body.totalDiscountCap === 'number' ? totalDiscountCap : undefined,
      allowedOrderTypes: allowedOrderTypes !== undefined ? allowedOrderTypes : undefined,
      daysOfWeek: daysOfWeek !== undefined ? daysOfWeek : undefined,
      startTime: startTime !== undefined ? startTime : undefined,
      endTime: endTime !== undefined ? endTime : undefined,
      includeAllItems: includeAllItems !== undefined ? includeAllItems : undefined,
      reportCategory: reportCategory !== undefined ? reportCategory : undefined,
      validFrom: body.validFrom === null ? null : typeof body.validFrom === 'string' ? new Date(body.validFrom) : undefined,
      validUntil: body.validUntil === null ? null : typeof body.validUntil === 'string' ? new Date(body.validUntil) : undefined,
      requiresCustomerLogin: typeof body.requiresCustomerLogin === 'boolean' ? body.requiresCustomerLogin : undefined,
    };

    const updated = await prisma.$transaction(async (tx) => {
      const tpl = await tx.orderVoucherTemplate.update({
        where: { id: templateId },
        data,
      });

      if (shouldUpdateScopes) {
        await tx.orderVoucherTemplateMenu.deleteMany({ where: { templateId } });
        await tx.orderVoucherTemplateCategory.deleteMany({ where: { templateId } });

        if (includeAllItems === false) {
          if (scopedMenuIds.length > 0) {
            await tx.orderVoucherTemplateMenu.createMany({
              data: scopedMenuIds.map((menuId) => ({ templateId, menuId })),
              skipDuplicates: true,
            });
          }
          if (scopedCategoryIds.length > 0) {
            await tx.orderVoucherTemplateCategory.createMany({
              data: scopedCategoryIds.map((categoryId) => ({ templateId, categoryId })),
              skipDuplicates: true,
            });
          }
        }
      }

      return tpl;
    });

    return NextResponse.json({ success: true, data: serializeBigInt(updated) });
  } catch (error) {
    console.error('Error updating order voucher template:', error);
    return NextResponse.json({ success: false, message: 'Failed to update voucher template' }, { status: 500 });
  }
}

export const GET = withMerchant(handleGet);
export const PUT = withMerchant(handlePut);
