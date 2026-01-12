import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { z } from 'zod';

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
        approvalLogs: {
          orderBy: { createdAt: 'desc' },
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

    const schema = z.object({
      isApproved: z.boolean().optional(),
      isActive: z.boolean().optional(),
      rejectionReason: z.string().min(3).max(500).optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { isApproved, isActive, rejectionReason } = parsed.data;

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

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      // Update influencer
      const updateData: { isApproved?: boolean; isActive?: boolean; approvedAt?: Date | null; approvedByUserId?: bigint | null } = {};

      if (typeof isApproved === 'boolean') {
        updateData.isApproved = isApproved;

        if (isApproved) {
          updateData.approvedAt = now;
          updateData.approvedByUserId = authContext.userId;

          await tx.influencerApprovalLog.create({
            data: {
              influencerId,
              action: 'APPROVE',
              actedByUserId: authContext.userId,
              reason: null,
            },
          });
        } else {
          if (!rejectionReason) {
            throw new Error('Rejection reason is required');
          }

          updateData.approvedAt = null;
          updateData.approvedByUserId = null;

          await tx.influencerApprovalLog.create({
            data: {
              influencerId,
              action: 'REJECT',
              actedByUserId: authContext.userId,
              reason: rejectionReason,
            },
          });
        }
      }

      if (typeof isActive === 'boolean') {
        updateData.isActive = isActive;
      }

      return tx.influencer.update({
        where: { id: influencerId },
        data: updateData,
        include: {
          balances: true,
          approvalLogs: {
            orderBy: { createdAt: 'desc' },
            include: {
              actedByUser: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });
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
      {
        success: false,
        message: error instanceof Error && error.message === 'Rejection reason is required'
          ? error.message
          : 'Failed to update influencer',
      },
      { status: error instanceof Error && error.message === 'Rejection reason is required' ? 400 : 500 }
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
