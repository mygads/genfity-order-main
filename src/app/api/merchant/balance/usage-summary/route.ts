import { NextRequest, NextResponse } from 'next/server';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import balanceService from '@/lib/services/BalanceService';

async function handleGet(_req: NextRequest, context: AuthContext) {
  try {
    const merchantId = context.merchantId;
    if (!merchantId) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_ID_REQUIRED', message: 'Merchant ID is required' },
        { status: 400 }
      );
    }

    const usage = await balanceService.getUsageSummary(merchantId);

    return NextResponse.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    console.error('[GET /api/merchant/balance/usage-summary] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to get usage summary',
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchantOwner(handleGet);
