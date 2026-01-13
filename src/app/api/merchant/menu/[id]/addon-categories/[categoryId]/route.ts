/**
 * Menu Addon Category Management API
 * DELETE /api/merchant/menu/[menuId]/addon-categories/[categoryId] - Remove addon category from menu
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import { NotFoundError } from '@/lib/constants/errors';
import type { AuthContext } from '@/lib/types/auth';
import prisma from '@/lib/db/client';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * DELETE /api/merchant/menu/[menuId]/addon-categories/[categoryId]
 * Remove addon category from menu
 */
async function handleDelete(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
) {
  try {
    const menuIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!menuIdResult.ok) {
      return NextResponse.json(menuIdResult.body, { status: menuIdResult.status });
    }
    const categoryIdResult = await requireBigIntRouteParam(contextParams, 'categoryId');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }
    const menuId = menuIdResult.value;
    const categoryId = categoryIdResult.value;

    // Verify menu exists and belongs to merchant
    const menu = await prisma.menu.findFirst({
      where: {
        id: menuId,
        merchantId: context.merchantId,
      },
    });

    if (!menu) {
      throw new NotFoundError('Menu not found');
    }

    // Delete the menu addon category relationship
    await prisma.menuAddonCategory.delete({
      where: {
        menuId_addonCategoryId: {
          menuId,
          addonCategoryId: categoryId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Addon category removed from menu successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error removing addon category from menu:', error);

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

    // Handle Prisma not found error
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Menu addon category relationship not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to remove addon category from menu',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const DELETE = withMerchant(handleDelete);
