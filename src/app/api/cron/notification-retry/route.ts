/**
 * Notification Retry Cron API
 * POST /api/cron/notification-retry - Process pending notification retries
 * GET /api/cron/notification-retry - Get queue statistics
 */

import { NextResponse } from 'next/server';
import notificationRetryService from '@/lib/services/NotificationRetryService';

// Verify cron secret for security
function verifyCronSecret(request: Request): boolean {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret) {
        console.warn('CRON_SECRET not configured');
        return false;
    }
    
    return authHeader === `Bearer ${cronSecret}`;
}

/**
 * POST - Process pending notification retries
 */
export async function POST(request: Request) {
    if (!verifyCronSecret(request)) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const startTime = Date.now();
        
        // Process pending retries
        const results = await notificationRetryService.processPendingRetries();
        
        // Clean up old records (older than 30 days)
        const cleaned = await notificationRetryService.cleanupOldRecords(30);
        
        const duration = Date.now() - startTime;

        console.log(`[Notification Retry] Processed: ${results.processed}, Succeeded: ${results.succeeded}, Failed: ${results.failed}, Requeued: ${results.requeued}, Cleaned: ${cleaned}, Duration: ${duration}ms`);

        return NextResponse.json({
            success: true,
            data: {
                ...results,
                cleaned,
                durationMs: duration,
            },
        });
    } catch (error) {
        console.error('Notification retry cron error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process notification retries' },
            { status: 500 }
        );
    }
}

/**
 * GET - Get retry queue statistics
 */
export async function GET(request: Request) {
    if (!verifyCronSecret(request)) {
        return NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
        );
    }

    try {
        const stats = await notificationRetryService.getQueueStats();

        return NextResponse.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Notification retry stats error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to get retry queue statistics' },
            { status: 500 }
        );
    }
}
