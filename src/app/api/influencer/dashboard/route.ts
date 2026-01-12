/**
 * GET /api/influencer/dashboard
 * Get influencer dashboard data
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withInfluencer, InfluencerAuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

async function handler(
  _request: NextRequest,
  context: InfluencerAuthContext
): Promise<NextResponse> {
  const influencerId = context.influencerId;

  // Get influencer with balances
  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
    include: {
      balances: true,
    },
  });

  if (!influencer) {
    return NextResponse.json({
      success: false,
      error: 'Influencer not found',
    }, { status: 404 });
  }

  // Get referred merchants with their subscription status
  const referredMerchants = await prisma.merchant.findMany({
    where: { referredByInfluencerId: influencerId },
    select: {
      id: true,
      name: true,
      code: true,
      country: true,
      currency: true,
      isOpen: true,
      hasGivenFirstCommission: true,
      createdAt: true,
      subscription: {
        select: {
          type: true,
          status: true,
        },
      },
      // Get total payments from this merchant
      paymentRequests: {
        where: { status: 'VERIFIED' },
        select: {
          amount: true,
          currency: true,
          verifiedAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get recent transactions
  const recentTransactions = await prisma.influencerTransaction.findMany({
    where: { influencerId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      influencer: false,
    },
  });

  // Get merchant names for transactions
  const merchantIds = recentTransactions
    .filter(t => t.merchantId)
    .map(t => t.merchantId as bigint);
  
  const merchants = await prisma.merchant.findMany({
    where: { id: { in: merchantIds } },
    select: { id: true, name: true },
  });

  const merchantMap = new Map(merchants.map(m => [m.id.toString(), m.name]));

  const transactionsWithMerchant = recentTransactions.map(t => ({
    ...t,
    merchantName: t.merchantId ? merchantMap.get(t.merchantId.toString()) : null,
  }));

  // Pending withdrawals
  const pendingWithdrawals = await prisma.influencerWithdrawal.findMany({
    where: {
      influencerId,
      status: { in: ['PENDING', 'PROCESSING'] },
    },
  });

  const pendingWithdrawalsByCurrency: Record<string, number> = {};
  for (const w of pendingWithdrawals) {
    pendingWithdrawalsByCurrency[w.currency] = 
      (pendingWithdrawalsByCurrency[w.currency] || 0) + Number(w.amount);
  }

  // Calculate stats
  const totalReferrals = referredMerchants.length;
  const activeReferrals = referredMerchants.filter(m => m.isOpen).length;

  // All-time earnings by currency (from balances)
  const allTimeEarnings: Record<string, number> = {};
  for (const balance of influencer.balances) {
    allTimeEarnings[balance.currency] = Number(balance.totalEarned);
  }

  // This month earnings by currency (from commission transactions)
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const monthTransactions = await prisma.influencerTransaction.findMany({
    where: {
      influencerId,
      createdAt: { gte: startOfMonth },
      type: { in: ['COMMISSION_FIRST', 'COMMISSION_RECURRING'] },
    },
    select: {
      currency: true,
      amount: true,
    },
  });

  const thisMonthEarnings: Record<string, number> = {};
  for (const t of monthTransactions) {
    thisMonthEarnings[t.currency] = (thisMonthEarnings[t.currency] || 0) + Number(t.amount);
  }

  return NextResponse.json({
    success: true,
    data: serializeBigInt({
      influencer: {
        id: influencer.id,
        name: influencer.name,
        email: influencer.email,
        referralCode: influencer.referralCode,
        country: influencer.country,
        defaultCurrency: influencer.defaultCurrency,
        isApproved: influencer.isApproved,
        profilePictureUrl: influencer.profilePictureUrl,
      },
      balances: influencer.balances.map(b => ({
        currency: b.currency,
        balance: Number(b.balance),
        totalEarned: Number(b.totalEarned),
        totalWithdrawn: Number(b.totalWithdrawn),
      })),
      stats: {
        totalReferrals,
        activeReferrals,
        pendingWithdrawals: pendingWithdrawals.length,
        pendingWithdrawalAmount: pendingWithdrawalsByCurrency,
        thisMonthEarnings,
        allTimeEarnings,
      },
      referredMerchants: referredMerchants.map(m => ({
        id: m.id,
        businessName: m.name,
        merchantCode: m.code,
        country: m.country,
        currency: m.currency,
        isOpen: m.isOpen,
        hasGivenFirstCommission: m.hasGivenFirstCommission,
        subscriptionType: m.subscription?.type || 'TRIAL',
        subscriptionStatus: m.subscription?.status || 'ACTIVE',
        totalPayments: m.paymentRequests.reduce((sum, p) => sum + Number(p.amount), 0),
        createdAt: m.createdAt,
      })),
      recentTransactions: transactionsWithMerchant,
    }),
  });
}

export const GET = withInfluencer(handler);
