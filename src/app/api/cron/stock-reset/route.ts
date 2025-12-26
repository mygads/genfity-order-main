/**
 * Daily Stock Reset Cron API
 * POST /api/cron/stock-reset - Reset daily stock for ALL merchants
 * 
 * This resets stockQty to dailyStockTemplate for all menu items
 * that have autoResetStock enabled.
 * 
 * Should be scheduled to run daily at midnight (or store opening time)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';

const CRON_SECRET = process.env.CRON_SECRET;

interface ResetResult {
    merchantId: string;
    merchantCode: string;
    merchantName: string;
    menuResetCount: number;
    addonResetCount: number;
}

export async function POST(req: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = req.headers.get('authorization');
        const providedSecret = authHeader?.replace('Bearer ', '');

        if (CRON_SECRET && providedSecret !== CRON_SECRET) {
            console.warn('Stock reset cron called with invalid secret');
            return NextResponse.json(
                { success: false, error: 'UNAUTHORIZED', message: 'Invalid cron secret' },
                { status: 401 }
            );
        }

        console.log('🔄 Starting daily stock reset for all merchants...');
        const startTime = Date.now();

        // Get all active merchants
        const merchants = await prisma.merchant.findMany({
            where: { isActive: true },
            select: {
                id: true,
                code: true,
                name: true,
            },
        });

        const results: ResetResult[] = [];
        let totalMenuReset = 0;
        let totalAddonReset = 0;

        for (const merchant of merchants) {
            // Reset menu items with autoResetStock enabled
            const menuResetResult = await prisma.menu.updateMany({
                where: {
                    merchantId: merchant.id,
                    autoResetStock: true,
                    dailyStockTemplate: { not: null },
                    deletedAt: null,
                },
                data: {
                    // We need to use raw SQL for this since Prisma doesn't support
                    // setting a field to another field's value in updateMany
                },
            });

            // Use raw query to properly reset stock to template value
            const menuResetCount = await prisma.$executeRaw`
                UPDATE menus 
                SET stock_qty = daily_stock_template,
                    last_stock_reset_at = NOW(),
                    is_active = CASE WHEN daily_stock_template > 0 THEN true ELSE is_active END
                WHERE merchant_id = ${merchant.id}
                AND auto_reset_stock = true
                AND daily_stock_template IS NOT NULL
                AND deleted_at IS NULL
            `;

            // Reset addon items with autoResetStock enabled
            const addonResetCount = await prisma.$executeRaw`
                UPDATE addon_items 
                SET stock_qty = daily_stock_template,
                    last_stock_reset_at = NOW(),
                    is_active = CASE WHEN daily_stock_template > 0 THEN true ELSE is_active END
                WHERE merchant_id = ${merchant.id}
                AND auto_reset_stock = true
                AND daily_stock_template IS NOT NULL
                AND deleted_at IS NULL
            `;

            if (menuResetCount > 0 || addonResetCount > 0) {
                results.push({
                    merchantId: merchant.id.toString(),
                    merchantCode: merchant.code,
                    merchantName: merchant.name,
                    menuResetCount,
                    addonResetCount,
                });
                totalMenuReset += menuResetCount;
                totalAddonReset += addonResetCount;
            }
        }

        const durationMs = Date.now() - startTime;
        console.log(`✅ Stock reset completed: ${totalMenuReset} menus, ${totalAddonReset} addons in ${durationMs}ms`);

        return NextResponse.json({
            success: true,
            message: 'Daily stock reset completed',
            data: {
                merchantsProcessed: merchants.length,
                merchantsWithResets: results.length,
                totalMenuReset,
                totalAddonReset,
                durationMs,
                resetAt: new Date().toISOString(),
                details: results.slice(0, 20), // Limit to first 20 merchants
            },
        });
    } catch (error) {
        console.error('❌ Stock reset cron failed:', error);

        return NextResponse.json(
            {
                success: false,
                error: 'CRON_FAILED',
                message: error instanceof Error ? error.message : 'Stock reset failed',
            },
            { status: 500 }
        );
    }
}

// GET handler for Vercel Cron
export async function GET(req: NextRequest) {
    return POST(req);
}
