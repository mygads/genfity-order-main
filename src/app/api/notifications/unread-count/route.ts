/**
 * Unread Notifications Count API
 * GET /api/notifications/unread-count - Get unread notification count
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import userNotificationService from '@/lib/services/UserNotificationService';
import type { UserNotificationCategory, UserRole } from '@prisma/client';

// Categories allowed for Super Admin
const SUPER_ADMIN_CATEGORIES: UserNotificationCategory[] = ['SYSTEM', 'PAYMENT', 'SUBSCRIPTION'];

async function handleGet(req: NextRequest) {
    try {
        const userId = (req as unknown as { userId: bigint }).userId;
        const userRole = (req as unknown as { userRole: UserRole }).userRole;

        // For Super Admin, filter to only relevant categories
        const isSuperAdmin = userRole === 'SUPER_ADMIN';
        const allowedCategories = isSuperAdmin ? SUPER_ADMIN_CATEGORIES : undefined;

        const count = await userNotificationService.getUnreadCount(userId, allowedCategories);

        return NextResponse.json({
            success: true,
            data: { count },
        });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch unread count' },
            { status: 500 }
        );
    }
}

export const GET = withAuth(handleGet);
