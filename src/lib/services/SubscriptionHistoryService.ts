/**
 * Subscription History Service
 * Records all subscription-related events for audit trail
 */

import prisma from '@/lib/db/client';
import type { SubscriptionEventType } from '@prisma/client';

export interface SubscriptionHistoryInput {
    merchantId: bigint;
    eventType: SubscriptionEventType;
    previousType?: string | null;
    previousStatus?: string | null;
    previousBalance?: number | null;
    previousPeriodEnd?: Date | null;
    newType?: string | null;
    newStatus?: string | null;
    newBalance?: number | null;
    newPeriodEnd?: Date | null;
    reason?: string | null;
    metadata?: Record<string, unknown>;
    triggeredBy: 'SYSTEM' | 'ADMIN' | 'MERCHANT';
    triggeredByUserId?: bigint | null;
}

class SubscriptionHistoryService {
    /**
     * Record a subscription event
     */
    async recordEvent(input: SubscriptionHistoryInput) {
        return prisma.subscriptionHistory.create({
            data: {
                merchantId: input.merchantId,
                eventType: input.eventType,
                previousType: input.previousType,
                previousStatus: input.previousStatus,
                previousBalance: input.previousBalance,
                previousPeriodEnd: input.previousPeriodEnd,
                newType: input.newType,
                newStatus: input.newStatus,
                newBalance: input.newBalance,
                newPeriodEnd: input.newPeriodEnd,
                reason: input.reason,
                metadata: input.metadata as object,
                triggeredBy: input.triggeredBy,
                triggeredByUserId: input.triggeredByUserId,
            },
        });
    }

    /**
     * Record auto-switch event
     */
    async recordAutoSwitch(
        merchantId: bigint,
        previousType: string,
        previousStatus: string,
        newType: string,
        newStatus: string,
        reason: string,
        balance?: number,
        periodEnd?: Date | null
    ) {
        return this.recordEvent({
            merchantId,
            eventType: 'AUTO_SWITCHED',
            previousType,
            previousStatus,
            newType,
            newStatus,
            newBalance: balance,
            newPeriodEnd: periodEnd,
            reason,
            triggeredBy: 'SYSTEM',
        });
    }

    /**
     * Record suspension event
     */
    async recordSuspension(
        merchantId: bigint,
        previousType: string,
        reason: string,
        balance?: number
    ) {
        return this.recordEvent({
            merchantId,
            eventType: 'SUSPENDED',
            previousType,
            previousStatus: 'ACTIVE',
            newType: previousType,
            newStatus: 'SUSPENDED',
            newBalance: balance,
            reason,
            triggeredBy: 'SYSTEM',
        });
    }

    /**
     * Record reactivation event
     */
    async recordReactivation(
        merchantId: bigint,
        previousType: string,
        newType: string,
        reason: string,
        balance?: number,
        periodEnd?: Date | null
    ) {
        return this.recordEvent({
            merchantId,
            eventType: 'REACTIVATED',
            previousType,
            previousStatus: 'SUSPENDED',
            newType,
            newStatus: 'ACTIVE',
            newBalance: balance,
            newPeriodEnd: periodEnd,
            reason,
            triggeredBy: 'SYSTEM',
        });
    }

    /**
     * Record payment verified event
     */
    async recordPaymentReceived(
        merchantId: bigint,
        paymentType: 'DEPOSIT_TOPUP' | 'MONTHLY_SUBSCRIPTION',
        amount: number,
        balance: number,
        periodEnd?: Date | null,
        adminUserId?: bigint
    ) {
        return this.recordEvent({
            merchantId,
            eventType: 'PAYMENT_RECEIVED',
            newBalance: balance,
            newPeriodEnd: periodEnd,
            reason: `Payment of ${amount} verified for ${paymentType === 'DEPOSIT_TOPUP' ? 'deposit top-up' : 'monthly subscription'}`,
            metadata: { paymentType, amount },
            triggeredBy: 'ADMIN',
            triggeredByUserId: adminUserId,
        });
    }

    /**
     * Record payment rejected event
     */
    async recordPaymentRejected(
        merchantId: bigint,
        paymentType: 'DEPOSIT_TOPUP' | 'MONTHLY_SUBSCRIPTION',
        amount: number,
        reason: string,
        adminUserId: bigint
    ) {
        return this.recordEvent({
            merchantId,
            eventType: 'PAYMENT_REJECTED',
            reason: `Payment of ${amount} rejected: ${reason}`,
            metadata: { paymentType, amount, rejectionReason: reason },
            triggeredBy: 'ADMIN',
            triggeredByUserId: adminUserId,
        });
    }

    /**
     * Record trial expired event
     */
    async recordTrialExpired(merchantId: bigint, reason: string) {
        return this.recordEvent({
            merchantId,
            eventType: 'TRIAL_EXPIRED',
            previousType: 'TRIAL',
            previousStatus: 'ACTIVE',
            reason,
            triggeredBy: 'SYSTEM',
        });
    }

    /**
     * Record order fee deduction
     */
    async recordOrderFeeDeducted(
        merchantId: bigint,
        orderId: bigint,
        fee: number,
        balanceBefore: number,
        balanceAfter: number
    ) {
        return this.recordEvent({
            merchantId,
            eventType: 'ORDER_FEE_DEDUCTED',
            previousBalance: balanceBefore,
            newBalance: balanceAfter,
            reason: `Order fee of ${fee} deducted for order #${orderId}`,
            metadata: { orderId: orderId.toString(), fee },
            triggeredBy: 'SYSTEM',
        });
    }

    /**
     * Get subscription history for a merchant
     */
    async getMerchantHistory(
        merchantId: bigint,
        options: { limit?: number; offset?: number; eventType?: SubscriptionEventType } = {}
    ) {
        const { limit = 50, offset = 0, eventType } = options;

        const where = {
            merchantId,
            ...(eventType && { eventType }),
        };

        const [history, total] = await Promise.all([
            prisma.subscriptionHistory.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.subscriptionHistory.count({ where }),
        ]);

        return {
            history,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + history.length < total,
            },
        };
    }

    /**
     * Get all subscription events for analytics (super admin)
     */
    async getAnalyticsData(options: {
        startDate?: Date;
        endDate?: Date;
        eventTypes?: SubscriptionEventType[];
        limit?: number;
        offset?: number;
    } = {}) {
        const { startDate, endDate, eventTypes, limit = 100, offset = 0 } = options;

        const where: Record<string, unknown> = {};

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                (where.createdAt as Record<string, Date>).gte = startDate;
            }
            if (endDate) {
                (where.createdAt as Record<string, Date>).lte = endDate;
            }
        }

        if (eventTypes && eventTypes.length > 0) {
            where.eventType = { in: eventTypes };
        }

        const [events, total] = await Promise.all([
            prisma.subscriptionHistory.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.subscriptionHistory.count({ where }),
        ]);

        return {
            events,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + events.length < total,
            },
        };
    }

    /**
     * Get subscription event counts grouped by type
     */
    async getEventCounts(options: { startDate?: Date; endDate?: Date } = {}) {
        const { startDate, endDate } = options;

        const where: Record<string, unknown> = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                (where.createdAt as Record<string, Date>).gte = startDate;
            }
            if (endDate) {
                (where.createdAt as Record<string, Date>).lte = endDate;
            }
        }

        const counts = await prisma.subscriptionHistory.groupBy({
            by: ['eventType'],
            where,
            _count: { id: true },
        });

        return counts.reduce((acc, item) => {
            acc[item.eventType] = item._count.id;
            return acc;
        }, {} as Record<string, number>);
    }

    /**
     * Get daily event counts for charting
     */
    async getDailyEventCounts(options: {
        startDate: Date;
        endDate: Date;
        eventTypes?: SubscriptionEventType[];
    }) {
        const { startDate, endDate, eventTypes } = options;

        const where: Record<string, unknown> = {
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
        };

        if (eventTypes && eventTypes.length > 0) {
            where.eventType = { in: eventTypes };
        }

        // Get raw data and aggregate in JS since Prisma doesn't support date grouping well
        const events = await prisma.subscriptionHistory.findMany({
            where,
            select: {
                eventType: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        // Group by date and event type
        const dailyCounts: Record<string, Record<string, number>> = {};
        
        for (const event of events) {
            const dateKey = event.createdAt.toISOString().split('T')[0];
            if (!dailyCounts[dateKey]) {
                dailyCounts[dateKey] = {};
            }
            if (!dailyCounts[dateKey][event.eventType]) {
                dailyCounts[dateKey][event.eventType] = 0;
            }
            dailyCounts[dateKey][event.eventType]++;
        }

        return dailyCounts;
    }

    /**
     * Clean up old history records (older than specified days)
     */
    async cleanupOldRecords(olderThanDays: number = 365) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await prisma.subscriptionHistory.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
            },
        });

        return result.count;
    }
}

const subscriptionHistoryService = new SubscriptionHistoryService();
export default subscriptionHistoryService;
