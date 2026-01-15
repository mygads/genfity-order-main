import React from 'react';

import type { TranslationKeys } from '@/lib/i18n';
import { tOr } from '@/lib/i18n/useTranslation';
import SettingsCard from '@/components/merchants/merchant-edit/ui/SettingsCard';
import Switch from '@/components/ui/Switch';

export interface DiscountVoucherTabProps {
  t: (key: TranslationKeys | string, params?: Record<string, string | number>) => string;
  posDiscountsEnabled: boolean;
  onPosDiscountsEnabledChange: (next: boolean) => void;
  customerVouchersEnabled: boolean;
  onCustomerVouchersEnabledChange: (next: boolean) => void;
}

export default function DiscountVoucherTab({
  t,
  posDiscountsEnabled,
  onPosDiscountsEnabledChange,
  customerVouchersEnabled,
  onCustomerVouchersEnabledChange,
}: DiscountVoucherTabProps) {
  return (
    <div className="space-y-6">
      <SettingsCard
        title={tOr(t, 'admin.merchantEdit.discountVoucher.title', 'Discount & vouchers')}
        description={tOr(
          t,
          'admin.merchantEdit.discountVoucher.desc',
          'Control whether discounts and vouchers are available in POS and customer checkout flows.'
        )}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.discountVoucher.posDiscounts.title', 'Enable POS discounts')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {tOr(
                    t,
                    'admin.merchantEdit.discountVoucher.posDiscounts.desc',
                    'Show the discount section (manual discount + voucher template selection) in the POS payment popup.'
                  )}
                </p>
              </div>
              <Switch
                checked={posDiscountsEnabled}
                onCheckedChange={onPosDiscountsEnabledChange}
                aria-label={tOr(t, 'admin.merchantEdit.discountVoucher.posDiscounts.title', 'Enable POS discounts')}
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.discountVoucher.customerVouchers.title', 'Enable customer vouchers')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {tOr(
                    t,
                    'admin.merchantEdit.discountVoucher.customerVouchers.desc',
                    'Allow customers to enter voucher codes during checkout. When disabled, voucher input and validation are hidden.'
                  )}
                </p>
                {!posDiscountsEnabled ? (
                  <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                    {tOr(
                      t,
                      'admin.merchantEdit.discountVoucher.customerVouchers.requiresPosDiscounts',
                      'Enable POS discounts before enabling customer vouchers.'
                    )}
                  </p>
                ) : null}
              </div>
              <Switch
                checked={customerVouchersEnabled}
                onCheckedChange={onCustomerVouchersEnabledChange}
                disabled={!posDiscountsEnabled}
                aria-label={tOr(t, 'admin.merchantEdit.discountVoucher.customerVouchers.title', 'Enable customer vouchers')}
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
            {tOr(
              t,
              'admin.merchantEdit.discountVoucher.note',
              'Note: Only one voucher can be applied per order, and vouchers cannot be combined with manual discounts.'
            )}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
