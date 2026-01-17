import { describe, expect, it, vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.doUnmock('@/lib/services/MerchantTemplateService');
});

describe('New merchant bootstrap (repo-mocked integration)', () => {
  it('applies default modes/fees/features/receiptSettings on createMerchant', async () => {
    const userRepositoryMock = {
      emailExists: vi.fn().mockResolvedValue(false),
      create: vi.fn().mockResolvedValue({
        id: BigInt(1000),
        name: 'Owner',
        email: 'owner@example.com',
        role: 'MERCHANT_OWNER',
        isActive: true,
      }),
    };

    const merchantRepositoryMock = {
      codeExists: vi.fn().mockResolvedValue(false),
      createWithUser: vi.fn().mockImplementation(async (data: any) => ({
        id: BigInt(2000),
        code: data.code,
        name: data.name,
        ...data,
      })),
    };

    vi.doMock('@/lib/repositories/UserRepository', () => ({ default: userRepositoryMock }));
    vi.doMock('@/lib/repositories/MerchantRepository', () => ({ default: merchantRepositoryMock }));

    vi.doMock('@/lib/utils/passwordHasher', () => ({ hashPassword: vi.fn().mockResolvedValue('hashed') }));
    vi.doMock('@/lib/utils/validators', () => ({
      validateEmail: vi.fn(),
      validateRequired: vi.fn(),
      validateMerchantCode: vi.fn(),
    }));

    vi.doMock('@/lib/repositories/SubscriptionRepository', () => ({
      default: {
        createMerchantSubscription: vi.fn().mockResolvedValue(undefined),
      },
    }));

    vi.doMock('@/lib/repositories/BalanceRepository', () => ({
      default: {
        getOrCreateBalance: vi.fn().mockResolvedValue(undefined),
      },
    }));

    const subscriptionServiceMock = {
      getPlanPricing: vi.fn().mockResolvedValue({ trialDays: 30 }),
    };
    vi.doMock('@/lib/services/SubscriptionService', () => ({ default: subscriptionServiceMock }));

    vi.doMock('@/lib/services/UserNotificationService', () => ({
      default: {
        notifyNewMerchantRegistration: vi.fn().mockResolvedValue(undefined),
      },
    }));

    vi.doMock('@/lib/services/MerchantTemplateService', () => ({
      default: {
        createTemplateData: vi.fn().mockResolvedValue({
          categories: [{ id: BigInt(1), name: 'Makanan' }, { id: BigInt(2), name: 'Minuman' }],
          menus: [{ id: BigInt(10), name: 'Menu Makanan' }, { id: BigInt(11), name: 'Menu Minuman' }],
          addonCategory: { id: BigInt(20), name: 'Tambahan' },
          addonItems: [{ id: BigInt(30), name: 'Ekstra 1' }, { id: BigInt(31), name: 'Ekstra 2' }],
          openingHoursCount: 7,
        }),
      },
    }));

    const { default: merchantService } = await import('@/lib/services/MerchantService');

    await merchantService.createMerchant({
      name: 'Merchant Test',
      code: 'ABCD',
      ownerName: 'Owner',
      ownerEmail: 'owner@example.com',
      ownerPassword: 'password',
      currency: 'IDR',
    });

    expect(subscriptionServiceMock.getPlanPricing).toHaveBeenCalledWith('IDR');

    expect(merchantRepositoryMock.createWithUser).toHaveBeenCalledTimes(1);
    const merchantCreateArg = merchantRepositoryMock.createWithUser.mock.calls[0]?.[0];

    // Sales modes
    expect(merchantCreateArg.isDineInEnabled).toBe(true);
    expect(merchantCreateArg.isTakeawayEnabled).toBe(true);
    expect(merchantCreateArg.isDeliveryEnabled).toBe(false);
    expect(merchantCreateArg.requireTableNumberForDineIn).toBe(true);

    // Scheduled/reservation
    expect(merchantCreateArg.isScheduledOrderEnabled).toBe(false);
    expect(merchantCreateArg.isReservationEnabled).toBe(false);

    // Fees/charges
    expect(merchantCreateArg.enableTax).toBe(false);
    expect(merchantCreateArg.enableServiceCharge).toBe(false);
    expect(merchantCreateArg.enablePackagingFee).toBe(false);

    // POS
    expect(merchantCreateArg.posPayImmediately).toBe(true);

    // Feature flags
    expect(merchantCreateArg.features?.orderVouchers?.posDiscountsEnabled).toBe(true);
    expect(merchantCreateArg.features?.orderVouchers?.customerEnabled).toBe(false);
    expect(merchantCreateArg.features?.pos?.customItems?.enabled).toBe(false);

    // Receipt settings defaults
    expect(merchantCreateArg.receiptSettings?.sendCompletedOrderEmailToCustomer).toBe(false);
    expect(merchantCreateArg.receiptSettings?.showCustomFooterText).toBe(false);
    expect(merchantCreateArg.receiptSettings?.customFooterText).toBeUndefined();
    expect(merchantCreateArg.receiptSettings?.customThankYouMessage).toBeUndefined();
    expect(merchantCreateArg.receiptSettings?.receiptLanguage).toBe('id');
  });
});

describe('MerchantTemplateService (Prisma-mocked integration)', () => {
  it('creates 2 categories + 2 menus + 1 addon category (2 items) and links addon only to food menu; opening hours 24/7', async () => {
    const tx = {
      menuCategory: {
        create: vi
          .fn()
          .mockResolvedValueOnce({ id: BigInt(1), name: 'Makanan' })
          .mockResolvedValueOnce({ id: BigInt(2), name: 'Minuman' }),
      },
      addonCategory: {
        create: vi.fn().mockResolvedValue({ id: BigInt(3), name: 'Tambahan' }),
      },
      addonItem: {
        create: vi
          .fn()
          .mockResolvedValueOnce({ id: BigInt(4), name: 'Ekstra 1' })
          .mockResolvedValueOnce({ id: BigInt(5), name: 'Ekstra 2' }),
      },
      menu: {
        create: vi
          .fn()
          .mockResolvedValueOnce({ id: BigInt(6), name: 'Menu Makanan' })
          .mockResolvedValueOnce({ id: BigInt(7), name: 'Menu Minuman' }),
      },
      menuCategoryItem: {
        create: vi.fn().mockResolvedValue(undefined),
      },
      menuAddonCategory: {
        create: vi.fn().mockResolvedValue(undefined),
      },
      merchantOpeningHour: {
        create: vi.fn().mockResolvedValue(undefined),
      },
    };

    const prismaMock = {
      $transaction: vi.fn().mockImplementation(async (fn: any) => fn(tx)),
    };

    vi.doMock('@/lib/db/client', () => ({ default: prismaMock }));

    const { default: merchantTemplateService } = await import('@/lib/services/MerchantTemplateService');

    const result = await merchantTemplateService.createTemplateData(BigInt(10), BigInt(20), 'IDR');

    expect(result.categories.map((c) => c.name)).toEqual(['Makanan', 'Minuman']);
    expect(result.menus.map((m) => m.name)).toEqual(['Menu Makanan', 'Menu Minuman']);
    expect(result.addonCategory.name).toBe('Tambahan');
    expect(result.addonItems.map((a) => a.name)).toEqual(['Ekstra 1', 'Ekstra 2']);
    expect(result.openingHoursCount).toBe(7);

    // Addon category should link only to the food menu
    expect(tx.menuAddonCategory.create).toHaveBeenCalledTimes(1);
    expect(tx.menuAddonCategory.create).toHaveBeenCalledWith({
      data: { menuId: BigInt(6), addonCategoryId: BigInt(3) },
    });

    // Opening hours should be 24/7 for all days
    expect(tx.merchantOpeningHour.create).toHaveBeenCalledTimes(7);
    const calls = tx.merchantOpeningHour.create.mock.calls.map((c) => c[0]?.data);
    const days = calls.map((d) => d.dayOfWeek).sort((a: number, b: number) => a - b);
    expect(days).toEqual([0, 1, 2, 3, 4, 5, 6]);
    for (const d of calls) {
      expect(d.openTime).toBe('00:00');
      expect(d.closeTime).toBe('23:59');
      expect(d.isClosed).toBe(false);
    }
  });
});
