/**
 * Merchant Addon Item API (by ID)
 * GET /api/merchant/addon-items/[id] - Get addon item details
 * PUT /api/merchant/addon-items/[id] - Update addon item
 * DELETE /api/merchant/addon-items/[id] - Delete addon item
 */

import { NextRequest, NextResponse } from 'next/server';
import addonService from '@/lib/services/AddonService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { ValidationError, NotFoundError } from '@/lib/constants/errors';
import { serializeBigInt } from '@/lib/utils/serializer';
import prisma from '@/lib/db/client';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * GET /api/merchant/addon-items/[id]
 * Get addon item details
 */
async function handleGet(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
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

    const itemIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!itemIdResult.ok) {
      return NextResponse.json(itemIdResult.body, { status: itemIdResult.status });
    }
    const itemId = itemIdResult.value;

    // Get addon item
    const item = await addonService.getAddonItemById(
      itemId,
      merchantUser.merchantId
    );

    return NextResponse.json({
      success: true,
      data: serializeBigInt(item),
      message: 'Addon item retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting addon item:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error ? error.message : 'Failed to get addon item',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/merchant/addon-items/[id]
 * Update addon item
 */
async function handlePut(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
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

    const itemIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!itemIdResult.ok) {
      return NextResponse.json(itemIdResult.body, { status: itemIdResult.status });
    }
    const itemId = itemIdResult.value;
    const body = await req.json();

    // Update addon item
    const item = await addonService.updateAddonItem(
      itemId,
      merchantUser.merchantId,
      {
        name: body.name,
        description: body.description,
        price: body.price !== undefined ? parseFloat(body.price) : undefined,
        inputType: body.inputType,
        displayOrder: body.displayOrder,
        isActive: body.isActive,
        trackStock: body.trackStock,
        stockQty: body.stockQty,
        lowStockThreshold: body.lowStockThreshold,
        dailyStockTemplate: body.dailyStockTemplate,
        autoResetStock: body.autoResetStock,
      }
    );

    return NextResponse.json({
      success: true,
      data: serializeBigInt(item),
      message: 'Addon item updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating addon item:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: error.message,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    if (error instanceof NotFoundError) {
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
            : 'Failed to update addon item',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/merchant/addon-items/[id]
 * Delete addon item
 */
async function handleDelete(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
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

    const itemIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!itemIdResult.ok) {
      return NextResponse.json(itemIdResult.body, { status: itemIdResult.status });
    }
    const itemId = itemIdResult.value;

    // Delete addon item
    await addonService.deleteAddonItem(itemId, merchantUser.merchantId);

    return NextResponse.json({
      success: true,
      message: 'Addon item deleted successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error deleting addon item:', error);

    if (error instanceof NotFoundError) {
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
            : 'Failed to delete addon item',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const PUT = withMerchant(handlePut);
export const DELETE = withMerchant(handleDelete);
