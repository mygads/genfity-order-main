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

        const result = await subscriptionHistoryService.getMerchantHistoryWithCurrency(
            BigInt(merchantId!),
            {
                limit: Math.min(limit, 100),
                offset,
                eventType: eventType as SubscriptionEventType | undefined,
            }
        );

        const historyItems = (result.history ?? []).map((item) => {
            const metadata = (item.metadata ?? {}) as Record<string, unknown>;
            const normalized: Record<string, unknown> = { ...metadata };

            const requestId = typeof normalized.requestId === 'string' ? normalized.requestId : null;
            const voucherCode = typeof normalized.voucherCode === 'string' ? normalized.voucherCode : null;
            const orderId = typeof normalized.orderId === 'string' ? normalized.orderId : null;

            if (typeof normalized.flowType !== 'string') {
                if (['PAYMENT_SUBMITTED', 'PAYMENT_CANCELLED', 'PAYMENT_RECEIVED', 'PAYMENT_REJECTED'].includes(item.eventType)) {
                    normalized.flowType = 'PAYMENT_VERIFICATION';
                } else if (item.eventType === 'ORDER_FEE_DEDUCTED') {
                    normalized.flowType = 'ORDER_FEE';
                } else if (item.eventType === 'BALANCE_TOPUP') {
                    normalized.flowType = 'BALANCE_ADJUSTMENT';
                } else if (item.eventType === 'PERIOD_EXTENDED') {
                    normalized.flowType = 'SUBSCRIPTION_ADJUSTMENT';
                }
            }

            if (typeof normalized.flowId !== 'string') {
                if (requestId) {
                    normalized.flowId = `payment-${requestId}`;
                } else if (voucherCode) {
                    normalized.flowId = `voucher-${voucherCode}`;
                } else if (orderId) {
                    normalized.flowId = `order-fee-${orderId}`;
                } else {
                    normalized.flowId = `history-${item.id.toString()}`;
                }
            }

            const previousPeriodEnd = item.previousPeriodEnd ? new Date(item.previousPeriodEnd) : null;
            const newPeriodEnd = item.newPeriodEnd ? new Date(item.newPeriodEnd) : null;

            const normalizedDaysDelta = typeof normalized.daysDelta === 'number'
                ? normalized.daysDelta
                : (typeof normalized.daysDelta === 'string' && normalized.daysDelta.trim() !== '' && Number.isFinite(Number(normalized.daysDelta))
                    ? Number(normalized.daysDelta)
                    : null);

            if (previousPeriodEnd && newPeriodEnd && normalizedDaysDelta === null) {
                const diffMs = newPeriodEnd.getTime() - previousPeriodEnd.getTime();
                normalized.daysDelta = Math.round(diffMs / (1000 * 60 * 60 * 24));
            } else if (normalizedDaysDelta !== null) {
                normalized.daysDelta = normalizedDaysDelta;
            }

            const daysDelta = typeof normalized.daysDelta === 'number' ? normalized.daysDelta : null;
            let periodFrom: Date | null = previousPeriodEnd;
            let periodTo: Date | null = newPeriodEnd;

            if (!periodFrom && periodTo && typeof daysDelta === 'number') {
                const derivedFrom = new Date(periodTo);
                derivedFrom.setDate(derivedFrom.getDate() - daysDelta);
                periodFrom = derivedFrom;
            }

            if (!periodTo && periodFrom && typeof daysDelta === 'number') {
                const derivedTo = new Date(periodFrom);
                derivedTo.setDate(derivedTo.getDate() + daysDelta);
                periodTo = derivedTo;
            }

            if (periodFrom && typeof normalized.periodFrom !== 'string') {
                normalized.periodFrom = periodFrom.toISOString();
            }

            if (periodTo && typeof normalized.periodTo !== 'string') {
                normalized.periodTo = periodTo.toISOString();
            }

            return {
                ...item,
                metadata: normalized,
            };
        });

        // Filter out ORDER_FEE_DEDUCTED events from subscription history
        // Order fees should only appear on the transactions page
        const filteredHistory = historyItems.filter(
            (item) => item.eventType !== 'ORDER_FEE_DEDUCTED'
        );

        const pagedHistory = filteredHistory.slice(0, Math.min(limit, 100));
        const filteredTotal = result.pagination.total - (historyItems.length - filteredHistory.length);

        return NextResponse.json({
            success: true,
            data: serializeBigInt({
                ...result,
                history: pagedHistory,
                pagination: {
                    ...result.pagination,
                    total: Math.max(filteredTotal, 0),
                    hasMore: offset + pagedHistory.length < filteredTotal,
                },
            }),
        });
    } catch (error) {
        console.error('Error fetching subscription history:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch subscription history' },
            { status: 500 }
        );
    }
});
