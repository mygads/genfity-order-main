/**
 * Merchant Subscription History API
 * GET /api/merchant/subscription/history
 * Access: MERCHANT_OWNER, MERCHANT_STAFF
 */

import { NextResponse } from 'next/server';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import subscriptionHistoryService from '@/lib/services/SubscriptionHistoryService';
import { serializeBigInt } from '@/lib/utils/serializer';
import type { SubscriptionEventType } from '@prisma/client';

export const GET = withMerchant(async (
    request: Request,
    authContext: AuthContext
) => {
    try {
        const { merchantId } = authContext;
        const { searchParams } = new URL(request.url);
        
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = parseInt(searchParams.get('offset') || '0');
        const eventType = searchParams.get('eventType') || undefined;

        const result = await subscriptionHistoryService.getMerchantHistory(
            BigInt(merchantId!),
            {
                limit: Math.min(limit, 100),
                offset,
                eventType: eventType as SubscriptionEventType | undefined,
            }
        );

        return NextResponse.json({
            success: true,
            data: serializeBigInt(result),
        });
    } catch (error) {
        console.error('Error fetching subscription history:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch subscription history' },
            { status: 500 }
        );
    }
});
