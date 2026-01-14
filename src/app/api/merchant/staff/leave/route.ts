/**
 * Staff Leave Merchant API
 * POST /api/merchant/staff/leave - Staff leaves a merchant
 * 
 * Only accessible by MERCHANT_STAFF (staff can leave their merchant)
 */

import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/middleware/errorHandler';
import { withAuth } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import staffPermissionService from '@/lib/services/StaffPermissionService';
import authService from '@/lib/services/AuthService';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';

/**
 * POST handler - Staff leaves merchant
 * Body: { merchantId: string }
 */
async function leaveHandler(
  request: NextRequest,
  authContext: AuthContext
) {
  try {
    // Only staff can use this endpoint
    if (authContext.role !== 'MERCHANT_STAFF') {
      throw new ValidationError(
        'Only staff can leave a merchant. Owners must transfer ownership first.',
        ERROR_CODES.VALIDATION_ERROR
      );
    }

    const body = await request.json();
    const { merchantId } = body;

    if (!merchantId) {
      throw new ValidationError('Merchant ID required', ERROR_CODES.VALIDATION_ERROR);
    }

    await staffPermissionService.leaveMerchant(
      authContext.userId,
      BigInt(merchantId)
    );

    // Force logout from all portals/devices immediately.
    // (If the user had driver access, this also logs them out from the driver portal.)
    await authService.logoutAll(authContext.userId);

    return successResponse(
      null,
      'You have successfully left the merchant',
      200
    );
  } catch (error) {
    return handleError(error);
  }
}

export const POST = withAuth(leaveHandler, ['MERCHANT_STAFF']);
