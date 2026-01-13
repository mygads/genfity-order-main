/**
 * POST /api/influencer/auth/register
 * Influencer registration endpoint
 */

import { NextRequest } from 'next/server';
import influencerAuthService from '@/lib/services/InfluencerAuthService';
import { handleError, successResponse } from '@/lib/middleware/errorHandler';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';
import { isTurnstileEnabled, verifyTurnstileToken } from '@/lib/utils/turnstile';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password, country, turnstileToken } = body;

    // Validate required fields
    if (!name || !email || !password || !country) {
      throw new ValidationError(
        'Name, email, password, and country are required',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    if (name.length < 2) {
      throw new ValidationError(
        'Name must be at least 2 characters',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'Unknown';

    if (isTurnstileEnabled()) {
      if (!turnstileToken || typeof turnstileToken !== 'string') {
        throw new ValidationError(
          'Security verification required',
          ERROR_CODES.VALIDATION_FAILED
        );
      }

      await verifyTurnstileToken({ token: turnstileToken, ipAddress });
    }

    const result = await influencerAuthService.register({
      name,
      email,
      phone,
      password,
      country,
    });

    return successResponse(result, 'Registration successful. Your account is pending approval.', 201);
  } catch (error) {
    return handleError(error);
  }
}
