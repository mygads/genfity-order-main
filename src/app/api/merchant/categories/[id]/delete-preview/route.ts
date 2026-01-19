/**
 * Category Delete Preview API
 * GET /api/merchant/categories/[id]/delete-preview
 * Returns information about what will be affected when deleting a category
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * GET /api/merchant/categories/[id]/delete-preview
 * Preview what will be affected when deleting this category
 */
async function handleGet(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
) {
  try {
    const categoryIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }
    const categoryId = categoryIdResult.value;

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

    // Get category with related data
    const category = await prisma.menuCategory.findFirst({
      where: {
        id: categoryId,
        merchantId,
        deletedAt: null,
      },
      include: {
        menuItems: {
          include: {
            menu: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Category not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Get unique menus that will be affected
    const affectedMenus = category.menuItems.map(item => item.menu);
    const uniqueMenus = Array.from(
      new Map(affectedMenus.map(m => [m.id.toString(), m])).values()
    );

    return NextResponse.json({
      success: true,
      data: {
        category: {
          id: serializeBigInt(category.id),
          name: category.name,
        },
        // Legacy field names for frontend compatibility
        menuItemsCount: uniqueMenus.length,
        menuNames: uniqueMenus.slice(0, 10).map(m => m.name),
        // New field names
        affectedMenusCount: uniqueMenus.length,
        affectedMenus: serializeBigInt(uniqueMenus.slice(0, 10)), // Limit to 10 for preview
        hasMoreMenus: uniqueMenus.length > 10,
        message: uniqueMenus.length > 0
          ? `This category is assigned to ${uniqueMenus.length} menu item(s). Deleting will remove the category from these menus.`
          : 'This category is not assigned to any menu items. It can be safely deleted.',
        canDelete: true, // Category can always be deleted, menus will just lose this category
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting delete preview:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to get delete preview',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
