/**
 * Notifications API
 * GET /api/notifications - Get notifications for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/middleware/auth';
import userNotificationService from '@/lib/services/UserNotificationService';
import type { UserNotificationCategory } from '@prisma/client';

// Categories allowed for Super Admin
const SUPER_ADMIN_CATEGORIES: UserNotificationCategory[] = ['SYSTEM', 'PAYMENT', 'SUBSCRIPTION'];

async function handleGet(req: NextRequest, authContext: AuthContext) {
    try {
        const { userId, role: userRole } = authContext;

        const { searchParams } = new URL(req.url);

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const category = searchParams.get('category') as UserNotificationCategory | null;
        const isReadParam = searchParams.get('isRead');
        const isRead = isReadParam === 'true' ? true : isReadParam === 'false' ? false : undefined;

        // For Super Admin, filter to only relevant categories
        const isSuperAdmin = userRole === 'SUPER_ADMIN';
        const allowedCategories = isSuperAdmin ? SUPER_ADMIN_CATEGORIES : undefined;

        console.log('[Notifications] User:', userId.toString(), 'Role:', userRole, 'isSuperAdmin:', isSuperAdmin, 'allowedCategories:', allowedCategories);

        const result = await userNotificationService.getNotifications(userId, {
            page,
            limit,
            filters: {
                ...(category ? { category } : {}),
                ...(typeof isRead === 'boolean' ? { isRead } : {}),
            },
            allowedCategories,
        });

        // Serialize BigInt
        const serialized = {
            ...result,
            notifications: result.notifications.map(n => ({
                ...n,
                id: n.id.toString(),
                userId: n.userId?.toString(),
                merchantId: n.merchantId?.toString(),
                createdAt: n.createdAt.toISOString(),
                readAt: n.readAt?.toISOString(),
            })),
        };

        return NextResponse.json({
            success: true,
            data: serialized,
        });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(handleGet);
