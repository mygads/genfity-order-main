/**
 * Menu Toggle Active Status API
 * PATCH /api/merchant/menu/[id]/toggle-active - Toggle menu active status
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import { withMerchant } from '@/lib/middleware/auth';
import { NotFoundError } from '@/lib/constants/errors';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * PATCH /api/merchant/menu/[id]/toggle-active
 * Toggle menu item active status
 */
async function handlePatch(
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

    const menu = await menuService.toggleMenuActive(menuId);

    return NextResponse.json({
      success: true,
      data: serializeBigInt(menu),
      message: `Menu ${menu.isActive ? 'activated' : 'deactivated'} successfully`,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error toggling menu active status:', error);

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
        message: 'Failed to toggle menu status',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const PATCH = withMerchant(handlePatch);
