/**
 * POST /api/admin/merchants/:id/toggle
 * Toggle merchant active status (Super Admin only)
 * 
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "merchant": {...}
 *   },
 *   "message": "Merchant status toggled successfully",
 *   "statusCode": 200
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import merchantService from '@/lib/services/MerchantService';
import { successResponse } from '@/lib/middleware/errorHandler';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { AuthContext } from '@/lib/types/auth';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

async function toggleMerchantHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const merchantIdResult = await requireBigIntRouteParam(context, 'id');
  if (!merchantIdResult.ok) {
    return NextResponse.json(merchantIdResult.body, { status: merchantIdResult.status });
  }
  const merchantId = merchantIdResult.value;

  // Toggle merchant status
  const merchant = await merchantService.toggleMerchantStatus(merchantId);

  return successResponse(
    { merchant },
    'Merchant status toggled successfully',
    200
  );
}

export const POST = withSuperAdmin(toggleMerchantHandler);
