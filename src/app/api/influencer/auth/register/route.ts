/**
 * POST /api/influencer/auth/register
 * Influencer registration endpoint
 */

import { NextRequest } from 'next/server';
import influencerAuthService from '@/lib/services/InfluencerAuthService';
import { handleError, successResponse } from '@/lib/middleware/errorHandler';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password, country } = body;

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
