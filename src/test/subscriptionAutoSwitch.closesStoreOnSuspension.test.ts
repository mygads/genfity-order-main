import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.useFakeTimers();

type PrismaMock = {
  subscriptionPlan: { findFirst: ReturnType<typeof vi.fn> };
  merchant: { findUnique: ReturnType<typeof vi.fn> };
};

const prismaMock = vi.hoisted((): PrismaMock => ({
  subscriptionPlan: { findFirst: vi.fn() },
  merchant: { findUnique: vi.fn() },
}));

vi.mock('@/lib/db/client', () => ({
  default: prismaMock,
}));

const subscriptionRepositoryMock = vi.hoisted(() => ({
  default: {
    getMerchantSubscription: vi.fn(),
    suspendSubscription: vi.fn(),
    closeMerchantStore: vi.fn(),
  },
}));

const balanceRepositoryMock = vi.hoisted(() => ({
  default: {
    getMerchantBalance: vi.fn(),
  },
}));

const subscriptionHistoryServiceMock = vi.hoisted(() => ({
  default: {
    recordSuspension: vi.fn(),
    recordTrialExpired: vi.fn(),
  },
}));

const userNotificationServiceMock = vi.hoisted(() => ({
  default: {
    createForMerchant: vi.fn(),
  },
}));

vi.mock('@/lib/repositories/SubscriptionRepository', () => subscriptionRepositoryMock);
vi.mock('@/lib/repositories/BalanceRepository', () => balanceRepositoryMock);
vi.mock('@/lib/services/SubscriptionHistoryService', () => subscriptionHistoryServiceMock);
vi.mock('@/lib/services/UserNotificationService', () => userNotificationServiceMock);

import subscriptionAutoSwitchService from '@/lib/services/SubscriptionAutoSwitchService';

describe('SubscriptionAutoSwitchService closes store on suspension', () => {
  beforeEach(() => {
    prismaMock.subscriptionPlan.findFirst.mockReset();
    prismaMock.merchant.findUnique.mockReset();

    subscriptionRepositoryMock.default.getMerchantSubscription.mockReset();
    subscriptionRepositoryMock.default.suspendSubscription.mockReset();
    subscriptionRepositoryMock.default.closeMerchantStore.mockReset();

    balanceRepositoryMock.default.getMerchantBalance.mockReset();

    subscriptionHistoryServiceMock.default.recordSuspension.mockReset();
    subscriptionHistoryServiceMock.default.recordTrialExpired.mockReset();

    userNotificationServiceMock.default.createForMerchant.mockReset();

    // Default: no grace period
    prismaMock.subscriptionPlan.findFirst.mockResolvedValue({ gracePeriodDays: 0, monthlyDays: 31 });

    prismaMock.merchant.findUnique.mockResolvedValue({
      id: BigInt(10),
      code: 'M',
      name: 'Merchant',
      isOpen: true,
      isActive: true,
    });

    balanceRepositoryMock.default.getMerchantBalance.mockResolvedValue({
      merchantId: BigInt(10),
      balance: 0,
    });
  });

  it('suspends expired trial with no fallback and closes store', async () => {
    const now = new Date('2026-01-17T10:00:00.000Z');
    vi.setSystemTime(now);

    subscriptionRepositoryMock.default.getMerchantSubscription.mockResolvedValue({
      type: 'TRIAL',
      status: 'ACTIVE',
      trialEndsAt: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodEnd: null,
    });

    const res = await subscriptionAutoSwitchService.checkAndAutoSwitch(BigInt(10));

    expect(res.action).toBe('SUSPENDED');
    expect(subscriptionRepositoryMock.default.suspendSubscription).toHaveBeenCalledWith(
      BigInt(10),
      expect.stringContaining('Trial expired')
    );
    expect(subscriptionRepositoryMock.default.closeMerchantStore).toHaveBeenCalledWith(
      BigInt(10),
      expect.stringContaining('Store closed')
    );
  });
});
