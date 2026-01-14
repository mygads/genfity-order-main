/**
 * User Notification Service
 * Business logic for in-app notifications with role-based targeting
 */

import prisma from '@/lib/db/client';
import type { UserRole, UserNotificationCategory } from '@prisma/client';
import {
    normalizeNotificationSettings,
    type MerchantTransactionToggleKey,
} from '@/lib/utils/notificationSettings';

interface CreateNotificationParams {
    userId?: bigint;
    merchantId?: bigint;
    targetRole?: UserRole;
    category: UserNotificationCategory;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
    actionUrl?: string;
}

interface NotificationFilters {
    category?: UserNotificationCategory;
    isRead?: boolean;
}

class UserNotificationService {
    private resolveMerchantTransactionToggle(
        category: UserNotificationCategory,
        metadata?: Record<string, unknown> | null,
        title?: string
    ): MerchantTransactionToggleKey | null {
        if (category === 'ORDER') return 'newOrder';
        if (category === 'PAYMENT') return 'payment';
        if (category === 'SUBSCRIPTION') return 'subscription';

        if (category === 'STOCK') {
            const type = typeof metadata?.type === 'string' ? metadata.type : undefined;
            if (type === 'OUT_OF_STOCK') return 'stockOut';
            if (type === 'LOW_STOCK') return 'lowStock';

            // Fallback for older callers
            if (title?.toLowerCase().includes('out of stock')) return 'stockOut';
            if (title?.toLowerCase().includes('low stock')) return 'lowStock';

            return 'lowStock';
        }

        return null;
    }

    private async getUserSettingsMap(userIds: bigint[]) {
        const map = new Map<string, ReturnType<typeof normalizeNotificationSettings>>();
        if (userIds.length === 0) return map;

        const prefs = await prisma.userPreference.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, notificationSettings: true },
        });

        for (const p of prefs) {
            map.set(p.userId.toString(), normalizeNotificationSettings(p.notificationSettings));
        }

        return map;
    }

    /**
     * Create a notification for a specific user
     */
    async createForUser(params: CreateNotificationParams) {
        if (params.userId) {
            const pref = await prisma.userPreference.findUnique({
                where: { userId: params.userId },
                select: { notificationSettings: true },
            });
            const settings = normalizeNotificationSettings(pref?.notificationSettings);
            if (!settings.account.transactions) {
                return null;
            }
        }

        return prisma.userNotification.create({
            data: {
                userId: params.userId,
                merchantId: params.merchantId,
                targetRole: params.targetRole,
                category: params.category,
                title: params.title,
                message: params.message,
                metadata: params.metadata ? JSON.parse(JSON.stringify(params.metadata)) : undefined,
                actionUrl: params.actionUrl,
            },
        });
    }

    /**
     * Create notifications for all users of a merchant
     * Respects notification permissions for staff users
     */
    async createForMerchant(
        merchantId: bigint,
        category: UserNotificationCategory,
        title: string,
        message: string,
        options: {
            targetRole?: UserRole;
            metadata?: Record<string, unknown>;
            actionUrl?: string;
        } = {}
    ) {
        // Map notification category to required permission keys.
        // null => no permission required (everyone receives)
        // array => staff must have ANY of these permissions
        const categoryPermissionMap: Record<UserNotificationCategory, string[] | null> = {
            'ORDER': ['notif_new_order'],
            'STOCK': ['notif_stock_out', 'notif_low_stock'],
            'STAFF': null, // Special-case below (owner-only)
            'PAYMENT': ['notif_payment'],
            'SUBSCRIPTION': ['notif_subscription'],
            'SYSTEM': null,
        };

        const requiredPermissions = categoryPermissionMap[category];

        const transactionToggleKey = this.resolveMerchantTransactionToggle(
            category,
            options.metadata ?? null,
            title
        );

        // Get all users associated with this merchant with permissions info
        const merchantUsers = await prisma.merchantUser.findMany({
            where: {
                merchantId,
                isActive: true,
            },
            select: { userId: true, role: true, permissions: true },
        });

        // Filter users based on notification permissions
        const eligibleUsers = merchantUsers.filter(mu => {
            // If targetRole is specified and doesn't match, skip
            if (options.targetRole) {
                if (options.targetRole === 'MERCHANT_OWNER' && mu.role !== 'OWNER') return false;
                if (options.targetRole === 'MERCHANT_STAFF' && mu.role !== 'STAFF') return false;
            }

            // Owners always receive all notifications
            if (mu.role === 'OWNER') return true;

            // Staff-category notifications are owner-only (e.g., staff login/new staff added)
            if (category === 'STAFF') return false;

            // If no permission required (SYSTEM notifications), all users receive
            if (!requiredPermissions) return true;

            // Staff must have at least one required permission
            return requiredPermissions.some(p => mu.permissions?.includes(p) ?? false);
        });

        const finalEligibleUsers = await (async () => {
            if (!transactionToggleKey) return eligibleUsers;

            const staffUserIds = eligibleUsers.filter(u => u.role === 'STAFF').map(u => u.userId);
            const settingsMap = await this.getUserSettingsMap(staffUserIds);

            return eligibleUsers.filter(mu => {
                if (mu.role === 'OWNER') return true;
                const settings = settingsMap.get(mu.userId.toString()) ?? normalizeNotificationSettings(undefined);
                return settings.merchant[transactionToggleKey];
            });
        })();

        // Create notifications for each eligible user
        const notifications = await prisma.userNotification.createMany({
            data: finalEligibleUsers.map(mu => ({
                userId: mu.userId,
                merchantId,
                targetRole: options.targetRole,
                category,
                title,
                message,
                metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : undefined,
                actionUrl: options.actionUrl,
            })),
        });

        return notifications;
    }

    /**
     * Compute which merchant users are eligible for a category based on permissions.
     * Mirrors the filtering rules used by createForMerchant.
     */
    private async getEligibleMerchantUserIds(
        merchantId: bigint,
        category: UserNotificationCategory,
        options: { targetRole?: UserRole } = {}
    ): Promise<bigint[]> {
        const categoryPermissionMap: Record<UserNotificationCategory, string[] | null> = {
            'ORDER': ['notif_new_order'],
            'STOCK': ['notif_stock_out', 'notif_low_stock'],
            'STAFF': null,
            'PAYMENT': ['notif_payment'],
            'SUBSCRIPTION': ['notif_subscription'],
            'SYSTEM': null,
        };

        const requiredPermissions = categoryPermissionMap[category];

        const merchantUsers = await prisma.merchantUser.findMany({
            where: {
                merchantId,
                isActive: true,
            },
            select: { userId: true, role: true, permissions: true },
        });

        const eligibleUsers = merchantUsers.filter(mu => {
            if (options.targetRole) {
                if (options.targetRole === 'MERCHANT_OWNER' && mu.role !== 'OWNER') return false;
                if (options.targetRole === 'MERCHANT_STAFF' && mu.role !== 'STAFF') return false;
            }

            // Owners always receive notifications
            if (mu.role === 'OWNER') return true;

            // Staff-category notifications are owner-only
            if (category === 'STAFF') return false;

            // If no permission required, all users receive
            if (!requiredPermissions) return true;

            return requiredPermissions.some(p => mu.permissions?.includes(p) ?? false);
        });

        return eligibleUsers.map(u => u.userId);
    }

    /**
     * Create notifications for all super admins
     */
    async createForSuperAdmins(
        category: UserNotificationCategory,
        title: string,
        message: string,
        options: {
            metadata?: Record<string, unknown>;
            actionUrl?: string;
        } = {}
    ) {
        const superAdmins = await prisma.user.findMany({
            where: { role: 'SUPER_ADMIN', isActive: true },
            select: { id: true },
        });

        const notifications = await prisma.userNotification.createMany({
            data: superAdmins.map(admin => ({
                userId: admin.id,
                targetRole: 'SUPER_ADMIN' as UserRole,
                category,
                title,
                message,
                metadata: options.metadata ? JSON.parse(JSON.stringify(options.metadata)) : undefined,
                actionUrl: options.actionUrl,
            })),
        });

        return notifications;
    }

    /**
     * Get notifications for a user with pagination
     */
    async getNotifications(
        userId: bigint,
        options: {
            page?: number;
            limit?: number;
            filters?: NotificationFilters;
            allowedCategories?: UserNotificationCategory[];
        } = {}
    ) {
        const { page = 1, limit = 20, filters = {}, allowedCategories } = options;
        const skip = (page - 1) * limit;

        const where = {
            userId,
            ...(filters.category ? { category: filters.category } : {}),
            ...(typeof filters.isRead === 'boolean' ? { isRead: filters.isRead } : {}),
            // Filter by allowed categories if specified
            ...(allowedCategories ? { category: { in: allowedCategories } } : {}),
        };

        const [notifications, total] = await Promise.all([
            prisma.userNotification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            prisma.userNotification.count({ where }),
        ]);

        return {
            notifications,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Get unread count for a user
     * @param allowedCategories - Optional filter for specific notification categories
     */
    async getUnreadCount(userId: bigint, allowedCategories?: UserNotificationCategory[]): Promise<number> {
        return prisma.userNotification.count({
            where: {
                userId,
                isRead: false,
                ...(allowedCategories ? { category: { in: allowedCategories } } : {}),
            },
        });
    }

    /**
     * Mark a notification as read
     */
    async markAsRead(notificationId: bigint, userId: bigint) {
        return prisma.userNotification.updateMany({
            where: {
                id: notificationId,
                userId, // Ensure user owns the notification
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: bigint) {
        return prisma.userNotification.updateMany({
            where: {
                userId,
                isRead: false,
            },
            data: {
                isRead: true,
                readAt: new Date(),
            },
        });
    }

    /**
     * Delete old notifications (cleanup)
     */
    async deleteOldNotifications(daysOld: number = 90) {
        const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

        return prisma.userNotification.deleteMany({
            where: {
                createdAt: { lt: cutoffDate },
                isRead: true,
            },
        });
    }

    // =============================================
    // NOTIFICATION TRIGGER HELPERS
    // =============================================

    /**
     * Notify merchant owner about trial ending
     */
    async notifyTrialEnding(merchantId: bigint, daysRemaining: number) {
        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { name: true },
        });

        return this.createForMerchant(
            merchantId,
            'SUBSCRIPTION',
            daysRemaining === 1
                ? 'Trial Ends Tomorrow!'
                : `Trial Ends in ${daysRemaining} Days`,
            daysRemaining === 1
                ? `Your trial for ${merchant?.name} ends tomorrow. Upgrade now to continue using all features.`
                : `Your trial for ${merchant?.name} ends in ${daysRemaining} days. Consider upgrading to a paid plan.`,
            {
                targetRole: 'MERCHANT_OWNER',
                actionUrl: '/admin/dashboard/subscription',
                metadata: { daysRemaining },
            }
        );
    }

    /**
     * Notify merchant owner about low balance
     */
    async notifyLowBalance(merchantId: bigint, balance: number, estimatedOrders: number) {
        return this.createForMerchant(
            merchantId,
            'SUBSCRIPTION',
            'Low Balance Warning',
            `Your balance can only cover approximately ${estimatedOrders} more orders. Top up now to avoid service interruption.`,
            {
                targetRole: 'MERCHANT_OWNER',
                actionUrl: '/admin/dashboard/subscription/topup',
                metadata: { balance, estimatedOrders },
            }
        );
    }

    /**
     * Notify merchant owner about subscription expired
     */
    async notifySubscriptionExpired(merchantId: bigint) {
        return this.createForMerchant(
            merchantId,
            'SUBSCRIPTION',
            'Subscription Expired',
            'Your subscription has expired. Please renew to continue accepting orders.',
            {
                targetRole: 'MERCHANT_OWNER',
                actionUrl: '/admin/dashboard/subscription',
            }
        );
    }

    /**
     * Notify all merchant users about new order
     */
    async notifyNewOrder(merchantId: bigint, orderId: bigint, orderNumber: string, totalAmount: number) {
        const created = await this.createForMerchant(
            merchantId,
            'ORDER',
            'New Order Received! 🎉',
            `Order #${orderNumber} has been placed.`,
            {
                actionUrl: `/admin/dashboard/orders?orderId=${orderId}`,
                metadata: { orderId: orderId.toString(), orderNumber, totalAmount },
            }
        );

        // Also send web push to subscribed merchant users
        // Note: browser/system controls whether a sound is played for push notifications.
        try {
            const order = await prisma.order.findUnique({
                where: { id: orderId },
                select: {
                    status: true,
                    customer: {
                        select: { name: true },
                    },
                },
            });

            // Only send web push for PENDING orders (online/customer orders).
            // POS/admin-created orders are typically already ACCEPTED, so they won't trigger push.
            if (order?.status !== 'PENDING') {
                return created;
            }

            const customerName = order?.customer?.name || 'Customer';

            await this.sendPushToMerchant(merchantId, { category: 'ORDER', transactionToggleKey: 'newOrder' }, async (pushService, subscription, merchant) => {
                return pushService.sendNewOrderNotification(
                    subscription,
                    orderNumber,
                    customerName,
                    totalAmount,
                    merchant.currency,
                    merchant.currency === 'IDR' ? 'id' : 'en'
                );
            });
        } catch (err) {
            console.error('Failed to send new order push notifications:', err);
        }

        return created;
    }

    /**
     * Notify merchant users about stock running out
     */
    async notifyStockOut(merchantId: bigint, menuName: string, menuId: bigint) {
        // Create in-app notification
        await this.createForMerchant(
            merchantId,
            'STOCK',
            'Item Out of Stock',
            `"${menuName}" is now out of stock.`,
            {
                actionUrl: `/admin/dashboard/menu/edit/${menuId}`,
                metadata: { type: 'OUT_OF_STOCK', menuId: menuId.toString(), menuName },
            }
        );

        // Also send push notification to all subscribed merchant users
        await this.sendPushToMerchant(merchantId, { category: 'STOCK', transactionToggleKey: 'stockOut' }, async (pushService, subscription, merchant) => {
            return pushService.sendOutOfStockNotification(subscription, merchant.name, menuName, 'en');
        });
    }

    /**
     * Notify merchant users about low stock threshold
     */
    async notifyLowStock(
        merchantId: bigint,
        menuName: string,
        menuId: bigint,
        remainingQty: number,
        threshold: number
    ) {
        // Create in-app notification
        await this.createForMerchant(
            merchantId,
            'STOCK',
            'Low Stock Alert',
            `"${menuName}" is low on stock (${remainingQty} left; threshold ${threshold}).`,
            {
                actionUrl: `/admin/dashboard/menu/edit/${menuId}`,
                metadata: { type: 'LOW_STOCK', menuId: menuId.toString(), menuName, remainingQty, threshold },
            }
        );

        // Also send push notification to all subscribed merchant users
        await this.sendPushToMerchant(merchantId, { category: 'STOCK', transactionToggleKey: 'lowStock' }, async (pushService, subscription, merchant) => {
            return pushService.sendLowStockNotification(subscription, merchant.name, menuName, remainingQty, threshold, 'en');
        });
    }

    /**
     * Notify merchant owner about staff login
     */
    async notifyStaffLogin(merchantId: bigint, staffName: string, staffEmail: string) {
        return this.createForMerchant(
            merchantId,
            'STAFF',
            'Staff Logged In',
            `${staffName} (${staffEmail}) has logged in.`,
            {
                targetRole: 'MERCHANT_OWNER',
                actionUrl: '/admin/dashboard/staff',
                metadata: { staffName, staffEmail },
            }
        );
    }

    /**
     * Notify merchant owner about payment verification
     */
    async notifyPaymentVerified(merchantId: bigint, amount: number, currency: string) {
        const formattedAmount = currency === 'AUD'
            ? `A$${amount.toFixed(2)}`
            : `Rp ${amount.toLocaleString('id-ID')}`;

        return this.createForMerchant(
            merchantId,
            'PAYMENT',
            'Payment Verified ✅',
            `Your payment of ${formattedAmount} has been verified and applied to your account.`,
            {
                targetRole: 'MERCHANT_OWNER',
                actionUrl: '/admin/dashboard/subscription',
                metadata: { amount, currency },
            }
        );
    }

    /**
     * Notify merchant owner about payment rejected
     */
    async notifyPaymentRejected(merchantId: bigint, reason: string) {
        return this.createForMerchant(
            merchantId,
            'PAYMENT',
            'Payment Rejected ❌',
            `Your payment was rejected: ${reason}`,
            {
                targetRole: 'MERCHANT_OWNER',
                actionUrl: '/admin/dashboard/subscription/topup',
                metadata: { reason },
            }
        );
    }

    /**
     * Notify merchant owner about negative balance (real-time when balance goes negative)
     */
    async notifyNegativeBalance(
        merchantId: bigint,
        balance: number,
        orderNumber: string,
        currency: string
    ) {
        // Create in-app notification
        await this.createForMerchant(
            merchantId,
            'SUBSCRIPTION',
            '⚠️ Negative Balance Warning',
            `Your balance is now negative after order #${orderNumber}. Top up before midnight to avoid store closure.`,
            {
                targetRole: 'MERCHANT_OWNER',
                actionUrl: '/admin/dashboard/subscription/topup',
                metadata: { balance, orderNumber },
            }
        );

        // Also send push notification to all subscribed merchant users
        await this.sendPushToMerchant(merchantId, { category: 'SUBSCRIPTION', targetRole: 'MERCHANT_OWNER', transactionToggleKey: 'subscription' }, async (pushService, subscription, merchant) => {
            return pushService.sendNegativeBalanceNotification(
                subscription,
                merchant.name,
                balance,
                orderNumber,
                currency,
                'en'
            );
        });
    }

    /**
     * Send push notification to all subscribed users of a merchant
     */
    private async sendPushToMerchant(
        merchantId: bigint,
        options: {
            category: UserNotificationCategory;
            targetRole?: UserRole;
            transactionToggleKey?: MerchantTransactionToggleKey;
        },
        sendFn: (
            pushService: typeof import('./WebPushService').default,
            subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
            merchant: { name: string; currency: string }
        ) => Promise<boolean>
    ) {
        try {
            // Dynamically import to avoid circular dependency
            const webPushService = (await import('./WebPushService')).default;
            
            // Get merchant info
            const merchant = await prisma.merchant.findUnique({
                where: { id: merchantId },
                select: { name: true, currency: true },
            });

            if (!merchant) return;

            const eligibleUserIds = await this.getEligibleMerchantUserIds(merchantId, options.category, {
                targetRole: options.targetRole,
            });

            if (eligibleUserIds.length === 0) return;

            const transactionToggleKey =
                options.transactionToggleKey ?? this.resolveMerchantTransactionToggle(options.category, null);

            let finalEligibleUserIds = eligibleUserIds;

            if (transactionToggleKey) {
                const merchantUsers = await prisma.merchantUser.findMany({
                    where: {
                        merchantId,
                        isActive: true,
                        userId: { in: eligibleUserIds },
                    },
                    select: { userId: true, role: true },
                });

                const ownerUserIds = new Set(
                    merchantUsers.filter(mu => mu.role === 'OWNER').map(mu => mu.userId.toString())
                );
                const staffUserIds = merchantUsers.filter(mu => mu.role === 'STAFF').map(mu => mu.userId);

                const settingsMap = await this.getUserSettingsMap(staffUserIds);

                finalEligibleUserIds = eligibleUserIds.filter(uid => {
                    if (ownerUserIds.has(uid.toString())) return true;
                    const settings = settingsMap.get(uid.toString()) ?? normalizeNotificationSettings(undefined);
                    return settings.merchant[transactionToggleKey];
                });
            }

            if (finalEligibleUserIds.length === 0) return;

            // Get all active push subscriptions for this merchant's users
            const pushSubscriptions = await prisma.pushSubscription.findMany({
                where: {
                    merchantId,
                    isActive: true,
                    userId: { in: finalEligibleUserIds },
                },
                select: {
                    userId: true,
                    endpoint: true,
                    p256dhKey: true,
                    authKey: true,
                },
            });

            // Send push to each subscription
            for (const sub of pushSubscriptions) {
                try {
                    await sendFn(
                        webPushService,
                        {
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dhKey,
                                auth: sub.authKey,
                            },
                        },
                        merchant
                    );
                } catch (err) {
                    console.error(`Failed to send push notification to ${sub.endpoint}:`, err);
                }
            }
        } catch (err) {
            console.error('Failed to send push notifications to merchant:', err);
        }
    }

    /**
     * Notify super admins about new merchant registration
     */
    async notifyNewMerchantRegistration(merchantName: string, merchantCode: string, merchantId: bigint) {
        return this.createForSuperAdmins(
            'SYSTEM',
            'New Merchant Registered',
            `${merchantName} (${merchantCode}) has registered and started their trial.`,
            {
                actionUrl: `/admin/dashboard/merchants/${merchantId}`,
                metadata: { merchantName, merchantCode, merchantId: merchantId.toString() },
            }
        );
    }
}

const userNotificationService = new UserNotificationService();
export default userNotificationService;
