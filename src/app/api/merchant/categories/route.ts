/**
 * Merchant Menu Categories API
 * GET /api/merchant/categories - List all categories
 * POST /api/merchant/categories - Create new category
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import { withMerchant } from '@/lib/middleware/auth';
import { ValidationError } from '@/lib/constants/errors';

/**
 * GET /api/merchant/categories
 * Get all menu categories for merchant
 */
async function handleGet(req: NextRequest) {
  try {
    const merchantId = req.headers.get('x-merchant-id');
    
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Merchant ID not found',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    const categories = await menuService.getCategoriesByMerchant(BigInt(merchantId));

    return NextResponse.json({
      success: true,
      data: categories,
      message: 'Categories retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting categories:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve categories',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/merchant/categories
 * Create new menu category
 */
async function handlePost(req: NextRequest) {
  try {
    const merchantId = req.headers.get('x-merchant-id');
    
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Merchant ID not found',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    const category = await menuService.createCategory({
      merchantId: BigInt(merchantId),
      name: body.name,
      description: body.description,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Category created successfully',
      statusCode: 201,
    });
  } catch (error) {
    console.error('Error creating category:', error);

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

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to create category',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const POST = withMerchant(handlePost);
