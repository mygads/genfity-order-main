/**
 * GET /api/influencer/withdrawals - Get withdrawal history
 * POST /api/influencer/withdrawals - Request new withdrawal
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withInfluencer, InfluencerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';
import { handleError, successResponse } from '@/lib/middleware/errorHandler';
import { Decimal } from '@prisma/client/runtime/library';
import { InfluencerWithdrawalStatus } from '@prisma/client';

async function getHandler(
  request: NextRequest,
  context: InfluencerAuthContext
): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status');

  const where: { influencerId: bigint; status?: InfluencerWithdrawalStatus } = {
    influencerId: context.influencerId,
  };

  if (status && Object.values(InfluencerWithdrawalStatus).includes(status as InfluencerWithdrawalStatus)) {
    where.status = status as InfluencerWithdrawalStatus;
  }

  const [withdrawals, total] = await Promise.all([
    prisma.influencerWithdrawal.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.influencerWithdrawal.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: serializeBigInt(withdrawals),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

async function postHandler(
  request: NextRequest,
  context: InfluencerAuthContext
): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { currency, amount } = body;

    // Validate required fields
    if (!currency || !amount) {
      throw new ValidationError(
        'Currency and amount are required',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    if (amount <= 0) {
      throw new ValidationError(
        'Amount must be greater than 0',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    // Minimum withdrawal amounts
    // Minimum withdrawal amounts (default fallback)
    let minIdr = 100000;
    let minAud = 20;

    // Fetch dynamic settings from subscription plan
    const plan = await prisma.subscriptionPlan.findFirst({ where: { isActive: true } });
    if (plan) {
      // Values from DB are Decimal, convert to Number
      minIdr = Number(plan.influencerMinWithdrawalIdr ?? 100000);
      minAud = Number(plan.influencerMinWithdrawalAud ?? 20);
    }

    const minimumWithdrawal: Record<string, number> = {
      IDR: minIdr,
      AUD: minAud,
    };

    if (amount < (minimumWithdrawal[currency] || 0)) {
      throw new ValidationError(
        `Minimum withdrawal amount is ${currency === 'IDR' ? 'Rp 100.000' : '$20 AUD'}`,
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    // Get influencer with balance
    const influencer = await prisma.influencer.findUnique({
      where: { id: context.influencerId },
      include: {
        balances: {
          where: { currency },
        },
      },
    });

    if (!influencer) {
      throw new ValidationError('Influencer not found', ERROR_CODES.NOT_FOUND);
    }

    // Check if account is approved
    if (!influencer.isApproved) {
      throw new ValidationError(
        'Your account is not yet approved. Please wait for admin approval.',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    // Check balance
    const balance = influencer.balances[0];
    if (!balance || Number(balance.balance) < amount) {
      throw new ValidationError(
        'Insufficient balance',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    // Get bank details based on currency
    let bankName: string | null = null;
    let bankAccountNumber: string | null = null;
    let bankAccountName: string | null = null;

    if (currency === 'IDR') {
      bankName = influencer.bankNameIdr;
      bankAccountNumber = influencer.bankAccountIdr;
      bankAccountName = influencer.bankAccountNameIdr;
    } else if (currency === 'AUD') {
      bankName = influencer.bankNameAud;
      bankAccountNumber = influencer.bankAccountAud;
      bankAccountName = influencer.bankAccountNameAud;
    }

    if (!bankName || !bankAccountNumber || !bankAccountName) {
      throw new ValidationError(
        `Please complete your ${currency} bank details before requesting withdrawal`,
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    // Check for pending withdrawals in same currency
    const pendingWithdrawal = await prisma.influencerWithdrawal.findFirst({
      where: {
        influencerId: context.influencerId,
        currency,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (pendingWithdrawal) {
      throw new ValidationError(
        `You have a pending ${currency} withdrawal. Please wait until it's processed.`,
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    // Create withdrawal request and deduct balance in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get current balance
      const currentBalance = await tx.influencerBalance.findUnique({
        where: {
          influencerId_currency: {
            influencerId: context.influencerId,
            currency,
          },
        },
      });

      if (!currentBalance || Number(currentBalance.balance) < amount) {
        throw new ValidationError('Insufficient balance', ERROR_CODES.VALIDATION_FAILED);
      }

      const balanceBefore = Number(currentBalance.balance);
      const balanceAfter = balanceBefore - amount;

      // Update balance
      await tx.influencerBalance.update({
        where: {
          influencerId_currency: {
            influencerId: context.influencerId,
            currency,
          },
        },
        data: {
          balance: new Decimal(balanceAfter),
          totalWithdrawn: { increment: amount },
        },
      });

      // Create transaction record
      await tx.influencerTransaction.create({
        data: {
          influencerId: context.influencerId,
          type: 'WITHDRAWAL',
          currency,
          amount: new Decimal(-amount), // Negative for withdrawal
          balanceBefore: new Decimal(balanceBefore),
          balanceAfter: new Decimal(balanceAfter),
          description: `Withdrawal request - ${currency} ${amount.toLocaleString()}`,
        },
      });

      // Create withdrawal request
      const withdrawal = await tx.influencerWithdrawal.create({
        data: {
          influencerId: context.influencerId,
          currency,
          amount: new Decimal(amount),
          status: 'PENDING',
          bankName,
          bankAccountNumber,
          bankAccountName,
        },
      });

      return withdrawal;
    });

    return successResponse(
      serializeBigInt(result),
      'Withdrawal request submitted successfully',
      201
    );
  } catch (error) {
    return handleError(error);
  }
}

export const GET = withInfluencer(getHandler);
export const POST = withInfluencer(postHandler);
