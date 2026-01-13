/**
 * Restore Deleted Addon Item API
 * POST /api/merchant/addon-items/:id/restore - Restore a soft-deleted addon item
 *
 * @description Restores an addon item that was previously soft-deleted.
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

    const itemIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!itemIdResult.ok) {
      return NextResponse.json(itemIdResult.body, { status: itemIdResult.status });
    }
    const itemId = itemIdResult.value;

    // Restore the addon item
    const restoredItem = await dataCleanupService.restoreAddonItem(
      itemId,
      BigInt(userId)
    );

    console.log(`✅ Addon item ${itemId.toString()} restored by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Addon item restored successfully',
      data: serializeBigInt(restoredItem),
    });
  } catch (error) {
    console.error('❌ Error restoring addon item:', error);

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
        message: error instanceof Error ? error.message : 'Failed to restore addon item',
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
