/**
 * Group Balance Transfer API (Merchant Owner)
 * POST /api/merchant/balance/transfer - Transfer balance between branches
 */

import { NextRequest } from 'next/server';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { successResponse, handleError } from '@/lib/middleware/errorHandler';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';
import balanceService from '@/lib/services/BalanceService';

async function handlePost(request: NextRequest, authContext: AuthContext) {
  try {
    const body = await request.json();

    const fromMerchantId = body?.fromMerchantId ? BigInt(body.fromMerchantId) : null;
    const toMerchantId = body?.toMerchantId ? BigInt(body.toMerchantId) : null;
    const amount = Number(body?.amount);
    const note = typeof body?.note === 'string' ? body.note.trim() : undefined;

    if (!fromMerchantId || !toMerchantId) {
      throw new ValidationError('Source and destination are required', ERROR_CODES.VALIDATION_FAILED);
    }

    if (!(Number.isFinite(amount) && amount > 0)) {
      throw new ValidationError('Amount must be greater than zero', ERROR_CODES.VALIDATION_FAILED);
    }

    await balanceService.transferBalance({
      ownerUserId: authContext.userId,
      fromMerchantId,
      toMerchantId,
      amount,
      note,
    });

    return successResponse(
      {
        fromMerchantId: fromMerchantId.toString(),
        toMerchantId: toMerchantId.toString(),
        amount,
      },
      'Balance transferred successfully',
      200
    );
  } catch (error) {
    return handleError(error);
  }
}

export const POST = withMerchantOwner(handlePost);
