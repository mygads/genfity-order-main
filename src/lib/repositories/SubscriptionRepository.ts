/**
 * Subscription Repository
 * Data access layer for subscription-related operations
 */

import prisma from '@/lib/db/client';
import type { Prisma } from '@prisma/client';

class SubscriptionRepository {
    /**
     * Get subscription plan by key
     */
    async getPlanByKey(planKey: string) {
        return prisma.subscriptionPlan.findUnique({
            where: { planKey },
        });
    }

    /**
     * Get all active subscription plans
     */
    async getAllPlans(activeOnly = true) {
        return prisma.subscriptionPlan.findMany({
            where: activeOnly ? { isActive: true } : undefined,
            orderBy: { planKey: 'asc' },
        });
    }

    /**
     * Update subscription plan
     */
    async updatePlan(id: bigint, data: Prisma.SubscriptionPlanUpdateInput) {
        return prisma.subscriptionPlan.update({
            where: { id },
            data,
        });
    }

    /**
     * Get merchant subscription
     */
    async getMerchantSubscription(merchantId: bigint) {
        return prisma.merchantSubscription.findUnique({
            where: { merchantId },
            include: {
                merchant: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        currency: true,
                    },
                },
            },
        });
    }

    /**
     * Create merchant subscription (for new merchants)
     */
    async createMerchantSubscription(
        merchantId: bigint,
        trialDays: number = 30
    ) {
        const now = new Date();
        const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);

        return prisma.merchantSubscription.create({
            data: {
                merchantId,
                type: 'TRIAL',
                status: 'ACTIVE',
                trialStartedAt: now,
                trialEndsAt,
            },
        });
    }

    /**
     * Update merchant subscription
     */
    async updateMerchantSubscription(
        merchantId: bigint,
        data: Prisma.MerchantSubscriptionUpdateInput
    ) {
        return prisma.merchantSubscription.update({
            where: { merchantId },
            data,
        });
    }

    /**
     * Suspend merchant subscription
     */
    async suspendSubscription(merchantId: bigint, reason: string) {
        return prisma.merchantSubscription.update({
            where: { merchantId },
            data: {
                status: 'SUSPENDED',
                suspendedAt: new Date(),
                suspendReason: reason,
            },
        });
    }

    /**
     * Reactivate merchant subscription
     */
    async reactivateSubscription(merchantId: bigint) {
        return prisma.merchantSubscription.update({
            where: { merchantId },
            data: {
                status: 'ACTIVE',
                suspendedAt: null,
                suspendReason: null,
            },
        });
    }

    /**
     * Extend trial subscription by a number of days
     */
    async extendTrial(merchantId: bigint, days: number) {
        const subscription = await prisma.merchantSubscription.findUnique({
            where: { merchantId },
        });

        if (!subscription || subscription.type !== 'TRIAL') {
            throw new Error('Merchant does not have a trial subscription');
        }

        const currentEndDate = subscription.trialEndsAt || new Date();
        const newEndDate = new Date(currentEndDate.getTime() + days * 24 * 60 * 60 * 1000);

        return prisma.merchantSubscription.update({
            where: { merchantId },
            data: {
                trialEndsAt: newEndDate,
            },
        });
    }

    /**
     * Get expired trial subscriptions
     */
    async getExpiredTrials() {
        return prisma.merchantSubscription.findMany({
            where: {
                type: 'TRIAL',
                status: 'ACTIVE',
                trialEndsAt: {
                    lt: new Date(),
                },
            },
            include: {
                merchant: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }

    /**
     * Get expired monthly subscriptions
     */
    async getExpiredMonthly() {
        return prisma.merchantSubscription.findMany({
            where: {
                type: 'MONTHLY',
                status: 'ACTIVE',
                currentPeriodEnd: {
                    lt: new Date(),
                },
            },
            include: {
                merchant: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }

    /**
     * Upgrade to deposit mode
     */
    async upgradeToDeposit(merchantId: bigint) {
        return prisma.merchantSubscription.update({
            where: { merchantId },
            data: {
                type: 'DEPOSIT',
                status: 'ACTIVE',
                trialEndsAt: null,
                currentPeriodStart: null,
                currentPeriodEnd: null,
                suspendedAt: null,
                suspendReason: null,
            },
        });
    }

    /**
     * Upgrade to monthly mode
     */
    async upgradeToMonthly(merchantId: bigint, months: number) {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + months * 30 * 24 * 60 * 60 * 1000);

        return prisma.merchantSubscription.update({
            where: { merchantId },
            data: {
                type: 'MONTHLY',
                status: 'ACTIVE',
                trialEndsAt: null,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
                suspendedAt: null,
                suspendReason: null,
            },
        });
    }

    /**
     * Extend monthly subscription
     */
    async extendMonthlySubscription(merchantId: bigint, months: number) {
        const subscription = await this.getMerchantSubscription(merchantId);
        if (!subscription) {
            throw new Error('Subscription not found');
        }

        // Start from current period end or now, whichever is later
        const startFrom = subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date()
            ? subscription.currentPeriodEnd
            : new Date();

        const newPeriodEnd = new Date(startFrom.getTime() + months * 30 * 24 * 60 * 60 * 1000);

        return prisma.merchantSubscription.update({
            where: { merchantId },
            data: {
                status: 'ACTIVE',
                currentPeriodEnd: newPeriodEnd,
                suspendedAt: null,
                suspendReason: null,
            },
        });
    }
}

const subscriptionRepository = new SubscriptionRepository();
export default subscriptionRepository;
