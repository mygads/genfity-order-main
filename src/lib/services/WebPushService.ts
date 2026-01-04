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
        if (!this.isConfigured()) {
            console.warn('Web push is not configured. Set VAPID keys in environment.');
            return false;
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
                icon: payload.icon || '/images/logo/genfity-icon-192.png',
                badge: payload.badge || '/images/logo/genfity-badge-72.png',
                tag: payload.tag,
                data: payload.data,
                actions: payload.actions,
                requireInteraction: payload.requireInteraction ?? false,
                vibrate: payload.vibrate || [200, 100, 200],
            });

            await webpush.sendNotification(pushSubscription, notificationPayload);
            return true;
        } catch (error) {
            console.error('Push notification failed:', error);
            
            // Check if subscription is expired/invalid
            if (error instanceof Error && 'statusCode' in error) {
                const statusCode = (error as { statusCode: number }).statusCode;
                if (statusCode === 404 || statusCode === 410) {
                    // Subscription no longer valid - should be removed
                    console.log('Subscription expired or invalid:', subscription.endpoint);
                }
            }
            
            return false;
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
}

const webPushService = new WebPushService();
export default webPushService;
