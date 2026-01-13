/**
 * POST /api/admin/influencers/:id/reject
 * Reject an influencer (referral partner) with reason
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { z } from 'zod';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

const bodySchema = z.object({
  reason: z.string().min(3).max(500),
});

async function handler(
  request: NextRequest,
  context: AuthContext,
  routeContext: RouteContext
): Promise<NextResponse> {
  const influencerIdResult = await requireBigIntRouteParam(routeContext, 'id');
  if (!influencerIdResult.ok) {
    return NextResponse.json(influencerIdResult.body, { status: influencerIdResult.status });
  }
  const influencerId = influencerIdResult.value;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      success: false,
      message: 'Rejection reason is required (min 3 chars)',
    }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const influencer = await tx.influencer.findUnique({
      where: { id: influencerId },
      select: { id: true },
    });

    if (!influencer) {
      return null;
    }

    const updated = await tx.influencer.update({
      where: { id: influencerId },
      data: {
        isApproved: false,
        approvedAt: null,
        approvedByUserId: null,
      },
    });

    await tx.influencerApprovalLog.create({
      data: {
        influencerId,
        action: 'REJECT',
        actedByUserId: context.userId,
        reason: parsed.data.reason,
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
