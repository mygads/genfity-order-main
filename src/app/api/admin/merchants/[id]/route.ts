/**
 * GET /api/admin/merchants/:id
 * Get merchant details (Super Admin only)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "merchant": {...}
 *   },
 *   "message": "Merchant retrieved successfully",
 *   "statusCode": 200
 * }
 * 
 * PUT /api/admin/merchants/:id
 * Update merchant (Super Admin only)
 * 
 * Request Body:
 * {
 *   "name": "Updated Name",
 *   "description": "Updated description",
 *   ...
 * }
 * 
 * DELETE /api/admin/merchants/:id
 * Hard delete merchant (Super Admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import merchantService from '@/lib/services/MerchantService';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { UpdateMerchantInput } from '@/lib/services/MerchantService';
import { AuthContext } from '@/lib/types/auth';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

async function getMerchantHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const merchantIdResult = await requireBigIntRouteParam(context, 'id');
  if (!merchantIdResult.ok) {
    return NextResponse.json(merchantIdResult.body, { status: merchantIdResult.status });
  }
  const merchantId = merchantIdResult.value;

  // Get merchant details
  const merchant = await merchantService.getMerchantById(merchantId);

  return successResponse({ merchant }, 'Merchant retrieved successfully', 200);
}

async function updateMerchantHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const merchantIdResult = await requireBigIntRouteParam(context, 'id');
  if (!merchantIdResult.ok) {
    return NextResponse.json(merchantIdResult.body, { status: merchantIdResult.status });
  }
  const merchantId = merchantIdResult.value;
  const body: UpdateMerchantInput = await request.json();

  // Update merchant
  const merchant = await merchantService.updateMerchant(merchantId, body);

  return successResponse({ merchant }, 'Merchant updated successfully', 200);
}

async function deleteMerchantHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const merchantIdResult = await requireBigIntRouteParam(context, 'id');
  if (!merchantIdResult.ok) {
    return NextResponse.json(merchantIdResult.body, { status: merchantIdResult.status });
  }
  const merchantId = merchantIdResult.value;

  // Delete merchant (hard delete)
  await merchantService.deleteMerchant(merchantId);

  return successResponse(null, 'Merchant deleted successfully', 200);
}

export const GET = withSuperAdmin(getMerchantHandler);
export const PUT = withSuperAdmin(updateMerchantHandler);
export const DELETE = withSuperAdmin(deleteMerchantHandler);
