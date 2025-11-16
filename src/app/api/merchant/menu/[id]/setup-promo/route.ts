/**
 * Menu Setup Promo API
 * POST /api/merchant/menu/[id]/setup-promo - Setup promo for menu item
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import { withMerchant } from '@/lib/middleware/auth';
import { ValidationError, NotFoundError } from '@/lib/constants/errors';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * POST /api/merchant/menu/[id]/setup-promo
 * Setup promotional pricing for menu item
 */
async function handlePost(
  req: NextRequest,
  context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
) {
  try {
    const params = await contextParams.params;
    const menuId = BigInt(params?.id || '0');
    const body = await req.json();

    const menu = await menuService.setupMenuPromo(menuId, {
      isPromo: body.isPromo,
      promoPrice: body.promoPrice,
      promoStartDate: body.promoStartDate ? new Date(body.promoStartDate) : undefined,
      promoEndDate: body.promoEndDate ? new Date(body.promoEndDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(menu),
      message: body.isPromo ? 'Promo setup successfully' : 'Promo removed successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error setting up promo:', error);

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
        message: 'Failed to setup promo',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
