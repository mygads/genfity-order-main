/**
 * Merchant Subscription API
 * GET /api/merchant/subscription - Get current subscription status
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import subscriptionService from '@/lib/services/SubscriptionService';
import subscriptionAutoSwitchService from '@/lib/services/SubscriptionAutoSwitchService';

/**
 * GET /api/merchant/subscription
 * Get subscription status for current merchant
 * Also triggers auto-switch check on each access
 */
async function handleGet(req: NextRequest, context: AuthContext) {
    try {
        const merchantId = context.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_ID_REQUIRED', message: 'Merchant ID is required' },
                { status: 400 }
            );
        }

        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true, currency: true },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        // Auto-check and switch subscription if needed
        // This runs every time merchant user accesses the dashboard
        try {
            const switchResult = await subscriptionAutoSwitchService.checkAndAutoSwitch(merchantId);
            if (switchResult.action !== 'NO_CHANGE') {
                console.log(`📋 Dashboard access triggered subscription auto-switch:`, {
                    merchant: switchResult.merchantCode,
                    action: switchResult.action,
                    reason: switchResult.reason,
                    storeOpened: switchResult.storeOpened,
                });
            }
        } catch (switchError) {
            console.error('Auto-switch check failed:', switchError);
            // Don't fail the request if auto-switch fails
        }

        const status = await subscriptionService.getSubscriptionStatus(merchantId);

        // If no subscription found, return a "no subscription" status (not an error)
        // This allows the frontend to show appropriate warning without breaking
        if (!status) {
            const merchantCurrency = merchant.currency || 'IDR';
            const pricing = await subscriptionService.getPlanPricing(merchantCurrency);
            
            return NextResponse.json({
                success: true,
                data: {
                    subscription: {
                        type: 'NONE' as const,
                        status: 'SUSPENDED',
                        isValid: false,
                        daysRemaining: 0,
                        trialEndsAt: null,
                        currentPeriodEnd: null,
                        suspendReason: 'No active subscription',
                    },
                    balance: null,
                    pricing: {
                        currency: merchantCurrency,
                        depositMinimum: pricing.depositMinimum,
                        orderFee: pricing.orderFee,
                        monthlyPrice: pricing.monthlyPrice,
                    },
                },
            });
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

// Allow both MERCHANT_OWNER and MERCHANT_STAFF to view subscription status
export const GET = withMerchant(handleGet);
