/**
 * Merchant Addon Item Toggle Active API
 * PATCH /api/merchant/addon-items/[id]/toggle-active - Toggle active status
 */

import { NextRequest, NextResponse } from 'next/server';
import addonService from '@/lib/services/AddonService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import prisma from '@/lib/db/client';

/**
 * PATCH /api/merchant/addon-items/[id]/toggle-active
 * Toggle addon item active status
 */
async function handlePatch(
  req: NextRequest,
  context: AuthContext,
  contextParams: { params: Promise<Record<string, string>> }
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

    const params = await contextParams.params;
    const itemId = BigInt(params?.id || '0');

    const item = await addonService.toggleAddonItemActive(
      itemId,
      merchantUser.merchantId
    );

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
      data: serializeBigInt(item),
      message: `Addon item ${item.isActive ? 'activated' : 'deactivated'} successfully`,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error toggling addon item status:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to toggle addon item status',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const PATCH = withMerchant(handlePatch);
