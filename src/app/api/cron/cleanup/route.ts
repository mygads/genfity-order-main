/**
 * Cleanup Cron API
 * POST /api/cron/cleanup - Clean up expired data
 * 
 * Tasks:
 * 1. Delete expired user sessions
 * 2. Delete expired customer sessions
 * 3. Expire old pending payment requests
 * 4. Clean up old notification logs (optional)
 * 5. Permanently delete soft-deleted data (>30 days)
 * 6. Clean orphaned blob images
 * 
 * Should be scheduled to run daily or hourly
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import dataCleanupService from '@/lib/services/DataCleanupService';
import { Prisma } from '@prisma/client';

const CRON_SECRET = process.env.CRON_SECRET;
const SESSION_PAYLOAD_RETENTION_HOURS = 24;

interface CleanupResult {
    task: string;
    deletedCount: number;
    success: boolean;
    error?: string;
}

type JsonSessionMap = Record<string, Prisma.JsonValue>;

function pruneSessionPayload(payload: Prisma.JsonValue | null): { nextPayload: Prisma.JsonValue | Prisma.NullTypes.JsonNull; prunedCount: number } {
    if (!payload) {
        return { nextPayload: Prisma.JsonNull, prunedCount: 0 };
    }

    if (typeof payload !== 'object' || Array.isArray(payload)) {
        return { nextPayload: payload, prunedCount: 0 };
    }

    const sessions = (payload as { sessions?: JsonSessionMap })?.sessions;
    if (!sessions || typeof sessions !== 'object') {
        return { nextPayload: payload, prunedCount: 0 };
    }

    const cutoff = Date.now() - SESSION_PAYLOAD_RETENTION_HOURS * 60 * 60 * 1000;
    let prunedCount = 0;

    const nextSessions = Object.entries(sessions).reduce<JsonSessionMap>((acc, [key, value]) => {
        if (!value || typeof value !== 'object') {
            prunedCount += 1;
            return acc;
        }

        const updatedAt = (value as { updatedAt?: string | null }).updatedAt;
        if (!updatedAt) {
            prunedCount += 1;
            return acc;
        }

        const timestamp = new Date(updatedAt).getTime();
        if (Number.isNaN(timestamp) || timestamp < cutoff) {
            prunedCount += 1;
            return acc;
        }

        acc[key] = value;
        return acc;
    }, {});

    if (prunedCount === 0) {
        return { nextPayload: payload, prunedCount: 0 };
    }

    const { sessions: _sessions, ...rest } = payload as Record<string, Prisma.JsonValue>;
    const nextPayload: Prisma.JsonValue = Object.keys(nextSessions).length > 0
        ? ({ ...rest, sessions: nextSessions } as Prisma.JsonObject)
        : ({ ...rest } as Prisma.JsonObject);

    return { nextPayload, prunedCount };
}

export async function POST(req: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = req.headers.get('authorization');
        const providedSecret = authHeader?.replace('Bearer ', '');

        if (CRON_SECRET && providedSecret !== CRON_SECRET) {
            console.warn('Cleanup cron called with invalid secret');
            return NextResponse.json(
                { success: false, error: 'UNAUTHORIZED', message: 'Invalid cron secret' },
                { status: 401 }
            );
        }

        console.log('🧹 Starting cleanup tasks...');
        const startTime = Date.now();
        const results: CleanupResult[] = [];

        // Task 1: Delete expired user sessions
        try {
            const userSessionsDeleted = await prisma.userSession.deleteMany({
                where: {
                    expiresAt: { lt: new Date() },
                },
            });
            results.push({
                task: 'Delete Expired User Sessions',
                deletedCount: userSessionsDeleted.count,
                success: true,
            });
        } catch (error) {
            results.push({
                task: 'Delete Expired User Sessions',
                deletedCount: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        // Task 2: Delete expired customer sessions
        try {
            const customerSessionsDeleted = await prisma.customerSession.deleteMany({
                where: {
                    expiresAt: { lt: new Date() },
                },
            });
            results.push({
                task: 'Delete Expired Customer Sessions',
                deletedCount: customerSessionsDeleted.count,
                success: true,
            });
        } catch (error) {
            results.push({
                task: 'Delete Expired Customer Sessions',
                deletedCount: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        // Task 3: Expire old pending payment requests (older than 7 days)
        try {
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const expiredPayments = await prisma.paymentRequest.updateMany({
                where: {
                    status: 'PENDING',
                    createdAt: { lt: sevenDaysAgo },
                },
                data: {
                    status: 'EXPIRED',
                },
            });
            results.push({
                task: 'Expire Old Payment Requests',
                deletedCount: expiredPayments.count,
                success: true,
            });
        } catch (error) {
            results.push({
                task: 'Expire Old Payment Requests',
                deletedCount: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        // Task 4: Delete old notification logs (older than 90 days)
        try {
            const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
            const oldNotifications = await prisma.notificationLog.deleteMany({
                where: {
                    createdAt: { lt: ninetyDaysAgo },
                },
            });
            results.push({
                task: 'Delete Old Notification Logs',
                deletedCount: oldNotifications.count,
                success: true,
            });
        } catch (error) {
            results.push({
                task: 'Delete Old Notification Logs',
                deletedCount: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        // Task 5: Clean up expired reset tokens
        try {
            // User reset tokens
            const userTokensCleaned = await prisma.user.updateMany({
                where: {
                    resetTokenExpiresAt: { lt: new Date() },
                    resetToken: { not: null },
                },
                data: {
                    resetToken: null,
                    resetTokenExpiresAt: null,
                },
            });

            // Customer reset tokens
            const customerTokensCleaned = await prisma.customer.updateMany({
                where: {
                    resetTokenExpiresAt: { lt: new Date() },
                    resetToken: { not: null },
                },
                data: {
                    resetToken: null,
                    resetTokenExpiresAt: null,
                },
            });

            results.push({
                task: 'Clean Expired Reset Tokens',
                deletedCount: userTokensCleaned.count + customerTokensCleaned.count,
                success: true,
            });
        } catch (error) {
            results.push({
                task: 'Clean Expired Reset Tokens',
                deletedCount: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        // Task 6: Permanently delete soft-deleted data (>30 days) and clean orphaned images
        try {
            console.log('🗑️ Running data cleanup tasks...');
            const dataCleanupResults = await dataCleanupService.runAllTasks();
            
            // Add individual results from data cleanup
            dataCleanupResults.results.forEach((result: CleanupResult) => {
                results.push({
                    task: result.task,
                    deletedCount: result.deletedCount,
                    success: result.success,
                    error: result.error,
                });
            });
            
            console.log(`✅ Data cleanup completed: ${dataCleanupResults.totalDeleted} items cleaned`);
        } catch (error) {
            results.push({
                task: 'Data Cleanup (Soft Deletes & Images)',
                deletedCount: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        // Task 7: Prune old customer display session payloads (>24h)
        try {
            const states = await prisma.customerDisplayState.findMany({
                select: { id: true, payload: true },
            });

            let prunedTotal = 0;

            for (const state of states) {
                const { nextPayload, prunedCount } = pruneSessionPayload(state.payload as Prisma.JsonValue | null);
                if (prunedCount === 0) continue;

                prunedTotal += prunedCount;
                await prisma.customerDisplayState.update({
                    where: { id: state.id },
                    data: { payload: nextPayload as Prisma.InputJsonValue | Prisma.NullTypes.JsonNull },
                });
            }

            results.push({
                task: 'Prune Customer Display Sessions',
                deletedCount: prunedTotal,
                success: true,
            });
        } catch (error) {
            results.push({
                task: 'Prune Customer Display Sessions',
                deletedCount: 0,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        }

        const durationMs = Date.now() - startTime;
        const totalDeleted = results.reduce((sum, r) => sum + r.deletedCount, 0);
        const failedTasks = results.filter(r => !r.success).length;

        console.log(`✅ Cleanup completed: ${totalDeleted} items cleaned in ${durationMs}ms`);

        return NextResponse.json({
            success: failedTasks === 0,
            message: `Cleanup completed: ${totalDeleted} items cleaned`,
            data: {
                totalCleaned: totalDeleted,
                tasksRun: results.length,
                tasksFailed: failedTasks,
                durationMs,
                cleanedAt: new Date().toISOString(),
                results,
            },
        });
    } catch (error) {
        console.error('❌ Cleanup cron failed:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'CRON_FAILED',
                message: error instanceof Error ? error.message : 'Cleanup failed',
            },
            { status: 500 }
        );
    }
}

// GET handler for Vercel Cron
export async function GET(req: NextRequest) {
    return POST(req);
}
