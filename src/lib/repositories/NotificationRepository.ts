/**
 * Notification Repository
 * Data access layer for notification logging to avoid duplicate notifications
 */

import prisma from '@/lib/db/client';
import type { NotificationType } from '@prisma/client';

class NotificationRepository {
    /**
     * Log a notification that was sent
     */
    async logNotification(
        merchantId: bigint,
        type: NotificationType,
        email: string,
        success: boolean,
        errorMessage?: string,
        metadata?: Record<string, unknown>
    ) {
        return prisma.notificationLog.create({
            data: {
                merchantId,
                type,
                sentToEmail: email,
                success,
                errorMessage,
                metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
            },
        });
    }

    /**
     * Check if a notification was already sent within a timeframe
     * Used to prevent duplicate notifications
     */
    async wasNotificationSentRecently(
        merchantId: bigint,
        type: NotificationType,
        hoursAgo: number = 24
    ): Promise<boolean> {
        const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

        const count = await prisma.notificationLog.count({
            where: {
                merchantId,
                type,
                success: true,
                sentAt: {
                    gte: cutoff,
                },
            },
        });

        return count > 0;
    }

    /**
     * Get recent notifications for a merchant
     */
    async getRecentNotifications(
        merchantId: bigint,
        limit: number = 20
    ) {
        return prisma.notificationLog.findMany({
            where: { merchantId },
            orderBy: { sentAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Get all notifications by type (for admin reporting)
     */
    async getNotificationsByType(
        type: NotificationType,
        options: { limit?: number; offset?: number } = {}
    ) {
        const { limit = 50, offset = 0 } = options;

        const [notifications, total] = await Promise.all([
            prisma.notificationLog.findMany({
                where: { type },
                orderBy: { sentAt: 'desc' },
                take: limit,
                skip: offset,
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
            }),
            prisma.notificationLog.count({ where: { type } }),
        ]);

        return { notifications, total };
    }

    /**
     * Get merchants that need trial ending notifications
     * Returns merchants with trials ending within X days who haven't been notified
     */
    async getMerchantsNeedingTrialWarning(daysRemaining: number) {
        const now = new Date();
        const targetDate = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
        const startOfTargetDay = new Date(targetDate.setHours(0, 0, 0, 0));
        const endOfTargetDay = new Date(targetDate.setHours(23, 59, 59, 999));

        // Get the notification type based on days remaining
        let notificationType: NotificationType;
        if (daysRemaining === 7) notificationType = 'TRIAL_ENDING_7_DAYS';
        else if (daysRemaining === 3) notificationType = 'TRIAL_ENDING_3_DAYS';
        else if (daysRemaining === 1) notificationType = 'TRIAL_ENDING_1_DAY';
        else return [];

        // Get merchants with trial ending on target date
        const merchants = await prisma.merchantSubscription.findMany({
            where: {
                type: 'TRIAL',
                status: 'ACTIVE',
                trialEndsAt: {
                    gte: startOfTargetDay,
                    lte: endOfTargetDay,
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

        // Filter out merchants who were already notified
        const result = [];
        for (const sub of merchants) {
            const alreadySent = await this.wasNotificationSentRecently(
                sub.merchantId,
                notificationType,
                48 // Don't send same notification within 48 hours
            );
            if (!alreadySent) {
                result.push({
                    ...sub,
                    notificationType,
                    daysRemaining,
                });
            }
        }

        return result;
    }

    /**
     * Get merchants with low balance (deposit mode only)
     */
    async getMerchantsWithLowBalance(thresholdMultiplier: number = 10) {
        // Get order fee from plan
        const plan = await prisma.subscriptionPlan.findFirst({
            where: { isActive: true },
        });

        if (!plan) return [];

        // Get deposit mode merchants with low balance
        const merchants = await prisma.merchantSubscription.findMany({
            where: {
                type: 'DEPOSIT',
                status: 'ACTIVE',
            },
            include: {
                merchant: {
                    include: {
                        merchantBalance: true,
                    },
                },
            },
        });

        const result = [];
        for (const sub of merchants) {
            if (!sub.merchant.merchantBalance) continue;

            const balance = Number(sub.merchant.merchantBalance.balance);
            const currency = sub.merchant.currency;
            const orderFee = currency === 'AUD'
                ? Number(plan.orderFeeAud)
                : Number(plan.orderFeeIdr);
            const threshold = orderFee * thresholdMultiplier;

            if (balance <= threshold && balance > 0) {
                // Check if already notified
                const alreadySent = await this.wasNotificationSentRecently(
                    sub.merchantId,
                    'LOW_BALANCE',
                    72 // Don't send within 72 hours
                );

                if (!alreadySent) {
                    result.push({
                        merchantId: sub.merchantId,
                        merchantCode: sub.merchant.code,
                        merchantName: sub.merchant.name,
                        merchantEmail: sub.merchant.email,
                        balance,
                        orderFee,
                        estimatedOrders: Math.floor(balance / orderFee),
                    });
                }
            }
        }

        return result;
    }

    /**
     * Get merchants that need monthly subscription expiring notifications
     * Returns merchants with monthly subscription ending within X days who haven't been notified
     */
    async getMerchantsNeedingMonthlyWarning(daysRemaining: number) {
        const now = new Date();
        const targetDate = new Date(now.getTime() + daysRemaining * 24 * 60 * 60 * 1000);
        const startOfTargetDay = new Date(targetDate);
        startOfTargetDay.setHours(0, 0, 0, 0);
        const endOfTargetDay = new Date(targetDate);
        endOfTargetDay.setHours(23, 59, 59, 999);

        // Get merchants with monthly subscription ending on target date
        const merchants = await prisma.merchantSubscription.findMany({
            where: {
                type: 'MONTHLY',
                status: 'ACTIVE',
                currentPeriodEnd: {
                    gte: startOfTargetDay,
                    lte: endOfTargetDay,
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

        // Filter out merchants who were already notified
        const result = [];
        for (const sub of merchants) {
            const alreadySent = await this.wasNotificationSentRecently(
                sub.merchantId,
                'MONTHLY_EXPIRING' as NotificationType,
                48 // Don't send same notification within 48 hours
            );
            if (!alreadySent) {
                result.push(sub);
            }
        }

        return result;
    }
}

const notificationRepository = new NotificationRepository();
export default notificationRepository;
