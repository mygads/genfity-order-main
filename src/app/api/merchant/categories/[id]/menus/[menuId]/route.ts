/**
 * Remove Menu from Category API
 * DELETE /api/merchant/categories/[id]/menus/[menuId]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';

/**
 * DELETE /api/merchant/categories/[id]/menus/[menuId]
 * Remove menu from category
 */
async function handleDelete(
  req: NextRequest,
  context: AuthContext,
  routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await routeContext.params;
    const categoryId = BigInt(params.id);
    const menuId = BigInt(params.menuId);

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
