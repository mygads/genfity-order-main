/**
 * Merchant Order Voucher Codes API
 *
 * GET  /api/merchant/order-vouchers/templates/:id/codes
 * POST /api/merchant/order-vouchers/templates/:id/codes
 */

import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam } from '@/lib/utils/routeContext';

type CreateCodesBody = {
  count?: number;
  length?: number;
  manualCodes?: unknown;
  manualCode?: unknown;
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function parseOptionalInt(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeManualCodes(input: unknown): string[] {
  const raw: string[] = [];

  if (Array.isArray(input)) {
    for (const v of input) {
      if (typeof v === 'string') raw.push(v);
    }
  } else if (typeof input === 'string') {
    raw.push(input);
  }

  const exploded: string[] = [];
  for (const item of raw) {
    const parts = item
      .split(/[\s,;]+/g)
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    exploded.push(...parts);
  }

  const cleaned = exploded
    .map((x) => x.trim().toUpperCase())
    .filter((x) => x.length > 0);

  const uniq = Array.from(new Set(cleaned));
  return uniq;
}

function validateManualCode(code: string): boolean {
  if (code.length < 3 || code.length > 32) return false;
  return /^[A-Z0-9]+$/.test(code);
}

function generateCode(length: number): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
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
      select: { id: true },
    });

    if (!template) {
      return NextResponse.json({ success: false, message: 'Template not found' }, { status: 404 });
    }

    const { searchParams } = new URL(_req.url);
    const takeRaw = parseOptionalInt(searchParams.get('take'));
    const take = Math.min(Math.max(takeRaw ?? 200, 1), 500);

    const codes = await prisma.orderVoucherCode.findMany({
      where: { merchantId, templateId },
      orderBy: { createdAt: 'desc' },
      take,
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

    const data = codes.map((c) => ({
      id: c.id,
      code: c.code,
      isActive: c.isActive,
      createdAt: c.createdAt,
      validFrom: c.validFrom,
      validUntil: c.validUntil,
      usedCount: c._count.orderDiscounts,
    }));

    return NextResponse.json({ success: true, data: serializeBigInt(data) });
  } catch (error) {
    console.error('Error listing order voucher codes:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve voucher codes' }, { status: 500 });
  }
}

async function handlePost(req: NextRequest, context: AuthContext, routeContext: { params: Promise<Record<string, string>> }) {
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

    const body = (await req.json()) as CreateCodesBody;

    const manualCodes = normalizeManualCodes(body.manualCodes ?? body.manualCode);
    if (manualCodes.length > 0) {
      const limited = manualCodes.slice(0, 500);
      const invalid = limited.find((c) => !validateManualCode(c));
      if (invalid) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid code: ${invalid}. Codes must be 3-32 chars and contain only A-Z, 0-9.`,
          },
          { status: 400 }
        );
      }

      const existing = await prisma.orderVoucherCode.findMany({
        where: { merchantId, code: { in: limited } },
        select: { code: true },
      });
      const existingSet = new Set(existing.map((r) => r.code));

      const toCreate = limited.filter((c) => !existingSet.has(c));
      if (toCreate.length > 0) {
        await prisma.orderVoucherCode.createMany({
          data: toCreate.map((code) => ({
            merchantId,
            templateId,
            code,
            isActive: true,
          })),
          skipDuplicates: true,
        });
      }

      const codes = await prisma.orderVoucherCode.findMany({
        where: { merchantId, templateId, code: { in: limited } },
        orderBy: { createdAt: 'desc' },
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

      const data = codes.map((c) => ({
        id: c.id,
        code: c.code,
        isActive: c.isActive,
        createdAt: c.createdAt,
        validFrom: c.validFrom,
        validUntil: c.validUntil,
        usedCount: c._count.orderDiscounts,
      }));

      const skipped = limited.filter((c) => existingSet.has(c));

      return NextResponse.json({
        success: true,
        data: serializeBigInt(data),
        message: skipped.length > 0 ? 'Some codes already exist and were skipped.' : 'Voucher codes added',
      });
    }

    const requestedCount = typeof body.count === 'number' ? Math.floor(body.count) : 1;
    const count = Math.min(Math.max(requestedCount, 1), 500);

    const requestedLength = typeof body.length === 'number' ? Math.floor(body.length) : 8;
    const length = Math.min(Math.max(requestedLength, 6), 16);

    const createdCodes: string[] = [];
    let attempts = 0;

    while (createdCodes.length < count && attempts < 6) {
      attempts += 1;
      const remaining = count - createdCodes.length;

      const batchSize = Math.min(remaining, 200);
      const codesBatch = new Set<string>();
      while (codesBatch.size < batchSize) {
        codesBatch.add(generateCode(length));
      }

      const codesArray = Array.from(codesBatch);

      await prisma.orderVoucherCode.createMany({
        data: codesArray.map((code) => ({
          merchantId,
          templateId,
          code,
          isActive: true,
        })),
        skipDuplicates: true,
      });

      const inserted = await prisma.orderVoucherCode.findMany({
        where: {
          merchantId,
          templateId,
          code: { in: codesArray },
        },
        select: { code: true },
      });

      for (const row of inserted) {
        if (createdCodes.length < count) createdCodes.push(row.code);
      }
    }

    const codes = await prisma.orderVoucherCode.findMany({
      where: { merchantId, templateId, code: { in: createdCodes } },
      orderBy: { createdAt: 'desc' },
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

    const data = codes.map((c) => ({
      id: c.id,
      code: c.code,
      isActive: c.isActive,
      createdAt: c.createdAt,
      validFrom: c.validFrom,
      validUntil: c.validUntil,
      usedCount: c._count.orderDiscounts,
    }));

    return NextResponse.json({
      success: true,
      data: serializeBigInt(data),
      message: createdCodes.length < count ? 'Some codes could not be generated due to collisions. Please try again.' : 'Voucher codes generated',
    });
  } catch (error) {
    console.error('Error generating order voucher codes:', error);
    return NextResponse.json({ success: false, message: 'Failed to generate voucher codes' }, { status: 500 });
  }
}

export const GET = withMerchant(handleGet);
export const POST = withMerchant(handlePost);
