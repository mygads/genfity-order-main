/**
 * POST /api/influencer/auth/login
 * Influencer login endpoint
 */

import { NextRequest } from 'next/server';
import influencerAuthService from '@/lib/services/InfluencerAuthService';
import { handleError, successResponse } from '@/lib/middleware/errorHandler';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      throw new ValidationError(
        'Email and password are required',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    // Get device info and IP from request
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ipAddress = 
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
      request.headers.get('x-real-ip') || 
      'Unknown';

    const result = await influencerAuthService.login(
      { email, password },
      userAgent,
      ipAddress
    );

    return successResponse(result, 'Login successful', 200);
  } catch (error) {
    return handleError(error);
  }
}
