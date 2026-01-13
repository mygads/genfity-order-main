/**
 * Payment Request Confirm API
 * POST /api/merchant/payment-request/[id]/confirm - Confirm payment
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import paymentRequestService from '@/lib/services/PaymentRequestService';
import { z } from 'zod';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

const confirmSchema = z.object({
    transferNotes: z.string().max(500).optional(),
    transferProofUrl: z.string().url().optional(),
});

/**
 * POST /api/merchant/payment-request/[id]/confirm
 * Confirm payment for a payment request
 */
async function handlePost(
    req: NextRequest,
    context: AuthContext,
    routeContext: RouteContext
) {
    try {
        const merchantUser = await prisma.merchantUser.findFirst({
            where: { userId: context.userId },
            include: { merchant: true },
        });

        if (!merchantUser) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const requestIdResult = await requireBigIntRouteParam(routeContext, 'id');
        if (!requestIdResult.ok) {
            return NextResponse.json(requestIdResult.body, { status: requestIdResult.status });
        }
        const requestId = requestIdResult.value;

        const body = await req.json();
        const validation = confirmSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { transferNotes, transferProofUrl } = validation.data;

        const updatedRequest = await paymentRequestService.confirmPayment(
            requestId,
            merchantUser.merchantId,
            transferNotes,
            transferProofUrl
        );

        return NextResponse.json({
            success: true,
            message: 'Payment confirmed. Waiting for admin verification.',
            data: {
                id: updatedRequest.id.toString(),
                status: updatedRequest.status,
                confirmedAt: updatedRequest.confirmedAt,
            },
        });
    } catch (error: unknown) {
        console.error('Error confirming payment:', error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    { success: false, error: 'NOT_FOUND', message: error.message },
                    { status: 404 }
                );
            }
            if (error.message.includes('does not belong') || error.message.includes('Cannot confirm')) {
                return NextResponse.json(
                    { success: false, error: 'BAD_REQUEST', message: error.message },
                    { status: 400 }
                );
            }
            if (error.message.includes('expired')) {
                return NextResponse.json(
                    { success: false, error: 'EXPIRED', message: error.message },
                    { status: 410 }
                );
            }
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to confirm payment' },
            { status: 500 }
        );
    }
}

export const POST = withMerchantOwner(handlePost);
