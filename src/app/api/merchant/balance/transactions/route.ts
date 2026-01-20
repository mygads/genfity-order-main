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
 * - includePending: boolean (optional, include pending payment requests)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import type { BalanceTransactionType, Prisma } from '@prisma/client';

interface TransactionItem {
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string | null;
    createdAt: Date;
    // Payment request specific fields
    status?: string;
    paymentRequestId?: string;
    paymentType?: string;
    isPaymentRequest?: boolean;
}

/**
 * GET /api/merchant/balance/transactions
 * Get transaction history for current merchant
 */
async function handleGet(req: NextRequest, context: AuthContext) {
    try {
        const merchantId = context.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_ID_REQUIRED', message: 'Merchant ID is required' },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const type = searchParams.get('type') as BalanceTransactionType | null;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const search = searchParams.get('search');
        const includePending = searchParams.get('includePending') === 'true';

        // Get balance record
        const balance = await prisma.merchantBalance.findUnique({
            where: { merchantId },
        });

        // Build where clause for transactions
        const transactionWhere: Prisma.BalanceTransactionWhereInput = {};
        
        if (balance) {
            transactionWhere.balanceId = balance.id;
        } else {
            // No balance record, return empty for transactions
            transactionWhere.balanceId = BigInt(-1); // Will match nothing
        }

        if (type) {
            transactionWhere.type = type;
        }

        if (startDate || endDate) {
            transactionWhere.createdAt = {};
            if (startDate) {
                transactionWhere.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                // Include the entire end date
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                transactionWhere.createdAt.lte = endDateTime;
            }
        }

        if (search) {
            transactionWhere.description = {
                contains: search,
                mode: 'insensitive',
            };
        }

        // Hide no-op subscription-day voucher redemptions from balance transactions.
        // These are subscription period changes and should appear in Subscription History, not Transactions.
        transactionWhere.NOT = {
            AND: [
                { type: 'SUBSCRIPTION' },
                { amount: 0 },
                {
                    description: {
                        contains: 'days subscription',
                        mode: 'insensitive',
                    },
                },
            ],
        };

        // Fetch transactions
        const [transactions, transactionTotal] = await Promise.all([
            prisma.balanceTransaction.findMany({
                where: transactionWhere,
                orderBy: { createdAt: 'desc' },
                take: includePending ? limit : limit,
                skip: offset,
            }),
            prisma.balanceTransaction.count({ where: transactionWhere }),
        ]);

        // Fetch pending payment requests if requested
        let pendingRequests: TransactionItem[] = [];
        let pendingTotal = 0;

        if (includePending && offset === 0) {
            // Build where clause for payment requests
            const paymentRequestWhere: Prisma.PaymentRequestWhereInput = {
                merchantId,
                status: { in: ['PENDING', 'CONFIRMED', 'REJECTED'] },
            };

            if (startDate || endDate) {
                paymentRequestWhere.createdAt = {};
                if (startDate) {
                    paymentRequestWhere.createdAt.gte = new Date(startDate);
                }
                if (endDate) {
                    const endDateTime = new Date(endDate);
                    endDateTime.setHours(23, 59, 59, 999);
                    paymentRequestWhere.createdAt.lte = endDateTime;
                }
            }

            const [requests, requestCount] = await Promise.all([
                prisma.paymentRequest.findMany({
                    where: paymentRequestWhere,
                    orderBy: { createdAt: 'desc' },
                    take: 10, // Limit pending requests shown
                }),
                prisma.paymentRequest.count({ where: paymentRequestWhere }),
            ]);

            pendingRequests = requests.map(r => ({
                id: `pr_${r.id.toString()}`,
                type: r.type === 'DEPOSIT_TOPUP' ? 'PENDING_DEPOSIT' : 'PENDING_SUBSCRIPTION',
                amount: Number(r.amount),
                balanceBefore: 0,
                balanceAfter: 0,
                description: getPaymentRequestDescription(r.type, r.status, Number(r.amount), r.currency),
                createdAt: r.createdAt,
                status: r.status,
                paymentRequestId: r.id.toString(),
                paymentType: r.type,
                isPaymentRequest: true,
            }));

            pendingTotal = requestCount;
        }

        // Transform and merge results
        const transactionItems: TransactionItem[] = transactions.map(t => ({
            id: t.id.toString(),
            type: t.type,
            amount: Number(t.amount),
            balanceBefore: Number(t.balanceBefore),
            balanceAfter: Number(t.balanceAfter),
            description: t.description,
            createdAt: t.createdAt,
            isPaymentRequest: false,
        }));

        // Merge and sort by date (pending first, then by date)
        const allItems = [...pendingRequests, ...transactionItems].sort((a, b) => {
            // Pending requests first
            if (a.isPaymentRequest && !b.isPaymentRequest) return -1;
            if (!a.isPaymentRequest && b.isPaymentRequest) return 1;
            // Then by date descending
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        const total = transactionTotal + (includePending ? pendingTotal : 0);

        return NextResponse.json({
            success: true,
            data: {
                transactions: allItems.slice(0, limit),
                pagination: {
                    total,
                    limit,
                    offset,
                    hasMore: offset + allItems.length < total,
                },
                pendingCount: pendingTotal,
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

/**
 * Generate description for payment request based on status
 */
function getPaymentRequestDescription(
    type: string,
    status: string,
    amount: number,
    currency: string
): string {
    const typeLabel = type === 'DEPOSIT_TOPUP' ? 'Top Up' : 'Monthly Subscription';
    const amountStr = currency === 'IDR' 
        ? `Rp ${amount.toLocaleString()}` 
        : `A$${amount.toFixed(2)}`;

    switch (status) {
        case 'PENDING':
            return `${typeLabel} ${amountStr} - Waiting for payment`;
        case 'CONFIRMED':
            return `${typeLabel} ${amountStr} - Waiting for admin verification`;
        case 'REJECTED':
            return `${typeLabel} ${amountStr} - Payment rejected`;
        case 'VERIFIED':
            return `${typeLabel} ${amountStr} - Payment verified`;
        case 'EXPIRED':
            return `${typeLabel} ${amountStr} - Request expired`;
        default:
            return `${typeLabel} ${amountStr}`;
    }
}

export const GET = withMerchantOwner(handleGet);
