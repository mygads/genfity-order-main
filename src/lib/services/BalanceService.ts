/**
 * Balance Service
 * Business logic for merchant balance operations
 */

import balanceRepository from '@/lib/repositories/BalanceRepository';
import subscriptionRepository from '@/lib/repositories/SubscriptionRepository';
import subscriptionService from '@/lib/services/SubscriptionService';

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

            // If balance is now zero or negative, should suspend
            if (result.isZero) {
                await subscriptionRepository.suspendSubscription(
                    merchantId,
                    'Deposit balance depleted'
                );
            }

            return {
                success: true,
                newBalance: result.newBalance,
                shouldSuspend: result.isZero,
            };
        } catch (error) {
            if (error instanceof Error && error.message === 'Insufficient balance') {
                return { success: false, newBalance: 0, shouldSuspend: true };
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
}

const balanceService = new BalanceService();
export default balanceService;
