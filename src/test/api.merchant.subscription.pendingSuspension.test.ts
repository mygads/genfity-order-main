import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => {
  class NextRequest extends Request {
    nextUrl: URL;

    constructor(input: string | URL, init?: RequestInit) {
      super(input, init);
      this.nextUrl = new URL(typeof input === 'string' ? input : input.toString());
    }
  }

  const NextResponse = {
    json: (body: unknown, init?: { status?: number }) => {
      return new Response(JSON.stringify(body), {
        status: init?.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  };

  return { NextRequest, NextResponse };
});

const prismaMock = vi.hoisted(() => ({
  merchant: {
    findUnique: vi.fn(),
  },
}));

vi.mock('@/lib/db/client', () => ({
  default: prismaMock,
}));

const subscriptionServiceMock = vi.hoisted(() => ({
  default: {
    getSubscriptionStatus: vi.fn(),
    getPlanPricing: vi.fn(),
  },
}));

const autoSwitchServiceMock = vi.hoisted(() => ({
  default: {
    checkAndAutoSwitch: vi.fn(),
  },
}));

vi.mock('@/lib/services/SubscriptionService', () => subscriptionServiceMock);
vi.mock('@/lib/services/SubscriptionAutoSwitchService', () => autoSwitchServiceMock);

vi.mock('@/lib/middleware/auth', () => ({
  withMerchant: (handler: any) => handler,
}));

import { GET as getSubscription } from '@/app/api/merchant/subscription/route';

async function readJson(res: Response) {
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

describe('GET /api/merchant/subscription pending suspension flag', () => {
  beforeEach(() => {
    prismaMock.merchant.findUnique.mockReset();
    subscriptionServiceMock.default.getSubscriptionStatus.mockReset();
    subscriptionServiceMock.default.getPlanPricing.mockReset();
    autoSwitchServiceMock.default.checkAndAutoSwitch.mockReset();

    prismaMock.merchant.findUnique.mockResolvedValue({
      id: BigInt(1),
      currency: 'IDR',
    });

    subscriptionServiceMock.default.getPlanPricing.mockResolvedValue({
      depositMinimum: 100000,
      orderFee: 250,
      monthlyPrice: 100000,
    });

    autoSwitchServiceMock.default.checkAndAutoSwitch.mockResolvedValue({
      action: 'NO_CHANGE',
    });
  });

  it('returns pendingSuspension for depleted deposit', async () => {
    subscriptionServiceMock.default.getSubscriptionStatus.mockResolvedValue({
      merchantId: BigInt(1),
      type: 'DEPOSIT',
      status: 'ACTIVE',
      isValid: false,
      daysRemaining: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      balance: 0,
      currency: 'IDR',
      suspendReason: null,
      inGracePeriod: false,
      graceDaysRemaining: null,
      graceEndsAt: null,
    });

    const res = await getSubscription({} as any, { merchantId: BigInt(1) } as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.data.subscription.pendingSuspension).toBe(true);
    expect(json.data.subscription.pendingSuspensionReason).toBe('DEPOSIT_DEPLETED');
  });

  it('returns pendingSuspension for expired monthly', async () => {
    subscriptionServiceMock.default.getSubscriptionStatus.mockResolvedValue({
      merchantId: BigInt(1),
      type: 'MONTHLY',
      status: 'ACTIVE',
      isValid: false,
      daysRemaining: 0,
      trialEndsAt: null,
      currentPeriodEnd: new Date('2026-01-01T00:00:00.000Z'),
      balance: null,
      currency: 'IDR',
      suspendReason: null,
      inGracePeriod: false,
      graceDaysRemaining: null,
      graceEndsAt: null,
    });

    const res = await getSubscription({} as any, { merchantId: BigInt(1) } as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.data.subscription.pendingSuspension).toBe(true);
    expect(json.data.subscription.pendingSuspensionReason).toBe('MONTHLY_EXPIRED');
  });

  it('returns pendingSuspension for expired trial', async () => {
    subscriptionServiceMock.default.getSubscriptionStatus.mockResolvedValue({
      merchantId: BigInt(1),
      type: 'TRIAL',
      status: 'ACTIVE',
      isValid: false,
      daysRemaining: 0,
      trialEndsAt: new Date('2026-01-01T00:00:00.000Z'),
      currentPeriodEnd: null,
      balance: null,
      currency: 'IDR',
      suspendReason: null,
      inGracePeriod: false,
      graceDaysRemaining: null,
      graceEndsAt: null,
    });

    const res = await getSubscription({} as any, { merchantId: BigInt(1) } as any);
    const json = await readJson(res as any);

    expect(res.status).toBe(200);
    expect(json.data.subscription.pendingSuspension).toBe(true);
    expect(json.data.subscription.pendingSuspensionReason).toBe('TRIAL_EXPIRED');
  });
});
