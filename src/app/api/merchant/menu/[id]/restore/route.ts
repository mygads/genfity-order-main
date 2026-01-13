/**
 * Restore Deleted Menu API
 * POST /api/merchant/menu/:id/restore - Restore a soft-deleted menu item
 *
 * @description Restores a menu item that was previously soft-deleted.
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

    const menuIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!menuIdResult.ok) {
      return NextResponse.json(menuIdResult.body, { status: menuIdResult.status });
    }
    const menuId = menuIdResult.value;

    // Restore the menu
    const restoredMenu = await dataCleanupService.restoreMenu(
      menuId,
      BigInt(userId)
    );

    console.log(`✅ Menu ${menuId.toString()} restored by user ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Menu restored successfully',
      data: serializeBigInt(restoredMenu),
    });
  } catch (error) {
    console.error('❌ Error restoring menu:', error);

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
        message: error instanceof Error ? error.message : 'Failed to restore menu',
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
