import { NextRequest, NextResponse } from 'next/server';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import balanceService from '@/lib/services/BalanceService';

async function handleGet(_req: NextRequest, context: AuthContext) {
  try {
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
      select: { merchantId: true },
    });

    if (!merchantUser) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
        { status: 404 }
      );
    }

    const usage = await balanceService.getUsageSummary(merchantUser.merchantId);

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
