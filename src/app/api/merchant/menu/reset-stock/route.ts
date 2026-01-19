/**
 * Daily Stock Reset API
 * POST /api/merchant/menu/reset-stock - Reset daily stock for all menus with autoResetStock enabled
 * 
 * This endpoint should be called by a CRON job daily (e.g., at midnight)
 * 
 * Example cron setup:
 * - Vercel Cron: https://vercel.com/docs/cron-jobs
 * - External CRON service calling this endpoint with merchant authentication
 */

import { NextRequest, NextResponse } from 'next/server';
import menuService from '@/lib/services/MenuService';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import prisma from '@/lib/db/client';

/**
 * POST /api/merchant/menu/reset-stock
 * Reset stock for all menu items with auto-reset enabled
 */
async function handlePost(req: NextRequest, context: AuthContext) {
  try {
    const merchantId = context.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_ID_REQUIRED',
          message: 'Merchant ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true },
    });

    if (!merchant) {
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

    // Reset stock for this merchant's menus
    const resetCount = await menuService.resetDailyStock(merchantId);

    return NextResponse.json({
      success: true,
      data: {
        resetCount,
        merchantId: merchantId.toString(),
        resetAt: new Date().toISOString(),
      },
      message: `Successfully reset stock for ${resetCount} menu items`,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error resetting stock:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to reset stock',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
