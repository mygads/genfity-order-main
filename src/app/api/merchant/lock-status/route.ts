/**
 * Merchant Lock Status API
 * GET /api/merchant/lock-status - Get current merchant lock status & reason
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import subscriptionService from '@/lib/services/SubscriptionService';

export type MerchantLockReason = 'NONE' | 'INACTIVE' | 'SUBSCRIPTION_SUSPENDED';

async function handleGet(_req: NextRequest, authContext: AuthContext) {
  try {
    const merchantId = authContext.merchantId;
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
      select: {
        id: true,
        code: true,
        isActive: true,
      },
    });

    if (!merchant) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const status = await subscriptionService.getSubscriptionStatus(merchantId);

    const subscription = status
      ? {
          type: status.type,
          status: status.status,
          isValid: status.isValid,
          daysRemaining: status.daysRemaining,
          suspendReason: status.suspendReason,
        }
      : {
          type: 'NONE' as const,
          status: 'SUSPENDED' as const,
          isValid: false,
          daysRemaining: 0,
          suspendReason: 'No active subscription',
        };

    const isSubscriptionSuspended = subscription.status === 'SUSPENDED' || subscription.isValid === false;

    const reason: MerchantLockReason = merchant.isActive === false
      ? 'INACTIVE'
      : isSubscriptionSuspended
        ? 'SUBSCRIPTION_SUSPENDED'
        : 'NONE';

    return NextResponse.json({
      success: true,
      data: {
        isLocked: reason !== 'NONE',
        reason,
        merchant: {
          id: merchant.id.toString(),
          code: merchant.code,
          isActive: merchant.isActive,
        },
        subscription,
      },
      statusCode: 200,
    });
  } catch (error) {
    console.error('Error getting merchant lock status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to get merchant lock status',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
