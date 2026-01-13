/**
 * Restore Deleted Addon Category API
 * POST /api/merchant/addon-categories/:id/restore - Restore a soft-deleted addon category
 *
 * @description Restores an addon category that was previously soft-deleted.
 * Only works for items deleted within the retention period (30 days).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import dataCleanupService from '@/lib/services/DataCleanupService';
import { serializeBigInt } from '@/lib/utils/serializer';
import type { AuthContext } from '@/lib/types/auth';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

async function handlePost(
  req: NextRequest,
  authContext: AuthContext,
  contextParams: RouteContext
) {
  try {
    const { userId, merchantId } = authContext;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Merchant ID required' },
        { status: 401 }
      );
    }

    const categoryIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }
    const categoryId = categoryIdResult.value;

    // Restore the addon category
    const restoredCategory = await dataCleanupService.restoreAddonCategory(
      categoryId,
      BigInt(userId)
    );

    console.log(`✅ Addon category ${categoryId.toString()} restored by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Addon category restored successfully',
      data: serializeBigInt(restoredCategory),
    });
  } catch (error) {
    console.error('❌ Error restoring addon category:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { success: false, error: 'NOT_FOUND', message: error.message },
          { status: 404 }
        );
      }
      if (error.message.includes('permanently deleted')) {
        return NextResponse.json(
          { success: false, error: 'EXPIRED', message: error.message },
          { status: 410 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'RESTORE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to restore addon category',
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
