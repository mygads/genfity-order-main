import React from 'react';
import dynamic from 'next/dynamic';

import type { TranslationKeys } from '@/lib/i18n';
import type { MerchantFormData } from '@/components/merchants/merchant-edit/types';
import {
  COUNTRIES,
  CURRENCIES,
  getCurrencyForCountry,
  getDefaultTimezoneForCountry,
  getTimezonesForCountry,
} from '@/lib/constants/location';
import SettingsCard from '@/components/merchants/merchant-edit/ui/SettingsCard';

const MapLocationPicker = dynamic(() => import('@/components/maps/MapLocationPicker'), { ssr: false });

export interface LocationTabProps {
  t: (key: TranslationKeys | string, params?: Record<string, string | number>) => string;
  formData: MerchantFormData;
  setFormData: React.Dispatch<React.SetStateAction<MerchantFormData>>;
  onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
}

export default function LocationTab({ t, formData, setFormData, onChange }: LocationTabProps) {
  const availableTimezones = getTimezonesForCountry(formData.country);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountry = e.target.value;
    const newCurrency = getCurrencyForCountry(newCountry);
    const newTimezone = getDefaultTimezoneForCountry(newCountry);

    setFormData((prev) => ({
      ...prev,
      country: newCountry,
      currency: newCurrency,
      timezone: newTimezone,
    }));
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        title={t('admin.merchant.location') || 'Location'}
        description={t('admin.merchantEdit.storeLocationDesc') || "Set your store's address, timezone, and map pin."}
      >
        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('admin.merchantEdit.address')} <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={onChange}
              required
              rows={2}
              data-tutorial="store-address-input"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.merchantEdit.country')} <span className="text-red-500">*</span>
              </label>
              <select
                name="country"
                value={formData.country}
                onChange={handleCountryChange}
                required
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.flag} {country.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Currency and timezone default from country.</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('admin.merchantEdit.currency')}</label>
              <div className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-200 flex items-center">
                {CURRENCIES.find((c) => c.value === formData.currency)?.symbol || ''} {formData.currency}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.currencyAutoSet') || 'Auto-set based on country'}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.merchantEdit.timezone')} <span className="text-red-500">*</span>
              </label>
              <select
                name="timezone"
                value={formData.timezone}
                onChange={onChange}
                required
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              >
                {availableTimezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div data-tutorial="store-map-picker">
            <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">{t('admin.merchantEdit.storeLocation') || 'Map pin'}</h4>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
              This is used for delivery distance checks and helping customers find your store.
            </p>
            <MapLocationPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLocationChange={(lat: number, lng: number) => {
                setFormData((prev) => ({
                  ...prev,
                  latitude: lat,
                  longitude: lng,
                }));
              }}
              height="350px"
            />
          </div>
        </div>
      </SettingsCard>
    </div>
  );
}
