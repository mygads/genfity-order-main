/**
 * Merchant Addon Item API (by ID)
 * GET /api/merchant/addon-items/[id] - Get addon item details
 * PUT /api/merchant/addon-items/[id] - Update addon item
 * DELETE /api/merchant/addon-items/[id] - Delete addon item
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import menuRepository from '@/lib/repositories/MenuRepository';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { ValidationError, NotFoundError } from '@/lib/constants/errors';

/**
 * GET /api/merchant/addon-items/[id]
 * Get addon item details
 */
async function handleGet(
  req: NextRequest,
  _context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const itemId = BigInt(params?.id || '0');

    // Get addon item from repository
    const item = await menuRepository.findAddonItemById(itemId);

    if (!item) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: 'Addon item not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: item,
      message: 'Addon item retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting addon item:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to get addon item',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/merchant/addon-items/[id]
 * Update addon item
 */
async function handlePut(
  req: NextRequest,
  _context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const itemId = BigInt(params?.id || '0');
    const body = await req.json();

    // Update addon item
    const item = await menuService.updateAddonItem(itemId, {
      name: body.name,
      price: body.price,
      isAvailable: body.isAvailable,
      hasStock: body.hasStock,
      stockQuantity: body.stockQuantity,
    });

    return NextResponse.json({
      success: true,
      data: item,
      message: 'Addon item updated successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error updating addon item:', error);

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
        message: 'Failed to update addon item',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/merchant/addon-items/[id]
 * Delete addon item
 */
async function handleDelete(
  req: NextRequest,
  _context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const itemId = BigInt(params?.id || '0');

    // Delete addon item
    await menuService.deleteAddonItem(itemId);

    return NextResponse.json({
      success: true,
      message: 'Addon item deleted successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error deleting addon item:', error);

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
        message: 'Failed to delete addon item',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const PUT = withMerchant(handlePut);
export const DELETE = withMerchant(handleDelete);
