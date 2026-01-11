/**
 * Payment Request Service
 * Business logic for manual payment verification
 */

import paymentRequestRepository from '@/lib/repositories/PaymentRequestRepository';
import balanceRepository from '@/lib/repositories/BalanceRepository';
import subscriptionRepository from '@/lib/repositories/SubscriptionRepository';
import subscriptionService from '@/lib/services/SubscriptionService';
import subscriptionAutoSwitchService from '@/lib/services/SubscriptionAutoSwitchService';
import subscriptionHistoryService from '@/lib/services/SubscriptionHistoryService';
import userNotificationService from '@/lib/services/UserNotificationService';
import influencerCommissionService from '@/lib/services/InfluencerCommissionService';
import prisma from '@/lib/db/client';
import { NotFoundError, ValidationError, ConflictError, ERROR_CODES } from '@/lib/constants/errors';

export interface CreatePaymentRequestInput {
    merchantId: bigint;
    type: 'DEPOSIT_TOPUP' | 'MONTHLY_SUBSCRIPTION';
    currency: string;
    amount: number;
    monthsRequested?: number;
}

class PaymentRequestService {
    /**
     * Create a new payment request
     */
    async createPaymentRequest(input: CreatePaymentRequestInput) {
        // Check if there's already a pending request
        const existingRequest = await paymentRequestRepository.getActiveMerchantRequest(input.merchantId);
        if (existingRequest) {
            throw new ConflictError(
                'You already have a pending payment request. Please complete or cancel it first.',
                ERROR_CODES.CONFLICT
            );
        }

        // Get pricing and bank info
        const pricing = await subscriptionService.getPlanPricing(input.currency);

        // Validate amount
        if (input.type === 'DEPOSIT_TOPUP' && input.amount < pricing.depositMinimum) {
            throw new ValidationError(
                `Minimum deposit is ${input.currency === 'IDR' ? 'Rp ' : 'A$'}${pricing.depositMinimum.toLocaleString()}`,
                ERROR_CODES.VALIDATION_FAILED
            );
        }

        if (input.type === 'MONTHLY_SUBSCRIPTION') {
            const months = input.monthsRequested || 1;
            if (months < 1 || months > 12) {
                throw new ValidationError('Months must be between 1 and 12', ERROR_CODES.VALIDATION_FAILED);
            }
            input.amount = pricing.monthlyPrice * months;
        }

        // Set expiry (24 hours from now)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        return paymentRequestRepository.createPaymentRequest({
            merchantId: input.merchantId,
            type: input.type,
            currency: input.currency,
            amount: input.amount,
            monthsRequested: input.monthsRequested,
            bankName: pricing.bankName || undefined,
            bankAccountNumber: pricing.bankAccount || undefined,
            bankAccountName: pricing.bankAccountName || undefined,
            expiresAt,
        });
    }

    /**
     * Merchant confirms they have paid
     */
    async confirmPayment(
        requestId: bigint,
        merchantId: bigint,
        transferNotes?: string,
        transferProofUrl?: string
    ) {
        const request = await paymentRequestRepository.getPaymentRequest(requestId);

        if (!request) {
            throw new NotFoundError('Payment request not found', ERROR_CODES.NOT_FOUND);
        }

        if (request.merchantId !== merchantId) {
            throw new ValidationError('This payment request does not belong to you', ERROR_CODES.VALIDATION_FAILED);
        }

        if (request.status !== 'PENDING') {
            throw new ValidationError(`Cannot confirm a ${request.status.toLowerCase()} request`, ERROR_CODES.VALIDATION_FAILED);
        }

        // Check if expired
        if (request.expiresAt && request.expiresAt < new Date()) {
            await paymentRequestRepository.rejectPayment(requestId, BigInt(0), 'Request expired');
            throw new ValidationError('This payment request has expired. Please create a new one.', ERROR_CODES.VALIDATION_FAILED);
        }

        const result = await paymentRequestRepository.confirmPayment(requestId, {
            transferNotes,
            transferProofUrl,
        });

        // Record in subscription history that merchant submitted payment for verification
        try {
            await subscriptionHistoryService.recordPaymentSubmitted(
                merchantId,
                request.type as 'DEPOSIT_TOPUP' | 'MONTHLY_SUBSCRIPTION',
                Number(request.amount),
                request.currency,
                requestId
            );
            console.log(`✅ Payment submission recorded in history for merchant ${merchantId}`);
        } catch (historyError) {
            console.error('Failed to record payment submission in history:', historyError);
            // Don't fail if history recording fails
        }

        // Get merchant info for notification
        try {
            const merchant = await prisma.merchant.findUnique({
                where: { id: merchantId },
                select: { name: true, code: true, currency: true },
            });

            if (merchant) {
                const amountFormatted = request.currency === 'IDR'
                    ? `Rp ${Number(request.amount).toLocaleString()}`
                    : `${merchant.currency || 'AUD'} ${Number(request.amount).toLocaleString()}`;

                // Notify Super Admins about payment confirmation
                await userNotificationService.createForSuperAdmins(
                    'PAYMENT',
                    'Payment Confirmation Pending Verification',
                    `${merchant.name} (${merchant.code}) has confirmed a ${request.type === 'DEPOSIT_TOPUP' ? 'deposit top-up' : 'monthly subscription'} payment of ${amountFormatted}. Please verify.`,
                    {
                        metadata: {
                            requestId: requestId.toString(),
                            merchantId: merchantId.toString(),
                            merchantName: merchant.name,
                            merchantCode: merchant.code,
                            type: request.type,
                            amount: Number(request.amount),
                            currency: request.currency,
                        },
                        actionUrl: '/admin/dashboard/payment-verification',
                    }
                );
            }
        } catch (notifError) {
            console.error('Failed to notify super admins about payment confirmation:', notifError);
            // Don't fail the confirmation if notification fails
        }

        return result;
    }

    /**
     * Admin verifies payment and applies to merchant account
     */
    async verifyPayment(
        requestId: bigint,
        adminUserId: bigint,
        notes?: string
    ) {
        const request = await paymentRequestRepository.getPaymentRequest(requestId);

        if (!request) {
            throw new NotFoundError('Payment request not found', ERROR_CODES.NOT_FOUND);
        }

        if (request.status !== 'CONFIRMED') {
            throw new ValidationError(
                `Cannot verify a ${request.status.toLowerCase()} request. Payment must be confirmed by merchant first.`,
                ERROR_CODES.VALIDATION_FAILED
            );
        }

        // Verify the payment
        await paymentRequestRepository.verifyPayment(requestId, adminUserId, notes);

        // Apply the payment based on type
        if (request.type === 'DEPOSIT_TOPUP') {
            // Add to balance
            await balanceRepository.addBalance(
                request.merchantId,
                Number(request.amount),
                'DEPOSIT',
                `Top-up from payment request #${request.id}`,
                requestId
            );
        } else if (request.type === 'MONTHLY_SUBSCRIPTION') {
            const months = request.monthsRequested || 1;

            // Get current subscription
            const subscription = await subscriptionRepository.getMerchantSubscription(request.merchantId);

            if (!subscription) {
                // No subscription exists, create monthly subscription via upgradeToMonthly
                await subscriptionRepository.upgradeToMonthly(request.merchantId, months);
            } else if (subscription.type === 'MONTHLY') {
                // Extend existing monthly subscription
                await subscriptionRepository.extendMonthlySubscription(request.merchantId, months);
            } else {
                // TRIAL or DEPOSIT - just extend/set the monthly period without changing type yet
                // The auto-switch service will handle type switching
                const now = new Date();
                const startFrom = subscription.currentPeriodEnd && subscription.currentPeriodEnd > now
                    ? subscription.currentPeriodEnd
                    : now;
                
                // Get monthly days from plan (default 31)
                const plan = await prisma.subscriptionPlan.findFirst({
                    where: { isActive: true },
                    select: { monthlyDays: true },
                });
                const monthlyDays = plan?.monthlyDays ?? 31;
                
                const newPeriodEnd = new Date(startFrom.getTime() + months * monthlyDays * 24 * 60 * 60 * 1000);
                
                await subscriptionRepository.updateMerchantSubscription(request.merchantId, {
                    currentPeriodStart: subscription.currentPeriodEnd ? undefined : now,
                    currentPeriodEnd: newPeriodEnd,
                });
            }

            // Create balance transaction record for monthly subscription payment
            // This makes the subscription payment visible in transaction history
            const balance = await balanceRepository.getOrCreateBalance(request.merchantId);
            await prisma.balanceTransaction.create({
                data: {
                    balanceId: balance.id,
                    type: 'SUBSCRIPTION',
                    amount: Number(request.amount),
                    balanceBefore: Number(balance.balance),
                    balanceAfter: Number(balance.balance), // Subscription payment doesn't affect balance
                    description: `Monthly subscription payment (${months} month${months > 1 ? 's' : ''})`,
                    paymentRequestId: requestId,
                    createdByUserId: adminUserId,
                },
            });
        }

        // Get updated balance and subscription for history recording
        const [updatedBalance, updatedSubscription] = await Promise.all([
            prisma.merchantBalance.findUnique({ where: { merchantId: request.merchantId } }),
            subscriptionRepository.getMerchantSubscription(request.merchantId),
        ]);

        // Record payment received in subscription history
        try {
            await subscriptionHistoryService.recordPaymentReceived(
                request.merchantId,
                request.type as 'DEPOSIT_TOPUP' | 'MONTHLY_SUBSCRIPTION',
                Number(request.amount),
                Number(updatedBalance?.balance ?? 0),
                updatedSubscription?.currentPeriodEnd ?? null,
                adminUserId
            );
            console.log(`✅ Payment history recorded for merchant ${request.merchantId}`);
        } catch (historyError) {
            console.error('Failed to record payment history:', historyError);
            // Don't fail payment verification if history recording fails
        }

        // Use SubscriptionAutoSwitchService to handle auto-switch and store activation
        try {
            const switchResult = await subscriptionAutoSwitchService.handlePaymentVerified(
                request.merchantId,
                request.type as 'DEPOSIT_TOPUP' | 'MONTHLY_SUBSCRIPTION',
                Number(request.amount),
                request.monthsRequested || undefined
            );
            console.log(`📋 Payment verification auto-switch result:`, {
                merchant: switchResult.merchantCode,
                action: switchResult.action,
                reason: switchResult.reason,
                storeOpened: switchResult.storeOpened,
            });
        } catch (switchError) {
            console.error('Failed to run auto-switch after payment verification:', switchError);
            // Don't fail payment verification if auto-switch fails
            // Fall back to simple reactivation
            await this.reactivateIfNeeded(request.merchantId, request.type);
        }

        // Process influencer commission if merchant was referred
        try {
            const commissionResult = await influencerCommissionService.processPaymentCommission(
                request.merchantId,
                Number(request.amount),
                request.currency,
                requestId
            );
            if (commissionResult.success && commissionResult.commissionAmount) {
                console.log(`💰 Influencer commission processed:`, {
                    influencerId: commissionResult.influencerId?.toString(),
                    amount: commissionResult.commissionAmount,
                    currency: commissionResult.currency,
                    rate: commissionResult.commissionRate,
                    isFirstPayment: commissionResult.isFirstPayment,
                });
            } else if (commissionResult.error && commissionResult.error !== 'Merchant has no referrer') {
                console.log(`ℹ️ Commission not processed: ${commissionResult.error}`);
            }
        } catch (commissionError) {
            console.error('Failed to process influencer commission:', commissionError);
            // Don't fail payment verification if commission processing fails
        }

        return request;
    }

    /**
     * Admin rejects payment
     */
    async rejectPayment(
        requestId: bigint,
        adminUserId: bigint,
        reason: string
    ) {
        const request = await paymentRequestRepository.getPaymentRequest(requestId);

        if (!request) {
            throw new NotFoundError('Payment request not found', ERROR_CODES.NOT_FOUND);
        }

        if (request.status === 'VERIFIED') {
            throw new ValidationError('Cannot reject an already verified payment', ERROR_CODES.VALIDATION_FAILED);
        }

        const result = await paymentRequestRepository.rejectPayment(requestId, adminUserId, reason);

        // Record payment rejection in subscription history
        try {
            await subscriptionHistoryService.recordPaymentRejected(
                request.merchantId,
                request.type as 'DEPOSIT_TOPUP' | 'MONTHLY_SUBSCRIPTION',
                Number(request.amount),
                reason,
                adminUserId
            );
            console.log(`✅ Payment rejection recorded for merchant ${request.merchantId}`);
        } catch (historyError) {
            console.error('Failed to record payment rejection history:', historyError);
            // Don't fail rejection if history recording fails
        }

        return result;
    }

    /**
     * Get merchant's payment requests
     */
    async getMerchantPaymentRequests(
        merchantId: bigint,
        options: { limit?: number; offset?: number } = {}
    ) {
        return paymentRequestRepository.getMerchantPaymentRequests(merchantId, options);
    }

    /**
     * Get all confirmed payment requests for admin verification
     */
    async getPendingVerifications(options: { limit?: number; offset?: number } = {}) {
        return paymentRequestRepository.getPendingRequests({ ...options, status: 'CONFIRMED' });
    }

    /**
     * Get single payment request
     */
    async getPaymentRequest(requestId: bigint) {
        return paymentRequestRepository.getPaymentRequest(requestId);
    }

    /**
     * Helper: Reactivate subscription if needed
     */
    private async reactivateIfNeeded(merchantId: bigint, _expectedType: string) {
        const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);
        if (subscription && subscription.status === 'SUSPENDED') {
            await subscriptionRepository.reactivateSubscription(merchantId);
        }
    }
}

const paymentRequestService = new PaymentRequestService();
export default paymentRequestService;
