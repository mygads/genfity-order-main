/**
 * GET /api/influencer/merchants
 * Get detailed list of merchants referred by the authenticated influencer
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withInfluencer, InfluencerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

function parseIntSafe(value: string | null, fallback: number): number {
  const parsed = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function handler(
  request: NextRequest,
  context: InfluencerAuthContext
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const page = Math.max(1, parseIntSafe(searchParams.get('page'), 1));
  const limit = Math.min(100, Math.max(1, parseIntSafe(searchParams.get('limit'), 25)));
  const q = (searchParams.get('q') || '').trim();
  const currency = (searchParams.get('currency') || '').trim();
  const isOpen = searchParams.get('isOpen');
  const sortBy = (searchParams.get('sortBy') || 'createdAt').trim();
  const sortDir = (searchParams.get('sortDir') || 'desc').trim().toLowerCase();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    referredByInfluencerId: context.influencerId,
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { code: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }

  if (currency) {
    where.currency = currency;
  }

  if (isOpen === 'true') {
    where.isOpen = true;
  } else if (isOpen === 'false') {
    where.isOpen = false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orderBy: any = (() => {
    const dir = sortDir === 'asc' ? 'asc' : 'desc';
    switch (sortBy) {
      case 'name':
        return { name: dir };
      case 'code':
        return { code: dir };
      case 'currency':
        return { currency: dir };
      case 'isOpen':
        return { isOpen: dir };
      case 'createdAt':
      default:
        return { createdAt: dir };
    }
  })();

  const [merchants, total] = await Promise.all([
    prisma.merchant.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        email: true,
        country: true,
        currency: true,
        isOpen: true,
        isActive: true,
        createdAt: true,
        hasGivenFirstCommission: true,
        subscription: {
          select: {
            type: true,
            status: true,
          },
        },
        paymentRequests: {
          where: { status: 'VERIFIED' },
          select: {
            amount: true,
            currency: true,
            verifiedAt: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.merchant.count({ where }),
  ]);

  const data = merchants.map((m) => ({
    id: m.id,
    businessName: m.name,
    merchantCode: m.code,
    email: m.email,
    country: m.country,
    currency: m.currency,
    isOpen: m.isOpen,
    isActive: m.isActive,
    createdAt: m.createdAt,
    hasGivenFirstCommission: m.hasGivenFirstCommission,
    subscriptionType: m.subscription?.type || 'TRIAL',
    subscriptionStatus: m.subscription?.status || 'ACTIVE',
    totalPayments: m.paymentRequests.reduce((sum, p) => sum + Number(p.amount), 0),
    lastPaymentAt:
      m.paymentRequests
        .filter((p) => p.verifiedAt)
        .sort((a, b) => (b.verifiedAt?.getTime() || 0) - (a.verifiedAt?.getTime() || 0))[0]
        ?.verifiedAt || null,
  }));

  return NextResponse.json({
    success: true,
    data: serializeBigInt({
      merchants: data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }),
  });
}

export const GET = withInfluencer(handler);
