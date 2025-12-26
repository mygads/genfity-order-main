/**
 * Merchant Subscription API
 * GET /api/merchant/subscription - Get current subscription status
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import subscriptionService from '@/lib/services/SubscriptionService';

/**
 * GET /api/merchant/subscription
 * Get subscription status for current merchant
 */
async function handleGet(req: NextRequest, context: AuthContext) {
    try {
        // Get merchant from user's merchant_users relationship
        const merchantUser = await prisma.merchantUser.findFirst({
            where: { userId: context.userId },
            include: { merchant: true },
        });

        if (!merchantUser) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const status = await subscriptionService.getSubscriptionStatus(merchantUser.merchantId);

        if (!status) {
            return NextResponse.json(
                { success: false, error: 'NO_SUBSCRIPTION', message: 'No subscription found' },
                { status: 404 }
            );
        }

        // Get pricing for this merchant's currency
        const pricing = await subscriptionService.getPlanPricing(status.currency);

        return NextResponse.json({
            success: true,
            data: {
                subscription: {
                    type: status.type,
                    status: status.status,
                    isValid: status.isValid,
                    daysRemaining: status.daysRemaining,
                    trialEndsAt: status.trialEndsAt,
                    currentPeriodEnd: status.currentPeriodEnd,
                    suspendReason: status.suspendReason,
                },
                balance: status.type === 'DEPOSIT' ? {
                    amount: status.balance,
                    currency: status.currency,
                } : null,
                pricing: {
                    currency: status.currency,
                    depositMinimum: pricing.depositMinimum,
                    orderFee: pricing.orderFee,
                    monthlyPrice: pricing.monthlyPrice,
                },
            },
        });
    } catch (error) {
        console.error('Error getting subscription:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get subscription' },
            { status: 500 }
        );
    }
}

export const GET = withMerchantOwner(handleGet);
