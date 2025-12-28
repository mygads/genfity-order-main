/**
 * Payment Request Reject API (Super Admin)
 * POST /api/admin/payment-requests/[id]/reject - Reject payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import paymentRequestService from '@/lib/services/PaymentRequestService';
import userNotificationService from '@/lib/services/UserNotificationService';
import prisma from '@/lib/db/client';
import { z } from 'zod';

const rejectSchema = z.object({
    reason: z.string().min(1).max(500),
});

async function handlePost(
    req: NextRequest,
    context: AuthContext,
    routeContext: { params: Promise<Record<string, string>> }
) {
    try {
        const { id } = await routeContext.params;
        const requestId = BigInt(id);

        const body = await req.json();
        const validation = rejectSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        // Get payment request info before rejection
        const paymentRequest = await prisma.paymentRequest.findUnique({
            where: { id: requestId },
            select: { merchantId: true },
        });

        await paymentRequestService.rejectPayment(
            requestId,
            context.userId,
            validation.data.reason
        );

        // Send notification to merchant owner
        if (paymentRequest?.merchantId) {
            await userNotificationService.notifyPaymentRejected(
                paymentRequest.merchantId,
                validation.data.reason
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Payment rejected',
        });
    } catch (error: unknown) {
        console.error('Error rejecting payment:', error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    { success: false, error: 'NOT_FOUND', message: error.message },
                    { status: 404 }
                );
            }
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to reject payment' },
            { status: 500 }
        );
    }
}

export const POST = withSuperAdmin(handlePost);
