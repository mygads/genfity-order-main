/**
 * Balance Service
 * Business logic for merchant balance operations
 */

import balanceRepository from '@/lib/repositories/BalanceRepository';
import subscriptionRepository from '@/lib/repositories/SubscriptionRepository';
import subscriptionService from '@/lib/services/SubscriptionService';
import subscriptionHistoryService from '@/lib/services/SubscriptionHistoryService';
import userNotificationService from '@/lib/services/UserNotificationService';
import prisma from '@/lib/db/client';
import { AuthorizationError, ERROR_CODES, NotFoundError, ValidationError } from '@/lib/constants/errors';

export interface BalanceInfo {
    balance: number;
    currency: string;
    lastTopupAt: Date | null;
    isLow: boolean;
    orderFee: number;
    estimatedOrders: number;
}

class BalanceService {
    /**
     * Get merchant balance info with context
     */
    async getBalanceInfo(merchantId: bigint, currency: string): Promise<BalanceInfo> {
        const balance = await balanceRepository.getOrCreateBalance(merchantId);
        const pricing = await subscriptionService.getPlanPricing(currency);

        const balanceAmount = Number(balance.balance);
        const orderFee = pricing.orderFee;
        const estimatedOrders = orderFee > 0 ? Math.floor(balanceAmount / orderFee) : 0;

        // Consider balance "low" if less than 10 orders remaining
        const isLow = estimatedOrders < 10;

        return {
            balance: balanceAmount,
            currency: balance.merchant?.currency || currency,
            lastTopupAt: balance.lastTopupAt,
            isLow,
            orderFee,
            estimatedOrders,
        };
    }

    /**
     * Add balance from verified payment
     */
    async addBalanceFromPayment(
        merchantId: bigint,
        amount: number,
        paymentRequestId: bigint,
        description: string
    ): Promise<void> {
        // Add balance
        await balanceRepository.addBalance(
            merchantId,
            amount,
            'DEPOSIT',
            description,
            paymentRequestId
        );

        // Reactivate subscription if it was suspended due to zero balance
        const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);
        if (subscription && subscription.status === 'SUSPENDED' && subscription.type === 'DEPOSIT') {
            await subscriptionRepository.reactivateSubscription(merchantId);
            // Also reopen the store
            await subscriptionRepository.reopenMerchantStore(merchantId);
        }
    }

    /**
     * Deduct order fee (called when order is placed)
     */
    async deductOrderFee(
        merchantId: bigint,
        orderId: bigint,
        orderNumber: string
    ): Promise<{
        success: boolean;
        newBalance: number;
        shouldSuspend: boolean;
    }> {
        // Check subscription type
        const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);
        if (!subscription || subscription.type !== 'DEPOSIT') {
            // Not deposit mode, no fee to deduct
            return { success: true, newBalance: 0, shouldSuspend: false };
        }

        const currency = subscription.merchant?.currency || 'IDR';
        const pricing = await subscriptionService.getPlanPricing(currency);
        const orderFee = pricing.orderFee;

        try {
            const result = await balanceRepository.deductBalance(
                merchantId,
                orderFee,
                orderId,
                `Order fee for #${orderNumber}`
            );

            if ((result as any).wasDuplicate) {
                // Idempotent duplicate (race/retry). Balance already reflects the correct deduction.
                return {
                    success: true,
                    newBalance: (result as any).newBalance,
                    shouldSuspend: false,
                };
            }

            // Log to subscription history
            await subscriptionHistoryService.recordOrderFeeDeducted(
                merchantId,
                orderId,
                orderFee,
                result.balanceBefore,
                result.newBalance
            );

            // If balance is now negative, send real-time push notification
            if (result.isNegative) {
                try {
                    await userNotificationService.notifyNegativeBalance(
                        merchantId,
                        result.newBalance,
                        orderNumber,
                        currency
                    );
                    console.log(`[Order ${orderNumber}] Negative balance notification sent to merchant`);
                } catch (notifyError) {
                    console.error(`[Order ${orderNumber}] Failed to send negative balance notification:`, notifyError);
                }
            }

            return {
                success: true,
                newBalance: result.newBalance,
                shouldSuspend: false, // Changed: Don't suspend immediately, let cron handle at midnight
            };
        } catch (error) {
            if (error instanceof Error && error.message === 'Insufficient balance') {
                return { success: false, newBalance: 0, shouldSuspend: true };
            }
            throw error;
        }
    }

    /**
     * Deduct completed-order email fee (paid customer email).
     * This is independent of subscription type and never allows negative balances.
     */
    async deductCompletedOrderEmailFee(
        merchantId: bigint,
        orderId: bigint,
        orderNumber: string,
        amount: number,
        sentToEmail?: string
    ): Promise<{
        success: boolean;
        newBalance: number;
    }> {
        if (!(typeof amount === 'number' && Number.isFinite(amount)) || amount <= 0) {
            return { success: true, newBalance: 0 };
        }

        const description = sentToEmail
            ? `Completed order email fee for #${orderNumber} (to ${sentToEmail})`
            : `Completed order email fee for #${orderNumber}`;

        try {
            const result = await balanceRepository.deductBalanceWithType(merchantId, {
                amount,
                type: 'COMPLETED_ORDER_EMAIL_FEE',
                description,
                orderId,
                allowNegative: false,
            });

            return { success: true, newBalance: result.newBalance };
        } catch (error) {
            if (error instanceof Error && error.message === 'Insufficient balance') {
                return { success: false, newBalance: 0 };
            }
            throw error;
        }
    }

    /**
     * Admin manual balance adjustment
     */
    async adjustBalance(
        merchantId: bigint,
        amount: number,
        description: string,
        adminUserId: bigint
    ): Promise<void> {
        const balanceBefore = await balanceRepository.getMerchantBalance(merchantId);
        if (!balanceBefore) {
            throw new NotFoundError('Balance not found', ERROR_CODES.NOT_FOUND);
        }

        const balanceBeforeAmount = Number(balanceBefore.balance);

        await balanceRepository.adjustBalance(merchantId, amount, description, adminUserId);

        const balanceAfter = await balanceRepository.getMerchantBalance(merchantId);
        const balanceAfterAmount = balanceAfter ? Number(balanceAfter.balance) : balanceBeforeAmount + amount;

        try {
            await subscriptionHistoryService.recordBalanceAdjusted(
                merchantId,
                amount,
                balanceBeforeAmount,
                balanceAfterAmount,
                description,
                'ADMIN',
                adminUserId,
                {
                    source: 'ADMIN_ADJUST',
                    currency: balanceBefore.merchant?.currency,
                    flowId: `balance-adjust-${merchantId.toString()}-${Date.now()}`,
                    flowType: 'BALANCE_ADJUSTMENT',
                }
            );
        } catch (historyError) {
            console.error('Failed to record balance adjustment history:', historyError);
        }

        // If adjustment makes balance positive and subscription was suspended
        if (amount > 0) {
            const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);
            if (subscription && subscription.status === 'SUSPENDED' && subscription.type === 'DEPOSIT') {
                const balance = await balanceRepository.getMerchantBalance(merchantId);
                if (balance && Number(balance.balance) > 0) {
                    await subscriptionRepository.reactivateSubscription(merchantId);
                }
            }
        }
    }

    /**
     * Transfer balance between branches in the same group (owner-only)
     */
    async transferBalance(input: {
        ownerUserId: bigint;
        fromMerchantId: bigint;
        toMerchantId: bigint;
        amount: number;
        note?: string;
    }): Promise<void> {
        const { ownerUserId, fromMerchantId, toMerchantId, amount, note } = input;

        if (!(Number.isFinite(amount) && amount > 0)) {
            throw new ValidationError('Amount must be greater than zero', ERROR_CODES.VALIDATION_FAILED);
        }

        if (fromMerchantId === toMerchantId) {
            throw new ValidationError('Source and destination must be different', ERROR_CODES.VALIDATION_FAILED);
        }

        const merchants = await prisma.merchant.findMany({
            where: { id: { in: [fromMerchantId, toMerchantId] } },
            select: {
                id: true,
                name: true,
                code: true,
                parentMerchantId: true,
                currency: true,
            },
        });

        const fromMerchant = merchants.find((merchant) => merchant.id === fromMerchantId);
        const toMerchant = merchants.find((merchant) => merchant.id === toMerchantId);

        if (!fromMerchant || !toMerchant) {
            throw new NotFoundError('Merchant not found');
        }

        const fromMainId = fromMerchant.parentMerchantId ?? fromMerchant.id;
        const toMainId = toMerchant.parentMerchantId ?? toMerchant.id;

        if (fromMainId !== toMainId) {
            throw new ValidationError('Branches must be in the same group', ERROR_CODES.VALIDATION_FAILED);
        }

        const ownerLink = await prisma.merchantUser.findFirst({
            where: {
                userId: ownerUserId,
                role: 'OWNER',
                isActive: true,
                merchantId: { in: [fromMainId, fromMerchantId, toMerchantId] },
            },
            select: { id: true },
        });

        if (!ownerLink) {
            throw new AuthorizationError('You do not have access to this merchant group', ERROR_CODES.FORBIDDEN);
        }

        if (fromMerchant.currency !== toMerchant.currency) {
            throw new ValidationError('Branch currencies must match', ERROR_CODES.VALIDATION_FAILED);
        }

        const noteSuffix = note ? ` (${note})` : '';
        const descriptionFrom = `Transfer to ${toMerchant.name}${noteSuffix}`;
        const descriptionTo = `Transfer from ${fromMerchant.name}${noteSuffix}`;

        await balanceRepository.transferBalance({
            fromMerchantId,
            toMerchantId,
            amount,
            descriptionFrom,
            descriptionTo,
            createdByUserId: ownerUserId,
        });
    }

    /**
     * Get balance transactions
     */
    async getTransactions(
        merchantId: bigint,
        options: { limit?: number; offset?: number } = {}
    ) {
        return balanceRepository.getTransactions(merchantId, options);
    }

    /**
     * Check if merchant has sufficient balance for order
     */
    async hasSufficientBalance(merchantId: bigint): Promise<boolean> {
        const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);

        // If not deposit mode, always sufficient
        if (!subscription || subscription.type !== 'DEPOSIT') {
            return true;
        }

        const currency = subscription.merchant?.currency || 'IDR';
        const pricing = await subscriptionService.getPlanPricing(currency);
        const balance = await balanceRepository.getMerchantBalance(merchantId);

        if (!balance) {
            return false;
        }

        return Number(balance.balance) >= pricing.orderFee;
    }

    /**
     * Get billing summary for deposit mode (yesterday, last week, last month)
     */
    async getBillingSummary(merchantId: bigint): Promise<{
        yesterday: number;
        lastWeek: number;
        lastMonth: number;
    }> {
        const now = new Date();

        // Calculate date ranges
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);

        const startOfWeek = new Date(startOfToday);
        startOfWeek.setDate(startOfWeek.getDate() - 7);

        const startOfMonth = new Date(startOfToday);
        startOfMonth.setDate(startOfMonth.getDate() - 30);

        // Get transactions and calculate sums
        const transactions = await balanceRepository.getTransactionsByDateRange(
            merchantId,
            startOfMonth,
            now
        );

        let yesterday = 0;
        let lastWeek = 0;
        let lastMonth = 0;

        for (const tx of transactions) {
            // Only count ORDER_FEE transactions (negative amounts)
            const amount = Number(tx.amount);
            if (tx.type === 'ORDER_FEE' && amount < 0) {
                const fee = Math.abs(amount);
                const txDate = new Date(tx.createdAt);

                // Yesterday
                if (txDate >= startOfYesterday && txDate < startOfToday) {
                    yesterday += fee;
                }
                // Last week
                if (txDate >= startOfWeek) {
                    lastWeek += fee;
                }
                // Last month (all transactions in range)
                lastMonth += fee;
            }
        }

        return { yesterday, lastWeek, lastMonth };
    }

    /**
     * Get usage totals for today + last 30 days.
     * Used for subscription dashboard cards.
     */
    async getUsageSummary(merchantId: bigint): Promise<{
        today: {
            orderFee: number;
            orderFeeCount: number;
            completedOrderEmailFee: number;
            completedOrderEmailFeeCount: number;
            total: number;
        };
        last30Days: {
            orderFee: number;
            orderFeeCount: number;
            completedOrderEmailFee: number;
            completedOrderEmailFeeCount: number;
            total: number;
        };
    }> {
        const now = new Date();

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfLast30Days = new Date(startOfToday);
        startOfLast30Days.setDate(startOfLast30Days.getDate() - 30);

        const transactions = await balanceRepository.getTransactionsByDateRange(
            merchantId,
            startOfLast30Days,
            now
        );

        const summary = {
            today: {
                orderFee: 0,
                orderFeeCount: 0,
                completedOrderEmailFee: 0,
                completedOrderEmailFeeCount: 0,
                total: 0,
            },
            last30Days: {
                orderFee: 0,
                orderFeeCount: 0,
                completedOrderEmailFee: 0,
                completedOrderEmailFeeCount: 0,
                total: 0,
            },
        };

        for (const tx of transactions) {
            const amount = Number(tx.amount);
            const txDate = new Date(tx.createdAt);
            const inToday = txDate >= startOfToday;

            // Only count usage/deductions (negative amounts)
            if (!(Number.isFinite(amount) && amount < 0)) {
                continue;
            }

            const fee = Math.abs(amount);

            if (tx.type === 'ORDER_FEE') {
                summary.last30Days.orderFee += fee;
                summary.last30Days.orderFeeCount += 1;
                if (inToday) {
                    summary.today.orderFee += fee;
                    summary.today.orderFeeCount += 1;
                }
            }

            if (tx.type === 'COMPLETED_ORDER_EMAIL_FEE') {
                summary.last30Days.completedOrderEmailFee += fee;
                summary.last30Days.completedOrderEmailFeeCount += 1;
                if (inToday) {
                    summary.today.completedOrderEmailFee += fee;
                    summary.today.completedOrderEmailFeeCount += 1;
                }
            }
        }

        summary.today.total = summary.today.orderFee + summary.today.completedOrderEmailFee;
        summary.last30Days.total = summary.last30Days.orderFee + summary.last30Days.completedOrderEmailFee;

        return summary;
    }
}

const balanceService = new BalanceService();
export default balanceService;
