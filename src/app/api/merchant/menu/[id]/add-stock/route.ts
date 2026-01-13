/**
 * Menu Add Stock API
 * POST /api/merchant/menu/[id]/add-stock - Add stock to menu item
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import { withMerchant } from '@/lib/middleware/auth';
import { ValidationError, NotFoundError } from '@/lib/constants/errors';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * POST /api/merchant/menu/[id]/add-stock
 * Add stock quantity to menu item
 */
async function handlePost(
  req: NextRequest,
  context: AuthContext,
  contextParams: RouteContext
) {
  try {
    const menuIdResult = await requireBigIntRouteParam(contextParams, 'id');
    if (!menuIdResult.ok) {
      return NextResponse.json(menuIdResult.body, { status: menuIdResult.status });
    }
    const menuId = menuIdResult.value;
    const body = await req.json();

    if (!body.quantity || body.quantity <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Quantity must be greater than 0',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const menu = await menuService.addMenuStock(menuId, parseInt(body.quantity));

    return NextResponse.json({
      success: true,
      data: serializeBigInt(menu),
      message: `Added ${body.quantity} stock successfully`,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error adding menu stock:', error);

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
        message: 'Failed to add stock',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
