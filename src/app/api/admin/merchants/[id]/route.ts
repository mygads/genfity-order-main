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
 * Soft delete merchant (Super Admin only)
 */

import { NextRequest } from 'next/server';
import merchantService from '@/lib/services/MerchantService';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { UpdateMerchantInput } from '@/lib/services/MerchantService';
import { AuthContext } from '@/lib/types/auth';

async function getMerchantHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const merchantId = BigInt(params.id);

  // Get merchant details
  const merchant = await merchantService.getMerchantById(merchantId);

  return successResponse({ merchant }, 'Merchant retrieved successfully', 200);
}

async function updateMerchantHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const merchantId = BigInt(params.id);
  const body: UpdateMerchantInput = await request.json();

  // Update merchant
  const merchant = await merchantService.updateMerchant(merchantId, body);

  return successResponse({ merchant }, 'Merchant updated successfully', 200);
}

async function deleteMerchantHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: { params: Promise<Record<string, string>> }
) {
  const params = await context.params;
  const merchantId = BigInt(params.id);

  // Delete merchant (soft delete)
  await merchantService.deleteMerchant(merchantId);

  return successResponse(null, 'Merchant deleted successfully', 200);
}

export const GET = withSuperAdmin(getMerchantHandler);
export const PUT = withSuperAdmin(updateMerchantHandler);
export const DELETE = withSuperAdmin(deleteMerchantHandler);
