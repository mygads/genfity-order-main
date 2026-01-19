/**
 * GET /api/merchant/addon-categories/[id]/items
 * Get all addon items for a specific category
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import addonRepository from '@/lib/repositories/AddonRepository';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

async function handleGet(
  request: NextRequest,
  context: AuthContext,
  routeContext: RouteContext
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

    const categoryIdResult = await requireBigIntRouteParam(routeContext, 'id');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }
    const categoryId = categoryIdResult.value;

    // Verify category belongs to merchant
    const category = await addonRepository.getAddonCategoryById(
      categoryId,
      merchantId
    );
    
    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: 'CATEGORY_NOT_FOUND',
          message: 'Addon category not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Get all items for this category
    const items = await addonRepository.getAddonItems(
      categoryId,
      merchantId
    );

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
        message: 'An error occurred while retrieving addon items',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
