/**
 * Merchant Addon Items Reorder API
 * POST /api/merchant/addon-categories/[id]/reorder-items - Reorder addon items
 */

import { NextRequest, NextResponse } from 'next/server';
import addonService from '@/lib/services/AddonService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import prisma from '@/lib/db/client';

/**
 * POST /api/merchant/addon-categories/[id]/reorder-items
 * Reorder addon items within a category
 */
async function handlePost(
  req: NextRequest,
  context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
    });

    if (!merchantUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found for this user',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const params = await contextParams.params;
    const categoryId = BigInt(params?.id || '0');
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
      merchantUser.merchantId,
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
