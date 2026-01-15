import React from 'react';

import type { TranslationKeys } from '@/lib/i18n';
import { tOr } from '@/lib/i18n/useTranslation';
import type { MerchantFormData } from '@/components/merchants/merchant-edit/types';
import SettingsCard from '@/components/merchants/merchant-edit/ui/SettingsCard';
import Switch from '@/components/ui/Switch';

export interface FeaturesTabProps {
  t: (key: TranslationKeys | string, params?: Record<string, string | number>) => string;
  formData: MerchantFormData;
  setFormData: React.Dispatch<React.SetStateAction<MerchantFormData>>;
  onOpenReservationsWizard: () => void;
}

export default function FeaturesTab({ t, formData, setFormData, onOpenReservationsWizard }: FeaturesTabProps) {
  return (
    <div className="space-y-6">
      <SettingsCard
        title={tOr(t, 'admin.merchantEdit.features.title', 'Optional features')}
        description={tOr(t, 'admin.merchantEdit.features.desc', 'Enable optional customer flows such as scheduled orders and reservations.')}
      >
        <div className="space-y-4">
          {/* Scheduled Orders */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40" data-tutorial="features-scheduled-orders">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.scheduledOrders.title', 'Scheduled orders')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {tOr(t, 'admin.merchantEdit.scheduledOrders.desc', 'Allow customers to place orders for a future time.')}
                </p>
              </div>
              <Switch
                checked={formData.isScheduledOrderEnabled}
                onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isScheduledOrderEnabled: checked }))}
                aria-label={tOr(t, 'admin.merchantEdit.scheduledOrders.title', 'Scheduled orders')}
              />
            </div>
          </div>

          {/* Reservations */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40" data-tutorial="features-reservations">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.reservations.title', 'Reservations')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {tOr(t, 'admin.merchantEdit.reservations.desc', 'Allow customers to reserve tables and optionally preorder items.')}
                </p>
              </div>
              <Switch
                checked={formData.isReservationEnabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onOpenReservationsWizard();
                    return;
                  }
                  setFormData((prev) => ({ ...prev, isReservationEnabled: false }));
                }}
                aria-label={tOr(t, 'admin.merchantEdit.reservations.title', 'Reservations')}
              />
            </div>

            {formData.isReservationEnabled ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {tOr(t, 'admin.merchantEdit.reservations.requirePreorderTitle', 'Require preorder menu')}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {tOr(t, 'admin.merchantEdit.reservations.requirePreorderDesc', 'Require customers to select menu items when reserving.')}
                      </p>
                    </div>
                    <Switch
                      checked={formData.reservationMenuRequired}
                      onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, reservationMenuRequired: checked }))}
                      aria-label={tOr(t, 'admin.merchantEdit.reservations.requirePreorderTitle', 'Require preorder menu')}
                    />
                  </div>
                </div>

                {formData.reservationMenuRequired ? (
                  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {tOr(t, 'admin.merchantEdit.reservations.minPreorderItemsLabel', 'Minimum preorder items')}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={formData.reservationMinItemCount ?? 1}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          reservationMinItemCount: e.target.value ? Math.max(1, parseInt(e.target.value, 10) || 1) : 1,
                        }))
                      }
                      className="h-10 w-full max-w-60 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {tOr(t, 'admin.merchantEdit.reservations.minPreorderItemsHelp', 'If preorder is required, customers must select at least this many items.')}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
