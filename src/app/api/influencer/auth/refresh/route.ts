/**
 * POST /api/influencer/auth/refresh
 * Refresh influencer access token using refresh token
 */

import { NextRequest } from 'next/server';
import influencerAuthService from '@/lib/services/InfluencerAuthService';
import { handleError, successResponse } from '@/lib/middleware/errorHandler';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      throw new ValidationError(
        'Refresh token is required',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    const result = await influencerAuthService.refreshAccessToken(refreshToken);

    return successResponse(result, 'Token refreshed successfully', 200);
  } catch (error) {
    return handleError(error);
  }
}
