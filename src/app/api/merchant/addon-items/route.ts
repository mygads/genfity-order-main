/**
 * Merchant Addon Items API
 * GET /api/merchant/addon-items - List addon items for a category
 * POST /api/merchant/addon-items - Create new addon item
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import menuRepository from '@/lib/repositories/MenuRepository';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { ValidationError } from '@/lib/constants/errors';

/**
 * GET /api/merchant/addon-items
 * Get addon items for a category
 */
async function handleGet(
  req: NextRequest,
  _context: AuthContext,
  _routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryIdParam = searchParams.get('categoryId');

    if (!categoryIdParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Category ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const categoryId = BigInt(categoryIdParam);

    // Get addon items by category - using repository directly
    const items = await menuRepository.findAddonItemsByCategoryId(categoryId);

    return NextResponse.json({
      success: true,
      data: items,
      message: 'Addon items retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting addon items:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to get addon items',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/merchant/addon-items
 * Create new addon item
 */
async function handlePost(
  req: NextRequest,
  _context: AuthContext,
  _routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.addonCategoryId || !body.name || body.price === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Addon category ID, name, and price are required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Create addon item
    const addonItem = await menuService.createAddonItem({
      categoryId: BigInt(body.addonCategoryId),
      name: body.name,
      price: body.price,
      isAvailable: body.isAvailable,
      hasStock: body.trackStock || false,
      stockQuantity: body.stockQty,
    });

    return NextResponse.json({
      success: true,
      data: addonItem,
      message: 'Addon item created successfully',
      statusCode: 201,
    });
  } catch (error) {
    console.error('Error creating addon item:', error);

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

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to create addon item',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const POST = withMerchant(handlePost);
