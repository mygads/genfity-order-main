/**
 * Merchant Menu Items API
 * GET /api/merchant/menu - List all menus
 * POST /api/merchant/menu - Create new menu
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import { ValidationError } from '@/lib/constants/errors';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { parseOptionalBigIntQueryParam } from '@/lib/utils/routeContext';

/**
 * GET /api/merchant/menu
 * Get all menu items for merchant
 */
async function handleGet(req: NextRequest, context: AuthContext) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
      include: { merchant: true },
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

    const { searchParams } = new URL(req.url);
    const categoryIdResult = parseOptionalBigIntQueryParam(searchParams, 'categoryId', 'Invalid categoryId');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }

    const menus = await menuService.getMenusByMerchant(
      merchantUser.merchantId,
      categoryIdResult.value ?? undefined
    );

    return NextResponse.json({
      success: true,
      data: serializeBigInt(menus),
      message: 'Menus retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting menus:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve menus',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/merchant/menu
 * Create new menu item
 */
async function handlePost(req: NextRequest, context: AuthContext) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
      include: { merchant: true },
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

    const body = await req.json();

    const menu = await menuService.createMenu({
      merchantId: merchantUser.merchantId,
      categoryId: body.categoryId ? BigInt(body.categoryId) : undefined,
      name: body.name,
      description: body.description,
      price: body.price,
      imageUrl: body.imageUrl,
      imageThumbUrl: body.imageThumbUrl,
      imageThumbMeta: body.imageThumbMeta,
      isActive: body.isActive !== undefined ? body.isActive : true,
      isSpicy: body.isSpicy || false,
      isBestSeller: body.isBestSeller || false,
      isSignature: body.isSignature || false,
      isRecommended: body.isRecommended || false,
      trackStock: body.trackStock || false,
      stockQty: body.stockQty,
      dailyStockTemplate: body.dailyStockTemplate,
      autoResetStock: body.autoResetStock || false,
      userId: context.userId, // ✅ Audit trail: createdByUserId
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(menu),
      message: 'Menu created successfully',
      statusCode: 201,
    });
  } catch (error) {
    console.error('Error creating menu:', error);

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
        message: 'Failed to create menu',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const POST = withMerchant(handlePost);
