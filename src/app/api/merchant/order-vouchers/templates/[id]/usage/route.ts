/**
 * Merchant Order Voucher Usage API
 *
 * GET /api/merchant/order-vouchers/templates/:id/usage
 *
 * Returns recent usage rows (OrderDiscount) for a given voucher template.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { getBigIntQueryParam, requireBigIntRouteParam } from '@/lib/utils/routeContext';
import type { Prisma } from '@prisma/client';

function parseOptionalDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function parseOptionalInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function handleGet(req: NextRequest, context: AuthContext, routeContext: { params: Promise<Record<string, string>> }) {
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
      select: { id: true },
    });

    if (!template) {
      return NextResponse.json({ success: false, message: 'Template not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);

    const takeRaw = parseOptionalInt(searchParams.get('take'));
    const take = Math.min(Math.max(takeRaw ?? 50, 1), 200);

    const cursor = getBigIntQueryParam(searchParams, 'cursor');

    const startDate = parseOptionalDate(searchParams.get('startDate'));
    const endDate = parseOptionalDate(searchParams.get('endDate'));

    const sourceRaw = searchParams.get('source');
    const source = sourceRaw === 'POS_VOUCHER' || sourceRaw === 'CUSTOMER_VOUCHER' || sourceRaw === 'MANUAL' ? sourceRaw : null;

    const codeQuery = searchParams.get('code')?.trim();

    const where: Prisma.OrderDiscountWhereInput = {
      merchantId,
      voucherTemplateId: templateId,
      ...(source ? { source } : {}),
      ...(codeQuery
        ? {
            voucherCode: {
              code: { contains: codeQuery, mode: 'insensitive' },
            },
          }
        : {}),
      ...(startDate || endDate
        ? {
            order: {
              placedAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            },
          }
        : {}),
    };

    const rows = await prisma.orderDiscount.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        createdAt: true,
        source: true,
        label: true,
        discountAmount: true,
        voucherCode: {
          select: {
            id: true,
            code: true,
          },
        },
        appliedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        appliedByCustomer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        order: {
          select: {
            id: true,
            orderNumber: true,
            orderType: true,
            status: true,
            placedAt: true,
            subtotal: true,
            discountAmount: true,
            totalAmount: true,
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    const hasMore = rows.length > take;
    const items = hasMore ? rows.slice(0, take) : rows;
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        items,
        nextCursor,
      }),
    });
  } catch (error) {
    console.error('Error listing voucher usage:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve voucher usage' }, { status: 500 });
  }
}

export const GET = withMerchant(handleGet);
