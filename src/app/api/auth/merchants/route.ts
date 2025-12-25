/**
 * User Merchants API
 * GET /api/auth/merchants - Get all merchants for current user
 * 
 * Used for merchant selection on login for users with multiple merchants
 */

import { NextRequest } from 'next/server';
import { successResponse, handleError } from '@/lib/middleware/errorHandler';
import { withAuth } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import staffPermissionService from '@/lib/services/StaffPermissionService';

/**
 * GET handler - Get all merchants for user
 */
async function getMerchantsHandler(
  request: NextRequest,
  authContext: AuthContext
) {
  try {
    const merchants = await staffPermissionService.getUserMerchants(authContext.userId);

    return successResponse(
      { merchants },
      'Merchants retrieved successfully',
      200
    );
  } catch (error) {
    return handleError(error);
  }
}

export const GET = withAuth(getMerchantsHandler, ['MERCHANT_OWNER', 'MERCHANT_STAFF']);
