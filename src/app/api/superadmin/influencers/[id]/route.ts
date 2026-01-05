import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/superadmin/influencers/[id]
 * Get influencer details
 */
export const GET = withSuperAdmin(async (req: NextRequest, authContext, routeContext: { params: Promise<Record<string, string>> }) => {
  try {
    const { id } = await routeContext.params;
    const influencerId = BigInt(id);

    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
      include: {
        balances: true,
        referredMerchants: {
          select: {
            id: true,
            name: true,
            code: true,
            country: true,
            currency: true,
            isOpen: true,
            hasGivenFirstCommission: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        withdrawals: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!influencer) {
      return NextResponse.json(
        { success: false, message: 'Influencer not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt({
        ...influencer,
        passwordHash: undefined,
      }),
    });
  } catch (error) {
    console.error('Error fetching influencer:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch influencer' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/superadmin/influencers/[id]
 * Update influencer (approve, activate/deactivate)
 */
export const PUT = withSuperAdmin(async (req: NextRequest, authContext, routeContext: { params: Promise<Record<string, string>> }) => {
  try {
    const { id } = await routeContext.params;
    const influencerId = BigInt(id);
    const body = await req.json();
    const { isApproved, isActive } = body;

    // Validate influencer exists
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
    });

    if (!influencer) {
      return NextResponse.json(
        { success: false, message: 'Influencer not found' },
        { status: 404 }
      );
    }

    // Update influencer
    const updateData: { isApproved?: boolean; isActive?: boolean; approvedAt?: Date } = {};
    if (typeof isApproved === 'boolean') {
      updateData.isApproved = isApproved;
      if (isApproved && !influencer.approvedAt) {
        updateData.approvedAt = new Date();
      }
    }
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }

    const updated = await prisma.influencer.update({
      where: { id: influencerId },
      data: updateData,
      include: {
        balances: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Influencer updated successfully',
      data: serializeBigInt({
        ...updated,
        passwordHash: undefined,
      }),
    });
  } catch (error) {
    console.error('Error updating influencer:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update influencer' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/superadmin/influencers/[id]
 * Delete an influencer (soft delete by deactivating)
 */
export const DELETE = withSuperAdmin(async (req: NextRequest, authContext, routeContext: { params: Promise<Record<string, string>> }) => {
  try {
    const { id } = await routeContext.params;
    const influencerId = BigInt(id);

    // Validate influencer exists
    const influencer = await prisma.influencer.findUnique({
      where: { id: influencerId },
    });

    if (!influencer) {
      return NextResponse.json(
        { success: false, message: 'Influencer not found' },
        { status: 404 }
      );
    }

    // Soft delete by deactivating
    await prisma.influencer.update({
      where: { id: influencerId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Influencer deactivated successfully',
    });
  } catch (error) {
    console.error('Error deleting influencer:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete influencer' },
      { status: 500 }
    );
  }
});
