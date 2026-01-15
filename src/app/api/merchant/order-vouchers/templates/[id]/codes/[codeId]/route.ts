/**
 * Merchant Order Voucher Code Actions API
 *
 * PUT    /api/merchant/order-vouchers/templates/:id/codes/:codeId
 * DELETE /api/merchant/order-vouchers/templates/:id/codes/:codeId
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam } from '@/lib/utils/routeContext';

async function getMerchantIdForUser(userId: bigint): Promise<bigint | null> {
  const merchantUser = await prisma.merchantUser.findFirst({ where: { userId } });
  return merchantUser?.merchantId ?? null;
}

async function handlePut(req: NextRequest, context: AuthContext, routeContext: { params: Promise<Record<string, string>> }) {
  try {
    const templateParam = await requireBigIntRouteParam(routeContext, 'id');
    if (!templateParam.ok) {
      return NextResponse.json(templateParam.body, { status: templateParam.status });
    }

    const codeParam = await requireBigIntRouteParam(routeContext, 'codeId');
    if (!codeParam.ok) {
      return NextResponse.json(codeParam.body, { status: codeParam.status });
    }

    const merchantId = await getMerchantIdForUser(context.userId);
    if (!merchantId) {
      return NextResponse.json({ success: false, message: 'Merchant not found' }, { status: 404 });
    }

    const templateId = templateParam.value;
    const codeId = codeParam.value;

    const body = (await req.json()) as { isActive?: unknown };
    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ success: false, message: 'isActive must be a boolean' }, { status: 400 });
    }

    const updated = await prisma.orderVoucherCode.updateMany({
      where: { id: codeId, merchantId, templateId },
      data: { isActive: body.isActive },
    });

    if (updated.count === 0) {
      return NextResponse.json({ success: false, message: 'Code not found' }, { status: 404 });
    }

    const code = await prisma.orderVoucherCode.findFirst({
      where: { id: codeId, merchantId, templateId },
      select: {
        id: true,
        code: true,
        isActive: true,
        createdAt: true,
        validFrom: true,
        validUntil: true,
        _count: { select: { orderDiscounts: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        id: code?.id,
        code: code?.code,
        isActive: code?.isActive,
        createdAt: code?.createdAt,
        validFrom: code?.validFrom,
        validUntil: code?.validUntil,
        usedCount: code?._count.orderDiscounts ?? 0,
      }),
    });
  } catch (error) {
    console.error('Error updating order voucher code:', error);
    return NextResponse.json({ success: false, message: 'Failed to update voucher code' }, { status: 500 });
  }
}

async function handleDelete(_req: NextRequest, context: AuthContext, routeContext: { params: Promise<Record<string, string>> }) {
  try {
    const templateParam = await requireBigIntRouteParam(routeContext, 'id');
    if (!templateParam.ok) {
      return NextResponse.json(templateParam.body, { status: templateParam.status });
    }

    const codeParam = await requireBigIntRouteParam(routeContext, 'codeId');
    if (!codeParam.ok) {
      return NextResponse.json(codeParam.body, { status: codeParam.status });
    }

    const merchantId = await getMerchantIdForUser(context.userId);
    if (!merchantId) {
      return NextResponse.json({ success: false, message: 'Merchant not found' }, { status: 404 });
    }

    const templateId = templateParam.value;
    const codeId = codeParam.value;

    const code = await prisma.orderVoucherCode.findFirst({
      where: { id: codeId, merchantId, templateId },
      select: { id: true, _count: { select: { orderDiscounts: true } } },
    });

    if (!code) {
      return NextResponse.json({ success: false, message: 'Code not found' }, { status: 404 });
    }

    if ((code._count.orderDiscounts ?? 0) > 0) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete a code that has already been used. Please deactivate it instead.' },
        { status: 400 }
      );
    }

    await prisma.orderVoucherCode.delete({ where: { id: codeId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting order voucher code:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete voucher code' }, { status: 500 });
  }
}

export const PUT = withMerchant(handlePut);
export const DELETE = withMerchant(handleDelete);
