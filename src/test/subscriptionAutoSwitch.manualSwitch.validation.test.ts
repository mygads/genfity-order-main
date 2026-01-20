import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.useFakeTimers();

type PrismaMock = {
  merchant: { findUnique: ReturnType<typeof vi.fn> };
  subscriptionPlan: { findFirst: ReturnType<typeof vi.fn> };
};

const prismaMock = vi.hoisted((): PrismaMock => ({
  merchant: { findUnique: vi.fn() },
  subscriptionPlan: { findFirst: vi.fn() },
}));

vi.mock('@/lib/db/client', () => ({
  default: prismaMock,
}));

const subscriptionRepositoryMock = vi.hoisted(() => ({
  default: {
    getMerchantSubscription: vi.fn(),
    updateMerchantSubscription: vi.fn(),
    reopenMerchantStore: vi.fn(),
  },
}));

const balanceRepositoryMock = vi.hoisted(() => ({
  default: {
    getMerchantBalance: vi.fn(),
  },
}));

vi.mock('@/lib/repositories/SubscriptionRepository', () => subscriptionRepositoryMock);
vi.mock('@/lib/repositories/BalanceRepository', () => balanceRepositoryMock);
vi.mock('@/lib/services/SubscriptionHistoryService', () => ({ default: {} }));
vi.mock('@/lib/services/UserNotificationService', () => ({ default: {} }));

import subscriptionAutoSwitchService from '@/lib/services/SubscriptionAutoSwitchService';

describe('SubscriptionAutoSwitchService manual switch validation', () => {
  beforeEach(() => {
    prismaMock.merchant.findUnique.mockReset();
    prismaMock.subscriptionPlan.findFirst.mockReset();

    subscriptionRepositoryMock.default.getMerchantSubscription.mockReset();
    subscriptionRepositoryMock.default.updateMerchantSubscription.mockReset();
    subscriptionRepositoryMock.default.reopenMerchantStore.mockReset();

    balanceRepositoryMock.default.getMerchantBalance.mockReset();

    prismaMock.merchant.findUnique.mockResolvedValue({
      id: BigInt(1),
      code: 'M',
      name: 'Merchant',
      isOpen: false,
      isActive: true,
    });
  });

  it('blocks switching to monthly when no active period', async () => {
    vi.setSystemTime(new Date('2026-01-20T00:00:00.000Z'));

    subscriptionRepositoryMock.default.getMerchantSubscription.mockResolvedValue({
      type: 'DEPOSIT',
      status: 'ACTIVE',
      trialEndsAt: null,
      currentPeriodEnd: new Date('2026-01-01T00:00:00.000Z'),
    });

    balanceRepositoryMock.default.getMerchantBalance.mockResolvedValue({
      merchantId: BigInt(1),
      balance: 150,
    });

    await expect(
      subscriptionAutoSwitchService.manualSwitch(BigInt(1), 'MONTHLY')
    ).rejects.toThrow('Monthly subscription is not active');

    expect(subscriptionRepositoryMock.default.updateMerchantSubscription).not.toHaveBeenCalled();
  });

  it('blocks switching to deposit when balance is empty', async () => {
    vi.setSystemTime(new Date('2026-01-20T00:00:00.000Z'));

    subscriptionRepositoryMock.default.getMerchantSubscription.mockResolvedValue({
      type: 'MONTHLY',
      status: 'ACTIVE',
      trialEndsAt: null,
      currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
    });

    balanceRepositoryMock.default.getMerchantBalance.mockResolvedValue({
      merchantId: BigInt(1),
      balance: 0,
    });

    await expect(
      subscriptionAutoSwitchService.manualSwitch(BigInt(1), 'DEPOSIT')
    ).rejects.toThrow('Deposit balance is empty');

    expect(subscriptionRepositoryMock.default.updateMerchantSubscription).not.toHaveBeenCalled();
  });

  it('switches when target resources are available', async () => {
    vi.setSystemTime(new Date('2026-01-20T00:00:00.000Z'));

    subscriptionRepositoryMock.default.getMerchantSubscription.mockResolvedValue({
      type: 'MONTHLY',
      status: 'ACTIVE',
      trialEndsAt: null,
      currentPeriodEnd: new Date('2026-02-01T00:00:00.000Z'),
    });

    balanceRepositoryMock.default.getMerchantBalance.mockResolvedValue({
      merchantId: BigInt(1),
      balance: 250,
    });

    const result = await subscriptionAutoSwitchService.manualSwitch(BigInt(1), 'DEPOSIT');

    expect(result.newType).toBe('DEPOSIT');
    expect(subscriptionRepositoryMock.default.updateMerchantSubscription).toHaveBeenCalledWith(
      BigInt(1),
      expect.objectContaining({ type: 'DEPOSIT', status: 'ACTIVE' })
    );
    expect(subscriptionRepositoryMock.default.reopenMerchantStore).toHaveBeenCalledWith(BigInt(1));
  });
});
