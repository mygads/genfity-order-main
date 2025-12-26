/**
 * Subscription Cron API
 * POST /api/cron/subscriptions - Run subscription cron tasks
 * 
 * Protected by CRON_SECRET env variable
 * Should be called by external scheduler (Vercel Cron, GitHub Actions, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import subscriptionCronService from '@/lib/services/SubscriptionCronService';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(req: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = req.headers.get('authorization');
        const providedSecret = authHeader?.replace('Bearer ', '');

        if (CRON_SECRET && providedSecret !== CRON_SECRET) {
            console.warn('Cron API called with invalid secret');
            return NextResponse.json(
                { success: false, error: 'UNAUTHORIZED', message: 'Invalid cron secret' },
                { status: 401 }
            );
        }

        console.log('🕐 Starting subscription cron tasks...');

        // Run all cron tasks
        const summary = await subscriptionCronService.runAllTasks();

        console.log(`✅ Cron completed: ${summary.totalProcessed} processed, ${summary.totalErrors} errors`);

        return NextResponse.json({
            success: true,
            message: 'Cron tasks completed',
            data: {
                startedAt: summary.startedAt.toISOString(),
                completedAt: summary.completedAt.toISOString(),
                durationMs: summary.completedAt.getTime() - summary.startedAt.getTime(),
                totalProcessed: summary.totalProcessed,
                totalErrors: summary.totalErrors,
                results: summary.results.map(r => ({
                    task: r.task,
                    success: r.success,
                    count: r.count,
                    details: r.details?.slice(0, 10), // Limit details to 10 items
                    errors: r.errors?.slice(0, 5), // Limit errors to 5 items
                })),
            },
        });
    } catch (error) {
        console.error('❌ Cron task failed:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'CRON_FAILED',
                message: error instanceof Error ? error.message : 'Cron task failed',
            },
            { status: 500 }
        );
    }
}

// GET handler for Vercel Cron (which uses GET by default)
export async function GET(req: NextRequest) {
    // Redirect GET to POST handler
    return POST(req);
}
