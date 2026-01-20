/**
 * Merchant Balance Transactions Export API
 * GET /api/merchant/balance/transactions/export - Export transaction history as CSV
 * 
 * Query Parameters:
 * - type: BalanceTransactionType (optional filter)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - format: 'csv' (default)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import type { BalanceTransactionType, Prisma } from '@prisma/client';

/**
 * Format currency for CSV export
 */
function formatCurrency(amount: number, currency: string): string {
    if (currency === 'AUD') {
        return amount.toFixed(2);
    }
    return amount.toLocaleString('id-ID');
}

/**
 * GET /api/merchant/balance/transactions/export
 * Export transaction history as CSV
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

        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true, code: true, currency: true },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') as BalanceTransactionType | null;
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Get balance record
        const balance = await prisma.merchantBalance.findUnique({
            where: { merchantId },
        });

        if (!balance) {
            return new NextResponse('No transactions found', { status: 404 });
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
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                where.createdAt.lte = endDateTime;
            }
        }

        // Hide no-op subscription-day voucher redemptions from exports.
        where.NOT = {
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

        const transactions = await prisma.balanceTransaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        const currency = merchant.currency || 'IDR';
        const currencySymbol = currency === 'AUD' ? 'AUD' : 'IDR';

        // Generate CSV content
        const headers = ['Date', 'Time', 'Type', `Amount (${currencySymbol})`, `Balance Before (${currencySymbol})`, `Balance After (${currencySymbol})`, 'Description'];
        
        const rows = transactions.map(t => {
            const date = new Date(t.createdAt);
            return [
                date.toLocaleDateString('en-AU'),
                date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
                t.type,
                formatCurrency(Number(t.amount), currency),
                formatCurrency(Number(t.balanceBefore), currency),
                formatCurrency(Number(t.balanceAfter), currency),
                `"${(t.description || '').replace(/"/g, '""')}"`,
            ].join(',');
        });

        const csv = [headers.join(','), ...rows].join('\n');

        // Generate filename
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `transactions_${merchant.code}_${dateStr}.csv`;

        // Return CSV file
        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('Error exporting transactions:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to export transactions' },
            { status: 500 }
        );
    }
}

export const GET = withMerchantOwner(handleGet);
