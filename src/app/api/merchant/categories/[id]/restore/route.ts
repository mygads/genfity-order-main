/**
 * Restore Deleted Menu Category API
 * POST /api/merchant/categories/:id/restore - Restore a soft-deleted menu category
 *
 * @description Restores a menu category that was previously soft-deleted.
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

    const categoryId = parseInt(params?.id || '0');
    if (isNaN(categoryId) || categoryId === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_ID', message: 'Invalid category ID' },
        { status: 400 }
      );
    }

    // Restore the category
    const restoredCategory = await dataCleanupService.restoreMenuCategory(
      BigInt(categoryId),
      BigInt(userId)
    );

    console.log(`✅ Menu category ${categoryId} restored by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Menu category restored successfully',
      data: serializeBigInt(restoredCategory),
    });
  } catch (error) {
    console.error('❌ Error restoring menu category:', error);

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
        message: error instanceof Error ? error.message : 'Failed to restore category',
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
