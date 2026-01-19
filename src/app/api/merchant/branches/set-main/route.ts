/**
 * POST /api/merchant/branches/set-main
 * Promote a branch to be the main merchant for its group (owner only)
 */

import { NextRequest } from 'next/server';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { successResponse, handleError } from '@/lib/middleware/errorHandler';
import merchantService from '@/lib/services/MerchantService';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';

async function setMainBranchHandler(request: NextRequest, authContext: AuthContext) {
  try {
    const body = await request.json();
    const merchantIdRaw = body?.merchantId;

    if (!merchantIdRaw) {
      throw new ValidationError('merchantId is required', ERROR_CODES.VALIDATION_FAILED);
    }

    const merchantId = BigInt(merchantIdRaw);
    await merchantService.setPrimaryBranch(authContext.userId, merchantId);

    return successResponse(null, 'Main branch updated successfully', 200);
  } catch (error) {
    return handleError(error);
  }
}

export const POST = withMerchantOwner(setMainBranchHandler);
