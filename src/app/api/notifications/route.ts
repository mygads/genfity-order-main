/**
 * Notifications API
 * GET /api/notifications - Get notifications for current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import userNotificationService from '@/lib/services/UserNotificationService';
import type { UserNotificationCategory } from '@prisma/client';

async function handleGet(req: NextRequest) {
    try {
        const userId = (req as unknown as { userId: bigint }).userId;
        const { searchParams } = new URL(req.url);

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const category = searchParams.get('category') as UserNotificationCategory | null;
        const isReadParam = searchParams.get('isRead');
        const isRead = isReadParam === 'true' ? true : isReadParam === 'false' ? false : undefined;

        const result = await userNotificationService.getNotifications(userId, {
            page,
            limit,
            filters: {
                ...(category ? { category } : {}),
                ...(typeof isRead === 'boolean' ? { isRead } : {}),
            },
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
