/**
 * POST /api/influencer/auth/logout
 * Influencer logout endpoint
 */

import { NextRequest, NextResponse } from 'next/server';
import influencerAuthService from '@/lib/services/InfluencerAuthService';
import { withInfluencer, InfluencerAuthContext } from '@/lib/middleware/auth';

async function handler(
  _request: NextRequest,
  context: InfluencerAuthContext
): Promise<NextResponse> {
  await influencerAuthService.logout(context.sessionId);

  return NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });
}

export const POST = withInfluencer(handler);
