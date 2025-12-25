/**
 * Switch Merchant API
 * POST /api/auth/switch-merchant - Switch to a different merchant
 * 
 * Used when a user has multiple merchant associations
 * Updates the JWT token with the new merchantId
 */

import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/middleware/errorHandler';
import { withAuth } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { generateAccessToken, generateRefreshToken } from '@/lib/utils/jwtManager';
import sessionRepository from '@/lib/repositories/SessionRepository';
import { ValidationError, NotFoundError, ERROR_CODES } from '@/lib/constants/errors';
import { STAFF_PERMISSIONS } from '@/lib/constants/permissions';

/**
 * POST handler - Switch to a different merchant
 * Body: { merchantId: string }
 */
async function switchMerchantHandler(
  request: NextRequest,
  authContext: AuthContext
) {
  try {
    const body = await request.json();
    const { merchantId } = body;

    if (!merchantId) {
      throw new ValidationError('Merchant ID required', ERROR_CODES.VALIDATION_ERROR);
    }

    const targetMerchantId = BigInt(merchantId);

    // Verify user has access to this merchant
    const merchantUser = await prisma.merchantUser.findUnique({
      where: {
        merchantId_userId: {
          merchantId: targetMerchantId,
          userId: authContext.userId,
        },
      },
      include: {
        merchant: {
          select: {
            id: true,
            code: true,
            name: true,
            logoUrl: true,
            isActive: true,
            isOpen: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!merchantUser) {
      throw new NotFoundError(
        'You do not have access to this merchant',
        ERROR_CODES.NOT_FOUND
      );
    }

    if (!merchantUser.isActive) {
      throw new ValidationError(
        'Your access to this merchant has been disabled',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    if (!merchantUser.merchant.isActive) {
      throw new ValidationError(
        'This merchant is not active',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    // Generate new tokens with new merchantId
    const accessToken = generateAccessToken({
      userId: authContext.userId,
      sessionId: authContext.sessionId,
      role: authContext.role,
      email: authContext.email,
      merchantId: targetMerchantId,
    });

    const refreshToken = generateRefreshToken({
      userId: authContext.userId,
      sessionId: authContext.sessionId,
    });

    // Update session with new token
    await sessionRepository.update(authContext.sessionId, {
      token: accessToken,
    });

    // Get permissions for response
    const permissions = merchantUser.role === 'OWNER' 
      ? Object.values(STAFF_PERMISSIONS)
      : merchantUser.permissions;

    return successResponse(
      {
        accessToken,
        refreshToken,
        user: {
          id: merchantUser.user.id.toString(),
          name: merchantUser.user.name,
          email: merchantUser.user.email,
          role: merchantUser.user.role,
          merchantId: merchantId,
        },
        merchant: {
          id: merchantUser.merchant.id.toString(),
          code: merchantUser.merchant.code,
          name: merchantUser.merchant.name,
          logoUrl: merchantUser.merchant.logoUrl,
          isOpen: merchantUser.merchant.isOpen,
        },
        permissions,
        merchantRole: merchantUser.role,
      },
      'Merchant switched successfully',
      200
    );
  } catch (error) {
    return handleError(error);
  }
}

export const POST = withAuth(switchMerchantHandler, ['MERCHANT_OWNER', 'MERCHANT_STAFF']);
