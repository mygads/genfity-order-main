/**
 * Notification Settings API
 * GET /api/notifications/settings - Get current user's notification settings + which toggles are available
 * PUT /api/notifications/settings - Update current user's notification settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth, type AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import {
  normalizeNotificationSettings,
  mergeNotificationSettings,
  type MerchantTransactionToggleKey,
} from '@/lib/utils/notificationSettings';

type MerchantToggleAvailability = Record<MerchantTransactionToggleKey, boolean>;

function emptyAvailability(): MerchantToggleAvailability {
  return {
    newOrder: false,
    stockOut: false,
    lowStock: false,
    payment: false,
    subscription: false,
  };
}

async function getMerchantToggleAvailability(auth: AuthContext): Promise<MerchantToggleAvailability> {
  if (!auth.merchantId) return emptyAvailability();
  if (auth.role === 'MERCHANT_OWNER') {
    return {
      newOrder: true,
      stockOut: true,
      lowStock: true,
      payment: true,
      subscription: true,
    };
  }

  if (auth.role !== 'MERCHANT_STAFF') return emptyAvailability();

  const mu = await prisma.merchantUser.findUnique({
    where: {
      merchantId_userId: {
        merchantId: auth.merchantId,
        userId: auth.userId,
      },
    },
    select: {
      isActive: true,
      permissions: true,
    },
  });

  if (!mu?.isActive) return emptyAvailability();

  const permissions = mu.permissions ?? [];

  return {
    newOrder: permissions.includes('notif_new_order'),
    stockOut: permissions.includes('notif_stock_out'),
    lowStock: permissions.includes('notif_low_stock'),
    payment: permissions.includes('notif_payment'),
    subscription: permissions.includes('notif_subscription'),
  };
}

async function handleGet(_req: NextRequest, auth: AuthContext) {
  const pref = await prisma.userPreference.findUnique({
    where: { userId: auth.userId },
    select: { notificationSettings: true },
  });

  const settings = normalizeNotificationSettings(pref?.notificationSettings);
  const availability = await getMerchantToggleAvailability(auth);

  return NextResponse.json({
    success: true,
    data: {
      settings: {
        accountTransactions: settings.account.transactions,
        merchant: settings.merchant,
      },
      availability: {
        merchant: availability,
      },
    },
  });
}

async function handlePut(req: NextRequest, auth: AuthContext) {
  const body = (await req.json().catch(() => null)) as unknown;
  if (!body || typeof body !== 'object') {
    return NextResponse.json(
      { success: false, error: 'VALIDATION_ERROR', message: 'Invalid request body' },
      { status: 400 }
    );
  }

  const pref = await prisma.userPreference.findUnique({
    where: { userId: auth.userId },
    select: { notificationSettings: true },
  });

  const current = normalizeNotificationSettings(pref?.notificationSettings);
  const availability = await getMerchantToggleAvailability(auth);

  const patch = body as {
    accountTransactions?: boolean;
    merchant?: Partial<Record<MerchantTransactionToggleKey, boolean>>;
  };

  const next = mergeNotificationSettings(current, {
    account: {
      ...(typeof patch.accountTransactions === 'boolean'
        ? { transactions: patch.accountTransactions }
        : {}),
    },
    merchant: patch.merchant || {},
  });

  // Enforce: staff can only update merchant toggles they have access to.
  if (auth.role === 'MERCHANT_STAFF') {
    for (const key of Object.keys(next.merchant) as MerchantTransactionToggleKey[]) {
      if (!availability[key]) {
        next.merchant[key] = current.merchant[key];
      }
    }
  }

  await prisma.userPreference.upsert({
    where: { userId: auth.userId },
    create: {
      userId: auth.userId,
      notificationSettings: next as any,
    },
    update: {
      notificationSettings: next as any,
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      settings: {
        accountTransactions: next.account.transactions,
        merchant: next.merchant,
      },
    },
  });
}

export const GET = withAuth(handleGet);
export const PUT = withAuth(handlePut);
