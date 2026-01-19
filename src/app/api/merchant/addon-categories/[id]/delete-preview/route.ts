/**
 * Addon Category Delete Preview API
 * GET /api/merchant/addon-categories/[id]/delete-preview
 * Returns information about what will be affected when deleting an addon category
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * GET /api/merchant/addon-categories/[id]/delete-preview
 * Preview what will be affected when deleting this addon category
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

    // Get addon category with related data
    const addonCategory = await prisma.addonCategory.findFirst({
      where: {
        id: categoryId,
        merchantId,
        deletedAt: null,
      },
      include: {
        addonItems: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            price: true,
            isActive: true,
          },
        },
        menuAddonCategories: {
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

    if (!addonCategory) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Addon category not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Get unique menus that will be affected
    const affectedMenus = addonCategory.menuAddonCategories.map(mac => mac.menu);
    const uniqueMenus = Array.from(
      new Map(affectedMenus.map(m => [m.id.toString(), m])).values()
    );

    // Count addon items
    const addonItemsCount = addonCategory.addonItems.length;

    // Build warning message
    let message = '';
    const warnings: string[] = [];

    if (uniqueMenus.length > 0) {
      warnings.push(`This addon category is assigned to ${uniqueMenus.length} menu item(s).`);
    }

    if (addonItemsCount > 0) {
      warnings.push(`This will also delete ${addonItemsCount} addon item(s) in this category.`);
    }

    if (warnings.length > 0) {
      message = warnings.join(' ');
    } else {
      message = 'This addon category is not assigned to any menu items and has no addon items. It can be safely deleted.';
    }

    return NextResponse.json({
      success: true,
      data: {
        addonCategory: {
          id: serializeBigInt(addonCategory.id),
          name: addonCategory.name,
        },
        affectedMenusCount: uniqueMenus.length,
        affectedMenus: serializeBigInt(uniqueMenus.slice(0, 10)), // Limit to 10 for preview
        hasMoreMenus: uniqueMenus.length > 10,
        addonItemsCount,
        addonItems: serializeBigInt(addonCategory.addonItems.slice(0, 5)), // Limit to 5 for preview
        hasMoreItems: addonItemsCount > 5,
        message,
        canDelete: true, // Can always delete, relationships will be removed first
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
