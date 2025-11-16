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

    // Reset stock for this merchant's menus
    const resetCount = await menuService.resetDailyStock(merchantUser.merchantId);

    return NextResponse.json({
      success: true,
      data: {
        resetCount,
        merchantId: merchantUser.merchantId.toString(),
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

/**
 * Alternative: Reset stock for ALL merchants (admin-only)
 * This would be used by a system-wide cron job
 */
export async function POST_ALL_MERCHANTS(req: NextRequest) {
  try {
    // Verify CRON_SECRET to prevent unauthorized access
    const cronSecret = req.headers.get('authorization');
    if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Invalid CRON secret',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    // Reset stock for all merchants
    const totalResetCount = await menuService.resetDailyStock();

    return NextResponse.json({
      success: true,
      data: {
        resetCount: totalResetCount,
        resetAt: new Date().toISOString(),
      },
      message: `Successfully reset stock for ${totalResetCount} menu items across all merchants`,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error resetting stock (all merchants):', error);

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
