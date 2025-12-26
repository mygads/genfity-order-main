/**
 * Merchant Subscription Management API (Super Admin)
 * GET /api/admin/merchants/[id]/subscription - Get subscription
 * PUT /api/admin/merchants/[id]/subscription - Update subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import subscriptionService from '@/lib/services/SubscriptionService';
import subscriptionRepository from '@/lib/repositories/SubscriptionRepository';
import { z } from 'zod';

const updateSubscriptionSchema = z.object({
    type: z.enum(['TRIAL', 'DEPOSIT', 'MONTHLY']).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
    extendDays: z.number().min(1).max(365).optional(),
    suspendReason: z.string().max(500).optional(),
});

async function handleGet(
    req: NextRequest,
    context: AuthContext,
    routeContext: { params: Promise<Record<string, string>> }
) {
    try {
        const { id } = await routeContext.params;
        const merchantId = BigInt(id);

        const status = await subscriptionService.getSubscriptionStatus(merchantId);

        if (!status) {
            return NextResponse.json(
                { success: false, error: 'NOT_FOUND', message: 'Subscription not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: status,
        });
    } catch (error) {
        console.error('Error getting subscription:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get subscription' },
            { status: 500 }
        );
    }
}

async function handlePut(
    req: NextRequest,
    context: AuthContext,
    routeContext: { params: Promise<Record<string, string>> }
) {
    try {
        const { id } = await routeContext.params;
        const merchantId = BigInt(id);

        const body = await req.json();
        const validation = updateSubscriptionSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { status, extendDays, suspendReason } = validation.data;

        // Handle extend trial via repository directly
        if (extendDays) {
            const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);
            if (subscription && subscription.trialEndsAt) {
                const newTrialEnd = new Date(subscription.trialEndsAt);
                newTrialEnd.setDate(newTrialEnd.getDate() + extendDays);
                await subscriptionRepository.updateMerchantSubscription(merchantId, {
                    trialEndsAt: newTrialEnd,
                });
            }
        }

        if (status === 'SUSPENDED' && suspendReason) {
            await subscriptionRepository.suspendSubscription(merchantId, suspendReason);
        } else if (status === 'ACTIVE') {
            await subscriptionRepository.reactivateSubscription(merchantId);
        }

        const updatedStatus = await subscriptionService.getSubscriptionStatus(merchantId);

        return NextResponse.json({
            success: true,
            message: 'Subscription updated successfully',
            data: updatedStatus,
        });
    } catch (error: unknown) {
        console.error('Error updating subscription:', error);

        if (error instanceof Error && error.message.includes('not found')) {
            return NextResponse.json(
                { success: false, error: 'NOT_FOUND', message: error.message },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to update subscription' },
            { status: 500 }
        );
    }
}

export const GET = withSuperAdmin(handleGet);
export const PUT = withSuperAdmin(handlePut);
