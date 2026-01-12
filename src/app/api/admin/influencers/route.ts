/**
 * Admin Influencers API
 * GET /api/admin/influencers - List influencers (pending/approved) for super admin approval workflow
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

function parseIntSafe(value: string | null, fallback: number): number {
  const parsed = value ? parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function handler(
  request: NextRequest,
  _context: AuthContext
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);

  const status = (searchParams.get('status') || 'pending').toLowerCase(); // pending | approved | all
  const page = Math.max(1, parseIntSafe(searchParams.get('page'), 1));
  const limit = Math.min(100, Math.max(1, parseIntSafe(searchParams.get('limit'), 25)));
  const q = (searchParams.get('q') || '').trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (status === 'pending') {
    where.isApproved = false;
  } else if (status === 'approved') {
    where.isApproved = true;
  }

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { referralCode: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [influencers, total] = await Promise.all([
    prisma.influencer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        referralCode: true,
        country: true,
        defaultCurrency: true,
        isActive: true,
        isApproved: true,
        approvedAt: true,
        approvedByUserId: true,
        createdAt: true,
        updatedAt: true,
        approvalLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            action: true,
            reason: true,
            createdAt: true,
            actedByUser: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.influencer.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: serializeBigInt({
      influencers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }),
  });
}

export const GET = withSuperAdmin(handler);
