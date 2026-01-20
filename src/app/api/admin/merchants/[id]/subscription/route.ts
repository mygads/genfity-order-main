/**
 * Merchant Subscription Management API (Super Admin)
 * GET /api/admin/merchants/[id]/subscription - Get subscription
 * PUT /api/admin/merchants/[id]/subscription - Update subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import subscriptionService from '@/lib/services/SubscriptionService';
import subscriptionRepository from '@/lib/repositories/SubscriptionRepository';
import emailService from '@/lib/services/EmailService';
import subscriptionHistoryService from '@/lib/services/SubscriptionHistoryService';
import prisma from '@/lib/db/client';
import { z } from 'zod';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';
import { serializeBigInt } from '@/lib/utils/serializer';

const updateSubscriptionSchema = z.object({
    type: z.enum(['TRIAL', 'DEPOSIT', 'MONTHLY']).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
    extendDays: z.number().min(1).max(365).optional(),
    adjustDays: z.number().min(-365).max(365).refine((value) => value !== 0, {
        message: 'Adjust days cannot be 0',
    }).optional(),
    monthlyPeriodMonths: z.number().min(1).max(24).optional(), // For MONTHLY type
    suspendReason: z.string().max(500).optional(),
}).refine((data) => !(data.extendDays && data.adjustDays), {
    message: 'Use either extendDays or adjustDays',
    path: ['extendDays'],
});

async function handleGet(
    req: NextRequest,
    context: AuthContext,
    routeContext: RouteContext
) {
    try {
        const merchantIdResult = await requireBigIntRouteParam(routeContext, 'id');
        if (!merchantIdResult.ok) {
            return NextResponse.json(merchantIdResult.body, { status: merchantIdResult.status });
        }
        const merchantId = merchantIdResult.value;

        const status = await subscriptionService.getSubscriptionStatus(merchantId);

        if (!status) {
            return NextResponse.json(
                { success: false, error: 'NOT_FOUND', message: 'Subscription not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: serializeBigInt(status),
        });
    } catch (error) {
        console.error('Error getting subscription:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get subscription' },
            { status: 500 }
        );
    }
}

async function handlePut(
    req: NextRequest,
    context: AuthContext,
    routeContext: RouteContext
) {
    try {
        const merchantIdResult = await requireBigIntRouteParam(routeContext, 'id');
        if (!merchantIdResult.ok) {
            return NextResponse.json(merchantIdResult.body, { status: merchantIdResult.status });
        }
        const merchantId = merchantIdResult.value;

        const body = await req.json();
        const validation = updateSubscriptionSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { type, status, extendDays, adjustDays, monthlyPeriodMonths, suspendReason } = validation.data;

        // Handle subscription type change
        if (type) {
            const currentSubscription = await subscriptionRepository.getMerchantSubscription(merchantId);
            if (!currentSubscription) {
                // Create new subscription if none exists
                await subscriptionRepository.createMerchantSubscription(merchantId);
            }

            // Change subscription type
            if (type === 'TRIAL') {
                // Reset to trial with 30 days
                await subscriptionRepository.updateMerchantSubscription(merchantId, {
                    type: 'TRIAL',
                    status: 'ACTIVE',
                    trialStartedAt: new Date(),
                    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    currentPeriodStart: null,
                    currentPeriodEnd: null,
                    suspendedAt: null,
                    suspendReason: null,
                });
            } else if (type === 'DEPOSIT') {
                await subscriptionRepository.upgradeToDeposit(merchantId);
            } else if (type === 'MONTHLY') {
                // Default to 1 month if not specified
                await subscriptionRepository.upgradeToMonthly(merchantId, monthlyPeriodMonths || 1);
            }
        }

        const daysDelta = typeof adjustDays === 'number' ? adjustDays : extendDays;

        // Handle adjust trial/period via repository directly
        if (typeof daysDelta === 'number') {
            const subscription = await subscriptionRepository.getMerchantSubscription(merchantId);
            if (subscription) {
                let newExpiryDate: Date | null = null;
                const previousExpiryDate = subscription.type === 'TRIAL'
                    ? subscription.trialEndsAt
                    : subscription.currentPeriodEnd;
                
                if (subscription.type === 'TRIAL' && subscription.trialEndsAt) {
                    const newTrialEnd = new Date(subscription.trialEndsAt);
                    newTrialEnd.setDate(newTrialEnd.getDate() + daysDelta);
                    await subscriptionRepository.updateMerchantSubscription(merchantId, {
                        trialEndsAt: newTrialEnd,
                    });
                    newExpiryDate = newTrialEnd;
                } else if (subscription.type === 'MONTHLY') {
                    // Extend monthly subscription by days
                    const currentEnd = subscription.currentPeriodEnd || new Date();
                    const newEnd = new Date(currentEnd);
                    newEnd.setDate(newEnd.getDate() + daysDelta);
                    await subscriptionRepository.updateMerchantSubscription(merchantId, {
                        currentPeriodEnd: newEnd,
                    });
                    newExpiryDate = newEnd;
                }

                if (newExpiryDate) {
                    const daysLabel = Math.abs(daysDelta);
                    const reason = daysDelta > 0
                        ? `Subscription extended by ${daysLabel} day(s)`
                        : `Subscription reduced by ${daysLabel} day(s)`;

                    try {
                        await subscriptionHistoryService.recordPeriodAdjusted(
                            merchantId,
                            previousExpiryDate ?? null,
                            newExpiryDate,
                            daysDelta,
                            reason,
                            'ADMIN',
                            context.userId,
                            subscription.type,
                            subscription.type,
                            {
                                source: 'ADMIN_ADJUST',
                                flowId: `subscription-adjust-${merchantId.toString()}-${Date.now()}`,
                                flowType: 'SUBSCRIPTION_ADJUSTMENT',
                            }
                        );
                    } catch (historyError) {
                        console.error('Failed to record subscription adjustment history:', historyError);
                    }
                }

                // Send email notification for subscription extension
                if (newExpiryDate && daysDelta > 0) {
                    const merchant = await prisma.merchant.findUnique({
                        where: { id: merchantId },
                        select: { name: true, email: true, country: true, timezone: true },
                    });

                    const admin = await prisma.user.findUnique({
                        where: { id: context.userId },
                        select: { name: true },
                    });

                    if (merchant?.email) {
                        try {
                            await emailService.sendSubscriptionExtensionNotification({
                                to: merchant.email,
                                merchantName: merchant.name,
                                daysExtended: daysDelta,
                                newExpiryDate: newExpiryDate,
                                merchantCountry: merchant.country,
                                merchantTimezone: merchant.timezone,
                                extendedBy: admin?.name || 'Administrator',
                            });
                            console.log(`✅ Subscription extension email sent to ${merchant.email}`);
                        } catch (emailError) {
                            console.error('Failed to send subscription extension email:', emailError);
                        }
                    }
                }
            }
        }

        // Handle status change (only if type wasn't changed, since type change sets status)
        if (status && !type) {
            if (status === 'SUSPENDED' && suspendReason) {
                await subscriptionRepository.suspendSubscription(merchantId, suspendReason);
            } else if (status === 'ACTIVE') {
                await subscriptionRepository.reactivateSubscription(merchantId);
            }
        }

        const updatedStatus = await subscriptionService.getSubscriptionStatus(merchantId);

        return NextResponse.json({
            success: true,
            message: 'Subscription updated successfully',
            data: serializeBigInt(updatedStatus),
        });
    } catch (error: unknown) {
        console.error('Error updating subscription:', error);

        if (error instanceof Error && error.message.includes('not found')) {
            return NextResponse.json(
                { success: false, error: 'NOT_FOUND', message: error.message },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to update subscription' },
            { status: 500 }
        );
    }
}

export const GET = withSuperAdmin(handleGet);
export const PUT = withSuperAdmin(handlePut);
