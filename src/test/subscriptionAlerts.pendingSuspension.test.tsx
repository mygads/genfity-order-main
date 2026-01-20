/** @vitest-environment jsdom */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const swrMock = vi.hoisted(() => ({
  useSWRWithAuth: vi.fn(),
}));

vi.mock('@/hooks/useSWRWithAuth', () => swrMock);

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { role: 'MERCHANT_OWNER' },
    hasPermission: () => true,
  }),
}));

vi.mock('@/lib/i18n/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'subscription.alert.pendingSuspensionTitle': 'Store will be suspended tonight',
        'subscription.alert.pendingSuspensionDeposit': 'Your deposit balance is zero. The store will be suspended tonight unless you top up.',
        'subscription.alert.pendingSuspensionMonthly': 'Your monthly subscription has expired. The store will be suspended tonight unless you renew.',
        'subscription.alert.pendingSuspensionTrial': 'Your trial has ended. The store will be suspended tonight unless you upgrade.',
        'subscription.alert.renewButton': 'Renew Subscription',
        'subscription.alert.contactOwner': 'Please contact the store owner to renew the subscription.',
      };
      return map[key] || key;
    },
  }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import SubscriptionAlerts from '@/components/subscription/SubscriptionAlerts';

describe('SubscriptionAlerts pending suspension banner', () => {
  it('shows pending suspension for depleted deposit', () => {
    swrMock.useSWRWithAuth.mockReturnValueOnce({
      data: {
        success: true,
        data: {
          subscription: {
            type: 'DEPOSIT',
            status: 'ACTIVE',
            isValid: false,
            daysRemaining: null,
            suspendReason: null,
            inGracePeriod: false,
            graceDaysRemaining: null,
            pendingSuspension: true,
            pendingSuspensionReason: 'DEPOSIT_DEPLETED',
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<SubscriptionAlerts />);

    expect(screen.getByText('Store will be suspended tonight')).toBeTruthy();
    expect(
      screen.getByText('Your deposit balance is zero. The store will be suspended tonight unless you top up.')
    ).toBeTruthy();
  });

  it('shows pending suspension for expired monthly', () => {
    swrMock.useSWRWithAuth.mockReturnValueOnce({
      data: {
        success: true,
        data: {
          subscription: {
            type: 'MONTHLY',
            status: 'ACTIVE',
            isValid: false,
            daysRemaining: 0,
            suspendReason: null,
            inGracePeriod: false,
            graceDaysRemaining: null,
            pendingSuspension: true,
            pendingSuspensionReason: 'MONTHLY_EXPIRED',
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<SubscriptionAlerts />);

    expect(screen.getByText('Store will be suspended tonight')).toBeTruthy();
    expect(
      screen.getByText('Your monthly subscription has expired. The store will be suspended tonight unless you renew.')
    ).toBeTruthy();
  });

  it('shows pending suspension for expired trial', () => {
    swrMock.useSWRWithAuth.mockReturnValueOnce({
      data: {
        success: true,
        data: {
          subscription: {
            type: 'TRIAL',
            status: 'ACTIVE',
            isValid: false,
            daysRemaining: 0,
            suspendReason: null,
            inGracePeriod: false,
            graceDaysRemaining: null,
            pendingSuspension: true,
            pendingSuspensionReason: 'TRIAL_EXPIRED',
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<SubscriptionAlerts />);

    expect(screen.getByText('Store will be suspended tonight')).toBeTruthy();
    expect(
      screen.getByText('Your trial has ended. The store will be suspended tonight unless you upgrade.')
    ).toBeTruthy();
  });
});
