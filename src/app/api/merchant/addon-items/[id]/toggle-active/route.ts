/**
 * Merchant Addon Item Toggle Active API
 * PATCH /api/merchant/addon-items/[id]/toggle-active - Toggle active status
 */

import { NextRequest, NextResponse } from 'next/server';
import addonService from '@/lib/services/AddonService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import prisma from '@/lib/db/client';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * PATCH /api/merchant/addon-items/[id]/toggle-active
 * Toggle addon item active status
 */
async function handlePatch(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
) {
  try {
    const merchantId = context.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_ID_REQUIRED',
          message: 'Merchant ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const itemIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!itemIdResult.ok) {
      return NextResponse.json(itemIdResult.body, { status: itemIdResult.status });
    }
    const itemId = itemIdResult.value;

    const item = await addonService.toggleAddonItemActive(
      itemId,
      merchantId
    );

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Addon item not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt(item),
      message: `Addon item ${item.isActive ? 'activated' : 'deactivated'} successfully`,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error toggling addon item status:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to toggle addon item status',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const PATCH = withMerchant(handlePatch);
