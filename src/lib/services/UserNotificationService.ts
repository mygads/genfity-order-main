/**
 * User Notification Service
 * Business logic for in-app notifications with role-based targeting
 */

import prisma from '@/lib/db/client';
import type { UserRole, UserNotificationCategory } from '@prisma/client';

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
    /**
     * Create a notification for a specific user
     */
    async createForUser(params: CreateNotificationParams) {
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
        // Map notification category to permission key
        const categoryPermissionMap: Record<UserNotificationCategory, string | null> = {
            'ORDER': 'notif_new_order',
            'STOCK': 'notif_stock_out',
            'STAFF': null, // Staff login always goes to owner only
            'PAYMENT': 'notif_payment',
            'SUBSCRIPTION': 'notif_subscription',
            'SYSTEM': null, // System notifications go to everyone
        };

        const requiredPermission = categoryPermissionMap[category];

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

            // If no permission required (SYSTEM notifications), all users receive
            if (!requiredPermission) return true;

            // Staff must have the specific notification permission
            return mu.permissions?.includes(requiredPermission) ?? false;
        });

        // Create notifications for each eligible user
        const notifications = await prisma.userNotification.createMany({
            data: eligibleUsers.map(mu => ({
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
        return this.createForMerchant(
            merchantId,
            'ORDER',
            'New Order Received! 🎉',
            `Order #${orderNumber} has been placed.`,
            {
                actionUrl: `/admin/dashboard/orders?orderId=${orderId}`,
                metadata: { orderId: orderId.toString(), orderNumber, totalAmount },
            }
        );
    }

    /**
     * Notify merchant users about stock running out
     */
    async notifyStockOut(merchantId: bigint, menuName: string, menuId: bigint) {
        return this.createForMerchant(
            merchantId,
            'STOCK',
            'Item Out of Stock',
            `"${menuName}" is now out of stock.`,
            {
                actionUrl: `/admin/dashboard/menu/edit/${menuId}`,
                metadata: { menuId: menuId.toString(), menuName },
            }
        );
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
