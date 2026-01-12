import { NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/superadmin/influencers
 * Get all influencers for Super Admin
 */
export const GET = withSuperAdmin(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'pending', 'approved', 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: { isApproved?: boolean } = {};
    if (status === 'pending') {
      where.isApproved = false;
    } else if (status === 'approved') {
      where.isApproved = true;
    }

    // Fetch influencers with counts
    const [influencers, total] = await Promise.all([
      prisma.influencer.findMany({
        where,
        include: {
          balances: true,
          approvalLogs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              actedByUser: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              referredMerchants: true,
              transactions: true,
              withdrawals: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.influencer.count({ where }),
    ]);

    // Get pending withdrawals
    const pendingWithdrawalsByInfluencer = await prisma.influencerWithdrawal.groupBy({
      by: ['influencerId'],
      where: { status: 'PENDING' },
      _count: { id: true },
    });
    const pendingWithdrawalsMap = new Map(
      pendingWithdrawalsByInfluencer.map((w) => [w.influencerId.toString(), w._count.id])
    );

    const formattedInfluencers = influencers.map((inf) => ({
      ...inf,
      passwordHash: undefined, // Remove password hash
      approvalLogs: inf.approvalLogs?.length ? inf.approvalLogs : [],
      pendingWithdrawals: pendingWithdrawalsMap.get(inf.id.toString()) || 0,
    }));

    return NextResponse.json({
      success: true,
      data: {
        influencers: serializeBigInt(formattedInfluencers),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching influencers:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch influencers' },
      { status: 500 }
    );
  }
});
