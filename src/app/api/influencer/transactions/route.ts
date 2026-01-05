/**
 * GET /api/influencer/transactions
 * Get influencer transaction history
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withInfluencer, InfluencerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

async function handler(
  request: NextRequest,
  context: InfluencerAuthContext
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const type = searchParams.get('type');
  const currency = searchParams.get('currency');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    influencerId: context.influencerId,
  };

  if (type) {
    where.type = type;
  }

  if (currency) {
    where.currency = currency;
  }

  const [transactions, total] = await Promise.all([
    prisma.influencerTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.influencerTransaction.count({ where }),
  ]);

  // Get merchant names for transactions
  const merchantIds = transactions
    .filter(t => t.merchantId)
    .map(t => t.merchantId as bigint);
  
  const merchants = await prisma.merchant.findMany({
    where: { id: { in: merchantIds } },
    select: { id: true, name: true },
  });

  const merchantMap = new Map(merchants.map(m => [m.id.toString(), m.name]));

  const transactionsWithMerchant = transactions.map(t => ({
    ...t,
    merchantName: t.merchantId ? merchantMap.get(t.merchantId.toString()) : null,
  }));

  return NextResponse.json({
    success: true,
    data: serializeBigInt(transactionsWithMerchant),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export const GET = withInfluencer(handler);
