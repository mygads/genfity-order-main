/**
 * Merchant Balance Transactions API
 * GET /api/merchant/balance/transactions - Get transaction history with filters
 * 
 * Query Parameters:
 * - limit: number (default 20)
 * - offset: number (default 0)
 * - type: BalanceTransactionType (optional filter)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - search: string (optional, search in description)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import type { BalanceTransactionType, Prisma } from '@prisma/client';

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
        const type = searchParams.get('type') as BalanceTransactionType | null;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const search = searchParams.get('search');

        // Get balance record
        const balance = await prisma.merchantBalance.findUnique({
            where: { merchantId: merchantUser.merchantId },
        });

        if (!balance) {
            return NextResponse.json({
                success: true,
                data: {
                    transactions: [],
                    pagination: { total: 0, limit, offset, hasMore: false },
                },
            });
        }

        // Build where clause
        const where: Prisma.BalanceTransactionWhereInput = {
            balanceId: balance.id,
        };

        if (type) {
            where.type = type;
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                // Include the entire end date
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                where.createdAt.lte = endDateTime;
            }
        }

        if (search) {
            where.description = {
                contains: search,
                mode: 'insensitive',
            };
        }

        const [transactions, total] = await Promise.all([
            prisma.balanceTransaction.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            prisma.balanceTransaction.count({ where }),
        ]);

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
