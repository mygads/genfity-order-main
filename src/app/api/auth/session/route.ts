/**
 * GET /api/auth/session
 * Check current session validity and return expiry info
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "userId": "1",
 *     "email": "user@example.com",
 *     "role": "MERCHANT_OWNER",
 *     "expiresAt": "2025-11-17T16:02:48.898Z",
 *     "isValid": true
 *   },
 *   "message": "Session is valid",
 *   "statusCode": 200
 * }
 */

import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/middleware/auth';
import { handleError, successResponse } from '@/lib/middleware/errorHandler';
import sessionRepository from '@/lib/repositories/SessionRepository';
import prisma from '@/lib/db/client';

export async function GET(request: NextRequest) {
  try {
    // Authenticate and get user context
    const authContext = await authenticate(request);

    // Get session from database to check expiry
    const session = await sessionRepository.findById(authContext.sessionId);

    if (!session) {
      return successResponse(
        {
          isValid: false,
          message: 'Session not found',
        },
        'Session not found',
        401
      );
    }

    // Check if session is still valid
    const now = new Date();
    const isValid = session.expiresAt > now && session.status === 'ACTIVE';

    // If merchant-role user but merchant was deleted, treat session as invalid
    if (
      isValid &&
      (authContext.role === 'MERCHANT_OWNER' || authContext.role === 'MERCHANT_STAFF')
    ) {
      if (!authContext.merchantId) {
        return successResponse(
          {
            userId: authContext.userId.toString(),
            email: authContext.email,
            role: authContext.role,
            merchantId: undefined,
            expiresAt: session.expiresAt.toISOString(),
            refreshExpiresAt: session.refreshExpiresAt?.toISOString(),
            isValid: false,
          },
          'Merchant not found',
          401
        );
      }

      const merchantExists = await prisma.merchant.findUnique({
        where: { id: authContext.merchantId },
        select: { id: true },
      });

      if (!merchantExists) {
        return successResponse(
          {
            userId: authContext.userId.toString(),
            email: authContext.email,
            role: authContext.role,
            merchantId: authContext.merchantId.toString(),
            expiresAt: session.expiresAt.toISOString(),
            refreshExpiresAt: session.refreshExpiresAt?.toISOString(),
            isValid: false,
          },
          'Merchant not found',
          401
        );
      }
    }

    return successResponse(
      {
        userId: authContext.userId.toString(),
        email: authContext.email,
        role: authContext.role,
        merchantId: authContext.merchantId?.toString(),
        expiresAt: session.expiresAt.toISOString(),
        refreshExpiresAt: session.refreshExpiresAt?.toISOString(),
        isValid,
      },
      isValid ? 'Session is valid' : 'Session has expired',
      isValid ? 200 : 401
    );
  } catch (error) {
    return handleError(error);
  }
}
