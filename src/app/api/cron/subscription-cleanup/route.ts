/**
 * Subscription Cleanup API
 * POST /api/cron/subscription-cleanup - Run cleanup tasks
 * 
 * Protected by CRON_SECRET environment variable
 */

import { NextRequest, NextResponse } from 'next/server';
import subscriptionCleanupService from '@/lib/services/SubscriptionCleanupService';

/**
 * POST /api/cron/subscription-cleanup
 * Run scheduled cleanup tasks
 * 
 * Headers:
 * - Authorization: Bearer <CRON_SECRET>
 */
export async function POST(req: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error('CRON_SECRET not configured');
            return NextResponse.json(
                { success: false, error: 'CRON_NOT_CONFIGURED' },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { success: false, error: 'UNAUTHORIZED' },
                { status: 401 }
            );
        }

        // Run cleanup
        const result = await subscriptionCleanupService.runFullCleanup();

        return NextResponse.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Error running cleanup:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to run cleanup' },
            { status: 500 }
        );
    }
}

/**
 * GET /api/cron/subscription-cleanup
 * Get cleanup statistics (for monitoring)
 */
export async function GET(req: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            return NextResponse.json(
                { success: false, error: 'CRON_NOT_CONFIGURED' },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { success: false, error: 'UNAUTHORIZED' },
                { status: 401 }
            );
        }

        const stats = await subscriptionCleanupService.getCleanupStats();

        return NextResponse.json({
            success: true,
            data: stats,
        });
    } catch (error) {
        console.error('Error getting cleanup stats:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get stats' },
            { status: 500 }
        );
    }
}
