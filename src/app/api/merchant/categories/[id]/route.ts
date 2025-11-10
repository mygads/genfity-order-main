/**
 * Merchant Single Menu Category API
 * PUT /api/merchant/categories/[id] - Update category
 * DELETE /api/merchant/categories/[id] - Delete category
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import { withMerchant } from '@/lib/middleware/auth';
import { ValidationError, NotFoundError } from '@/lib/constants/errors';
import type { AuthContext } from '@/lib/types/auth';

/**
 * PUT /api/merchant/categories/[id]
 * Update menu category
 */
async function handlePut(
  req: NextRequest,
  context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const categoryId = BigInt(params?.id || '0');
    const body = await req.json();

    const category = await menuService.updateCategory(categoryId, {
      name: body.name,
      description: body.description,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating category:', error);

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
        message: 'Failed to update category',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/merchant/categories/[id]
 * Delete menu category
 */
async function handleDelete(
  req: NextRequest,
  context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const categoryId = BigInt(params?.id || '0');

    await menuService.deleteCategory(categoryId);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error deleting category:', error);

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
        message: 'Failed to delete category',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const PUT = withMerchant(handlePut);
export const DELETE = withMerchant(handleDelete);
