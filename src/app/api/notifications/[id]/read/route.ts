/**
 * Mark Notification as Read API
 * POST /api/notifications/[id]/read - Mark a specific notification as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import userNotificationService from '@/lib/services/UserNotificationService';
import { getBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

async function handlePost(
    req: NextRequest,
    context: AuthContext,
    routeContext: RouteContext
) {
    try {
        const notificationId = await getBigIntRouteParam(routeContext, 'id');
        if (!notificationId) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: 'Invalid notification id' },
                { status: 400 }
            );
        }

        await userNotificationService.markAsRead(notificationId, context.userId);

        return NextResponse.json({
            success: true,
            message: 'Notification marked as read',
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to mark notification as read' },
            { status: 500 }
        );
    }
}

export const POST = withAuth(handlePost);

