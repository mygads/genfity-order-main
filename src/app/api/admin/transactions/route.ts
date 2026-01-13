/**
 * All Transactions API (Super Admin)
 * GET /api/admin/transactions - Get all balance transactions across merchants
 * 
 * Query Parameters:
 * - limit: number (default 50)
 * - offset: number (default 0)
 * - merchantId: string (optional filter by merchant)
 * - type: BalanceTransactionType (optional filter by type)
 * - startDate: ISO string (optional)
 * - endDate: ISO string (optional)
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import { parseOptionalBigIntQueryParam } from '@/lib/utils/routeContext';

interface TransactionWithDetails {
  id: bigint;
  type: string;
  amount: unknown;
  balanceBefore: unknown;
  balanceAfter: unknown;
  description: string | null;
  orderId: bigint | null;
  paymentRequestId: bigint | null;
  createdByUserId: bigint | null;
  createdAt: Date;
  balance: {
    merchant: {
      id: bigint;
      code: string;
      name: string;
      currency: string;
    };
  };
}

async function handleGet(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const merchantIdResult = parseOptionalBigIntQueryParam(searchParams, 'merchantId', 'Invalid merchantId');
    if (!merchantIdResult.ok) {
      return NextResponse.json(merchantIdResult.body, { status: merchantIdResult.status });
    }

    const merchantId = merchantIdResult.value;
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (merchantId !== null) {
      where.balance = {
        merchantId,
      };
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    if (search) {
      where.balance = {
        ...where.balance,
        merchant: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { code: { contains: search, mode: 'insensitive' } },
          ],
        },
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.balanceTransaction.findMany({
        where,
        include: {
          balance: {
            include: {
              merchant: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  currency: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.balanceTransaction.count({ where }),
    ]);

    // Get summary stats grouped by type and currency using Prisma.sql
    const conditions: string[] = [];
    const params: unknown[] = [];
    
    if (merchantId !== null) {
      conditions.push(`mb.merchant_id = $${params.length + 1}`);
      params.push(merchantId);
    }
    if (startDate) {
      conditions.push(`bt.created_at >= $${params.length + 1}`);
      params.push(new Date(startDate));
    }
    if (endDate) {
      conditions.push(`bt.created_at <= $${params.length + 1}`);
      params.push(new Date(endDate));
    }
    if (type) {
      conditions.push(`bt.type = $${params.length + 1}`);
      params.push(type);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    const summaryQuery = `
      SELECT 
        bt.type,
        m.currency,
        SUM(bt.amount) as total_amount,
        COUNT(*) as count
      FROM balance_transactions bt
      JOIN merchant_balances mb ON bt.balance_id = mb.id
      JOIN merchants m ON mb.merchant_id = m.id
      ${whereClause}
      GROUP BY bt.type, m.currency
      ORDER BY m.currency, bt.type
    `;

    const summaryRaw = await prisma.$queryRawUnsafe<Array<{
      type: string;
      currency: string;
      total_amount: unknown;
      count: bigint;
    }>>(summaryQuery, ...params);

    // Transform to the expected format
    const summary = summaryRaw.map((row) => ({
      type: row.type,
      currency: row.currency,
      _sum: { amount: Number(row.total_amount) },
      _count: Number(row.count),
    }));

    // Get daily trends for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyTrendsRaw = await prisma.$queryRaw<Array<{
      date: Date;
      type: string;
      total_amount: unknown;
      transaction_count: bigint;
    }>>`
      SELECT 
        DATE(created_at) as date,
        type,
        SUM(amount) as total_amount,
        COUNT(*) as transaction_count
      FROM balance_transactions
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at), type
      ORDER BY date ASC
    `;

    // Transform daily trends into a more usable format
    const trendsMap = new Map<string, {
      date: string;
      deposits: number;
      orderFees: number;
      subscriptions: number;
      refunds: number;
      adjustments: number;
      total: number;
    }>();

    dailyTrendsRaw.forEach((row) => {
      const dateStr = new Date(row.date).toISOString().split('T')[0];
      if (!trendsMap.has(dateStr)) {
        trendsMap.set(dateStr, {
          date: dateStr,
          deposits: 0,
          orderFees: 0,
          subscriptions: 0,
          refunds: 0,
          adjustments: 0,
          total: 0,
        });
      }
      const dayData = trendsMap.get(dateStr)!;
      const amount = Number(row.total_amount);
      
      switch (row.type) {
        case 'DEPOSIT':
          dayData.deposits = amount;
          break;
        case 'ORDER_FEE':
          dayData.orderFees = Math.abs(amount);
          break;
        case 'SUBSCRIPTION':
          dayData.subscriptions = Math.abs(amount);
          break;
        case 'REFUND':
          dayData.refunds = amount;
          break;
        case 'ADJUSTMENT':
          dayData.adjustments = amount;
          break;
      }
      dayData.total += amount;
    });

    const dailyTrends = Array.from(trendsMap.values()).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    return NextResponse.json({
      success: true,
      data: {
        transactions: transactions.map((t: TransactionWithDetails) => ({
          id: t.id.toString(),
          type: t.type,
          amount: Number(t.amount),
          balanceBefore: Number(t.balanceBefore),
          balanceAfter: Number(t.balanceAfter),
          description: t.description,
          orderId: t.orderId?.toString() || null,
          paymentRequestId: t.paymentRequestId?.toString() || null,
          createdAt: t.createdAt.toISOString(),
          merchant: {
            id: t.balance.merchant.id.toString(),
            code: t.balance.merchant.code,
            name: t.balance.merchant.name,
            currency: t.balance.merchant.currency,
          },
        })),
        summary: serializeBigInt(summary),
        dailyTrends,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + transactions.length < total,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

export const GET = withSuperAdmin(handleGet);
