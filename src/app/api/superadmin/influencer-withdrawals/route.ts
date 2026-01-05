import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { InfluencerWithdrawalStatus } from '@prisma/client';

/**
 * GET /api/superadmin/influencer-withdrawals
 * Get all influencer withdrawal requests for Super Admin
 */
export const GET = withSuperAdmin(async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED', 'all'
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Build where clause
    const where: { status?: InfluencerWithdrawalStatus } = {};
    if (status && status !== 'all' && Object.values(InfluencerWithdrawalStatus).includes(status as InfluencerWithdrawalStatus)) {
      where.status = status as InfluencerWithdrawalStatus;
    }

    // Fetch withdrawals with influencer info
    const [withdrawals, total] = await Promise.all([
      prisma.influencerWithdrawal.findMany({
        where,
        include: {
          influencer: {
            select: {
              id: true,
              name: true,
              email: true,
              referralCode: true,
              country: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.influencerWithdrawal.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        withdrawals: serializeBigInt(withdrawals),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch withdrawals' },
      { status: 500 }
    );
  }
});
