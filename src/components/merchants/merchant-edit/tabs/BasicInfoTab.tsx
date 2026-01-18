import React from 'react';
import Image from 'next/image';
import { FaArrowDown, FaArrowUp, FaImage, FaTimes } from 'react-icons/fa';

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
  promoInputRef: React.RefObject<HTMLInputElement | null>;

  uploading: boolean;
  uploadingBanner: boolean;
  uploadingPromoBanners: boolean;

  onLogoUpload: React.ChangeEventHandler<HTMLInputElement>;
  onBannerUpload: React.ChangeEventHandler<HTMLInputElement>;
  onPromoBannerUpload: React.ChangeEventHandler<HTMLInputElement>;
  onRemovePromoBanner: (index: number) => void;
  onMovePromoBanner: (fromIndex: number, toIndex: number) => void;
  onChange: React.ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}

export default function BasicInfoTab({
  t,
  formData,
  fileInputRef,
  bannerInputRef,
  promoInputRef,
  uploading,
  uploadingBanner,
  uploadingPromoBanners,
  onLogoUpload,
  onBannerUpload,
  onPromoBannerUpload,
  onRemovePromoBanner,
  onMovePromoBanner,
  onChange,
}: BasicInfoTabProps) {
  const promoCount = formData.promoBannerUrls?.length || 0;
  const promoLimit = 10;
  const promoLimitReached = promoCount >= promoLimit;

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
        title={tOr(t, 'admin.merchantEdit.promoBannerTitle', 'Promotion banners')}
        description={tOr(
          t,
          'admin.merchantEdit.promoBannerDesc',
          'Upload up to 10 promotional images to show on the customer display screen when idle.'
        )}
      >
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {tOr(t, 'admin.merchantEdit.promoBannerLabel', 'Promotion banners')}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {tOr(t, 'admin.merchantEdit.promoBannerCount', '{count} / 10 images', { count: promoCount })}
              </p>
            </div>
            <input
              ref={promoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onPromoBannerUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              isLoading={uploadingPromoBanners}
              disabled={promoLimitReached}
              onClick={() => promoInputRef.current?.click()}
            >
              {promoLimitReached
                ? tOr(t, 'admin.merchantEdit.promoBannerLimitReached', 'Limit reached')
                : tOr(t, 'admin.merchantEdit.promoBannerUpload', 'Upload banners')}
            </Button>
          </div>

          {promoCount === 0 ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-white px-4 py-5 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
              <FaImage className="h-4 w-4" />
              {tOr(t, 'admin.merchantEdit.promoBannerEmpty', 'No promotional banners uploaded yet.')}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {formData.promoBannerUrls.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950"
                  style={{ aspectRatio: '16 / 9' }}
                >
                  <Image src={url} alt={`Promo banner ${index + 1}`} fill className="object-cover" />
                  <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => onMovePromoBanner(index, index - 1)}
                      disabled={index === 0}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-40"
                      aria-label={tOr(t, 'admin.merchantEdit.promoBannerMoveUp', 'Move up')}
                    >
                      <FaArrowUp className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMovePromoBanner(index, index + 1)}
                      disabled={index === promoCount - 1}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white disabled:opacity-40"
                      aria-label={tOr(t, 'admin.merchantEdit.promoBannerMoveDown', 'Move down')}
                    >
                      <FaArrowDown className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemovePromoBanner(index)}
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label={tOr(t, 'admin.merchantEdit.promoBannerRemove', 'Remove banner')}
                    >
                      <FaTimes className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {tOr(
              t,
              'admin.merchantEdit.promoBannerFormats',
              'All image formats supported. Max 5MB each. Recommended: 1920x1080 (16:9).'
            )}
          </p>
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
