/**
 * Public Push Subscription API
 * Allows both logged-in and guest users to subscribe to push notifications
 * POST /api/public/push/subscribe - Subscribe to push notifications
 * DELETE /api/public/push/subscribe - Unsubscribe from push notifications
 * GET /api/public/push/subscribe - Get VAPID public key
 */

import { NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import webPushService from '@/lib/services/WebPushService';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * Subscribe to push notifications (public - no auth required)
 * For guest users: links subscription to order number(s)
 * For logged-in users: links subscription to customer ID
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { subscription, orderNumbers, customerId, userAgent } = body;

        let parsedCustomerId: bigint | null = null;
        if (customerId !== undefined && customerId !== null && customerId !== '') {
            const customerIdValue = typeof customerId === 'bigint' ? customerId.toString() : String(customerId).trim();
            if (!/^\d+$/.test(customerIdValue)) {
                return NextResponse.json(
                    { success: false, error: 'VALIDATION_ERROR', message: 'Invalid customerId' },
                    { status: 400 }
                );
            }

            parsedCustomerId = BigInt(customerIdValue);
        }

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

        // Check if subscription already exists by endpoint
        const existingSubscription = await prisma.customerPushSubscription.findFirst({
            where: {
                endpoint: subscription.endpoint,
            },
        });

        if (existingSubscription) {
            // Update existing subscription
            const orderNumbersArray = orderNumbers || [];
            const existingOrderNumbers = existingSubscription.orderNumbers || [];
            const mergedOrderNumbers = [...new Set([...existingOrderNumbers, ...orderNumbersArray])];

            const updated = await prisma.customerPushSubscription.update({
                where: { id: existingSubscription.id },
                data: {
                    p256dhKey: subscription.keys.p256dh,
                    authKey: subscription.keys.auth,
                    customerId: parsedCustomerId ?? existingSubscription.customerId,
                    orderNumbers: mergedOrderNumbers,
                    userAgent: userAgent || existingSubscription.userAgent,
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
        const newSubscription = await prisma.customerPushSubscription.create({
            data: {
                endpoint: subscription.endpoint,
                p256dhKey: subscription.keys.p256dh,
                authKey: subscription.keys.auth,
                customerId: parsedCustomerId,
                orderNumbers: orderNumbers || [],
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
        console.error('Customer push subscription error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to save subscription' },
            { status: 500 }
        );
    }
}

/**
 * Add order number to existing subscription
 */
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { endpoint, orderNumber } = body;

        if (!endpoint || !orderNumber) {
            return NextResponse.json(
                { success: false, error: 'Endpoint and orderNumber are required' },
                { status: 400 }
            );
        }

        const subscription = await prisma.customerPushSubscription.findFirst({
            where: { endpoint, isActive: true },
        });

        if (!subscription) {
            return NextResponse.json(
                { success: false, error: 'Subscription not found' },
                { status: 404 }
            );
        }

        const orderNumbers = subscription.orderNumbers || [];
        if (!orderNumbers.includes(orderNumber)) {
            orderNumbers.push(orderNumber);
        }

        const updated = await prisma.customerPushSubscription.update({
            where: { id: subscription.id },
            data: {
                orderNumbers,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Order added to subscription',
            data: serializeBigInt(updated),
        });
    } catch (error) {
        console.error('Add order to subscription error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to add order' },
            { status: 500 }
        );
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const endpoint = searchParams.get('endpoint');

        if (!endpoint) {
            return NextResponse.json(
                { success: false, error: 'Endpoint parameter is required' },
                { status: 400 }
            );
        }

        const deleted = await prisma.customerPushSubscription.updateMany({
            where: { endpoint },
            data: { isActive: false },
        });

        return NextResponse.json({
            success: true,
            message: deleted.count > 0 ? 'Subscription deactivated' : 'Subscription not found',
        });
    } catch (error) {
        console.error('Customer push unsubscribe error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to unsubscribe' },
            { status: 500 }
        );
    }
}

/**
 * Get VAPID public key for client-side subscription
 */
export async function GET() {
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
}
