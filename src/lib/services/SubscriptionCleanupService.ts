/**
 * Subscription Cleanup Service
 * Handles cleanup of old payment requests, logs, and expired data
 * Designed to be called by a cron job
 */

import prisma from '@/lib/db/client';

export interface CleanupResult {
    expiredPaymentRequests: number;
    oldNotificationLogs: number;
    oldSubscriptionHistory: number;
    expiredGroupOrders: number;
    oldJoinAttempts: number;
    totalCleaned: number;
    executedAt: Date;
}

class SubscriptionCleanupService {
    /**
     * Run all cleanup tasks
     * @param options Configuration for cleanup thresholds
     */
    async runFullCleanup(options: {
        paymentRequestExpiryDays?: number;
        notificationLogRetentionDays?: number;
        subscriptionHistoryRetentionDays?: number;
        groupOrderExpiryHours?: number;
        joinAttemptRetentionHours?: number;
    } = {}): Promise<CleanupResult> {
        const {
            paymentRequestExpiryDays = 30,       // Expire pending requests after 30 days
            notificationLogRetentionDays = 90,   // Keep notification logs for 90 days
            subscriptionHistoryRetentionDays = 365, // Keep subscription history for 1 year
            groupOrderExpiryHours = 24,          // Clean up expired group orders after 24 hours
            joinAttemptRetentionHours = 24,      // Clean up join attempts after 24 hours
        } = options;

        const results: CleanupResult = {
            expiredPaymentRequests: 0,
            oldNotificationLogs: 0,
            oldSubscriptionHistory: 0,
            expiredGroupOrders: 0,
            oldJoinAttempts: 0,
            totalCleaned: 0,
            executedAt: new Date(),
        };

        // 1. Expire old pending payment requests
        results.expiredPaymentRequests = await this.expirePendingPaymentRequests(paymentRequestExpiryDays);

        // 2. Clean up old notification logs
        results.oldNotificationLogs = await this.cleanupOldNotificationLogs(notificationLogRetentionDays);

        // 3. Clean up old subscription history (keep audit trail but remove very old entries)
        results.oldSubscriptionHistory = await this.cleanupOldSubscriptionHistory(subscriptionHistoryRetentionDays);

        // 4. Clean up expired group order sessions
        results.expiredGroupOrders = await this.cleanupExpiredGroupOrders(groupOrderExpiryHours);

        // 5. Clean up old join attempts
        results.oldJoinAttempts = await this.cleanupOldJoinAttempts(joinAttemptRetentionHours);

        results.totalCleaned = 
            results.expiredPaymentRequests +
            results.oldNotificationLogs +
            results.oldSubscriptionHistory +
            results.expiredGroupOrders +
            results.oldJoinAttempts;

        console.log('🧹 Cleanup completed:', results);
        return results;
    }

    /**
     * Expire pending payment requests that are too old
     */
    async expirePendingPaymentRequests(expiryDays: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - expiryDays);

        // Also expire requests that passed their expiresAt date
        const result = await prisma.paymentRequest.updateMany({
            where: {
                OR: [
                    {
                        status: 'PENDING',
                        createdAt: { lt: cutoffDate },
                    },
                    {
                        status: 'PENDING',
                        expiresAt: { lt: new Date() },
                    },
                ],
            },
            data: {
                status: 'EXPIRED',
            },
        });

        if (result.count > 0) {
            console.log(`⏰ Expired ${result.count} pending payment requests`);
        }

        return result.count;
    }

    /**
     * Clean up old notification logs
     */
    async cleanupOldNotificationLogs(retentionDays: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        const result = await prisma.notificationLog.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
            },
        });

        if (result.count > 0) {
            console.log(`📧 Deleted ${result.count} old notification logs`);
        }

        return result.count;
    }

    /**
     * Clean up old subscription history records
     * Keep important events (SUSPENDED, PAYMENT_RECEIVED) longer
     */
    async cleanupOldSubscriptionHistory(retentionDays: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        // Keep important events for twice as long
        const importantCutoffDate = new Date();
        importantCutoffDate.setDate(importantCutoffDate.getDate() - (retentionDays * 2));

        const result = await prisma.subscriptionHistory.deleteMany({
            where: {
                OR: [
                    {
                        // Non-important events: delete after retentionDays
                        createdAt: { lt: cutoffDate },
                        eventType: {
                            notIn: ['SUSPENDED', 'PAYMENT_RECEIVED', 'PAYMENT_REJECTED', 'CANCELLED'],
                        },
                    },
                    {
                        // Important events: delete after 2x retentionDays
                        createdAt: { lt: importantCutoffDate },
                    },
                ],
            },
        });

        if (result.count > 0) {
            console.log(`📜 Deleted ${result.count} old subscription history records`);
        }

        return result.count;
    }

    /**
     * Clean up expired group order sessions
     */
    async cleanupExpiredGroupOrders(expiryHours: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - expiryHours);

        // First update status to EXPIRED for sessions past their expiry
        await prisma.groupOrderSession.updateMany({
            where: {
                status: 'OPEN',
                expiresAt: { lt: new Date() },
            },
            data: {
                status: 'EXPIRED',
            },
        });

        // Delete old expired/cancelled sessions and their related data
        const expiredSessions = await prisma.groupOrderSession.findMany({
            where: {
                status: { in: ['EXPIRED', 'CANCELLED'] },
                updatedAt: { lt: cutoffDate },
            },
            select: { id: true },
        });

        if (expiredSessions.length === 0) {
            return 0;
        }

        const sessionIds = expiredSessions.map(s => s.id);

        // Delete in order due to foreign key constraints
        await prisma.groupOrderDetail.deleteMany({
            where: { sessionId: { in: sessionIds } },
        });

        await prisma.groupOrderParticipant.deleteMany({
            where: { sessionId: { in: sessionIds } },
        });

        const result = await prisma.groupOrderSession.deleteMany({
            where: { id: { in: sessionIds } },
        });

        if (result.count > 0) {
            console.log(`👥 Deleted ${result.count} expired group order sessions`);
        }

        return result.count;
    }

    /**
     * Clean up old join attempts (rate limiting records)
     */
    async cleanupOldJoinAttempts(retentionHours: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - retentionHours);

        const result = await prisma.groupJoinAttempt.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
            },
        });

        if (result.count > 0) {
            console.log(`🔐 Deleted ${result.count} old join attempts`);
        }

        return result.count;
    }

    /**
     * Get cleanup statistics (for dashboard)
     */
    async getCleanupStats(): Promise<{
        pendingPaymentRequests: number;
        expiredPaymentRequests: number;
        notificationLogsCount: number;
        subscriptionHistoryCount: number;
        expiredGroupOrders: number;
    }> {
        const [
            pendingPaymentRequests,
            expiredPaymentRequests,
            notificationLogsCount,
            subscriptionHistoryCount,
            expiredGroupOrders,
        ] = await Promise.all([
            prisma.paymentRequest.count({ where: { status: 'PENDING' } }),
            prisma.paymentRequest.count({ where: { status: 'EXPIRED' } }),
            prisma.notificationLog.count(),
            prisma.subscriptionHistory.count(),
            prisma.groupOrderSession.count({ where: { status: 'EXPIRED' } }),
        ]);

        return {
            pendingPaymentRequests,
            expiredPaymentRequests,
            notificationLogsCount,
            subscriptionHistoryCount,
            expiredGroupOrders,
        };
    }
}

const subscriptionCleanupService = new SubscriptionCleanupService();
export default subscriptionCleanupService;
