/**
 * Payment Request API
 * GET /api/merchant/payment-request - List payment requests
 * POST /api/merchant/payment-request - Create new payment request
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import paymentRequestService from '@/lib/services/PaymentRequestService';
import { z } from 'zod';

const createRequestSchema = z.object({
    type: z.enum(['DEPOSIT_TOPUP', 'MONTHLY_SUBSCRIPTION']),
    amount: z.number().positive().optional(),
    monthsRequested: z.number().min(1).max(12).optional(),
});

/**
 * GET /api/merchant/payment-request
 * List payment requests for current merchant
 */
async function handleGet(req: NextRequest, context: AuthContext) {
    try {
        const merchantId = context.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_ID_REQUIRED', message: 'Merchant ID is required' },
                { status: 400 }
            );
        }

        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const { requests, total } = await paymentRequestService.getMerchantPaymentRequests(
            merchantId,
            { limit, offset }
        );

        return NextResponse.json({
            success: true,
            data: {
                requests: requests.map(r => ({
                    id: r.id.toString(),
                    type: r.type,
                    status: r.status,
                    currency: r.currency,
                    amount: Number(r.amount),
                    monthsRequested: r.monthsRequested,
                    bankName: r.bankName,
                    bankAccountNumber: r.bankAccountNumber,
                    bankAccountName: r.bankAccountName,
                    confirmedAt: r.confirmedAt,
                    verifiedAt: r.verifiedAt,
                    rejectedAt: r.rejectedAt,
                    rejectionReason: r.rejectionReason,
                    expiresAt: r.expiresAt,
                    createdAt: r.createdAt,
                })),
                pagination: { total, limit, offset, hasMore: offset + requests.length < total },
            },
        });
    } catch (error) {
        console.error('Error getting payment requests:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get payment requests' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/merchant/payment-request
 * Create new payment request
 */
async function handlePost(req: NextRequest, context: AuthContext) {
    try {
        const merchantId = context.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_ID_REQUIRED', message: 'Merchant ID is required' },
                { status: 400 }
            );
        }

        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true, currency: true },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const body = await req.json();
        const validation = createRequestSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { type, amount, monthsRequested } = validation.data;
        const currency = merchant.currency || 'IDR';

        const paymentRequest = await paymentRequestService.createPaymentRequest({
            merchantId,
            type,
            currency,
            amount: amount || 0,
            monthsRequested,
        });

        return NextResponse.json({
            success: true,
            data: {
                id: paymentRequest.id.toString(),
                type: paymentRequest.type,
                status: paymentRequest.status,
                currency: paymentRequest.currency,
                amount: Number(paymentRequest.amount),
                monthsRequested: paymentRequest.monthsRequested,
                bankName: paymentRequest.bankName,
                bankAccountNumber: paymentRequest.bankAccountNumber,
                bankAccountName: paymentRequest.bankAccountName,
                expiresAt: paymentRequest.expiresAt,
                createdAt: paymentRequest.createdAt,
            },
        });
    } catch (error: unknown) {
        console.error('Error creating payment request:', error);

        if (error instanceof Error) {
            if (error.message.includes('already have a pending')) {
                return NextResponse.json(
                    { success: false, error: 'CONFLICT', message: error.message },
                    { status: 409 }
                );
            }
            if (error.message.includes('Minimum deposit')) {
                return NextResponse.json(
                    { success: false, error: 'VALIDATION_ERROR', message: error.message },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to create payment request' },
            { status: 500 }
        );
    }
}

export const GET = withMerchantOwner(handleGet);
export const POST = withMerchantOwner(handlePost);
