/**
 * Unread Notifications Count API
 * GET /api/notifications/unread-count - Get unread notification count
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import userNotificationService from '@/lib/services/UserNotificationService';

async function handleGet(req: NextRequest) {
    try {
        const userId = (req as unknown as { userId: bigint }).userId;

        const count = await userNotificationService.getUnreadCount(userId);

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
