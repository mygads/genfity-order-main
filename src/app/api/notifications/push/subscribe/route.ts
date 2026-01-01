/**
 * Push Subscription API
 * Manages Web Push notification subscriptions
 * POST /api/notifications/push/subscribe - Subscribe to push notifications
 * DELETE /api/notifications/push/subscribe - Unsubscribe from push notifications
 */

import { NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import webPushService from '@/lib/services/WebPushService';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * Subscribe to push notifications
 */
export const POST = withAuth(async (
    request: Request,
    authContext: AuthContext
) => {
    try {
        const { userId, merchantId } = authContext;
        const body = await request.json();
        const { subscription, userAgent } = body;

        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return NextResponse.json(
                { success: false, error: 'Invalid subscription data' },
                { status: 400 }
            );
        }

        // Check if push is configured
        if (!webPushService.isConfigured()) {
            return NextResponse.json(
                { success: false, error: 'Push notifications are not configured' },
                { status: 503 }
            );
        }

        // Check if subscription already exists
        const existingSubscription = await prisma.pushSubscription.findFirst({
            where: {
                userId,
                endpoint: subscription.endpoint,
            },
        });

        if (existingSubscription) {
            // Update existing subscription
            const updated = await prisma.pushSubscription.update({
                where: { id: existingSubscription.id },
                data: {
                    p256dhKey: subscription.keys.p256dh,
                    authKey: subscription.keys.auth,
                    merchantId: merchantId ? BigInt(merchantId) : null,
                    userAgent: userAgent || null,
                    isActive: true,
                    updatedAt: new Date(),
                },
            });

            return NextResponse.json({
                success: true,
                message: 'Subscription updated',
                data: serializeBigInt(updated),
            });
        }

        // Create new subscription
        const newSubscription = await prisma.pushSubscription.create({
            data: {
                userId,
                endpoint: subscription.endpoint,
                p256dhKey: subscription.keys.p256dh,
                authKey: subscription.keys.auth,
                merchantId: merchantId ? BigInt(merchantId) : null,
                userAgent: userAgent || null,
                isActive: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Subscription created',
            data: serializeBigInt(newSubscription),
        });
    } catch (error) {
        console.error('Push subscription error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save subscription' },
            { status: 500 }
        );
    }
});

/**
 * Unsubscribe from push notifications
 */
export const DELETE = withAuth(async (
    request: Request,
    authContext: AuthContext
) => {
    try {
        const { userId } = authContext;
        const { searchParams } = new URL(request.url);
        const endpoint = searchParams.get('endpoint');

        if (!endpoint) {
            // Delete all subscriptions for user
            const deleted = await prisma.pushSubscription.updateMany({
                where: { userId },
                data: { isActive: false },
            });

            return NextResponse.json({
                success: true,
                message: `Deactivated ${deleted.count} subscription(s)`,
            });
        }

        // Delete specific subscription
        const deleted = await prisma.pushSubscription.updateMany({
            where: {
                userId,
                endpoint,
            },
            data: { isActive: false },
        });

        return NextResponse.json({
            success: true,
            message: deleted.count > 0 ? 'Subscription deactivated' : 'Subscription not found',
        });
    } catch (error) {
        console.error('Push unsubscribe error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to unsubscribe' },
            { status: 500 }
        );
    }
});

/**
 * Get VAPID public key for client-side subscription
 */
export const GET = async () => {
    try {
        const vapidPublicKey = webPushService.getVapidPublicKey();

        if (!vapidPublicKey) {
            return NextResponse.json(
                { success: false, error: 'Push notifications not configured' },
                { status: 503 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                vapidPublicKey,
            },
        });
    } catch (error) {
        console.error('Get VAPID key error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get VAPID key' },
            { status: 500 }
        );
    }
};
