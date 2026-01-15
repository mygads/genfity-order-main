import React from 'react';
import Image from 'next/image';
import { FaImage } from 'react-icons/fa';

import type { TranslationKeys } from '@/lib/i18n';
import { tOr } from '@/lib/i18n/useTranslation';
import type { MerchantFormData } from '@/components/merchants/merchant-edit/types';
import SettingsCard from '@/components/merchants/merchant-edit/ui/SettingsCard';
import Button from '@/components/ui/Button';

export interface BasicInfoTabProps {
  t: (key: TranslationKeys | string, params?: Record<string, string | number>) => string;
  formData: MerchantFormData;

  fileInputRef: React.RefObject<HTMLInputElement | null>;
  bannerInputRef: React.RefObject<HTMLInputElement | null>;

  uploading: boolean;
  uploadingBanner: boolean;

  onLogoUpload: React.ChangeEventHandler<HTMLInputElement>;
  onBannerUpload: React.ChangeEventHandler<HTMLInputElement>;
  onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}

export default function BasicInfoTab({
  t,
  formData,
  fileInputRef,
  bannerInputRef,
  uploading,
  uploadingBanner,
  onLogoUpload,
  onBannerUpload,
  onChange,
}: BasicInfoTabProps) {
  return (
    <div className="space-y-6">
      <SettingsCard
        title={t('admin.merchantEdit.basicInfo') || 'Basic info'}
        description={tOr(
          t,
          'admin.merchantEdit.basicInfoDesc',
          'Update the customer-facing store profile: branding, contact, and description.'
        )}
      >
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Logo */}
          <div data-tutorial="store-logo-upload" className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.merchantEdit.storeLogo')}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.logoDesc')}</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={onLogoUpload} className="hidden" />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                isLoading={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {t('admin.merchantEdit.changeLogo')}
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
                {formData.logoUrl ? (
                  <Image src={formData.logoUrl} alt={formData.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-brand-100 text-lg font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                    {(formData.name || 'M').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.logoFormats')}</p>
            </div>
          </div>

          {/* Banner */}
          <div data-tutorial="store-banner-upload" className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.merchantEdit.storeBanner')}</p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.bannerDesc')}</p>
              </div>
              <input ref={bannerInputRef} type="file" accept="image/*" onChange={onBannerUpload} className="hidden" />
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={uploadingBanner}
                onClick={() => bannerInputRef.current?.click()}
              >
                {t('admin.merchantEdit.changeBanner')}
              </Button>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950" style={{ aspectRatio: '2/1' }}>
              {formData.bannerUrl ? (
                <div className="relative h-full w-full">
                  <Image src={formData.bannerUrl} alt={`${formData.name} banner`} fill className="object-cover" />
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="text-center">
                    <FaImage className="mx-auto h-7 w-7 text-gray-400" />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.noBanner')}</p>
                  </div>
                </div>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.bannerFormats')}</p>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title={t('admin.merchantEdit.storeDetails') || 'Store details'}
        description={tOr(t, 'admin.merchantEdit.storeDetailsDesc', 'These details appear in customer-facing pages and receipts.')}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('admin.merchantEdit.merchantCode')}
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              disabled
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.cannotChange')}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('admin.merchantEdit.storeName')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={onChange}
              required
              data-tutorial="store-name-input"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('admin.merchant.email')} <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              required
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('admin.merchantEdit.phoneNumber')} <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={onChange}
              required
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('admin.merchantEdit.description')}
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={onChange}
            rows={3}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          />
        </div>
      </SettingsCard>
    </div>
  );
}
