import React from 'react';

import type { TranslationKeys } from '@/lib/i18n';
import { useTranslation, tOr } from '@/lib/i18n/useTranslation';
import type { MerchantFormData } from '@/components/merchants/merchant-edit/types';
import SettingsCard from '@/components/merchants/merchant-edit/ui/SettingsCard';
import Switch from '@/components/ui/Switch';
import { getCurrencyConfig } from '@/lib/constants/location';
import { formatCurrency } from '@/lib/utils/format';

export interface FeesTabProps {
  formData: MerchantFormData;
  setFormData: React.Dispatch<React.SetStateAction<MerchantFormData>>;
}

export default function FeesTab({ formData, setFormData }: FeesTabProps) {
  const { t } = useTranslation();

  const currency = formData.currency || 'AUD';
  const currencyConfig = getCurrencyConfig(currency);
  const decimals = currencyConfig?.decimals ?? 2;
  const moneyStep = decimals === 0 ? '1' : (1 / Math.pow(10, decimals)).toFixed(decimals);

  return (
    <div className="space-y-6">
      <SettingsCard
        title={tOr(t, 'admin.merchantEdit.feesChargesTitle' as TranslationKeys, 'Fees & charges')}
        description={tOr(
          t,
          'admin.merchantEdit.feesChargesDesc' as TranslationKeys,
          'Configure tax, service charge, and packaging fees that apply to customer orders.'
        )}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.fee.taxTitle' as TranslationKeys, 'Tax')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {tOr(t, 'admin.merchantEdit.fee.taxDesc' as TranslationKeys, 'Apply a percentage-based tax to all orders.')}
                </p>
              </div>
              <Switch
                checked={formData.enableTax}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, enableTax: checked }))}
                aria-label={tOr(t, 'admin.merchantEdit.enableTax' as TranslationKeys, 'Enable tax')}
              />
            </div>
            {formData.enableTax ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {tOr(t, 'admin.merchantEdit.taxPercentage' as TranslationKeys, 'Tax percentage')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={formData.taxPercentage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, taxPercentage: parseFloat(e.target.value) || 0 }))}
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.fee.serviceChargeTitle' as TranslationKeys, 'Service charge')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {tOr(
                    t,
                    'admin.merchantEdit.fee.serviceChargeDesc' as TranslationKeys,
                    'Add a percentage-based service charge to all orders.'
                  )}
                </p>
              </div>
              <Switch
                checked={formData.enableServiceCharge}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, enableServiceCharge: checked }))}
                aria-label={tOr(t, 'admin.merchantEdit.enableServiceCharge' as TranslationKeys, 'Enable service charge')}
              />
            </div>
            {formData.enableServiceCharge ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {tOr(
                      t,
                      'admin.merchantEdit.chargePercentage' as TranslationKeys,
                      'Service charge percentage'
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={formData.serviceChargePercent}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          serviceChargePercent: parseFloat(e.target.value) || 0,
                        }))
                      }
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40" data-tutorial="fees-packaging-fee">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.fee.packagingFeeTitle' as TranslationKeys, 'Packaging fee')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {tOr(
                    t,
                    'admin.merchantEdit.fee.packagingFeeDesc' as TranslationKeys,
                    'Add a fixed fee per order.'
                  )}
                </p>
                <p className="mt-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                  {tOr(
                    t,
                    'admin.merchantEdit.packagingFeeDesc' as TranslationKeys,
                    'Applied to takeaway and delivery orders'
                  )}
                </p>
              </div>
              <Switch
                checked={formData.enablePackagingFee}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, enablePackagingFee: checked }))}
                aria-label={tOr(t, 'admin.merchantEdit.enablePackagingFee' as TranslationKeys, 'Enable packaging fee')}
              />
            </div>
            {formData.enablePackagingFee ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {tOr(t, 'admin.merchantEdit.feeAmount' as TranslationKeys, 'Packaging fee amount')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={moneyStep}
                    value={formData.packagingFeeAmount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, packagingFeeAmount: parseFloat(e.target.value) || 0 }))}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    {tOr(t, 'admin.merchantEdit.fee.preview' as TranslationKeys, 'Preview')}:{' '}
                    {formatCurrency(formData.packagingFeeAmount || 0, currency)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
