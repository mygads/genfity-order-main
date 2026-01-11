import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';

export const GET = withMerchant(async (request: NextRequest, authContext) => {
  const merchantId = authContext.merchantId;
  if (!merchantId) {
    return NextResponse.json(
      { success: false, message: 'Merchant context missing' },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const take = Math.min(Math.max(parseInt(searchParams.get('take') || '20', 10) || 20, 1), 50);
  const skip = Math.max(parseInt(searchParams.get('skip') || '0', 10) || 0, 0);

  const where = {
    orders: {
      some: {
        merchantId,
      },
    },
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { email: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  // Fetch one extra record to detect hasMore without running a separate count query.
  const takePlusOne = Math.min(take + 1, 51);

  const customersPlusOne = await prisma.customer.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
    skip,
    take: takePlusOne,
    orderBy: {
      id: 'desc',
    },
  });

  const hasMore = customersPlusOne.length > take;
  const customers = hasMore ? customersPlusOne.slice(0, take) : customersPlusOne;

  if (customers.length === 0) {
    return NextResponse.json({
      success: true,
      data: [],
      pagination: { skip, take, nextSkip: skip, hasMore: false },
    });
  }

  const stats = await prisma.order.groupBy({
    by: ['customerId'],
    where: {
      merchantId,
      customerId: {
        in: customers.map((c) => c.id),
      },
    },
    _count: {
      _all: true,
    },
    _sum: {
      totalAmount: true,
    },
    _max: {
      placedAt: true,
    },
  });

  const byCustomerId = new Map<bigint, (typeof stats)[number]>();
  for (const row of stats) {
    if (row.customerId) byCustomerId.set(row.customerId, row);
  }

  const enriched = customers.map((c) => {
    const row = byCustomerId.get(c.id);
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      orderCount: row?._count?._all ?? 0,
      totalSpent: row?._sum?.totalAmount ? decimalToNumber(row._sum.totalAmount) : 0,
      lastOrderAt: row?._max?.placedAt ?? null,
    };
  });

  return NextResponse.json({
    success: true,
    data: serializeBigInt(enriched),
    pagination: {
      skip,
      take,
      nextSkip: skip + customers.length,
      hasMore,
    },
  });
});
