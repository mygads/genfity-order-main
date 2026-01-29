/**
 * Branch Movement API (Merchant Owner)
 * POST /api/merchant/branches/move - move an existing merchant to be a BRANCH under a target MAIN merchant
 */

import { NextRequest } from 'next/server';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { handleError, successResponse } from '@/lib/middleware/errorHandler';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';
import merchantService from '@/lib/services/MerchantService';

async function moveBranchHandler(request: NextRequest, authContext: AuthContext) {
  try {
    const body = await request.json();

    if (!body?.merchantId || !body?.targetMainMerchantId) {
      throw new ValidationError('merchantId and targetMainMerchantId are required', ERROR_CODES.VALIDATION_FAILED);
    }

    const merchantId = BigInt(body.merchantId);
    const targetMainMerchantId = BigInt(body.targetMainMerchantId);

    await merchantService.moveMerchantToMain(authContext.userId, merchantId, targetMainMerchantId);

    return successResponse({}, 'Merchant moved successfully', 200);
  } catch (error) {
    return handleError(error);
  }
}

export const POST = withMerchantOwner(moveBranchHandler);
