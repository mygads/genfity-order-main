/**
 * Merchant Balance Adjust API (Super Admin)
 * POST /api/admin/merchants/[id]/balance/adjust - Manually adjust balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import balanceService from '@/lib/services/BalanceService';
import { z } from 'zod';

const adjustSchema = z.object({
    amount: z.number(), // Can be positive or negative
    description: z.string().min(1).max(500),
});

async function handlePost(
    req: NextRequest,
    context: AuthContext,
    routeContext: { params: Promise<Record<string, string>> }
) {
    try {
        const { id } = await routeContext.params;
        const merchantId = BigInt(id);

        const body = await req.json();
        const validation = adjustSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { amount, description } = validation.data;

        await balanceService.adjustBalance(
            merchantId,
            amount,
            description,
            context.userId
        );

        return NextResponse.json({
            success: true,
            message: `Balance adjusted by ${amount >= 0 ? '+' : ''}${amount}`,
        });
    } catch (error: unknown) {
        console.error('Error adjusting balance:', error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    { success: false, error: 'NOT_FOUND', message: error.message },
                    { status: 404 }
                );
            }
            if (error.message.includes('negative')) {
                return NextResponse.json(
                    { success: false, error: 'BAD_REQUEST', message: error.message },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to adjust balance' },
            { status: 500 }
        );
    }
}

export const POST = withSuperAdmin(handlePost);
