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
  type StaffActivityToggleKey,
} from '@/lib/utils/notificationSettings';

type MerchantToggleAvailability = Record<MerchantTransactionToggleKey, boolean>;
type StaffToggleAvailability = Record<StaffActivityToggleKey, boolean>;

function emptyAvailability(): MerchantToggleAvailability {
  return {
    newOrder: false,
    stockOut: false,
    lowStock: false,
    payment: false,
    subscription: false,
  };
}

function emptyStaffAvailability(): StaffToggleAvailability {
  return {
    login: false,
    logout: false,
  };
}

function getStaffToggleAvailability(auth: AuthContext): StaffToggleAvailability {
  if (!auth.merchantId) return emptyStaffAvailability();
  if (auth.role !== 'MERCHANT_OWNER') return emptyStaffAvailability();

  return {
    login: true,
    logout: true,
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
  const staffAvailability = getStaffToggleAvailability(auth);

  return NextResponse.json({
    success: true,
    data: {
      settings: {
        accountTransactions: settings.account.transactions,
        merchant: settings.merchant,
        staff: settings.staff,
      },
      availability: {
        merchant: availability,
        staff: staffAvailability,
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
    staff?: Partial<Record<StaffActivityToggleKey, boolean>>;
  };

  const next = mergeNotificationSettings(current, {
    account: {
      ...(typeof patch.accountTransactions === 'boolean'
        ? { transactions: patch.accountTransactions }
        : {}),
    },
    merchant: patch.merchant || {},
    staff: patch.staff || {},
  });

  // Enforce: staff can only update merchant toggles they have access to.
  if (auth.role === 'MERCHANT_STAFF') {
    for (const key of Object.keys(next.merchant) as MerchantTransactionToggleKey[]) {
      if (!availability[key]) {
        next.merchant[key] = current.merchant[key];
      }
    }

    // Staff cannot modify staff activity notification settings.
    next.staff = current.staff;
  }

  // Enforce: only merchant owners can modify staff activity notification settings.
  if (auth.role !== 'MERCHANT_OWNER') {
    next.staff = current.staff;
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
        staff: next.staff,
      },
    },
  });
}

export const GET = withAuth(handleGet);
export const PUT = withAuth(handlePut);
