/**
 * Toggle Addon Category Active Status
 * PATCH /api/merchant/addon-categories/[id]/toggle-active
 */

import { NextRequest, NextResponse } from 'next/server';
import addonService from '@/lib/services/AddonService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import prisma from '@/lib/db/client';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * PATCH /api/merchant/addon-categories/[id]/toggle-active
 * Toggle addon category active status
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

    const categoryIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }
    const categoryId = categoryIdResult.value;

    const category = await addonService.toggleAddonCategoryActive(
      categoryId,
      merchantId
    );

    return NextResponse.json({
      success: true,
      data: serializeBigInt(category),
      message: `Addon category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error toggling addon category status:', error);

    if (
      error instanceof Error &&
      error.message === 'Addon category not found'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: error.message,
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to toggle addon category status',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const PATCH = withMerchant(handlePatch);
