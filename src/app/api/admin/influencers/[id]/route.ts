/**
 * Admin Influencer Detail API
 * GET /api/admin/influencers/:id - View influencer and approval audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

async function handler(
  _request: NextRequest,
  _context: AuthContext,
  routeContext: RouteContext
): Promise<NextResponse> {
  const influencerIdResult = await requireBigIntRouteParam(routeContext, 'id');
  if (!influencerIdResult.ok) {
    return NextResponse.json(influencerIdResult.body, { status: influencerIdResult.status });
  }
  const influencerId = influencerIdResult.value;

  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      referralCode: true,
      country: true,
      defaultCurrency: true,
      profilePictureUrl: true,
      isActive: true,
      isApproved: true,
      approvedAt: true,
      approvedByUserId: true,
      createdAt: true,
      updatedAt: true,
      balances: {
        select: {
          currency: true,
          balance: true,
          totalEarned: true,
          totalWithdrawn: true,
        },
        orderBy: { currency: 'asc' },
      },
      approvalLogs: {
        orderBy: { createdAt: 'desc' },
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
  });

  if (!influencer) {
    return NextResponse.json({ success: false, message: 'Influencer not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: serializeBigInt(influencer),
  });
}

export const GET = withSuperAdmin(handler);
