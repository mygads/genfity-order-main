/**
 * Web Push Notification Service
 * Handles web push notifications using the Web Push API
 * 
 * Features:
 * - Push subscription management
 * - Send push notifications for subscription expiry warnings
 * - Trial ending alerts
 * - Grace period warnings
 * - Low balance alerts
 */

import webpush from 'web-push';
import { enqueueNotificationJob } from '@/lib/queue/notificationJobsQueue';
import { randomUUID } from 'crypto';

const DEBUG_PUSH = process.env.DEBUG_PUSH === 'true';
const pushLog = (...args: unknown[]) => {
    if (DEBUG_PUSH) {
        // eslint-disable-next-line no-console
        console.log(...args);
    }
};

// Configure VAPID keys - these should be set in environment variables
// Generate keys using: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'admin@genfity.com';

// Only configure if keys are present
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
        `mailto:${VAPID_EMAIL}`,
        VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY
    );
}

export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface PushNotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, unknown>;
    actions?: Array<{
        action: string;
        title: string;
        icon?: string;
    }>;
    requireInteraction?: boolean;
    vibrate?: number[];
}

export interface PushSendResult {
    success: boolean;
    statusCode?: number;
}

type OrderStatusForPush = 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
type OrderTypeForPush = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

// Note: StoredSubscription interface is used for reference/documentation
// The actual Prisma model is used for database operations
interface _StoredSubscription {
    id: bigint;
    userId: bigint;
    endpoint: string;
    p256dhKey: string;
    authKey: string;
    merchantId?: bigint;
    userAgent?: string;
    isActive: boolean;
    createdAt: Date;
}

class WebPushService {
    /**
     * Check if push notifications are properly configured
     */
    isConfigured(): boolean {
        return Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
    }

    /**
     * Get the public VAPID key for client-side subscription
     */
    getVapidPublicKey(): string {
        return VAPID_PUBLIC_KEY;
    }

    /**
     * Send push notification to a subscription
     */
    async sendPushNotification(
        subscription: PushSubscription,
        payload: PushNotificationPayload
    ): Promise<boolean> {
        const result = await this.sendPushNotificationDetailed(subscription, payload);
        return result.success;
    }

    /**
     * Send push notification but return statusCode for invalid subscriptions.
     * This lets callers deactivate 410/404 endpoints in the database.
     */
    async sendPushNotificationDetailed(
        subscription: PushSubscription,
        payload: PushNotificationPayload
    ): Promise<PushSendResult> {
        if (!this.isConfigured()) {
            console.warn('Web push is not configured. Set VAPID keys in environment.');
            return { success: false };
        }

        const canEnqueue = Boolean(process.env.RABBITMQ_URL) && process.env.RABBITMQ_WORKER !== '1';
        if (canEnqueue) {
            try {
                const queued = await enqueueNotificationJob({
                    kind: 'push.webpush_raw',
                    payload: {
                        kind: 'push.webpush_raw',
                        idempotencyKey: randomUUID(),
                        subscription: {
                            endpoint: subscription.endpoint,
                            keys: {
                                p256dh: subscription.keys.p256dh,
                                auth: subscription.keys.auth,
                            },
                        },
                        payload,
                    },
                });

                if (queued.ok) {
                    return { success: true };
                }
            } catch (err) {
                console.error('[WebPushService] failed to enqueue push job:', err);
            }
            // Fallback to direct sending below.
        }

        try {
            const pushSubscription = {
                endpoint: subscription.endpoint,
                keys: {
                    p256dh: subscription.keys.p256dh,
                    auth: subscription.keys.auth,
                },
            };

            const notificationPayload = JSON.stringify({
                title: payload.title,
                body: payload.body,
                icon: payload.icon || '/images/logo/icon.png',
                badge: payload.badge || '/images/logo/icon.png',
                tag: payload.tag,
                data: payload.data,
                actions: payload.actions,
                requireInteraction: payload.requireInteraction ?? false,
                vibrate: payload.vibrate || [200, 100, 200],
            });

            const ttlSeconds = 60 * 60; // 1 hour
            await webpush.sendNotification(pushSubscription, notificationPayload, {
                TTL: Math.max(0, Math.floor(ttlSeconds)),
            });
            return { success: true };
        } catch (error) {
            console.error('Push notification failed:', error);

            if (error instanceof Error && 'statusCode' in error) {
                const statusCode = (error as { statusCode: number }).statusCode;
                if (statusCode === 404 || statusCode === 410) {
                    pushLog('Subscription expired or invalid:', subscription.endpoint);
                    return { success: false, statusCode };
                }
                return { success: false, statusCode };
            }

            return { success: false };
        }
    }

    /**
     * Send trial ending push notification
     */
    async sendTrialEndingNotification(
        subscription: PushSubscription,
        daysRemaining: number,
        merchantName: string,
        locale: string = 'en'
    ): Promise<boolean> {
        const payload: PushNotificationPayload = {
            title: locale === 'id'
                ? `⏰ Trial Berakhir dalam ${daysRemaining} Hari`
                : `⏰ Trial Ends in ${daysRemaining} Days`,
            body: locale === 'id'
                ? `Trial ${merchantName} akan berakhir. Upgrade sekarang untuk melanjutkan!`
                : `Your ${merchantName} trial is ending soon. Upgrade now to continue!`,
            tag: 'trial-ending',
            data: {
                type: 'TRIAL_ENDING',
                daysRemaining,
                url: '/admin/dashboard/subscription/upgrade',
            },
            actions: [
                {
                    action: 'upgrade',
                    title: locale === 'id' ? 'Upgrade Sekarang' : 'Upgrade Now',
                },
                {
                    action: 'dismiss',
                    title: locale === 'id' ? 'Nanti' : 'Later',
                },
            ],
            requireInteraction: daysRemaining <= 3,
        };

        return this.sendPushNotification(subscription, payload);
    }

    /**
     * Send grace period warning push notification
     */
    async sendGracePeriodNotification(
        subscription: PushSubscription,
        daysRemaining: number,
        merchantName: string,
        subscriptionType: 'TRIAL' | 'MONTHLY',
        locale: string = 'en'
    ): Promise<boolean> {
        const typeText = locale === 'id'
            ? (subscriptionType === 'TRIAL' ? 'Trial' : 'Langganan bulanan')
            : (subscriptionType === 'TRIAL' ? 'Trial' : 'Monthly subscription');

        const payload: PushNotificationPayload = {
            title: locale === 'id'
                ? `⚠️ Grace Period: ${daysRemaining} Hari Tersisa`
                : `⚠️ Grace Period: ${daysRemaining} Days Left`,
            body: locale === 'id'
                ? `${typeText} ${merchantName} sudah berakhir. Bayar sekarang atau toko akan ditangguhkan!`
                : `Your ${merchantName} ${typeText.toLowerCase()} has expired. Pay now or your store will be suspended!`,
            tag: 'grace-period',
            data: {
                type: 'GRACE_PERIOD',
                daysRemaining,
                subscriptionType,
                url: '/admin/dashboard/subscription/upgrade',
            },
            actions: [
                {
                    action: 'pay',
                    title: locale === 'id' ? 'Bayar Sekarang' : 'Pay Now',
                },
            ],
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
        };

        return this.sendPushNotification(subscription, payload);
    }

    /**
     * Send subscription suspended push notification
     */
    async sendSuspendedNotification(
        subscription: PushSubscription,
        merchantName: string,
        reason: string,
        locale: string = 'en'
    ): Promise<boolean> {
        const payload: PushNotificationPayload = {
            title: locale === 'id'
                ? '🔴 Toko Ditangguhkan'
                : '🔴 Store Suspended',
            body: locale === 'id'
                ? `${merchantName} telah ditangguhkan: ${reason}. Aktifkan kembali untuk menerima pesanan.`
                : `${merchantName} has been suspended: ${reason}. Reactivate to accept orders.`,
            tag: 'suspended',
            data: {
                type: 'SUSPENDED',
                reason,
                url: '/admin/dashboard/subscription/topup',
            },
            actions: [
                {
                    action: 'reactivate',
                    title: locale === 'id' ? 'Aktifkan' : 'Reactivate',
                },
            ],
            requireInteraction: true,
        };

        return this.sendPushNotification(subscription, payload);
    }

    /**
     * Send low balance push notification
     */
    async sendLowBalanceNotification(
        subscription: PushSubscription,
        merchantName: string,
        balance: number,
        estimatedOrders: number,
        currency: string,
        locale: string = 'en'
    ): Promise<boolean> {
        const formattedBalance = new Intl.NumberFormat(
            locale === 'id' ? 'id-ID' : 'en-AU',
            { style: 'currency', currency }
        ).format(balance);

        const payload: PushNotificationPayload = {
            title: locale === 'id'
                ? '💰 Saldo Rendah'
                : '💰 Low Balance',
            body: locale === 'id'
                ? `Saldo ${merchantName}: ${formattedBalance}. Cukup untuk ~${estimatedOrders} pesanan. Top up sekarang!`
                : `${merchantName} balance: ${formattedBalance}. Enough for ~${estimatedOrders} orders. Top up now!`,
            tag: 'low-balance',
            data: {
                type: 'LOW_BALANCE',
                balance,
                estimatedOrders,
                url: '/admin/dashboard/subscription/topup',
            },
            actions: [
                {
                    action: 'topup',
                    title: locale === 'id' ? 'Top Up' : 'Top Up',
                },
            ],
            requireInteraction: estimatedOrders <= 5,
        };

        return this.sendPushNotification(subscription, payload);
    }

    /**
     * Send new order push notification
     */
    async sendNewOrderNotification(
        subscription: PushSubscription,
        orderNumber: string,
        customerName: string,
        totalAmount: number,
        currency: string,
        locale: string = 'en'
    ): Promise<boolean> {
        const formattedAmount = new Intl.NumberFormat(
            locale === 'id' ? 'id-ID' : 'en-AU',
            { style: 'currency', currency }
        ).format(totalAmount);

        const payload: PushNotificationPayload = {
            title: locale === 'id'
                ? `🔔 Pesanan Baru #${orderNumber}`
                : `🔔 New Order #${orderNumber}`,
            body: locale === 'id'
                ? `${customerName} - ${formattedAmount}`
                : `${customerName} - ${formattedAmount}`,
            tag: `order-${orderNumber}`,
            data: {
                type: 'NEW_ORDER',
                orderNumber,
                url: `/admin/dashboard/orders`,
            },
            actions: [
                {
                    action: 'view',
                    title: locale === 'id' ? 'Lihat' : 'View',
                },
                {
                    action: 'accept',
                    title: locale === 'id' ? 'Terima' : 'Accept',
                },
            ],
            requireInteraction: true,
            vibrate: [300, 100, 300],
        };

        return this.sendPushNotification(subscription, payload);
    }

    /**
     * Send negative balance warning push notification
     * Sent immediately when balance goes negative after order acceptance
     */
    async sendNegativeBalanceNotification(
        subscription: PushSubscription,
        merchantName: string,
        balance: number,
        orderNumber: string,
        currency: string,
        locale: string = 'en'
    ): Promise<boolean> {
        const formattedBalance = new Intl.NumberFormat(
            locale === 'id' ? 'id-ID' : 'en-AU',
            { style: 'currency', currency }
        ).format(Math.abs(balance));

        const payload: PushNotificationPayload = {
            title: locale === 'id'
                ? '⚠️ Saldo Negatif!'
                : '⚠️ Negative Balance!',
            body: locale === 'id'
                ? `Saldo ${merchantName}: -${formattedBalance} setelah pesanan #${orderNumber}. Top up sebelum tengah malam untuk menghindari penutupan toko.`
                : `${merchantName} balance: -${formattedBalance} after order #${orderNumber}. Top up before midnight to avoid store closure.`,
            tag: 'negative-balance',
            data: {
                type: 'NEGATIVE_BALANCE',
                balance,
                orderNumber,
                url: '/admin/dashboard/subscription/topup',
            },
            actions: [
                {
                    action: 'topup',
                    title: locale === 'id' ? 'Top Up Sekarang' : 'Top Up Now',
                },
            ],
            requireInteraction: true,
            vibrate: [500, 200, 500, 200, 500],
        };

        return this.sendPushNotification(subscription, payload);
    }

    /**
     * Send low stock alert push notification (merchant-side)
     */
    async sendLowStockNotification(
        subscription: PushSubscription,
        merchantName: string,
        itemName: string,
        remainingQty: number,
        threshold: number,
        locale: string = 'en'
    ): Promise<boolean> {
        const payload: PushNotificationPayload = {
            title: locale === 'id'
                ? '⚠️ Stok Menipis'
                : '⚠️ Low Stock Alert',
            body: locale === 'id'
                ? `${merchantName}: "${itemName}" tersisa ${remainingQty} (batas ${threshold}).`
                : `${merchantName}: "${itemName}" is low (${remainingQty} left; threshold ${threshold}).`,
            tag: `low-stock-${itemName}`,
            data: {
                type: 'LOW_STOCK',
                itemName,
                remainingQty,
                threshold,
                url: '/admin/dashboard/menu',
            },
            requireInteraction: false,
            vibrate: [200, 100, 200],
        };

        return this.sendPushNotification(subscription, payload);
    }

    /**
     * Send out of stock alert push notification (merchant-side)
     */
    async sendOutOfStockNotification(
        subscription: PushSubscription,
        merchantName: string,
        itemName: string,
        locale: string = 'en'
    ): Promise<boolean> {
        const payload: PushNotificationPayload = {
            title: locale === 'id'
                ? '❌ Stok Habis'
                : '❌ Out of Stock',
            body: locale === 'id'
                ? `${merchantName}: "${itemName}" sekarang habis stok.`
                : `${merchantName}: "${itemName}" is now out of stock.`,
            tag: `out-of-stock-${itemName}`,
            data: {
                type: 'OUT_OF_STOCK',
                itemName,
                url: '/admin/dashboard/menu',
            },
            requireInteraction: true,
            vibrate: [300, 100, 300],
        };

        return this.sendPushNotification(subscription, payload);
    }

    /**
     * Send order status update push notification to customer
     * Used for customer-facing notifications (order ready, completed, etc.)
     */
    async sendOrderStatusNotification(
        subscription: PushSubscription,
        orderNumber: string,
        status: 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED',
        merchantName: string,
        merchantCode: string,
        locale: string = 'en'
    ): Promise<boolean> {
        const statusMessages: Record<string, { title: string; body: string; emoji: string }> = {
            PREPARING: {
                title: locale === 'id'
                    ? `🍳 Pesanan #${orderNumber} Diproses`
                    : `🍳 Order #${orderNumber} Being Prepared`,
                body: locale === 'id'
                    ? `${merchantName} sedang menyiapkan pesanan Anda`
                    : `${merchantName} is preparing your order`,
                emoji: '🍳',
            },
            READY: {
                title: locale === 'id'
                    ? `✅ Pesanan #${orderNumber} Siap!`
                    : `✅ Order #${orderNumber} Ready!`,
                body: locale === 'id'
                    ? `Pesanan Anda di ${merchantName} siap diambil`
                    : `Your order at ${merchantName} is ready for pickup`,
                emoji: '✅',
            },
            COMPLETED: {
                title: locale === 'id'
                    ? `🎉 Pesanan #${orderNumber} Selesai`
                    : `🎉 Order #${orderNumber} Completed`,
                body: locale === 'id'
                    ? `Terima kasih telah memesan di ${merchantName}!`
                    : `Thank you for ordering at ${merchantName}!`,
                emoji: '🎉',
            },
            CANCELLED: {
                title: locale === 'id'
                    ? `❌ Pesanan #${orderNumber} Dibatalkan`
                    : `❌ Order #${orderNumber} Cancelled`,
                body: locale === 'id'
                    ? `Pesanan Anda di ${merchantName} telah dibatalkan`
                    : `Your order at ${merchantName} has been cancelled`,
                emoji: '❌',
            },
        };

        const message = statusMessages[status];
        if (!message) {
            console.warn(`Unknown order status: ${status}`);
            return false;
        }

        const payload: PushNotificationPayload = {
            title: message.title,
            body: message.body,
            tag: `order-status-${orderNumber}`,
            data: {
                type: 'ORDER_STATUS',
                orderNumber,
                status,
                merchantCode,
                orderUrl: `/${merchantCode}/order-status/${orderNumber}`,
            },
            actions: [
                {
                    action: 'track',
                    title: locale === 'id' ? 'Lacak Pesanan' : 'Track Order',
                },
            ],
            requireInteraction: status === 'READY', // Require interaction for READY status
            vibrate: status === 'READY' ? [300, 100, 300, 100, 300] : [200, 100, 200],
        };

        return this.sendPushNotification(subscription, payload);
    }

    async sendOrderStatusNotificationDetailed(
        subscription: PushSubscription,
        orderNumber: string,
        status: OrderStatusForPush,
        merchantName: string,
        merchantCode: string,
        locale: string = 'en',
        orderType?: OrderTypeForPush
    ): Promise<PushSendResult> {
        const statusMessages: Record<string, { title: string; body: string; emoji: string }> = {
            PREPARING: {
                title: locale === 'id'
                    ? `🍳 Pesanan #${orderNumber} Diproses`
                    : `🍳 Order #${orderNumber} Being Prepared`,
                body: locale === 'id'
                    ? `${merchantName} sedang menyiapkan pesanan Anda`
                    : `${merchantName} is preparing your order`,
                emoji: '🍳',
            },
            READY: {
                title: locale === 'id'
                    ? `✅ Pesanan #${orderNumber} Siap!`
                    : `✅ Order #${orderNumber} Ready!`,
                body: locale === 'id'
                    ? (orderType === 'DELIVERY'
                        ? `Pesanan Anda di ${merchantName} sudah siap dan akan segera dijemput driver.`
                        : `Pesanan Anda di ${merchantName} siap diambil`)
                    : (orderType === 'DELIVERY'
                        ? `Your order at ${merchantName} is ready and will be picked up by the driver.`
                        : `Your order at ${merchantName} is ready for pickup`),
                emoji: '✅',
            },
            COMPLETED: {
                title: locale === 'id'
                    ? `🎉 Pesanan #${orderNumber} Selesai`
                    : `🎉 Order #${orderNumber} Completed`,
                body: locale === 'id'
                    ? `Terima kasih telah memesan di ${merchantName}!`
                    : `Thank you for ordering at ${merchantName}!`,
                emoji: '🎉',
            },
            CANCELLED: {
                title: locale === 'id'
                    ? `❌ Pesanan #${orderNumber} Dibatalkan`
                    : `❌ Order #${orderNumber} Cancelled`,
                body: locale === 'id'
                    ? `Pesanan Anda di ${merchantName} telah dibatalkan`
                    : `Your order at ${merchantName} has been cancelled`,
                emoji: '❌',
            },
        };

        const message = statusMessages[status];
        if (!message) {
            console.warn(`Unknown order status: ${status}`);
            return { success: false };
        }

        const payload: PushNotificationPayload = {
            title: message.title,
            body: message.body,
            tag: `order-status-${orderNumber}`,
            data: {
                type: 'ORDER_STATUS',
                orderNumber,
                status,
                merchantCode,
                orderUrl: `/${merchantCode}/order-status/${orderNumber}`,
            },
            actions: [
                {
                    action: 'track',
                    title: locale === 'id' ? 'Lacak Pesanan' : 'Track Order',
                },
            ],
            requireInteraction: status === 'READY',
            vibrate: status === 'READY' ? [300, 100, 300, 100, 300] : [200, 100, 200],
        };

        return this.sendPushNotificationDetailed(subscription, payload);
    }

    async sendDeliveryPickedUpNotificationDetailed(
        subscription: PushSubscription,
        orderNumber: string,
        merchantName: string,
        merchantCode: string,
        locale: string = 'en'
    ): Promise<PushSendResult> {
        const payload: PushNotificationPayload = {
            title: locale === 'id'
                ? `🛵 Pesanan #${orderNumber} Dijemput Driver`
                : `🛵 Order #${orderNumber} Picked Up`,
            body: locale === 'id'
                ? `Driver sudah menjemput pesanan Anda dari ${merchantName} dan sedang menuju lokasi Anda.`
                : `The driver has picked up your order from ${merchantName} and is on the way to you.`,
            tag: `delivery-picked-up-${orderNumber}`,
            data: {
                type: 'DELIVERY_PICKED_UP',
                orderNumber,
                merchantCode,
                orderUrl: `/${merchantCode}/order-status/${orderNumber}`,
            },
            actions: [
                {
                    action: 'track',
                    title: locale === 'id' ? 'Lacak Pesanan' : 'Track Order',
                },
            ],
            requireInteraction: true,
            vibrate: [300, 100, 300, 100, 300],
        };

        return this.sendPushNotificationDetailed(subscription, payload);
    }
}

const webPushService = new WebPushService();
export default webPushService;

