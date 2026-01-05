import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * PUT /api/superadmin/influencer-withdrawals/[id]
 * Process a withdrawal request (approve, reject)
 */
export const PUT = withSuperAdmin(async (req: NextRequest, authContext: AuthContext, routeContext: { params: Promise<Record<string, string>> }) => {
  try {
    const { id } = await routeContext.params;
    const withdrawalId = BigInt(id);
    const body = await req.json();
    const { status, adminNotes } = body;

    // Validate status
    if (!['PROCESSING', 'COMPLETED', 'REJECTED'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Invalid status. Must be PROCESSING, COMPLETED, or REJECTED' },
        { status: 400 }
      );
    }

    // Fetch withdrawal with current data
    const withdrawal = await prisma.influencerWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        influencer: {
          include: {
            balances: true,
          },
        },
      },
    });

    if (!withdrawal) {
      return NextResponse.json(
        { success: false, message: 'Withdrawal not found' },
        { status: 404 }
      );
    }

    // Cannot change completed or rejected withdrawals
    if (withdrawal.status === 'COMPLETED' || withdrawal.status === 'REJECTED') {
      return NextResponse.json(
        { success: false, message: 'Cannot modify a completed or rejected withdrawal' },
        { status: 400 }
      );
    }

    // If completing, update balance
    if (status === 'COMPLETED') {
      // Find the balance for this currency
      const balance = withdrawal.influencer.balances.find(
        (b) => b.currency === withdrawal.currency
      );

      if (!balance) {
        return NextResponse.json(
          { success: false, message: 'Balance not found for this currency' },
          { status: 400 }
        );
      }

      // Use transaction to ensure consistency
      await prisma.$transaction(async (tx) => {
        // Update withdrawal status
        await tx.influencerWithdrawal.update({
          where: { id: withdrawalId },
          data: {
            status: 'COMPLETED',
            processedAt: new Date(),
            processedByUserId: authContext.userId,
            notes: adminNotes ? `${withdrawal.notes || ''}\n[Admin]: ${adminNotes}` : withdrawal.notes,
          },
        });

        // Update balance - deduct the amount and add to totalWithdrawn
        await tx.influencerBalance.update({
          where: { id: balance.id },
          data: {
            balance: { decrement: new Decimal(withdrawal.amount.toString()) },
            totalWithdrawn: { increment: new Decimal(withdrawal.amount.toString()) },
          },
        });

        // Calculate balance before and after
        const balanceBefore = new Decimal(balance.balance.toString());
        const balanceAfter = balanceBefore.minus(new Decimal(withdrawal.amount.toString()));

        // Create transaction record
        await tx.influencerTransaction.create({
          data: {
            influencerId: withdrawal.influencerId,
            type: 'WITHDRAWAL',
            amount: new Decimal(withdrawal.amount.toString()).negated(),
            currency: withdrawal.currency,
            description: `Withdrawal completed - ${withdrawal.bankName} ${withdrawal.bankAccountNumber}`,
            balanceBefore: balanceBefore,
            balanceAfter: balanceAfter,
          },
        });
      });
    } else if (status === 'REJECTED') {
      // Just update status, no balance changes needed
      await prisma.influencerWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'REJECTED',
          processedAt: new Date(),
          processedByUserId: authContext.userId,
          notes: adminNotes ? `${withdrawal.notes || ''}\n[Rejected]: ${adminNotes}` : withdrawal.notes,
        },
      });
    } else {
      // PROCESSING status
      await prisma.influencerWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'PROCESSING',
          notes: adminNotes ? `${withdrawal.notes || ''}\n[Processing]: ${adminNotes}` : withdrawal.notes,
        },
      });
    }

    // Fetch updated withdrawal
    const updatedWithdrawal = await prisma.influencerWithdrawal.findUnique({
      where: { id: withdrawalId },
      include: {
        influencer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Withdrawal ${status.toLowerCase()} successfully`,
      data: serializeBigInt(updatedWithdrawal),
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process withdrawal' },
      { status: 500 }
    );
  }
});
