/**
 * Group Balance API (Merchant Owner)
 * GET /api/merchant/balance/group - Get balances and subscriptions for branch group(s)
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { successResponse, handleError } from '@/lib/middleware/errorHandler';
import { decimalToNumber } from '@/lib/utils/serializer';
import { PaymentStatus } from '@prisma/client';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function getDaysRemaining(date: Date | null): number | null {
  if (!date) return null;
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / MS_PER_DAY));
}

async function handleGet(_request: NextRequest, authContext: AuthContext) {
  try {
    const prismaClient = prisma as any;

    const ownerLinks = await prismaClient.merchantUser.findMany({
      where: {
        userId: authContext.userId,
        role: 'OWNER',
        isActive: true,
      },
      include: {
        merchant: {
          include: {
            parentMerchant: {
              select: { id: true },
            },
            branches: {
              select: { id: true },
            },
          },
        },
      },
    }) as Array<{
      merchant: {
        id: bigint;
        parentMerchant: { id: bigint } | null;
        branches: Array<{ id: bigint }>;
      };
    }>;

    if (!ownerLinks.length) {
      return successResponse({ groups: [] }, 'No branch data found', 200);
    }

    const merchantIds = new Set<bigint>();
    ownerLinks.forEach((link) => {
      merchantIds.add(link.merchant.id);
      if (link.merchant.parentMerchant?.id) {
        merchantIds.add(link.merchant.parentMerchant.id);
      }
      link.merchant.branches.forEach((branch) => merchantIds.add(branch.id));
    });

    const ids = Array.from(merchantIds);

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * MS_PER_DAY);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const [merchantsResult, balances, subscriptions, paidOrdersAgg] = await Promise.all([
      prismaClient.merchant.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
          country: true,
          currency: true,
          timezone: true,
          logoUrl: true,
          parentMerchant: {
            select: { id: true },
          },
        },
      }),
      prisma.merchantBalance.findMany({
        where: { merchantId: { in: ids } },
        select: {
          merchantId: true,
          balance: true,
          lastTopupAt: true,
        },
      }),
      prisma.merchantSubscription.findMany({
        where: { merchantId: { in: ids } },
        select: {
          merchantId: true,
          type: true,
          status: true,
          trialEndsAt: true,
          currentPeriodEnd: true,
          suspendReason: true,
        },
      }),
      prisma.order.groupBy({
        by: ['merchantId'],
        where: {
          merchantId: { in: ids },
          placedAt: {
            gte: startDate,
            lte: endDate,
          },
          payment: {
            is: {
              status: PaymentStatus.COMPLETED,
            },
          },
        },
        _count: {
          _all: true,
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    const merchants = merchantsResult as Array<{
      id: bigint;
      code: string;
      name: string;
      isActive: boolean;
      country: string | null;
      currency: string;
      timezone: string | null;
      logoUrl: string | null;
      parentMerchant: { id: bigint } | null;
    }>;

    const earningsMap = new Map<string, { paidOrders30d: number; revenue30d: number }>();
    (paidOrdersAgg as Array<{
      merchantId: bigint;
      _count: { _all: number };
      _sum: { totalAmount: unknown };
    }>).forEach((row) => {
      earningsMap.set(row.merchantId.toString(), {
        paidOrders30d: row._count?._all ?? 0,
        revenue30d: decimalToNumber((row._sum?.totalAmount as any) ?? 0),
      });
    });

    const balanceMap = new Map(
      balances.map((balance) => [balance.merchantId.toString(), balance])
    );
    const subscriptionMap = new Map(
      subscriptions.map((subscription) => [subscription.merchantId.toString(), subscription])
    );

    const merchantMap = new Map(
      merchants.map((merchant) => {
        const balance = balanceMap.get(merchant.id.toString());
        const subscription = subscriptionMap.get(merchant.id.toString());
        const earnings = earningsMap.get(merchant.id.toString()) || {
          paidOrders30d: 0,
          revenue30d: 0,
        };
        const subscriptionType = subscription?.type ?? 'NONE';
        const daysRemaining = subscription?.type === 'TRIAL'
          ? getDaysRemaining(subscription.trialEndsAt)
          : subscription?.type === 'MONTHLY'
            ? getDaysRemaining(subscription.currentPeriodEnd)
            : null;

        const parentMerchantId = merchant.parentMerchant?.id || null;
        const branchType = parentMerchantId ? 'BRANCH' : 'MAIN';

        return [
          merchant.id.toString(),
          {
            id: merchant.id.toString(),
            code: merchant.code,
            name: merchant.name,
            branchType,
            parentMerchantId: parentMerchantId ? parentMerchantId.toString() : null,
            isActive: merchant.isActive,
            country: merchant.country,
            currency: merchant.currency,
            timezone: merchant.timezone,
            logoUrl: merchant.logoUrl,
            balance: {
              amount: balance ? decimalToNumber(balance.balance) : 0,
              lastTopupAt: balance?.lastTopupAt ?? null,
            },
            earnings,
            subscription: {
              type: subscriptionType,
              status: subscription?.status ?? 'CANCELLED',
              daysRemaining,
              trialEndsAt: subscription?.trialEndsAt ?? null,
              currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
              suspendReason: subscription?.suspendReason ?? null,
            },
          },
        ];
      })
    );

    const grouped = new Map<string, { main: any; branches: any[] }>();
    merchantMap.forEach((merchant) => {
      const mainId = merchant.parentMerchantId || merchant.id;
      const group = grouped.get(mainId) || { main: merchant, branches: [] };

      if (merchant.parentMerchantId) {
        group.branches.push(merchant);
      } else {
        group.main = merchant;
      }

      grouped.set(mainId, group);
    });

    return successResponse(
      { groups: Array.from(grouped.values()) },
      'Group balances retrieved successfully',
      200
    );
  } catch (error) {
    return handleError(error);
  }
}

export const GET = withMerchantOwner(handleGet);
