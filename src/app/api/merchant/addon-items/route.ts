/**
 * Merchant Addon Items API
 * GET /api/merchant/addon-items - List addon items
 * POST /api/merchant/addon-items - Create new addon item
 */

import { NextRequest, NextResponse } from 'next/server';
import addonService from '@/lib/services/AddonService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { ValidationError } from '@/lib/constants/errors';
import { serializeBigInt } from '@/lib/utils/serializer';
import prisma from '@/lib/db/client';
import { parseOptionalBigIntQueryParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * GET /api/merchant/addon-items
 * Get addon items - all items or filtered by category
 */
async function handleGet(
  req: NextRequest,
  context: AuthContext,
  _routeContext: RouteContext
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

    const { searchParams } = new URL(req.url);
    const categoryIdResult = parseOptionalBigIntQueryParam(searchParams, 'categoryId', 'Invalid categoryId');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }

    let items;
    if (categoryIdResult.value !== null) {
      // Get items for specific category
      const categoryId = categoryIdResult.value;
      items = await addonService.getAddonItems(
        categoryId,
        merchantId
      );
    } else {
      // Get all items for merchant
      items = await addonService.getAllAddonItemsByMerchant(
        merchantId
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt(items),
      message: 'Addon items retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting addon items:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to get addon items',
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
  context: AuthContext,
  _routeContext: RouteContext
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

    const body = await req.json();

    // Validate required fields
    if (!body.addonCategoryId || !body.name) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Addon category ID and name are required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Create addon item
    const addonItem = await addonService.createAddonItem(
      merchantId,
      {
        addonCategoryId: BigInt(body.addonCategoryId),
        name: body.name,
        description: body.description,
        price: body.price !== undefined ? parseFloat(body.price) : 0,
        inputType: body.inputType || 'SELECT',
        trackStock: body.trackStock || false,
        stockQty: body.stockQty,
        lowStockThreshold: body.lowStockThreshold,
        dailyStockTemplate: body.dailyStockTemplate,
        autoResetStock: body.autoResetStock || false,
      },
      context.userId // ✅ Audit trail: createdByUserId
    );

    return NextResponse.json(
      {
        success: true,
        data: serializeBigInt(addonItem),
        message: 'Addon item created successfully',
        statusCode: 201,
      },
      { status: 201 }
    );
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
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create addon item',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const POST = withMerchant(handlePost);
