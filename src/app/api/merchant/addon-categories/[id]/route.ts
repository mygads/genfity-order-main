/**
 * Merchant Addon Category API (by ID)
 * GET /api/merchant/addon-categories/[id] - Get addon category details
 * PUT /api/merchant/addon-categories/[id] - Update addon category
 * DELETE /api/merchant/addon-categories/[id] - Delete addon category
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import menuRepository from '@/lib/repositories/MenuRepository';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { ValidationError, NotFoundError } from '@/lib/constants/errors';

/**
 * GET /api/merchant/addon-categories/[id]
 * Get addon category details with items
 */
async function handleGet(
  req: NextRequest,
  _context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const categoryId = BigInt(params?.id || '0');

    // Get addon category with items from repository
    const category = await menuRepository.findAddonCategoryById(categoryId);

    if (!category) {
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

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Addon category retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting addon category:', error);

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
  _context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const categoryId = BigInt(params?.id || '0');
    const body = await req.json();

    // Update addon category
    const category = await menuService.updateAddonCategory(categoryId, {
      name: body.name,
      description: body.description,
      minSelection: body.minSelection,
      maxSelection: body.maxSelection,
    });

    return NextResponse.json({
      success: true,
      data: category,
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
        message: 'Failed to update addon category',
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
  _context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const categoryId = BigInt(params?.id || '0');

    // Delete addon category
    await menuService.deleteAddonCategory(categoryId);

    return NextResponse.json({
      success: true,
      message: 'Addon category deleted successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error deleting addon category:', error);

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
        message: 'Failed to delete addon category',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const PUT = withMerchant(handlePut);
export const DELETE = withMerchant(handleDelete);
