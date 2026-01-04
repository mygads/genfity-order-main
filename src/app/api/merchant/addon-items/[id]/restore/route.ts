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

async function handlePost(
  req: NextRequest,
  authContext: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const { userId, merchantId } = authContext;

    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: 'Merchant ID required' },
        { status: 401 }
      );
    }

    const itemId = parseInt(params?.id || '0');
    if (isNaN(itemId) || itemId === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ID', message: 'Invalid addon item ID' },
        { status: 400 }
      );
    }

    // Restore the addon item
    const restoredItem = await dataCleanupService.restoreAddonItem(
      BigInt(itemId),
      BigInt(userId)
    );

    console.log(`✅ Addon item ${itemId} restored by user ${userId}`);

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
