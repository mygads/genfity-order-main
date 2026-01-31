/**
 * Bulk Restore Menus API
 * POST /api/merchant/menu/bulk-restore - Restore multiple soft-deleted menu items at once
 *
 * @description Restores multiple menu items that were previously soft-deleted.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import dataCleanupService from '@/lib/services/DataCleanupService';
import { serializeBigInt } from '@/lib/utils/serializer';

interface BulkRestoreRequest {
  ids: number[];
}

export const POST = withMerchant(async (req: NextRequest, authContext) => {
  try {
    const { userId, merchantId } = authContext;
    const body = (await req.json()) as BulkRestoreRequest;

    const { ids } = body;

    // Validate request
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_IDS',
          message: 'Please provide an array of menu IDs',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: 'TOO_MANY_ITEMS',
          message: 'Cannot restore more than 100 items at once',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Perform bulk restore
    const result = await dataCleanupService.bulkRestoreMenus(
      ids.map(id => BigInt(id)),
      BigInt(userId)
    );

    console.log(`✅ Bulk restored ${result.restoredCount} menus by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully restored ${result.restoredCount} menu items`,
      data: serializeBigInt(result),
    });
  } catch (error) {
    console.error('❌ Error bulk restoring menus:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'BULK_RESTORE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to bulk restore menus',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
