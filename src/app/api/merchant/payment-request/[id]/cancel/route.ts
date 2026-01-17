/**
 * Payment Request Cancel API
 * POST /api/merchant/payment-request/[id]/cancel - Cancel a pending/confirmed request
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import paymentRequestService from '@/lib/services/PaymentRequestService';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

async function handlePost(
    _req: NextRequest,
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

        const updated = await paymentRequestService.cancelPaymentRequest(
            requestIdResult.value,
            merchantUser.merchantId
        );

        return NextResponse.json({
            success: true,
            message: 'Payment request cancelled.',
            data: {
                id: updated.id.toString(),
                status: updated.status,
                expiresAt: updated.expiresAt,
                updatedAt: updated.updatedAt,
            },
        });
    } catch (error: unknown) {
        console.error('Error cancelling payment request:', error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    { success: false, error: 'NOT_FOUND', message: error.message },
                    { status: 404 }
                );
            }
            if (error.message.includes('does not belong') || error.message.includes('Cannot cancel')) {
                return NextResponse.json(
                    { success: false, error: 'BAD_REQUEST', message: error.message },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to cancel payment request' },
            { status: 500 }
        );
    }
}

export const POST = withMerchantOwner(handlePost);
