/**
 * Merchant Management API (Merchant Owner)
 * POST /api/merchant/main - create new MAIN merchant (new group)
 */

import { NextRequest } from 'next/server';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { successResponse, handleError } from '@/lib/middleware/errorHandler';
import merchantService, { type CreateOwnerMainMerchantInput } from '@/lib/services/MerchantService';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';

function normalizeMainMerchantPayload(body: Record<string, unknown>): CreateOwnerMainMerchantInput {
  return {
    name: String(body.name || '').trim(),
    code: String(body.code || '').trim(),
    description: typeof body.description === 'string' ? body.description : undefined,
    address: typeof body.address === 'string' ? body.address : undefined,
    phoneNumber: typeof body.phoneNumber === 'string' ? body.phoneNumber : undefined,
    email: typeof body.email === 'string' ? body.email : undefined,
    isOpen: typeof body.isOpen === 'boolean' ? body.isOpen : undefined,
    country: typeof body.country === 'string' ? body.country : undefined,
    currency: typeof body.currency === 'string' ? body.currency : undefined,
    timezone: typeof body.timezone === 'string' ? body.timezone : undefined,
    latitude: typeof body.latitude === 'number' ? body.latitude : null,
    longitude: typeof body.longitude === 'number' ? body.longitude : null,
  };
}

async function createMainMerchantHandler(request: NextRequest, authContext: AuthContext) {
  try {
    const body = await request.json();
    const payload = normalizeMainMerchantPayload(body || {});

    const copyFromMerchantId = body?.copyFromMerchantId
      ? BigInt(body.copyFromMerchantId)
      : undefined;

    if (!payload.name || !payload.code) {
      throw new ValidationError('Merchant name and code are required', ERROR_CODES.VALIDATION_FAILED);
    }

    const merchant = await merchantService.createOwnerMainMerchant(authContext.userId, {
      ...payload,
      copyFromMerchantId,
    });

    return successResponse(
      { merchant },
      'Main merchant created successfully',
      201
    );
  } catch (error) {
    return handleError(error);
  }
}

export const POST = withMerchantOwner(createMainMerchantHandler);
