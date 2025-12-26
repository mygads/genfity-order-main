/**
 * Payment Request Repository
 * Data access layer for payment request operations
 */

import prisma from '@/lib/db/client';
import type { Prisma, PaymentRequestStatus, PaymentRequestType } from '@prisma/client';

class PaymentRequestRepository {
    /**
     * Create payment request
     */
    async createPaymentRequest(data: {
        merchantId: bigint;
        type: PaymentRequestType;
        currency: string;
        amount: number;
        monthsRequested?: number;
        bankName?: string;
        bankAccountNumber?: string;
        bankAccountName?: string;
        expiresAt?: Date;
    }) {
        return prisma.paymentRequest.create({
            data: {
                merchantId: data.merchantId,
                type: data.type,
                currency: data.currency,
                amount: data.amount,
                monthsRequested: data.monthsRequested,
                bankName: data.bankName,
                bankAccountNumber: data.bankAccountNumber,
                bankAccountName: data.bankAccountName,
                expiresAt: data.expiresAt,
                status: 'PENDING',
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
     * Get payment request by ID
     */
    async getPaymentRequest(id: bigint) {
        return prisma.paymentRequest.findUnique({
            where: { id },
            include: {
                merchant: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        email: true,
                        currency: true,
                    },
                },
            },
        });
    }

    /**
     * Get payment requests for a merchant
     */
    async getMerchantPaymentRequests(
        merchantId: bigint,
        options: {
            status?: PaymentRequestStatus;
            limit?: number;
            offset?: number;
        } = {}
    ) {
        const { status, limit = 20, offset = 0 } = options;

        const where: Prisma.PaymentRequestWhereInput = {
            merchantId,
            ...(status && { status }),
        };

        const [requests, total] = await Promise.all([
            prisma.paymentRequest.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.paymentRequest.count({ where }),
        ]);

        return { requests, total };
    }

    /**
     * Get all pending payment requests (for admin)
     */
    async getPendingRequests(options: {
        status?: PaymentRequestStatus;
        limit?: number;
        offset?: number;
    } = {}) {
        const { status = 'CONFIRMED', limit = 50, offset = 0 } = options;

        const where: Prisma.PaymentRequestWhereInput = {
            status,
        };

        const [requests, total] = await Promise.all([
            prisma.paymentRequest.findMany({
                where,
                include: {
                    merchant: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            email: true,
                            currency: true,
                        },
                    },
                },
                orderBy: { confirmedAt: 'asc' }, // Oldest first
                take: limit,
                skip: offset,
            }),
            prisma.paymentRequest.count({ where }),
        ]);

        return { requests, total };
    }

    /**
     * Merchant confirms payment
     */
    async confirmPayment(
        id: bigint,
        data: {
            transferNotes?: string;
            transferProofUrl?: string;
        }
    ) {
        return prisma.paymentRequest.update({
            where: { id },
            data: {
                status: 'CONFIRMED',
                confirmedAt: new Date(),
                transferNotes: data.transferNotes,
                transferProofUrl: data.transferProofUrl,
            },
        });
    }

    /**
     * Admin verifies payment
     */
    async verifyPayment(
        id: bigint,
        verifiedByUserId: bigint,
        notes?: string
    ) {
        return prisma.paymentRequest.update({
            where: { id },
            data: {
                status: 'VERIFIED',
                verifiedAt: new Date(),
                verifiedByUserId,
                verificationNotes: notes,
            },
        });
    }

    /**
     * Admin rejects payment
     */
    async rejectPayment(
        id: bigint,
        verifiedByUserId: bigint,
        reason: string
    ) {
        return prisma.paymentRequest.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectedAt: new Date(),
                verifiedByUserId,
                rejectionReason: reason,
            },
        });
    }

    /**
     * Get latest pending/confirmed request for merchant
     */
    async getActiveMerchantRequest(merchantId: bigint) {
        return prisma.paymentRequest.findFirst({
            where: {
                merchantId,
                status: {
                    in: ['PENDING', 'CONFIRMED'],
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Expire old pending requests
     */
    async expireOldRequests() {
        const now = new Date();

        return prisma.paymentRequest.updateMany({
            where: {
                status: 'PENDING',
                expiresAt: {
                    lt: now,
                },
            },
            data: {
                status: 'EXPIRED',
            },
        });
    }
}

const paymentRequestRepository = new PaymentRequestRepository();
export default paymentRequestRepository;
