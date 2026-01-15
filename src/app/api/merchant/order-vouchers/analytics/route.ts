/**
 * Merchant Order Voucher Analytics API
 *
 * GET /api/merchant/order-vouchers/analytics
 *
 * Provides aggregated voucher usage analytics (counts + total discounts)
 * grouped by source, template, and reportCategory.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import type { Prisma } from '@prisma/client';

type Period = 'today' | 'week' | 'month' | 'year' | 'custom';

function parseOptionalDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) ? d : null;
}

function toInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTzParts(date: Date, timeZone: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = fmt.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }

  return {
    year: toInt(map.year) ?? date.getUTCFullYear(),
    month: toInt(map.month) ?? date.getUTCMonth() + 1,
    day: toInt(map.day) ?? date.getUTCDate(),
    hour: toInt(map.hour) ?? 0,
    minute: toInt(map.minute) ?? 0,
    second: toInt(map.second) ?? 0,
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = getTzParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

function zonedTimeToUtc(parts: { year: number; month: number; day: number; hour: number; minute: number; second: number }, timeZone: string): Date {
  const guess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second));
  const offset = getTimeZoneOffsetMs(guess, timeZone);
  return new Date(guess.getTime() - offset);
}

function startOfDayInTz(now: Date, timeZone: string): Date {
  const p = getTzParts(now, timeZone);
  return zonedTimeToUtc({ year: p.year, month: p.month, day: p.day, hour: 0, minute: 0, second: 0 }, timeZone);
}

function startOfMonthInTz(now: Date, timeZone: string): Date {
  const p = getTzParts(now, timeZone);
  return zonedTimeToUtc({ year: p.year, month: p.month, day: 1, hour: 0, minute: 0, second: 0 }, timeZone);
}

function startOfYearInTz(now: Date, timeZone: string): Date {
  const p = getTzParts(now, timeZone);
  return zonedTimeToUtc({ year: p.year, month: 1, day: 1, hour: 0, minute: 0, second: 0 }, timeZone);
}

async function getMerchantForUser(userId: bigint): Promise<{ merchantId: bigint; timezone: string } | null> {
  const merchantUser = await prisma.merchantUser.findFirst({
    where: { userId },
    include: { merchant: { select: { id: true, timezone: true } } },
  });

  if (!merchantUser?.merchant) return null;
  return { merchantId: merchantUser.merchant.id, timezone: merchantUser.merchant.timezone };
}

export const GET = withMerchant(async (req: NextRequest, context: AuthContext) => {
  try {
    const merchant = await getMerchantForUser(context.userId);
    if (!merchant) {
      return NextResponse.json({ success: false, message: 'Merchant not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get('period') as Period) || 'month';

    const customStart = parseOptionalDate(searchParams.get('startDate'));
    const customEnd = parseOptionalDate(searchParams.get('endDate'));

    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === 'custom' && customStart && customEnd) {
      startDate = customStart;
      endDate = customEnd;
    } else if (period === 'today') {
      startDate = startOfDayInTz(now, merchant.timezone);
      endDate = now;
    } else if (period === 'week') {
      // Rolling last 7 days, anchored on merchant's start-of-day
      const startToday = startOfDayInTz(now, merchant.timezone);
      startDate = new Date(startToday.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
    } else if (period === 'year') {
      startDate = startOfYearInTz(now, merchant.timezone);
      endDate = now;
    } else {
      // Default: month
      startDate = startOfMonthInTz(now, merchant.timezone);
      endDate = now;
    }

    const baseWhere: Prisma.OrderDiscountWhereInput = {
      merchantId: merchant.merchantId,
      voucherTemplateId: { not: null },
      order: {
        placedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    };

    const summaryAgg = await prisma.orderDiscount.aggregate({
      where: baseWhere,
      _count: { id: true },
      _sum: { discountAmount: true },
    });

    const bySource = await prisma.orderDiscount.groupBy({
      where: baseWhere,
      by: ['source'],
      _count: { id: true },
      _sum: { discountAmount: true },
      orderBy: { _sum: { discountAmount: 'desc' } },
    });

    const byTemplate = await prisma.orderDiscount.groupBy({
      where: baseWhere,
      by: ['voucherTemplateId'],
      _count: { id: true },
      _sum: { discountAmount: true },
      orderBy: { _sum: { discountAmount: 'desc' } },
      take: 50,
    });

    const templateIds = byTemplate
      .map((r) => r.voucherTemplateId)
      .filter((x): x is bigint => typeof x === 'bigint');

    const templates = await prisma.orderVoucherTemplate.findMany({
      where: { merchantId: merchant.merchantId, id: { in: templateIds } },
      select: { id: true, name: true, audience: true, reportCategory: true },
    });

    const templateMap = new Map(templates.map((t) => [t.id.toString(), t] as const));

    const templateRows = byTemplate.map((r) => {
      const id = r.voucherTemplateId;
      const tpl = typeof id === 'bigint' ? templateMap.get(id.toString()) : undefined;
      return {
        templateId: id,
        templateName: tpl?.name ?? null,
        audience: tpl?.audience ?? null,
        reportCategory: tpl?.reportCategory ?? null,
        uses: r._count.id,
        totalDiscountAmount: r._sum.discountAmount,
      };
    });

    const reportCategoryMap = new Map<string, { uses: number; totalDiscountAmount: number }>();
    for (const row of templateRows) {
      const key = row.reportCategory ?? 'uncategorized';
      const prev = reportCategoryMap.get(key) ?? { uses: 0, totalDiscountAmount: 0 };
      reportCategoryMap.set(key, {
        uses: prev.uses + (row.uses || 0),
        totalDiscountAmount: prev.totalDiscountAmount + (row.totalDiscountAmount ? Number(row.totalDiscountAmount) : 0),
      });
    }

    const byReportCategory = Array.from(reportCategoryMap.entries())
      .map(([reportCategory, agg]) => ({ reportCategory, ...agg }))
      .sort((a, b) => b.totalDiscountAmount - a.totalDiscountAmount);

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        summary: {
          uses: summaryAgg._count.id,
          totalDiscountAmount: summaryAgg._sum.discountAmount,
        },
        bySource,
        byTemplate: templateRows,
        byReportCategory,
        meta: {
          period,
          timezone: merchant.timezone,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      }),
    });
  } catch (error) {
    console.error('Voucher analytics error:', error);
    return NextResponse.json({ success: false, message: 'Failed to retrieve voucher analytics' }, { status: 500 });
  }
});
