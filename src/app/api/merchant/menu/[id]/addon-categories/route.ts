/**
 * Menu Addon Categories API
 * POST /api/merchant/menu/[id]/addon-categories - Add addon category to menu
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import { ValidationError, NotFoundError } from '@/lib/constants/errors';
import type { AuthContext } from '@/lib/types/auth';
import prisma from '@/lib/db/client';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * POST /api/merchant/menu/[id]/addon-categories
 * Add addon category to menu
 */
async function handlePost(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
) {
  try {
    const menuIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!menuIdResult.ok) {
      return NextResponse.json(menuIdResult.body, { status: menuIdResult.status });
    }
    const menuId = menuIdResult.value;
    const body = await req.json();

    const { addonCategoryId, isRequired, displayOrder } = body;

    if (!addonCategoryId) {
      throw new ValidationError('Addon category ID is required');
    }

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

    // Verify addon category exists and belongs to merchant
    const addonCategory = await prisma.addonCategory.findFirst({
      where: {
        id: BigInt(addonCategoryId),
        merchantId: context.merchantId,
      },
    });

    if (!addonCategory) {
      throw new NotFoundError('Addon category not found');
    }

    // Create or update menu addon category
    const menuAddonCategory = await prisma.menuAddonCategory.upsert({
      where: {
        menuId_addonCategoryId: {
          menuId,
          addonCategoryId: BigInt(addonCategoryId),
        },
      },
      create: {
        menuId,
        addonCategoryId: BigInt(addonCategoryId),
        isRequired: isRequired || false,
        displayOrder: displayOrder ?? 0,
      },
      update: {
        isRequired: isRequired || false,
        displayOrder: displayOrder ?? 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...menuAddonCategory,
        menuId: menuAddonCategory.menuId.toString(),
        addonCategoryId: menuAddonCategory.addonCategoryId.toString(),
      },
      message: 'Addon category added to menu successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error adding addon category to menu:', error);

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
        message: 'Failed to add addon category to menu',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
