/**
 * Notification Retry Service
 * Handles automatic retrying of failed notifications with exponential backoff
 */

import prisma from '@/lib/db/client';
import userNotificationService from '@/lib/services/UserNotificationService';
import type { UserNotificationCategory, UserRole } from '@prisma/client';

interface NotificationRetryLog {
    id: bigint;
    notificationId: bigint | null;
    merchantId: bigint | null;
    userId: bigint | null;
    category: UserNotificationCategory;
    title: string;
    message: string;
    metadata: Record<string, unknown> | null;
    actionUrl: string | null;
    targetRole: UserRole | null;
    retryCount: number;
    maxRetries: number;
    nextRetryAt: Date | null;
    lastError: string | null;
    status: 'PENDING' | 'RETRYING' | 'SUCCESS' | 'FAILED';
    createdAt: Date;
    updatedAt: Date;
}

interface RetryConfig {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
    maxRetries: 5,
    baseDelayMs: 60000, // 1 minute
    maxDelayMs: 3600000, // 1 hour
};

class NotificationRetryService {
    private config: Required<RetryConfig>;

    constructor(config?: RetryConfig) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Calculate next retry delay using exponential backoff
     */
    private calculateNextRetryDelay(retryCount: number): number {
        // Exponential backoff: baseDelay * 2^retryCount
        const delay = this.config.baseDelayMs * Math.pow(2, retryCount);
        // Add jitter (±10%) to prevent thundering herd
        const jitter = delay * 0.1 * (Math.random() * 2 - 1);
        return Math.min(delay + jitter, this.config.maxDelayMs);
    }

    /**
     * Queue a notification for retry
     */
    async queueForRetry(params: {
        merchantId?: bigint;
        userId?: bigint;
        category: UserNotificationCategory;
        title: string;
        message: string;
        metadata?: Record<string, unknown>;
        actionUrl?: string;
        targetRole?: UserRole;
        error?: string;
    }): Promise<void> {
        const nextRetryAt = new Date(Date.now() + this.config.baseDelayMs);

        await prisma.notificationRetryQueue.create({
            data: {
                merchantId: params.merchantId || null,
                userId: params.userId || null,
                category: params.category,
                title: params.title,
                message: params.message,
                metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : null,
                actionUrl: params.actionUrl || null,
                targetRole: params.targetRole || null,
                retryCount: 0,
                maxRetries: this.config.maxRetries,
                nextRetryAt,
                lastError: params.error || null,
                status: 'PENDING',
            },
        });
    }

    /**
     * Process pending retries
     */
    async processPendingRetries(): Promise<{
        processed: number;
        succeeded: number;
        failed: number;
        requeued: number;
    }> {
        const now = new Date();
        const stats = { processed: 0, succeeded: 0, failed: 0, requeued: 0 };

        // Get all pending retries that are due
        const pendingRetries = await prisma.notificationRetryQueue.findMany({
            where: {
                status: { in: ['PENDING', 'RETRYING'] },
                nextRetryAt: { lte: now },
            },
            orderBy: { nextRetryAt: 'asc' },
            take: 100, // Process in batches
        });

        for (const retry of pendingRetries) {
            stats.processed++;

            try {
                // Update status to RETRYING
                await prisma.notificationRetryQueue.update({
                    where: { id: retry.id },
                    data: { status: 'RETRYING' },
                });

                // Attempt to send notification
                if (retry.merchantId) {
                    await userNotificationService.createForMerchant(
                        retry.merchantId,
                        retry.category,
                        retry.title,
                        retry.message,
                        {
                            targetRole: retry.targetRole || undefined,
                            metadata: retry.metadata as Record<string, unknown> | undefined,
                            actionUrl: retry.actionUrl || undefined,
                        }
                    );
                } else if (retry.userId) {
                    await userNotificationService.createForUser({
                        userId: retry.userId,
                        category: retry.category,
                        title: retry.title,
                        message: retry.message,
                        metadata: retry.metadata as Record<string, unknown> | undefined,
                        actionUrl: retry.actionUrl || undefined,
                    });
                } else if (retry.targetRole === 'SUPER_ADMIN') {
                    await userNotificationService.createForSuperAdmins(
                        retry.category,
                        retry.title,
                        retry.message,
                        {
                            metadata: retry.metadata as Record<string, unknown> | undefined,
                            actionUrl: retry.actionUrl || undefined,
                        }
                    );
                }

                // Mark as successful
                await prisma.notificationRetryQueue.update({
                    where: { id: retry.id },
                    data: { status: 'SUCCESS' },
                });

                stats.succeeded++;
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                const newRetryCount = retry.retryCount + 1;

                if (newRetryCount >= retry.maxRetries) {
                    // Max retries reached, mark as failed
                    await prisma.notificationRetryQueue.update({
                        where: { id: retry.id },
                        data: {
                            status: 'FAILED',
                            lastError: errorMessage,
                            retryCount: newRetryCount,
                        },
                    });
                    stats.failed++;
                } else {
                    // Calculate next retry time with exponential backoff
                    const nextDelay = this.calculateNextRetryDelay(newRetryCount);
                    const nextRetryAt = new Date(Date.now() + nextDelay);

                    await prisma.notificationRetryQueue.update({
                        where: { id: retry.id },
                        data: {
                            status: 'PENDING',
                            retryCount: newRetryCount,
                            nextRetryAt,
                            lastError: errorMessage,
                        },
                    });
                    stats.requeued++;
                }
            }
        }

        return stats;
    }

    /**
     * Get retry queue statistics
     */
    async getQueueStats(): Promise<{
        pending: number;
        retrying: number;
        failed: number;
        succeeded: number;
        oldestPending: Date | null;
    }> {
        const [counts, oldestPending] = await Promise.all([
            prisma.notificationRetryQueue.groupBy({
                by: ['status'],
                _count: { id: true },
            }),
            prisma.notificationRetryQueue.findFirst({
                where: { status: 'PENDING' },
                orderBy: { createdAt: 'asc' },
                select: { createdAt: true },
            }),
        ]);

        const statusCounts = counts.reduce((acc: Record<string, number>, item: { status: string; _count: { id: number } }) => {
            acc[item.status] = item._count.id;
            return acc;
        }, {} as Record<string, number>);

        return {
            pending: statusCounts['PENDING'] || 0,
            retrying: statusCounts['RETRYING'] || 0,
            failed: statusCounts['FAILED'] || 0,
            succeeded: statusCounts['SUCCESS'] || 0,
            oldestPending: oldestPending?.createdAt || null,
        };
    }

    /**
     * Clean up old retry records
     */
    async cleanupOldRecords(daysOld: number = 30): Promise<number> {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

        const result = await prisma.notificationRetryQueue.deleteMany({
            where: {
                status: { in: ['SUCCESS', 'FAILED'] },
                updatedAt: { lt: cutoffDate },
            },
        });

        return result.count;
    }

    /**
     * Retry a specific failed notification
     */
    async retryFailed(retryId: bigint): Promise<boolean> {
        const retry = await prisma.notificationRetryQueue.findUnique({
            where: { id: retryId },
        });

        if (!retry || retry.status !== 'FAILED') {
            return false;
        }

        // Reset for retry
        await prisma.notificationRetryQueue.update({
            where: { id: retryId },
            data: {
                status: 'PENDING',
                retryCount: 0,
                nextRetryAt: new Date(),
                lastError: null,
            },
        });

        return true;
    }
}

const notificationRetryService = new NotificationRetryService();
export default notificationRetryService;
