/**
 * PUT /api/influencer/bank-details
 * Update influencer bank details
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withInfluencer, InfluencerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';
import { handleError, successResponse } from '@/lib/middleware/errorHandler';

async function handler(
  request: NextRequest,
  context: InfluencerAuthContext
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const {
      bankNameIdr,
      bankAccountIdr,
      bankAccountNameIdr,
      bankNameAud,
      bankAccountAud,
      bankAccountNameAud,
    } = body;

    // Validate bank details - if one field is provided, all must be provided
    if (bankNameIdr || bankAccountIdr || bankAccountNameIdr) {
      if (!bankNameIdr || !bankAccountIdr || !bankAccountNameIdr) {
        throw new ValidationError(
          'Please provide complete IDR bank details (bank name, account number, account name)',
          ERROR_CODES.VALIDATION_FAILED
        );
      }
    }

    if (bankNameAud || bankAccountAud || bankAccountNameAud) {
      if (!bankNameAud || !bankAccountAud || !bankAccountNameAud) {
        throw new ValidationError(
          'Please provide complete AUD bank details (bank name, account number, account name)',
          ERROR_CODES.VALIDATION_FAILED
        );
      }
    }

    const influencer = await prisma.influencer.update({
      where: { id: context.influencerId },
      data: {
        bankNameIdr: bankNameIdr || null,
        bankAccountIdr: bankAccountIdr || null,
        bankAccountNameIdr: bankAccountNameIdr || null,
        bankNameAud: bankNameAud || null,
        bankAccountAud: bankAccountAud || null,
        bankAccountNameAud: bankAccountNameAud || null,
      },
      select: {
        id: true,
        bankNameIdr: true,
        bankAccountIdr: true,
        bankAccountNameIdr: true,
        bankNameAud: true,
        bankAccountAud: true,
        bankAccountNameAud: true,
      },
    });

    return successResponse(
      serializeBigInt(influencer),
      'Bank details updated successfully',
      200
    );
  } catch (error) {
    return handleError(error);
  }
}

export const PUT = withInfluencer(handler);
