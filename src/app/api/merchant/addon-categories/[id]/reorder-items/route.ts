/**
 * Merchant Addon Items Reorder API
 * POST /api/merchant/addon-categories/[id]/reorder-items - Reorder addon items
 */

import { NextRequest, NextResponse } from 'next/server';
import addonService from '@/lib/services/AddonService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import prisma from '@/lib/db/client';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * POST /api/merchant/addon-categories/[id]/reorder-items
 * Reorder addon items within a category
 */
async function handlePost(
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
    const body = await req.json();

    // Validate request body
    if (!Array.isArray(body.itemOrders)) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'itemOrders array is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Convert IDs to BigInt
    const itemOrders = body.itemOrders.map(
      (item: { id: string | number; displayOrder: number }) => ({
        id: BigInt(item.id),
        displayOrder: item.displayOrder,
      })
    );

    await addonService.reorderAddonItems(
      categoryId,
      merchantId,
      itemOrders
    );

    return NextResponse.json({
      success: true,
      message: 'Addon items reordered successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error reordering addon items:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to reorder addon items',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
