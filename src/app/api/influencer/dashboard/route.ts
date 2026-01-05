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
      email: true,
      currency: true,
      isActive: true,
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

  // Calculate stats
  const totalMerchants = referredMerchants.length;
  const activeMerchants = referredMerchants.filter(m => m.isActive).length;
  
  // Total earnings by currency
  const earningsByCurrency: Record<string, number> = {};
  for (const balance of influencer.balances) {
    earningsByCurrency[balance.currency] = Number(balance.totalEarned);
  }

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
        totalMerchants,
        activeMerchants,
        earningsByCurrency,
        pendingWithdrawalsByCurrency,
      },
      referredMerchants: referredMerchants.map(m => ({
        id: m.id,
        name: m.name,
        email: m.email,
        currency: m.currency,
        isActive: m.isActive,
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
