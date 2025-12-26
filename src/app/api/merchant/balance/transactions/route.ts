/**
 * Merchant Balance Transactions API
 * GET /api/merchant/balance/transactions - Get transaction history
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import balanceService from '@/lib/services/BalanceService';

/**
 * GET /api/merchant/balance/transactions
 * Get transaction history for current merchant
 */
async function handleGet(req: NextRequest, context: AuthContext) {
    try {
        // Get merchant from user's merchant_users relationship
        const merchantUser = await prisma.merchantUser.findFirst({
            where: { userId: context.userId },
            include: { merchant: true },
        });

        if (!merchantUser) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const { transactions, total } = await balanceService.getTransactions(
            merchantUser.merchantId,
            { limit, offset }
        );

        return NextResponse.json({
            success: true,
            data: {
                transactions: transactions.map(t => ({
                    id: t.id.toString(),
                    type: t.type,
                    amount: Number(t.amount),
                    balanceBefore: Number(t.balanceBefore),
                    balanceAfter: Number(t.balanceAfter),
                    description: t.description,
                    createdAt: t.createdAt,
                })),
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + transactions.length < total,
                },
            },
        });
    } catch (error) {
        console.error('Error getting transactions:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get transactions' },
            { status: 500 }
        );
    }
}

export const GET = withMerchantOwner(handleGet);
