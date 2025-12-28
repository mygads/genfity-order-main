/**
 * Mark All Notifications as Read API
 * POST /api/notifications/mark-all-read - Mark all notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import userNotificationService from '@/lib/services/UserNotificationService';

async function handlePost(req: NextRequest) {
    try {
        const userId = (req as unknown as { userId: bigint }).userId;

        const result = await userNotificationService.markAllAsRead(userId);

        return NextResponse.json({
            success: true,
            message: 'All notifications marked as read',
            data: { count: result.count },
        });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to mark notifications as read' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handlePost);
