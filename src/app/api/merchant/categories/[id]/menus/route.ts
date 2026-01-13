/**
 * Category Menu Management API
 * GET /api/merchant/categories/[id]/menus - Get menus in category
 * POST /api/merchant/categories/[id]/menus - Add menu to category
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * GET /api/merchant/categories/[id]/menus
 * Get all menus in this category
 */
async function handleGet(
  req: NextRequest,
  context: AuthContext,
  routeContext: RouteContext
) {
  try {
    const categoryIdResult = await requireBigIntRouteParam(routeContext, 'id');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }
    const categoryId = categoryIdResult.value;

    // Verify category belongs to merchant
    const category = await prisma.menuCategory.findFirst({
      where: {
        id: categoryId,
        merchant: {
          merchantUsers: {
            some: { userId: context.userId },
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'CATEGORY_NOT_FOUND',
          message: 'Category not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Get menus in this category through many-to-many
    const menuCategories = await prisma.menuCategoryItem.findMany({
      where: { categoryId },
      include: {
        menu: true,
      },
    });

    const menus = menuCategories.map((mc: { menu: unknown }) => mc.menu);

    return NextResponse.json({
      success: true,
      data: serializeBigInt(menus),
      message: 'Menus retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting category menus:', error);

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
 * POST /api/merchant/categories/[id]/menus
 * Add menu to category
 */
async function handlePost(
  req: NextRequest,
  context: AuthContext,
  routeContext: RouteContext
) {
  try {
    const categoryIdResult = await requireBigIntRouteParam(routeContext, 'id');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }
    const categoryId = categoryIdResult.value;
    const body = await req.json();
    
    // Validate menuId is provided
    if (!body.menuId) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Menu ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }
    
    const menuId = BigInt(body.menuId);

    // Get merchant
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
    });

    if (!merchantUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Verify category belongs to merchant
    const category = await prisma.menuCategory.findFirst({
      where: {
        id: categoryId,
        merchantId: merchantUser.merchantId,
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'CATEGORY_NOT_FOUND',
          message: 'Category not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Verify menu belongs to merchant
    const menu = await prisma.menu.findFirst({
      where: {
        id: menuId,
        merchantId: merchantUser.merchantId,
      },
    });

    if (!menu) {
      return NextResponse.json(
        {
          success: false,
          error: 'MENU_NOT_FOUND',
          message: 'Menu not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Check if already linked
    const existing = await prisma.menuCategoryItem.findUnique({
      where: {
        menuId_categoryId: {
          menuId,
          categoryId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: 'ALREADY_EXISTS',
          message: 'Menu is already in this category',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Create link
    const link = await prisma.menuCategoryItem.create({
      data: {
        menuId,
        categoryId,
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(link),
      message: 'Menu added to category successfully',
      statusCode: 201,
    });
  } catch (error) {
    console.error('Error adding menu to category:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to add menu to category',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const POST = withMerchant(handlePost);
