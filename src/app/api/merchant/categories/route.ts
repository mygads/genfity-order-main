/**
 * Merchant Menu Categories API
 * GET /api/merchant/categories - List all categories
 * POST /api/merchant/categories - Create new category
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { ValidationError } from '@/lib/constants/errors';
import { serializeBigInt } from '@/lib/utils/serializer';
import prisma from '@/lib/db/client';

/**
 * GET /api/merchant/categories
 * Get all menu categories for merchant
 */
async function handleGet(req: NextRequest, authContext: AuthContext) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: authContext.userId },
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

    // Get categories with menu count
    const categories = await prisma.menuCategory.findMany({
      where: { merchantId: merchantUser.merchantId },
      include: {
        _count: {
          select: { menus: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(categories),
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
async function handlePost(req: NextRequest, authContext: AuthContext) {
  try {
    // Get merchant from user's merchant_users relationship
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: authContext.userId },
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

    const body = await req.json();

    const category = await menuService.createCategory({
      merchantId: merchantUser.merchantId,
      name: body.name,
      description: body.description,
      sortOrder: body.sortOrder,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(category),
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
