/**
 * Toggle Category Active Status API
 * PATCH /api/merchant/categories/[id]/toggle-active
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * PATCH /api/merchant/categories/[id]/toggle-active
 * Toggle category active status
 */
async function handlePatch(
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

    // Get current category
    const category = await prisma.menuCategory.findUnique({
      where: { id: categoryId },
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

    // Verify category belongs to merchant
    if (category.merchantId !== merchantUser.merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'FORBIDDEN',
          message: 'Category does not belong to this merchant',
          statusCode: 403,
        },
        { status: 403 }
      );
    }

    // Toggle active status
    const updatedCategory = await prisma.menuCategory.update({
      where: { id: categoryId },
      data: { isActive: !category.isActive },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updatedCategory),
      message: 'Category status updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error toggling category status:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to toggle category status',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const PATCH = withMerchant(handlePatch);
