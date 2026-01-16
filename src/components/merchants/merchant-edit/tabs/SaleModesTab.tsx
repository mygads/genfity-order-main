import React, { useEffect, useRef, useState } from 'react';
import { FaChevronDown } from 'react-icons/fa';

import type { TranslationKeys } from '@/lib/i18n';
import { tOr } from '@/lib/i18n/useTranslation';
import type { MerchantFormData } from '@/components/merchants/merchant-edit/types';
import SettingsCard from '@/components/merchants/merchant-edit/ui/SettingsCard';
import Switch from '@/components/ui/Switch';
import Button from '@/components/ui/Button';

type ToastFn = (title: string, message: string, duration?: number) => void;

export interface SaleModesTabProps {
  t: (key: TranslationKeys | string, params?: Record<string, string | number>) => string;
  formData: MerchantFormData;
  setFormData: React.Dispatch<React.SetStateAction<MerchantFormData>>;
  originalFormData: MerchantFormData | null;
  showError: ToastFn;
  onTabChange: (tabId: string) => void;
}

export default function SaleModesTab({
  t,
  formData,
  setFormData,
  originalFormData,
  showError,
  onTabChange,
}: SaleModesTabProps) {
  const hasLocation = formData.latitude !== null && formData.longitude !== null;
  const enabledModes = [formData.isDineInEnabled, formData.isTakeawayEnabled, formData.isDeliveryEnabled].filter(Boolean).length;

  const hasCustomLabels = Boolean(
    (formData.dineInLabel || '').trim() || (formData.takeawayLabel || '').trim() || (formData.deliveryLabel || '').trim()
  );

  const hasModeSchedules = Boolean(
    formData.dineInScheduleStart ||
      formData.dineInScheduleEnd ||
      formData.takeawayScheduleStart ||
      formData.takeawayScheduleEnd ||
      formData.deliveryScheduleStart ||
      formData.deliveryScheduleEnd
  );

  const showDineInLabel = formData.isDineInEnabled || Boolean((formData.dineInLabel || '').trim());
  const showTakeawayLabel = formData.isTakeawayEnabled || Boolean((formData.takeawayLabel || '').trim());
  const showDeliveryLabel = formData.isDeliveryEnabled || Boolean((formData.deliveryLabel || '').trim());

  const showDineInSchedule = formData.isDineInEnabled || Boolean(formData.dineInScheduleStart || formData.dineInScheduleEnd);
  const showTakeawaySchedule = formData.isTakeawayEnabled || Boolean(formData.takeawayScheduleStart || formData.takeawayScheduleEnd);
  const showDeliverySchedule = formData.isDeliveryEnabled || Boolean(formData.deliveryScheduleStart || formData.deliveryScheduleEnd);

  const scheduleErrors = {
    dineIn: Boolean(
      (formData.dineInScheduleStart && !formData.dineInScheduleEnd) ||
        (!formData.dineInScheduleStart && formData.dineInScheduleEnd)
    ),
    takeaway: Boolean(
      (formData.takeawayScheduleStart && !formData.takeawayScheduleEnd) ||
        (!formData.takeawayScheduleStart && formData.takeawayScheduleEnd)
    ),
    delivery: Boolean(
      (formData.deliveryScheduleStart && !formData.deliveryScheduleEnd) ||
        (!formData.deliveryScheduleStart && formData.deliveryScheduleEnd)
    ),
  };

  const [labelsOpen, setLabelsOpen] = useState(false);
  const [schedulesOpen, setSchedulesOpen] = useState(false);
  const didInitAdvanced = useRef(false);

  useEffect(() => {
    if (didInitAdvanced.current) return;
    if (!originalFormData) return;

    setLabelsOpen(hasCustomLabels);
    setSchedulesOpen(hasModeSchedules);
    didInitAdvanced.current = true;
  }, [originalFormData, hasCustomLabels, hasModeSchedules]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Configure which ordering modes are available to customers.
      </p>

      {!hasLocation ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
          Delivery requires merchant coordinates. Set merchant location in the Location tab.
        </div>
      ) : null}

      <div className="space-y-6">
          <SettingsCard
            title={tOr(t, 'admin.merchantEdit.modes.chooseTitle', 'Order modes')}
            description={tOr(t, 'admin.merchantEdit.modes.chooseDescription', 'Choose which ordering modes are available for customers.')}
            rightSlot={
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                {enabledModes} enabled
              </span>
            }
          >

            <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
              {/* Dine In */}
              <div className="py-4" data-tutorial="sale-modes-dinein-toggle">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.merchantEdit.modes.dineInTitle')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.modes.dineInDesc')}</p>
                  </div>
                  <Switch
                    checked={formData.isDineInEnabled}
                    onCheckedChange={(checked) => {
                      if (!checked && !formData.isTakeawayEnabled && !formData.isDeliveryEnabled) {
                        showError(t('common.error'), t('admin.merchantEdit.orderModes.atLeastOneRequired'));
                        return;
                      }
                      setFormData((prev) => ({ ...prev, isDineInEnabled: checked }));
                    }}
                    aria-label={t('admin.merchantEdit.modes.dineInTitle')}
                  />
                </div>

                {formData.isDineInEnabled && (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {tOr(t, 'admin.merchantEdit.modes.requireTableNumberTitle', 'Require table number')}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {tOr(
                            t,
                            'admin.merchantEdit.modes.requireTableNumberDesc',
                            'If enabled, customers/admin must provide a table number for Dine In orders.'
                          )}
                        </p>
                      </div>

                      <Switch
                        checked={formData.requireTableNumberForDineIn}
                        onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, requireTableNumberForDineIn: checked }))}
                        aria-label={tOr(t, 'admin.merchantEdit.modes.requireTableNumberTitle', 'Require table number')}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Takeaway */}
              <div className="py-4" data-tutorial="sale-modes-takeaway-toggle">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.merchantEdit.orderModes.takeawayTitle')}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.orderModes.takeawayDesc')}</p>
                  </div>
                  <Switch
                    checked={formData.isTakeawayEnabled}
                    onCheckedChange={(checked) => {
                      if (!checked && !formData.isDineInEnabled && !formData.isDeliveryEnabled) {
                        showError(t('common.error'), t('admin.merchantEdit.orderModes.atLeastOneRequired'));
                        return;
                      }
                      setFormData((prev) => ({ ...prev, isTakeawayEnabled: checked }));
                    }}
                    aria-label={t('admin.merchantEdit.orderModes.takeawayTitle')}
                  />
                </div>
              </div>

              {/* Delivery */}
              <div className="py-4" data-tutorial="sale-modes-delivery-toggle">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.merchantEdit.orderModes.deliveryTitle')}</p>
                      {!hasLocation && !formData.isDeliveryEnabled ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                          Location required
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.orderModes.deliveryDesc')}</p>
                  </div>
                  <Switch
                    checked={formData.isDeliveryEnabled}
                    disabled={!hasLocation && !formData.isDeliveryEnabled}
                    onCheckedChange={(checked) => {
                      if (checked && !hasLocation) {
                        showError(t('common.error'), t('admin.merchantEdit.orderModes.deliveryRequiresLocation'));
                        return;
                      }
                      if (!checked && !formData.isDineInEnabled && !formData.isTakeawayEnabled) {
                        showError(t('common.error'), t('admin.merchantEdit.orderModes.atLeastOneRequired'));
                        return;
                      }
                      setFormData((prev) => ({ ...prev, isDeliveryEnabled: checked }));
                    }}
                    aria-label={t('admin.merchantEdit.orderModes.deliveryTitle')}
                  />
                </div>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard
            title="Labels & availability"
            description="Optional. Customize customer-facing labels and set mode availability hours."
            rightSlot={
              <Button type="button" variant="secondary" size="sm" onClick={() => onTabChange('hours')}>
                Manage overrides
              </Button>
            }
          >

            <div className="mt-4 grid gap-4">
              {/* Labels */}
              <details
                className="group rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
                open={labelsOpen}
                onToggle={(e) => setLabelsOpen((e.target as HTMLDetailsElement).open)}
                data-tutorial="sale-modes-labels-section"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Customer button labels</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Leave empty to use default translations.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasCustomLabels ? (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
                        Configured
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        Optional
                      </span>
                    )}
                    <FaChevronDown className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" />
                  </div>
                </summary>

                <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {showDineInLabel ? (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Dine In button label</label>
                        <input
                          type="text"
                          value={formData.dineInLabel}
                          onChange={(e) => setFormData((prev) => ({ ...prev, dineInLabel: e.target.value }))}
                          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                        />
                      </div>
                    ) : null}

                    {showTakeawayLabel ? (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Takeaway button label</label>
                        <input
                          type="text"
                          value={formData.takeawayLabel}
                          onChange={(e) => setFormData((prev) => ({ ...prev, takeawayLabel: e.target.value }))}
                          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                        />
                      </div>
                    ) : null}

                    {showDeliveryLabel ? (
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Delivery button label</label>
                        <input
                          type="text"
                          value={formData.deliveryLabel}
                          onChange={(e) => setFormData((prev) => ({ ...prev, deliveryLabel: e.target.value }))}
                          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                        />
                        {!formData.isDeliveryEnabled ? (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Delivery is currently disabled.</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">Preview</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {([
                        {
                          key: 'dinein',
                          enabled: formData.isDineInEnabled,
                          label: (formData.dineInLabel || '').trim() || tOr(t, 'customer.mode.dineIn', 'Dine In'),
                        },
                        {
                          key: 'takeaway',
                          enabled: formData.isTakeawayEnabled,
                          label: (formData.takeawayLabel || '').trim() || tOr(t, 'customer.mode.pickUp', 'Takeaway'),
                        },
                        {
                          key: 'delivery',
                          enabled: formData.isDeliveryEnabled,
                          label: (formData.deliveryLabel || '').trim() || tOr(t, 'customer.mode.delivery', 'Delivery'),
                        },
                      ] as const)
                        .filter((item) => item.enabled)
                        .map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            disabled
                            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                          >
                            {item.label}
                          </button>
                        ))}
                    </div>
                    {enabledModes === 0 ? (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Enable at least one mode above.</div>
                    ) : null}
                  </div>
                </div>
              </details>

              {/* Mode schedules */}
              <details
                className="group rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
                open={schedulesOpen}
                onToggle={(e) => setSchedulesOpen((e.target as HTMLDetailsElement).open)}
                data-tutorial="sale-modes-schedules-section"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Mode availability hours</p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Leave empty to follow opening hours. Overrides live in the Opening Hours tab.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasModeSchedules ? (
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
                        Configured
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        Optional
                      </span>
                    )}
                    <FaChevronDown className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" />
                  </div>
                </summary>

                <div className="space-y-4 border-t border-gray-200 p-4 dark:border-gray-800">
                  {scheduleErrors.dineIn || scheduleErrors.takeaway || scheduleErrors.delivery ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
                      Please fill both From and To for any mode availability hours you set.
                    </div>
                  ) : null}

                  <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Quick presets</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Applies to all modes (including disabled ones).</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            dineInScheduleStart: '',
                            dineInScheduleEnd: '',
                            takeawayScheduleStart: '',
                            takeawayScheduleEnd: '',
                            deliveryScheduleStart: '',
                            deliveryScheduleEnd: '',
                          }))
                        }
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        Always available
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            dineInScheduleStart: '11:00',
                            dineInScheduleEnd: '21:00',
                            takeawayScheduleStart: '11:00',
                            takeawayScheduleEnd: '21:00',
                            deliveryScheduleStart: '11:00',
                            deliveryScheduleEnd: '21:00',
                          }))
                        }
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        Standard (11:00–21:00)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            dineInScheduleStart: '17:00',
                            dineInScheduleEnd: '22:00',
                            takeawayScheduleStart: '17:00',
                            takeawayScheduleEnd: '22:00',
                            deliveryScheduleStart: '17:00',
                            deliveryScheduleEnd: '22:00',
                          }))
                        }
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                      >
                        Dinner only (17:00–22:00)
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    {showDineInSchedule ? (
                      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Dine In</p>
                          {!formData.isDineInEnabled ? (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                              Disabled
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">From</label>
                            <input
                              type="time"
                              value={formData.dineInScheduleStart}
                              onChange={(e) => setFormData((prev) => ({ ...prev, dineInScheduleStart: e.target.value }))}
                              aria-invalid={scheduleErrors.dineIn}
                              className={`h-10 w-full rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white ${
                                scheduleErrors.dineIn
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-900'
                                  : 'border-gray-200 focus:border-brand-500 dark:border-gray-800'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">To</label>
                            <input
                              type="time"
                              value={formData.dineInScheduleEnd}
                              onChange={(e) => setFormData((prev) => ({ ...prev, dineInScheduleEnd: e.target.value }))}
                              aria-invalid={scheduleErrors.dineIn}
                              className={`h-10 w-full rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white ${
                                scheduleErrors.dineIn
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-900'
                                  : 'border-gray-200 focus:border-brand-500 dark:border-gray-800'
                              }`}
                            />
                          </div>
                        </div>
                        {scheduleErrors.dineIn ? (
                          <p className="mt-2 text-xs text-red-600 dark:text-red-400">From and To must both be filled.</p>
                        ) : null}
                      </div>
                    ) : null}

                    {showTakeawaySchedule ? (
                      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Takeaway</p>
                          {!formData.isTakeawayEnabled ? (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                              Disabled
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">From</label>
                            <input
                              type="time"
                              value={formData.takeawayScheduleStart}
                              onChange={(e) => setFormData((prev) => ({ ...prev, takeawayScheduleStart: e.target.value }))}
                              aria-invalid={scheduleErrors.takeaway}
                              className={`h-10 w-full rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white ${
                                scheduleErrors.takeaway
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-900'
                                  : 'border-gray-200 focus:border-brand-500 dark:border-gray-800'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">To</label>
                            <input
                              type="time"
                              value={formData.takeawayScheduleEnd}
                              onChange={(e) => setFormData((prev) => ({ ...prev, takeawayScheduleEnd: e.target.value }))}
                              aria-invalid={scheduleErrors.takeaway}
                              className={`h-10 w-full rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white ${
                                scheduleErrors.takeaway
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-900'
                                  : 'border-gray-200 focus:border-brand-500 dark:border-gray-800'
                              }`}
                            />
                          </div>
                        </div>
                        {scheduleErrors.takeaway ? (
                          <p className="mt-2 text-xs text-red-600 dark:text-red-400">From and To must both be filled.</p>
                        ) : null}
                      </div>
                    ) : null}

                    {showDeliverySchedule ? (
                      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Delivery</p>
                          {!formData.isDeliveryEnabled ? (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                              Disabled
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">From</label>
                            <input
                              type="time"
                              value={formData.deliveryScheduleStart}
                              onChange={(e) => setFormData((prev) => ({ ...prev, deliveryScheduleStart: e.target.value }))}
                              aria-invalid={scheduleErrors.delivery}
                              className={`h-10 w-full rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white ${
                                scheduleErrors.delivery
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-900'
                                  : 'border-gray-200 focus:border-brand-500 dark:border-gray-800'
                              }`}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">To</label>
                            <input
                              type="time"
                              value={formData.deliveryScheduleEnd}
                              onChange={(e) => setFormData((prev) => ({ ...prev, deliveryScheduleEnd: e.target.value }))}
                              aria-invalid={scheduleErrors.delivery}
                              className={`h-10 w-full rounded-lg border bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-gray-900 dark:text-white ${
                                scheduleErrors.delivery
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-900'
                                  : 'border-gray-200 focus:border-brand-500 dark:border-gray-800'
                              }`}
                            />
                          </div>
                        </div>
                        {scheduleErrors.delivery ? (
                          <p className="mt-2 text-xs text-red-600 dark:text-red-400">From and To must both be filled.</p>
                        ) : null}
                        {!formData.isDeliveryEnabled ? (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Delivery is currently disabled.</p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </details>
            </div>
          </SettingsCard>
      </div>
    </div>
  );
}
