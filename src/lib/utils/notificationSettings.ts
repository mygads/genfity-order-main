import type { Prisma } from '@prisma/client';

export type MerchantTransactionToggleKey =
  | 'newOrder'
  | 'stockOut'
  | 'lowStock'
  | 'payment'
  | 'subscription';

export interface NotificationSettingsV1 {
  version: 1;
  account: {
    transactions: boolean;
  };
  merchant: Record<MerchantTransactionToggleKey, boolean>;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsV1 = {
  version: 1,
  account: {
    transactions: true,
  },
  merchant: {
    newOrder: true,
    stockOut: true,
    lowStock: true,
    payment: true,
    subscription: true,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function normalizeNotificationSettings(
  raw: Prisma.JsonValue | unknown
): NotificationSettingsV1 {
  if (!isRecord(raw)) {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }

  const version = raw.version === 1 ? 1 : 1;

  const accountRaw = isRecord(raw.account) ? raw.account : {};
  const merchantRaw = isRecord(raw.merchant) ? raw.merchant : {};

  const normalized: NotificationSettingsV1 = {
    version,
    account: {
      transactions:
        typeof accountRaw.transactions === 'boolean'
          ? accountRaw.transactions
          : DEFAULT_NOTIFICATION_SETTINGS.account.transactions,
    },
    merchant: {
      newOrder:
        typeof merchantRaw.newOrder === 'boolean'
          ? merchantRaw.newOrder
          : DEFAULT_NOTIFICATION_SETTINGS.merchant.newOrder,
      stockOut:
        typeof merchantRaw.stockOut === 'boolean'
          ? merchantRaw.stockOut
          : DEFAULT_NOTIFICATION_SETTINGS.merchant.stockOut,
      lowStock:
        typeof merchantRaw.lowStock === 'boolean'
          ? merchantRaw.lowStock
          : DEFAULT_NOTIFICATION_SETTINGS.merchant.lowStock,
      payment:
        typeof merchantRaw.payment === 'boolean'
          ? merchantRaw.payment
          : DEFAULT_NOTIFICATION_SETTINGS.merchant.payment,
      subscription:
        typeof merchantRaw.subscription === 'boolean'
          ? merchantRaw.subscription
          : DEFAULT_NOTIFICATION_SETTINGS.merchant.subscription,
    },
  };

  return normalized;
}

export function mergeNotificationSettings(
  current: NotificationSettingsV1,
  patch: Partial<{
    account: Partial<NotificationSettingsV1['account']>;
    merchant: Partial<NotificationSettingsV1['merchant']>;
  }>
): NotificationSettingsV1 {
  return {
    version: 1,
    account: {
      ...current.account,
      ...(patch.account || {}),
    },
    merchant: {
      ...current.merchant,
      ...(patch.merchant || {}),
    },
  };
}
