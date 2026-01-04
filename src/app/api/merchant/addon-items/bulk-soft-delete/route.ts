/**
 * Bulk Delete Addon Items API
 * POST /api/merchant/addon-items/bulk-soft-delete - Soft delete multiple addon items at once
 *
 * @description Performs soft delete on multiple addon items.
 * Requires confirmation token for safety.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import dataCleanupService from '@/lib/services/DataCleanupService';
import { serializeBigInt } from '@/lib/utils/serializer';

interface BulkDeleteRequest {
  ids: number[];
  confirmationToken: string;
}

// Generate a simple confirmation token based on IDs
function generateConfirmationToken(ids: number[]): string {
  const sortedIds = [...ids].sort((a, b) => a - b);
  return `DELETE_ADDON_ITEMS_${sortedIds.length}_ITEMS_${sortedIds[0]}_${sortedIds[sortedIds.length - 1]}`;
}

export const POST = withMerchant(async (req: NextRequest, authContext) => {
  try {
    const { userId, merchantId } = authContext;
    const body = (await req.json()) as BulkDeleteRequest;

    const { ids, confirmationToken } = body;

    // Validate request
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_IDS', message: 'Please provide an array of addon item IDs' },
        { status: 400 }
      );
    }

    if (ids.length > 100) {
      return NextResponse.json(
        { success: false, error: 'TOO_MANY_ITEMS', message: 'Cannot delete more than 100 addon items at once' },
        { status: 400 }
      );
    }

    // Validate confirmation token
    const expectedToken = generateConfirmationToken(ids);
    if (confirmationToken !== expectedToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'CONFIRMATION_REQUIRED',
          message: 'Please confirm this bulk delete operation',
          data: {
            itemCount: ids.length,
            confirmationToken: expectedToken,
          },
        },
        { status: 400 }
      );
    }

    // Perform bulk delete
    const result = await dataCleanupService.bulkDeleteAddonItems(
      ids.map(id => BigInt(id)),
      BigInt(userId)
    );

    console.log(`✅ Bulk deleted ${result.deletedCount} addon items by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} addon items`,
      data: serializeBigInt(result),
    });
  } catch (error) {
    console.error('❌ Error bulk deleting addon items:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'BULK_DELETE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to bulk delete addon items',
      },
      { status: 500 }
    );
  }
});

// GET handler to generate confirmation token
export const GET = withMerchant(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const idsParam = url.searchParams.get('ids');

    if (!idsParam) {
      return NextResponse.json(
        { success: false, error: 'MISSING_IDS', message: 'Please provide ids as query parameter' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_IDS', message: 'No valid IDs provided' },
        { status: 400 }
      );
    }

    const confirmationToken = generateConfirmationToken(ids);

    return NextResponse.json({
      success: true,
      data: {
        itemCount: ids.length,
        confirmationToken,
        message: `This will delete ${ids.length} addon items. Use this token to confirm.`,
      },
    });
  } catch (error) {
    console.error('❌ Error generating confirmation token:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'TOKEN_GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Failed to generate confirmation token',
      },
      { status: 500 }
    );
  }
});
