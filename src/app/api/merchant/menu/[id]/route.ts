/**
 * Merchant Single Menu Item API
 * GET /api/merchant/menu/[id] - Get menu details
 * PUT /api/merchant/menu/[id] - Update menu
 * DELETE /api/merchant/menu/[id] - Delete menu
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import { withMerchant } from '@/lib/middleware/auth';
import { ValidationError, NotFoundError } from '@/lib/constants/errors';
import type { AuthContext } from '@/lib/types/auth';

/**
 * GET /api/merchant/menu/[id]
 * Get menu item details
 */
async function handleGet(
  req: NextRequest,
  context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const menuId = BigInt(params?.id || '0');
    const menu = await menuService.getMenuWithAddons(menuId);

    if (!menu) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Menu not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: menu,
      message: 'Menu retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting menu:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve menu',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/merchant/menu/[id]
 * Update menu item
 */
async function handlePut(
  req: NextRequest,
  context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const menuId = BigInt(params?.id || '0');
    const body = await req.json();

    const menu = await menuService.updateMenu(menuId, {
      categoryId: body.categoryId ? BigInt(body.categoryId) : undefined,
      name: body.name,
      description: body.description,
      price: body.price,
      imageUrl: body.imageUrl,
      isActive: body.isActive,
      isSpicy: body.isSpicy,
      isBestSeller: body.isBestSeller,
      isSignature: body.isSignature,
      isRecommended: body.isRecommended,
      trackStock: body.trackStock,
      stockQty: body.stockQty,
      dailyStockTemplate: body.dailyStockTemplate,
      autoResetStock: body.autoResetStock,
      isPromo: body.isPromo,
    });

    return NextResponse.json({
      success: true,
      data: menu,
      message: 'Menu updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating menu:', error);

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
        message: 'Failed to update menu',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/merchant/menu/[id]
 * Delete menu item
 */
async function handleDelete(
  req: NextRequest,
  context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const menuId = BigInt(params?.id || '0');

    await menuService.deleteMenu(menuId);

    return NextResponse.json({
      success: true,
      message: 'Menu deleted successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error deleting menu:', error);

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
        message: 'Failed to delete menu',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const PUT = withMerchant(handlePut);
export const DELETE = withMerchant(handleDelete);
