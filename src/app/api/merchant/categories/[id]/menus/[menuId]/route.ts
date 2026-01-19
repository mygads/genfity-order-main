/**
 * Remove Menu from Category API
 * DELETE /api/merchant/categories/[id]/menus/[menuId]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * DELETE /api/merchant/categories/[id]/menus/[menuId]
 * Remove menu from category
 */
async function handleDelete(
  req: NextRequest,
  context: AuthContext,
  routeContext: RouteContext
) {
  try {
    const categoryIdResult = await requireBigIntRouteParam(routeContext, 'id');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }
    const menuIdResult = await requireBigIntRouteParam(routeContext, 'menuId');
    if (!menuIdResult.ok) {
      return NextResponse.json(menuIdResult.body, { status: menuIdResult.status });
    }

    const categoryId = categoryIdResult.value;
    const menuId = menuIdResult.value;

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

    // Verify category belongs to merchant
    const category = await prisma.menuCategory.findFirst({
      where: {
        id: categoryId,
        merchantId,
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

    // Delete link
    await prisma.menuCategoryItem.delete({
      where: {
        menuId_categoryId: {
          menuId,
          categoryId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Menu removed from category successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error removing menu from category:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to remove menu from category',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const DELETE = withMerchant(handleDelete);
