/**
 * GET /api/influencer/auth/me
 * Get current influencer profile
 */

import { NextRequest, NextResponse } from 'next/server';
import influencerAuthService from '@/lib/services/InfluencerAuthService';
import { withInfluencer, InfluencerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

async function handler(
  _request: NextRequest,
  context: InfluencerAuthContext
): Promise<NextResponse> {
  const influencer = await influencerAuthService.getInfluencerWithBalances(context.influencerId);

  if (!influencer) {
    return NextResponse.json({
      success: false,
      error: 'Influencer not found',
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: serializeBigInt(influencer),
  });
}

export const GET = withInfluencer(handler);
