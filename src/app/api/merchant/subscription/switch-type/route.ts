/**
 * Subscription Type Switch API
 * POST /api/merchant/subscription/switch-type - Switch between Monthly and Deposit
 * 
 * Updated to use SubscriptionAutoSwitchService with proper validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import subscriptionAutoSwitchService from '@/lib/services/SubscriptionAutoSwitchService';
import { serializeBigInt } from '@/lib/utils/serializer';
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

        const switchInfo = await subscriptionAutoSwitchService.canManualSwitch(merchantId);
        if (newType === switchInfo.currentType) {
            return NextResponse.json(
                { success: false, error: 'SWITCH_NOT_ALLOWED', message: `Already on ${newType} mode` },
                { status: 400 }
            );
        }

        const canSwitch = newType === 'MONTHLY'
            ? switchInfo.canSwitchToMonthly
            : switchInfo.canSwitchToDeposit;

        if (!canSwitch) {
            const message = newType === 'MONTHLY'
                ? 'Monthly subscription is not active. Please renew first.'
                : 'Deposit balance is empty. Please top up first.';
            return NextResponse.json(
                { success: false, error: 'SWITCH_NOT_ALLOWED', message },
                { status: 400 }
            );
        }

        // Perform the switch
        const result = await subscriptionAutoSwitchService.manualSwitch(merchantId, newType);

        return NextResponse.json({
            success: true,
            message: `Successfully switched to ${newType} mode`,
            data: serializeBigInt(result),
        });

    } catch (error) {
        console.error('Error switching subscription type:', error);
        if (error instanceof Error) {
            const message = error.message;
            if (
                message.includes('Monthly subscription is not active') ||
                message.includes('Deposit balance is empty') ||
                message.includes('Already on')
            ) {
                return NextResponse.json(
                    { success: false, error: 'SWITCH_NOT_ALLOWED', message },
                    { status: 400 }
                );
            }
        }
        return NextResponse.json(
            { 
                success: false, 
                error: 'INTERNAL_ERROR', 
                message: error instanceof Error ? error.message : 'Failed to switch subscription type' 
            },
            { status: 500 }
        );
    }
}

export const POST = withMerchantOwner(handlePost);
