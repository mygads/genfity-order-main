/**
 * Merchant Addon Category API (by ID)
 * GET /api/merchant/addon-categories/[id] - Get addon category details
 * PUT /api/merchant/addon-categories/[id] - Update addon category
 * DELETE /api/merchant/addon-categories/[id] - Delete addon category
 * PATCH /api/merchant/addon-categories/[id]/toggle-active - Toggle active status
 */

import { NextRequest, NextResponse } from 'next/server';
import addonService from '@/lib/services/AddonService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { ValidationError } from '@/lib/constants/errors';
import { serializeBigInt } from '@/lib/utils/serializer';
import prisma from '@/lib/db/client';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * GET /api/merchant/addon-categories/[id]
 * Get addon category details with items
 */
async function handleGet(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
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

    const categoryIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }
    const categoryId = categoryIdResult.value;

    const category = await addonService.getAddonCategoryById(
      categoryId,
      merchantUser.merchantId
    );

    return NextResponse.json({
      success: true,
      data: serializeBigInt(category),
      message: 'Addon category retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting addon category:', error);

    if (
      error instanceof Error &&
      error.message === 'Addon category not found'
    ) {
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
        message: 'Failed to get addon category',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/merchant/addon-categories/[id]
 * Update addon category
 */
async function handlePut(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
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

    const categoryIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }
    const categoryId = categoryIdResult.value;
    const body = await req.json();

    const category = await addonService.updateAddonCategory(
      categoryId,
      merchantUser.merchantId,
      {
        name: body.name,
        description: body.description,
        minSelection: body.minSelection,
        maxSelection: body.maxSelection,
        isActive: body.isActive,
      }
    );

    return NextResponse.json({
      success: true,
      data: serializeBigInt(category),
      message: 'Addon category updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating addon category:', error);

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

    if (
      error instanceof Error &&
      error.message === 'Addon category not found'
    ) {
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
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update addon category',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/merchant/addon-categories/[id]
 * Delete addon category
 */
async function handleDelete(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
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

    const categoryIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!categoryIdResult.ok) {
      return NextResponse.json(categoryIdResult.body, { status: categoryIdResult.status });
    }
    const categoryId = categoryIdResult.value;

    await addonService.deleteAddonCategory(categoryId, merchantUser.merchantId);

    return NextResponse.json({
      success: true,
      message: 'Addon category deleted successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error deleting addon category:', error);

    if (error instanceof Error) {
      if (error.message.includes('not found')) {
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

      if (error.message.includes('assigned to menu')) {
        return NextResponse.json(
          {
            success: false,
            error: 'CONFLICT',
            message: error.message,
            statusCode: 409,
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to delete addon category',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const PUT = withMerchant(handlePut);
export const DELETE = withMerchant(handleDelete);
