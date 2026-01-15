import React from 'react';

import { TranslationKeys } from '@/lib/i18n';
import { tOr } from '@/lib/i18n/useTranslation';
import { getCurrencyConfig } from '@/lib/constants/location';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils/format';
import Switch from '@/components/ui/Switch';
import SettingsCard from '@/components/merchants/merchant-edit/ui/SettingsCard';

export interface PosSettingsTabProps {
  t: (key: TranslationKeys | string, params?: Record<string, string | number>) => string;
  currency: string;

  posPayImmediately: boolean;
  onPosPayImmediatelyChange: (checked: boolean) => void;

  posCustomItemsEnabled: boolean;
  onPosCustomItemsEnabledChange: (checked: boolean) => void;

  posCustomItemsMaxNameLength: number;
  onPosCustomItemsMaxNameLengthChange: (value: number) => void;

  posCustomItemsMaxPrice: number;
  onPosCustomItemsMaxPriceChange: (value: number) => void;
}

export default function PosSettingsTab({
  t,
  currency,
  posPayImmediately,
  onPosPayImmediatelyChange,
  posCustomItemsEnabled,
  onPosCustomItemsEnabledChange,
  posCustomItemsMaxNameLength,
  onPosCustomItemsMaxNameLengthChange,
  posCustomItemsMaxPrice,
  onPosCustomItemsMaxPriceChange,
}: PosSettingsTabProps) {
  const currencyConfig = getCurrencyConfig(currency || 'AUD');
  const currencySymbol = getCurrencySymbol(currency || 'AUD');
  const decimals = currencyConfig?.decimals ?? 2;
  const step = decimals === 0 ? '1' : (1 / Math.pow(10, decimals)).toFixed(decimals);
  const normalizedValue = decimals === 0 ? Math.floor(posCustomItemsMaxPrice) : posCustomItemsMaxPrice;

  return (
    <div className="space-y-6">
      <SettingsCard
        title={tOr(t, 'admin.merchantEdit.pos.sectionTitle', 'POS settings')}
        description={tOr(t, 'admin.merchantEdit.pos.sectionDesc', 'Control cashier flow and POS order creation behavior.')}
      >
        <div className="space-y-3">
          <div
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40"
            data-tutorial="pos-pay-behavior"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.pos.payBehaviorTitle', 'Payment flow')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {posPayImmediately
                    ? tOr(
                        t,
                        'admin.merchantEdit.pos.payBehaviorDescPayNow',
                        'Pay immediately: show the payment modal right after creating an order in POS.'
                      )
                    : tOr(
                        t,
                        'admin.merchantEdit.pos.payBehaviorDescPayLater',
                        'Pay later: create the order first, then allow receipt printing and payment recording.'
                      )}
                </p>
              </div>
              <Switch
                checked={posPayImmediately}
                onCheckedChange={onPosPayImmediatelyChange}
                aria-label={tOr(t, 'admin.merchantEdit.pos.payBehaviorTitle', 'Payment flow')}
              />
            </div>
          </div>

          <div
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40"
            data-tutorial="pos-custom-items"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.pos.customItemsTitle', 'Custom items')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {posCustomItemsEnabled
                    ? tOr(
                        t,
                        'admin.merchantEdit.pos.customItemsDescEnabled',
                        'Allow cashiers to add a custom item with a custom name and price.'
                      )
                    : tOr(
                        t,
                        'admin.merchantEdit.pos.customItemsDescDisabled',
                        'Hide the Custom tab and block custom items from being created in POS.'
                      )}
                </p>
              </div>
              <Switch
                checked={posCustomItemsEnabled}
                onCheckedChange={onPosCustomItemsEnabledChange}
                aria-label={tOr(t, 'admin.merchantEdit.pos.customItemsTitle', 'Custom items')}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  {tOr(t, 'admin.merchantEdit.pos.customItemsMaxNameLength', 'Max custom item name length')}
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={posCustomItemsMaxNameLength}
                  onChange={(e) => onPosCustomItemsMaxNameLengthChange(Number(e.target.value))}
                  disabled={!posCustomItemsEnabled}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-900/60"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                  {tOr(t, 'admin.merchantEdit.pos.customItemsMaxPrice', 'Max custom item price')} ({currencySymbol})
                </label>
                <div className="relative" data-tutorial="pos-custom-items-max-price">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={step}
                    value={normalizedValue}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      if (!Number.isFinite(next)) {
                        onPosCustomItemsMaxPriceChange(0);
                        return;
                      }
                      onPosCustomItemsMaxPriceChange(decimals === 0 ? Math.floor(next) : next);
                    }}
                    disabled={!posCustomItemsEnabled}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:disabled:bg-gray-900/60"
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  {tOr(t, 'admin.merchantEdit.pos.customItemsMaxPriceHint', 'Applies to the unit price (before quantity).')}{' '}
                  {currency ? `(${currency})` : null}
                  {normalizedValue > 0
                    ? ` • ${tOr(t, 'admin.merchantEdit.pos.customItemsMaxPricePreview', 'Preview')}: ${formatCurrency(normalizedValue, currency || 'AUD')}`
                    : ` • ${tOr(t, 'admin.merchantEdit.pos.customItemsMaxPriceDefault', 'Set 0 to use default')}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
