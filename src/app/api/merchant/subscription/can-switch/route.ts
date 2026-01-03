/**
 * Check Manual Switch Availability API
 * GET /api/merchant/subscription/can-switch - Check if merchant can manually switch subscription types
 * 
 * Returns whether the merchant has both DEPOSIT and MONTHLY options available,
 * which determines if the switch button should be shown in the UI.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import subscriptionAutoSwitchService from '@/lib/services/SubscriptionAutoSwitchService';

async function handleGet(req: NextRequest, context: AuthContext) {
    try {
        const merchantId = context.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                { success: false, error: 'FORBIDDEN', message: 'Merchant access required' },
                { status: 403 }
            );
        }

        const result = await subscriptionAutoSwitchService.canManualSwitch(merchantId);

        return NextResponse.json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('Error checking subscription switch availability:', error);
        return NextResponse.json(
            { 
                success: false, 
                error: 'INTERNAL_ERROR', 
                message: error instanceof Error ? error.message : 'Failed to check switch availability' 
            },
            { status: 500 }
        );
    }
}

export const GET = withMerchant(handleGet);
