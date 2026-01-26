/**
 * POST /api/auth/login
 * User login endpoint
 * 
 * Request Body:
 * {
 *   "email": "admin@genfity.com",
 *   "password": "1234abcd",
 *   "rememberMe": false // Optional, extends session to 7 days for admin roles
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "user": { id, name, email, role },
 *     "accessToken": "jwt-token",
 *     "refreshToken": "refresh-token",
 *     "expiresIn": 86400 // in seconds, varies by role and rememberMe
 *   },
 *   "message": "Login successful",
 *   "statusCode": 200
 * }
 * 
 * Session Duration Rules:
 * - CUSTOMER: 90 days (7,776,000 seconds)
 * - ADMIN/OWNER/STAFF with rememberMe=true: 7 days (604,800 seconds)
 * - ADMIN/OWNER/STAFF with rememberMe=false: 1 day (86,400 seconds)
 */

import { NextRequest } from 'next/server';
import authService from '@/lib/services/AuthService';
import { handleError, successResponse } from '@/lib/middleware/errorHandler';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';
import { isTurnstileEnabled, verifyTurnstileToken } from '@/lib/utils/turnstile';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password, rememberMe = false, turnstileToken, client, merchantId } = body;

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

    // Optional anti-bot protection: enforce only when configured
    if (isTurnstileEnabled()) {
      if (!turnstileToken || typeof turnstileToken !== 'string') {
        throw new ValidationError(
          'Security verification required',
          ERROR_CODES.VALIDATION_FAILED
        );
      }

      await verifyTurnstileToken({ token: turnstileToken, ipAddress });
    }

    // Call AuthService login with remember me flag
    const result = await authService.login(
      { email, password, rememberMe, client, merchantId },
      userAgent,
      ipAddress
    );

    // Return success response with profile picture
    return successResponse(result, 'Login successful', 200);
  } catch (error) {
    return handleError(error);
  }
}
