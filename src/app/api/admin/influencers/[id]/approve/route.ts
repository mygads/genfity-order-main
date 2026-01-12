/**
 * POST /api/admin/influencers/:id/approve
 * Approve an influencer (referral partner)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

async function handler(
  _request: NextRequest,
  context: AuthContext,
  routeContext: { params: Promise<Record<string, string>> }
): Promise<NextResponse> {
  const { id } = await routeContext.params;
  const influencerId = BigInt(id);

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const influencer = await tx.influencer.findUnique({
      where: { id: influencerId },
      select: { id: true, isApproved: true },
    });

    if (!influencer) {
      return null;
    }

    const updated = await tx.influencer.update({
      where: { id: influencerId },
      data: {
        isApproved: true,
        approvedAt: now,
        approvedByUserId: context.userId,
      },
    });

    await tx.influencerApprovalLog.create({
      data: {
        influencerId,
        action: 'APPROVE',
        actedByUserId: context.userId,
        reason: null,
      },
    });

    return updated;
  });

  if (!result) {
    return NextResponse.json({ success: false, message: 'Influencer not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: serializeBigInt(result),
  });
}

export const POST = withSuperAdmin(handler);
