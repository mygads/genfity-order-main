/**
 * Customer Push Notification Service
 * Sends push notifications to customers for order status updates
 * 
 * Works with both:
 * - Logged-in customers (via customerId)
 * - Guest users (via orderNumber)
 */

import prisma from '@/lib/db/client';
import webPushService from '@/lib/services/WebPushService';

export class CustomerPushService {
    /**
     * Send push notification for order status update
     * Finds all subscriptions associated with this order and sends push
     */
    static async notifyOrderStatusChange(
        orderNumber: string,
        status: 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED',
        merchantName: string,
        merchantCode: string,
        customerId?: bigint | null,
        orderType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'
    ): Promise<number> {
        let sentCount = 0;

        try {
            // Check if push is configured
            if (!webPushService.isConfigured()) {
                console.log('[CustomerPush] Push not configured, skipping');
                return 0;
            }

            // Find all subscriptions for this order
            // Either by customerId or by orderNumber in the array
            const subscriptions = await prisma.customerPushSubscription.findMany({
                where: {
                    isActive: true,
                    OR: [
                        // Match by customerId if provided
                        ...(customerId ? [{ customerId }] : []),
                        // Match by orderNumber in array
                        { orderNumbers: { has: orderNumber } },
                    ],
                },
            });

            console.log(`[CustomerPush] Found ${subscriptions.length} subscriptions for order ${orderNumber}`);

            // Send push to each subscription
            for (const subscription of subscriptions) {
                try {
                    const result = await webPushService.sendOrderStatusNotificationDetailed(
                        {
                            endpoint: subscription.endpoint,
                            keys: {
                                p256dh: subscription.p256dhKey,
                                auth: subscription.authKey,
                            },
                        },
                        orderNumber,
                        status,
                        merchantName,
                        merchantCode,
                        'id', // Default to Indonesian locale
                        orderType
                    );

                    if (result.success) {
                        sentCount++;
                        console.log(`[CustomerPush] Sent notification to subscription ${subscription.id}`);
                    } else {
                        console.log(`[CustomerPush] Failed to send to subscription ${subscription.id}`);

                        // If subscription is invalid (expired/unsubscribed), mark inactive.
                        if (result.statusCode === 404 || result.statusCode === 410) {
                            const updated = await prisma.customerPushSubscription.updateMany({
                                where: { endpoint: subscription.endpoint },
                                data: { isActive: false },
                            });
                            console.log(
                                `[CustomerPush] Marked subscription(s) inactive for endpoint (rows: ${updated.count}) - last id ${subscription.id}`
                            );
                        }
                    }
                } catch (pushError) {
                    console.error(`[CustomerPush] Error sending to subscription ${subscription.id}:`, pushError);

                    // If subscription is invalid, mark as inactive
                    if (pushError instanceof Error && 'statusCode' in pushError) {
                        const statusCode = (pushError as { statusCode: number }).statusCode;
                        if (statusCode === 404 || statusCode === 410) {
                            const updated = await prisma.customerPushSubscription.updateMany({
                                where: { endpoint: subscription.endpoint },
                                data: { isActive: false },
                            });
                            console.log(
                                `[CustomerPush] Marked subscription(s) inactive for endpoint (rows: ${updated.count}) - last id ${subscription.id}`
                            );
                        }
                    }
                }
            }

            return sentCount;
        } catch (error) {
            console.error('[CustomerPush] Error notifying order status change:', error);
            return sentCount;
        }
    }

    /**
     * Send push notification when driver picks up a delivery order
     */
    static async notifyDeliveryPickedUp(
        orderNumber: string,
        merchantName: string,
        merchantCode: string,
        customerId?: bigint | null
    ): Promise<number> {
        let sentCount = 0;

        try {
            if (!webPushService.isConfigured()) {
                console.log('[CustomerPush] Push not configured, skipping');
                return 0;
            }

            const subscriptions = await prisma.customerPushSubscription.findMany({
                where: {
                    isActive: true,
                    OR: [
                        ...(customerId ? [{ customerId }] : []),
                        { orderNumbers: { has: orderNumber } },
                    ],
                },
            });

            console.log(`[CustomerPush] Found ${subscriptions.length} subscriptions for delivery pickup ${orderNumber}`);

            for (const subscription of subscriptions) {
                try {
                    const result = await webPushService.sendDeliveryPickedUpNotificationDetailed(
                        {
                            endpoint: subscription.endpoint,
                            keys: {
                                p256dh: subscription.p256dhKey,
                                auth: subscription.authKey,
                            },
                        },
                        orderNumber,
                        merchantName,
                        merchantCode,
                        'id'
                    );

                    if (result.success) {
                        sentCount++;
                        console.log(`[CustomerPush] Sent delivery pickup notification to subscription ${subscription.id}`);
                    } else if (result.statusCode === 404 || result.statusCode === 410) {
                        const updated = await prisma.customerPushSubscription.updateMany({
                            where: { endpoint: subscription.endpoint },
                            data: { isActive: false },
                        });
                        console.log(
                            `[CustomerPush] Marked subscription(s) inactive for endpoint (rows: ${updated.count}) - last id ${subscription.id}`
                        );
                    }
                } catch (pushError) {
                    console.error(`[CustomerPush] Error sending delivery pickup to subscription ${subscription.id}:`, pushError);

                    if (pushError instanceof Error && 'statusCode' in pushError) {
                        const statusCode = (pushError as { statusCode: number }).statusCode;
                        if (statusCode === 404 || statusCode === 410) {
                            const updated = await prisma.customerPushSubscription.updateMany({
                                where: { endpoint: subscription.endpoint },
                                data: { isActive: false },
                            });
                            console.log(
                                `[CustomerPush] Marked subscription(s) inactive for endpoint (rows: ${updated.count}) - last id ${subscription.id}`
                            );
                        }
                    }
                }
            }

            return sentCount;
        } catch (error) {
            console.error('[CustomerPush] Error notifying delivery picked up:', error);
            return sentCount;
        }
    }
}

export default CustomerPushService;
