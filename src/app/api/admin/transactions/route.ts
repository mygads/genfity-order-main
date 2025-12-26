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
    const merchantId = searchParams.get('merchantId');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (merchantId) {
      where.balance = {
        merchantId: BigInt(merchantId),
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

    // Get summary stats
    const summary = await prisma.balanceTransaction.groupBy({
      by: ['type'],
      _sum: {
        amount: true,
      },
      _count: true,
    });

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
