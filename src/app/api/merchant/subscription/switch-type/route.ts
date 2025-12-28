/**
 * Subscription Type Switch API
 * POST /api/merchant/subscription/switch-type - Switch between Monthly and Deposit
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { z } from 'zod';

const switchSchema = z.object({
    newType: z.enum(['MONTHLY', 'DEPOSIT']),
});

async function handlePost(req: NextRequest, context: AuthContext) {
    try {
        const merchantId = context.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                { success: false, error: 'FORBIDDEN', message: 'Merchant access required' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const validation = switchSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { newType } = validation.data;

        // Get current subscription
        const subscription = await prisma.merchantSubscription.findUnique({
            where: { merchantId },
            include: {
                merchant: {
                    include: { merchantBalance: true }
                }
            }
        });

        if (!subscription) {
            return NextResponse.json(
                { success: false, error: 'NOT_FOUND', message: 'Subscription not found' },
                { status: 404 }
            );
        }

        // Check if switch is allowed
        const now = new Date();
        const canSwitch =
            subscription.status === 'SUSPENDED' ||
            (subscription.type === 'TRIAL' && subscription.trialEndsAt && subscription.trialEndsAt <= now) ||
            (subscription.type === 'MONTHLY' && subscription.currentPeriodEnd && subscription.currentPeriodEnd <= now);

        if (!canSwitch && subscription.type !== 'TRIAL') {
            // Check if current period is still active
            if (subscription.type === 'MONTHLY' && subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
                return NextResponse.json({
                    success: false,
                    error: 'PERIOD_ACTIVE',
                    message: `You can switch after your current subscription ends on ${subscription.currentPeriodEnd.toLocaleDateString()}`,
                }, { status: 400 });
            }
        }

        // If switching from DEPOSIT to MONTHLY, balance is preserved
        // If switching from MONTHLY to DEPOSIT, need to top up (handled in top-up flow)

        // Update subscription type
        await prisma.merchantSubscription.update({
            where: { merchantId },
            data: {
                type: newType,
                // Reset dates based on new type
                currentPeriodStart: newType === 'MONTHLY' ? null : now,
                currentPeriodEnd: null,
                // Keep status as is or activate if was trial
                status: subscription.type === 'TRIAL' ? 'ACTIVE' : subscription.status,
            }
        });

        // If switching to DEPOSIT, ensure balance record exists
        if (newType === 'DEPOSIT') {
            await prisma.merchantBalance.upsert({
                where: { merchantId },
                create: {
                    merchantId,
                    balance: 0,
                },
                update: {} // No changes if exists
            });
        }

        return NextResponse.json({
            success: true,
            message: `Subscription type changed to ${newType}`,
            data: { newType }
        });

    } catch (error) {
        console.error('Error switching subscription type:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to switch subscription type' },
            { status: 500 }
        );
    }
}

export const POST = withMerchantOwner(handlePost);
