/**
 * Subscription Service
 * Business logic for subscription management
 */

import subscriptionRepository from '@/lib/repositories/SubscriptionRepository';
import balanceRepository from '@/lib/repositories/BalanceRepository';
import { NotFoundError, ValidationError, ERROR_CODES } from '@/lib/constants/errors';

export interface SubscriptionStatus {
    merchantId: bigint;
    type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY';
    status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
    isValid: boolean;
    daysRemaining: number | null;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    balance: number | null;
    currency: string;
    suspendReason: string | null;
}

export interface SubscriptionPlanPricing {
    trialDays: number;
    depositMinimum: number;
    orderFee: number;
    monthlyPrice: number;
    bankName: string | null;
    bankAccount: string | null;
    bankAccountName: string | null;
}

class SubscriptionService {
    /**
     * Get subscription plan pricing for a currency
     */
    async getPlanPricing(currency: string): Promise<SubscriptionPlanPricing> {
        const plans = await subscriptionRepository.getAllPlans(true);
        // We use a single plan row with dual currency fields
        const plan = plans[0];

        if (!plan) {
            // Return defaults if no plan configured
            return {
                trialDays: 30,
                depositMinimum: currency === 'IDR' ? 100000 : 15,
                orderFee: currency === 'IDR' ? 250 : 0.04,
                monthlyPrice: currency === 'IDR' ? 100000 : 15,
                bankName: null,
                bankAccount: null,
                bankAccountName: null,
            };
        }

        if (currency === 'AUD') {
            return {
                trialDays: plan.trialDays,
                depositMinimum: Number(plan.depositMinimumAud),
                orderFee: Number(plan.orderFeeAud),
                monthlyPrice: Number(plan.monthlyPriceAud),
                bankName: plan.bankNameAud,
                bankAccount: plan.bankAccountAud,
                bankAccountName: plan.bankAccountNameAud,
            };
        }

        // Default to IDR
        return {
            trialDays: plan.trialDays,
            depositMinimum: Number(plan.depositMinimumIdr),
            orderFee: Number(plan.orderFeeIdr),
            monthlyPrice: Number(plan.monthlyPriceIdr),
            bankName: plan.bankNameIdr,
            bankAccount: plan.bankAccountIdr,
            bankAccountName: plan.bankAccountNameIdr,
        };
    }

    /**
     * Get full subscription status for a merchant
     */
    async getSubscriptionStatus(merchantId: bigint): Promise<SubscriptionStatus | null> {
        const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);

        if (!subscription) {
            return null;
        }

        const currency = subscription.merchant?.currency || 'IDR';
        let daysRemaining: number | null = null;
        let balance: number | null = null;

        // Calculate days remaining based on subscription type
        if (subscription.type === 'TRIAL' && subscription.trialEndsAt) {
            const now = new Date();
            const diffMs = subscription.trialEndsAt.getTime() - now.getTime();
            daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        } else if (subscription.type === 'MONTHLY' && subscription.currentPeriodEnd) {
            const now = new Date();
            const diffMs = subscription.currentPeriodEnd.getTime() - now.getTime();
            daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        }

        // Get balance for deposit mode
        if (subscription.type === 'DEPOSIT') {
            const merchantBalance = await balanceRepository.getMerchantBalance(merchantId);
            balance = merchantBalance ? Number(merchantBalance.balance) : 0;
        }

        // Check if subscription is actually valid
        const isValid = this.checkSubscriptionValid(subscription, balance);

        return {
            merchantId,
            type: subscription.type,
            status: subscription.status,
            isValid,
            daysRemaining,
            trialEndsAt: subscription.trialEndsAt,
            currentPeriodEnd: subscription.currentPeriodEnd,
            balance,
            currency,
            suspendReason: subscription.suspendReason,
        };
    }

    /**
     * Check if subscription is valid (can accept orders)
     */
    private checkSubscriptionValid(
        subscription: { type: string; status: string; trialEndsAt: Date | null; currentPeriodEnd: Date | null },
        balance: number | null
    ): boolean {
        if (subscription.status !== 'ACTIVE') {
            return false;
        }

        const now = new Date();

        switch (subscription.type) {
            case 'TRIAL':
                return subscription.trialEndsAt ? subscription.trialEndsAt > now : false;

            case 'MONTHLY':
                return subscription.currentPeriodEnd ? subscription.currentPeriodEnd > now : false;

            case 'DEPOSIT':
                // For deposit mode, need positive balance
                return (balance ?? 0) > 0;

            default:
                return false;
        }
    }

    /**
     * Check and suspend expired subscriptions
     */
    async checkAndSuspendExpired(): Promise<{
        expiredTrials: number;
        expiredMonthly: number;
    }> {
        // Suspend expired trials
        const expiredTrials = await subscriptionRepository.getExpiredTrials();
        for (const sub of expiredTrials) {
            await subscriptionRepository.suspendSubscription(
                sub.merchantId,
                'Trial period ended'
            );
        }

        // Suspend expired monthly
        const expiredMonthly = await subscriptionRepository.getExpiredMonthly();
        for (const sub of expiredMonthly) {
            await subscriptionRepository.suspendSubscription(
                sub.merchantId,
                'Monthly subscription expired'
            );
        }

        return {
            expiredTrials: expiredTrials.length,
            expiredMonthly: expiredMonthly.length,
        };
    }

    /**
     * Create trial subscription for new merchant
     */
    async createTrialSubscription(merchantId: bigint): Promise<void> {
        const pricing = await this.getPlanPricing('IDR'); // Use IDR for trial days
        await subscriptionRepository.createMerchantSubscription(merchantId, pricing.trialDays);
        await balanceRepository.createMerchantBalance(merchantId);
    }

    /**
     * Upgrade merchant to deposit mode
     */
    async upgradeToDeposit(merchantId: bigint): Promise<void> {
        const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);
        if (!subscription) {
            throw new NotFoundError('Subscription not found', ERROR_CODES.NOT_FOUND);
        }

        await subscriptionRepository.upgradeToDeposit(merchantId);
    }

    /**
     * Upgrade merchant to monthly mode
     */
    async upgradeToMonthly(merchantId: bigint, months: number): Promise<void> {
        if (months < 1 || months > 12) {
            throw new ValidationError('Invalid months value', ERROR_CODES.VALIDATION_FAILED);
        }

        const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);
        if (!subscription) {
            throw new NotFoundError('Subscription not found', ERROR_CODES.NOT_FOUND);
        }

        await subscriptionRepository.upgradeToMonthly(merchantId, months);
    }

    /**
     * Extend monthly subscription
     */
    async extendMonthlySubscription(merchantId: bigint, months: number): Promise<void> {
        if (months < 1 || months > 12) {
            throw new ValidationError('Invalid months value', ERROR_CODES.VALIDATION_FAILED);
        }

        await subscriptionRepository.extendMonthlySubscription(merchantId, months);
    }

    /**
     * Reactivate suspended subscription
     */
    async reactivateSubscription(merchantId: bigint): Promise<void> {
        await subscriptionRepository.reactivateSubscription(merchantId);
    }

    /**
     * Suspend subscription manually
     */
    async suspendSubscription(merchantId: bigint, reason: string): Promise<void> {
        await subscriptionRepository.suspendSubscription(merchantId, reason);
    }

    /**
     * Check if merchant can accept orders
     */
    async canAcceptOrders(merchantId: bigint): Promise<{
        canAccept: boolean;
        reason?: string;
    }> {
        const status = await this.getSubscriptionStatus(merchantId);

        if (!status) {
            return { canAccept: false, reason: 'No subscription found' };
        }

        if (status.status === 'SUSPENDED') {
            return { canAccept: false, reason: status.suspendReason || 'Subscription suspended' };
        }

        if (status.status === 'CANCELLED') {
            return { canAccept: false, reason: 'Subscription cancelled' };
        }

        if (!status.isValid) {
            switch (status.type) {
                case 'TRIAL':
                    return { canAccept: false, reason: 'Trial period has ended' };
                case 'MONTHLY':
                    return { canAccept: false, reason: 'Monthly subscription has expired' };
                case 'DEPOSIT':
                    return { canAccept: false, reason: 'Insufficient deposit balance' };
            }
        }

        return { canAccept: true };
    }
}

const subscriptionService = new SubscriptionService();
export default subscriptionService;
