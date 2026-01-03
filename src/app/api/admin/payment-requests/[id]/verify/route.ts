/**
 * Payment Request Verify API (Super Admin)
 * POST /api/admin/payment-requests/[id]/verify - Approve payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import paymentRequestService from '@/lib/services/PaymentRequestService';
import userNotificationService from '@/lib/services/UserNotificationService';
import emailService from '@/lib/services/EmailService';
import prisma from '@/lib/db/client';
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

        // Get payment request info before verification
        const paymentRequest = await prisma.paymentRequest.findUnique({
            where: { id: requestId },
            include: {
                merchant: {
                    include: {
                        merchantBalance: true,
                        subscription: true,
                    },
                },
            },
        });

        await paymentRequestService.verifyPayment(
            requestId,
            context.userId,
            validation.data.notes
        );

        // Send notification and email to merchant owner
        if (paymentRequest?.merchant) {
            const amount = Number(paymentRequest.amount);
            const currency = paymentRequest.merchant.currency;
            const merchantName = paymentRequest.merchant.name;
            const merchantEmail = paymentRequest.merchant.email;

            // Send in-app notification
            await userNotificationService.notifyPaymentVerified(
                paymentRequest.merchant.id,
                amount,
                currency
            );

            // Send email notification
            if (merchantEmail) {
                // Get updated balance/subscription info after verification
                const updatedMerchant = await prisma.merchant.findUnique({
                    where: { id: paymentRequest.merchant.id },
                    include: {
                        merchantBalance: true,
                        subscription: true,
                    },
                });

                await emailService.sendPaymentVerifiedEmail({
                    to: merchantEmail,
                    merchantName,
                    amount,
                    currency,
                    paymentType: paymentRequest.type === 'DEPOSIT_TOPUP' ? 'DEPOSIT' : 'MONTHLY_SUBSCRIPTION',
                    newBalance: updatedMerchant?.merchantBalance
                        ? Number(updatedMerchant.merchantBalance.balance)
                        : undefined,
                    newPeriodEnd: updatedMerchant?.subscription?.currentPeriodEnd || undefined,
                });
            }
        }

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
