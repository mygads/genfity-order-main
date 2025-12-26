/**
 * Payment Request Service
 * Business logic for manual payment verification
 */

import paymentRequestRepository from '@/lib/repositories/PaymentRequestRepository';
import balanceRepository from '@/lib/repositories/BalanceRepository';
import subscriptionRepository from '@/lib/repositories/SubscriptionRepository';
import subscriptionService from '@/lib/services/SubscriptionService';
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

        return paymentRequestRepository.confirmPayment(requestId, {
            transferNotes,
            transferProofUrl,
        });
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

            // Reactivate if suspended
            await this.reactivateIfNeeded(request.merchantId, 'DEPOSIT');
        } else if (request.type === 'MONTHLY_SUBSCRIPTION') {
            const months = request.monthsRequested || 1;

            // Get current subscription
            const subscription = await subscriptionRepository.getMerchantSubscription(request.merchantId);

            if (subscription) {
                if (subscription.type === 'MONTHLY') {
                    // Extend existing subscription
                    await subscriptionRepository.extendMonthlySubscription(request.merchantId, months);
                } else {
                    // Upgrade to monthly
                    await subscriptionRepository.upgradeToMonthly(request.merchantId, months);
                }
            }

            // Reactivate if suspended
            await this.reactivateIfNeeded(request.merchantId, 'MONTHLY');
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

        return paymentRequestRepository.rejectPayment(requestId, adminUserId, reason);
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
