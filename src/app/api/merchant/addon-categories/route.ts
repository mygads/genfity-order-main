/**
 * Merchant Addon Categories API
 * GET /api/merchant/addon-categories - List all addon categories
 * POST /api/merchant/addon-categories - Create new addon category
 */

import { NextRequest, NextResponse } from 'next/server';
import addonService from '@/lib/services/AddonService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { ValidationError } from '@/lib/constants/errors';
import { serializeBigInt } from '@/lib/utils/serializer';
import prisma from '@/lib/db/client';

/**
 * GET /api/merchant/addon-categories
 * Get all addon categories for merchant
 */
async function handleGet(
  req: NextRequest,
  context: AuthContext,
  _routeContext: { params: Promise<Record<string, string>> }
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

    const categories = await addonService.getAddonCategories(
      merchantUser.merchantId
    );

    return NextResponse.json({
      success: true,
      data: serializeBigInt(categories),
      message: 'Addon categories retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting addon categories:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve addon categories',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/merchant/addon-categories
 * Create new addon category
 */
async function handlePost(
  req: NextRequest,
  context: AuthContext,
  _routeContext: { params: Promise<Record<string, string>> }
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

    const body = await req.json();

    // Validation
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Category name is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const category = await addonService.createAddonCategory(
      merchantUser.merchantId,
      {
        name: body.name,
        description: body.description,
        minSelection: body.minSelection,
        maxSelection: body.maxSelection,
      }
    );

    return NextResponse.json(
      {
        success: true,
        data: serializeBigInt(category),
        message: 'Addon category created successfully',
        statusCode: 201,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating addon category:', error);

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
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create addon category',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const POST = withMerchant(handlePost);
