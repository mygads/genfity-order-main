/**
 * Merchant Addon Categories API
 * GET /api/merchant/addon-categories - List all addon categories
 * POST /api/merchant/addon-categories - Create new addon category
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { ValidationError } from '@/lib/constants/errors';

/**
 * GET /api/merchant/addon-categories
 * Get all addon categories for merchant
 */
async function handleGet(
  req: NextRequest,
  _context: AuthContext,
  _routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    // Get merchant ID from merchant_users table via context
    // For now, we'll get from query param or use first merchant
    const { searchParams } = new URL(req.url);
    const merchantIdParam = searchParams.get('merchantId');

    if (!merchantIdParam) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Merchant ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const merchantId = BigInt(merchantIdParam);

    // Get addon categories
    const addonCategories = await menuService.getAddonCategoriesByMerchant(merchantId);

    return NextResponse.json({
      success: true,
      data: addonCategories,
      message: 'Addon categories retrieved successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting addon categories:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to get addon categories',
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
  _context: AuthContext,
  _routeContext: { params: Promise<Record<string, string>> }
) {
  try {
    const body = await req.json();

    // Validate required fields
    if (!body.merchantId || !body.name) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Merchant ID and name are required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Create addon category
    const addonCategory = await menuService.createAddonCategory({
      merchantId: BigInt(body.merchantId),
      name: body.name,
      description: body.description,
      minSelection: body.minSelection || 0,
      maxSelection: body.maxSelection,
    });

    return NextResponse.json({
      success: true,
      data: addonCategory,
      message: 'Addon category created successfully',
      statusCode: 201,
    });
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
        message: 'Failed to create addon category',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const POST = withMerchant(handlePost);
