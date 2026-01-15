/**
 * Balance Service
 * Business logic for merchant balance operations
 */

import balanceRepository from '@/lib/repositories/BalanceRepository';
import subscriptionRepository from '@/lib/repositories/SubscriptionRepository';
import subscriptionService from '@/lib/services/SubscriptionService';
import subscriptionHistoryService from '@/lib/services/SubscriptionHistoryService';
import userNotificationService from '@/lib/services/UserNotificationService';

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
            ? `Completed-order email fee for #${orderNumber} (to ${sentToEmail})`
            : `Completed-order email fee for #${orderNumber}`;

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
        await balanceRepository.adjustBalance(merchantId, amount, description, adminUserId);

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
}

const balanceService = new BalanceService();
export default balanceService;
