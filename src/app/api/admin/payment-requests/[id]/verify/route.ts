/**
 * Payment Request Verify API (Super Admin)
 * POST /api/admin/payment-requests/[id]/verify - Approve payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import paymentRequestService from '@/lib/services/PaymentRequestService';
import { z } from 'zod';

const verifySchema = z.object({
    notes: z.string().max(500).optional(),
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
        const validation = verifySchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        await paymentRequestService.verifyPayment(
            requestId,
            context.userId,
            validation.data.notes
        );

        return NextResponse.json({
            success: true,
            message: 'Payment verified successfully',
        });
    } catch (error: unknown) {
        console.error('Error verifying payment:', error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    { success: false, error: 'NOT_FOUND', message: error.message },
                    { status: 404 }
                );
            }
            if (error.message.includes('not awaiting')) {
                return NextResponse.json(
                    { success: false, error: 'BAD_REQUEST', message: error.message },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to verify payment' },
            { status: 500 }
        );
    }
}

export const POST = withSuperAdmin(handlePost);
