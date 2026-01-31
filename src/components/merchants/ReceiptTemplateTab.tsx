/**
 * Receipt Template Tab Component
 * 
 * Allows merchants to customize what appears on their receipts
 * Right-side live preview using an iframe to isolate receipt CSS
 */

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FaArrowRight, FaExclamationTriangle, FaPrint } from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';
import Switch from '@/components/ui/Switch';
import Button from '@/components/ui/Button';
import {
  ReceiptSettings,
  DEFAULT_RECEIPT_SETTINGS,
  RECEIPT_SETTINGS_GROUPS
} from '@/lib/types/receiptSettings';
import { formatCurrency } from '@/lib/utils/format';
import { fetchMerchantApi } from '@/lib/utils/orderApiClient';

// ============================================
// TYPES
// ============================================

interface ReceiptTemplateTabProps {
  settings: Partial<ReceiptSettings> | null;
  onChange: (settings: ReceiptSettings) => void;
  billingInfo?: {
    balance: number;
    completedOrderEmailFee: number;
    currency: string;
  } | null;
  merchantInfo: {
    name: string;
    code?: string;
    logoUrl?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    currency: string;
  };
}

// ============================================
// MAIN COMPONENT
// ============================================

export const ReceiptTemplateTab: React.FC<ReceiptTemplateTabProps> = ({
  settings: initialSettings,
  onChange,
  billingInfo,
  merchantInfo,
}) => {
  const { t, locale } = useTranslation();

  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string>('');

  const inferredLanguage: 'en' | 'id' = merchantInfo.currency === 'IDR' ? 'id' : 'en';
  const rawLanguage = initialSettings?.receiptLanguage;

  // Merge settings with defaults, but keep smart defaults for new preferences
  const settings: ReceiptSettings = {
    ...DEFAULT_RECEIPT_SETTINGS,
    ...(initialSettings || {}),
    receiptLanguage: rawLanguage === 'id' || rawLanguage === 'en' ? rawLanguage : inferredLanguage,
    paperSize: (initialSettings?.paperSize === '58mm' || initialSettings?.paperSize === '80mm')
      ? initialSettings.paperSize
      : DEFAULT_RECEIPT_SETTINGS.paperSize,
  };

  const paperWidthPx = settings.paperSize === '58mm' ? 200 : 280;

  const receiptLanguage: 'en' | 'id' = settings.receiptLanguage;

  const currency = billingInfo?.currency || merchantInfo.currency || 'AUD';
  const completedEmailFee = billingInfo?.completedOrderEmailFee ?? 0;
  const currentBalance = billingInfo?.balance ?? 0;

  const isCompletedEmailPriceConfigured = completedEmailFee > 0;
  const hasSufficientBalanceForCompletedEmail = currentBalance >= completedEmailFee && currentBalance > 0;

  const canEnableCompletedEmail =
    isCompletedEmailPriceConfigured &&
    hasSufficientBalanceForCompletedEmail;

  // Only disable the switch when user is trying to enable the feature.
  // Disabling (turning OFF) should always be allowed.
  const completedEmailToggleDisabled =
    !settings.sendCompletedOrderEmailToCustomer &&
    !canEnableCompletedEmail;

  const formatMoney = (amount: number) => formatCurrency(amount, currency, receiptLanguage);

  const previewRequestBody = useMemo(() => {
    // Keep the request small and stable.
    return JSON.stringify({
      receiptSettings: settings,
    });
  }, [settings]);

  // Handle checkbox change
  const handleChange = (key: keyof ReceiptSettings, value: boolean) => {
    onChange({
      ...settings,
      [key]: value,
    });
  };

  // Handle custom message change
  const handleMessageChange = (message: string) => {
    onChange({
      ...settings,
      customThankYouMessage: message || undefined,
    });
  };

  // Handle custom footer text change
  const handleFooterTextChange = (text: string) => {
    onChange({
      ...settings,
      customFooterText: text || undefined,
    });
  };

  const handleReceiptLanguageChange = (value: 'en' | 'id') => {
    onChange({
      ...settings,
      receiptLanguage: value,
    });
  };

  const handlePaperSizeChange = (value: '58mm' | '80mm') => {
    onChange({
      ...settings,
      paperSize: value,
    });
  };

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      setPreviewError('');
      setPreviewLoading(true);

      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          throw new Error('Missing access token');
        }

        const res = await fetchMerchantApi('/api/merchant/receipt/preview-html', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: previewRequestBody,
          token,
        });

        if (!res.ok) {
          throw new Error('Failed to generate preview');
        }

        const html = await res.text();
        if (isCancelled) return;
        setPreviewHtml(html);
      } catch (err) {
        if (isCancelled) return;
        setPreviewError(err instanceof Error ? err.message : 'Failed to generate preview');
        setPreviewHtml('');
      } finally {
        if (!isCancelled) setPreviewLoading(false);
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [previewRequestBody]);

  // Reset to defaults
  const handleReset = () => {
    onChange({ ...DEFAULT_RECEIPT_SETTINGS, paperSize: '80mm' });
  };

  // Test print
  const handleTestPrint = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const res = await fetchMerchantApi('/api/merchant/receipt/preview-html', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: previewRequestBody,
        token,
      });

      if (!res.ok) {
        throw new Error('Failed to generate preview');
      }

      const html = await res.text();

      // Print without navigating away: render into a hidden iframe and call print().
      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';

      const cleanup = () => {
        try {
          iframe.remove();
        } catch {
          // ignore
        }
      };

      iframe.onload = () => {
        try {
          const win = iframe.contentWindow;
          if (!win) return;
          win.focus();
          win.print();
        } catch {
          // ignore
        } finally {
          window.setTimeout(cleanup, 800);
        }
      };

      document.body.appendChild(iframe);
      iframe.srcdoc = html;
      window.setTimeout(cleanup, 5000);
    } catch {
      // Ignore preview print failures
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Controls */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Description and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('admin.receipt.subtitle')}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleReset}>
              {t('admin.receipt.resetDefaults')}
            </Button>
          </div>
        </div>

        {/* Customer Completed Email (Paid) */}
        <div
          className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          data-tutorial="receipt-completed-email-card"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {t('admin.receipt.completedEmail.title')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('admin.receipt.completedEmail.subtitle')}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin.receipt.completedEmail.price')}</div>
              <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {isCompletedEmailPriceConfigured ? formatMoney(completedEmailFee) : t('admin.receipt.completedEmail.notConfigured')}
              </div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="text-xs text-gray-500 dark:text-gray-400">{t('admin.receipt.completedEmail.balance')}</div>
              <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {formatMoney(currentBalance)}
              </div>
            </div>
          </div>

          {isCompletedEmailPriceConfigured &&
            !hasSufficientBalanceForCompletedEmail &&
            !settings.sendCompletedOrderEmailToCustomer && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <FaExclamationTriangle className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                        {t('admin.receipt.completedEmail.autoDisabledBanner.title')}
                      </p>
                      <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-300">
                        {t('admin.receipt.completedEmail.autoDisabledBanner.message')}
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/admin/dashboard/subscription/topup"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shrink-0"
                  >
                    {t('admin.receipt.completedEmail.autoDisabledBanner.topupCta')}
                    <FaArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}

          <div className="mt-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {t('admin.receipt.completedEmail.toggleLabel')}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {!isCompletedEmailPriceConfigured
                      ? t('admin.receipt.completedEmail.disabledReason.notConfigured')
                      : !hasSufficientBalanceForCompletedEmail
                        ? t('admin.receipt.completedEmail.disabledReason.noBalance')
                        : t('admin.receipt.completedEmail.toggleHelp')}
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(settings.sendCompletedOrderEmailToCustomer)}
                  disabled={completedEmailToggleDisabled}
                  onCheckedChange={(next) => {
                    if (next && !canEnableCompletedEmail) return;
                    onChange({
                      ...settings,
                      sendCompletedOrderEmailToCustomer: next,
                    });
                  }}
                  aria-label={t('admin.receipt.completedEmail.toggleLabel')}
                />
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {t('admin.receipt.completedEmail.note')}
            </p>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Header Section */}
          <div
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50"
            data-tutorial="receipt-custom-message"
          >
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t(RECEIPT_SETTINGS_GROUPS.header.titleKey)}
            </h3>
            <div className="space-y-2">
              {RECEIPT_SETTINGS_GROUPS.header.fields.map((field) => (
                <div key={field.key} className="flex items-start justify-between gap-4">
                  <span className="flex-1 text-sm font-medium leading-snug text-gray-800 dark:text-gray-200">
                    {t(field.labelKey)}
                  </span>
                  <Switch
                    size="sm"
                    checked={Boolean(settings[field.key as keyof ReceiptSettings])}
                    onCheckedChange={(next) => handleChange(field.key as keyof ReceiptSettings, next)}
                    aria-label={t(field.labelKey)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Order Section */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t(RECEIPT_SETTINGS_GROUPS.order.titleKey)}
            </h3>
            <div className="space-y-2">
              {RECEIPT_SETTINGS_GROUPS.order.fields.map((field) => (
                <div key={field.key} className="flex items-start justify-between gap-4">
                  <span className="flex-1 text-sm font-medium leading-snug text-gray-800 dark:text-gray-200">
                    {t(field.labelKey)}
                  </span>
                  <Switch
                    size="sm"
                    checked={Boolean(settings[field.key as keyof ReceiptSettings])}
                    onCheckedChange={(next) => handleChange(field.key as keyof ReceiptSettings, next)}
                    aria-label={t(field.labelKey)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Items Section */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t(RECEIPT_SETTINGS_GROUPS.items.titleKey)}
            </h3>
            <div className="space-y-2">
              {RECEIPT_SETTINGS_GROUPS.items.fields.map((field) => (
                <div key={field.key} className="flex items-start justify-between gap-4">
                  <span className="flex-1 text-sm font-medium leading-snug text-gray-800 dark:text-gray-200">
                    {t(field.labelKey)}
                  </span>
                  <Switch
                    size="sm"
                    checked={Boolean(settings[field.key as keyof ReceiptSettings])}
                    onCheckedChange={(next) => handleChange(field.key as keyof ReceiptSettings, next)}
                    aria-label={t(field.labelKey)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer Section */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t(RECEIPT_SETTINGS_GROUPS.footer.titleKey)}
            </h3>
            <div className="space-y-2">
              {RECEIPT_SETTINGS_GROUPS.footer.fields.map((field) => (
                <div key={field.key} className="flex items-start justify-between gap-4">
                  <span className="flex-1 text-sm font-medium leading-snug text-gray-800 dark:text-gray-200">
                    {t(field.labelKey)}
                  </span>
                  <Switch
                    size="sm"
                    checked={Boolean(settings[field.key as keyof ReceiptSettings])}
                    onCheckedChange={(next) => handleChange(field.key as keyof ReceiptSettings, next)}
                    aria-label={t(field.labelKey)}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Section - Full width */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t(RECEIPT_SETTINGS_GROUPS.payment.titleKey)}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {RECEIPT_SETTINGS_GROUPS.payment.fields.map((field) => (
              <div key={field.key} className="flex items-start justify-between gap-4 rounded-md border border-gray-200 bg-white px-3 py-2 dark:border-gray-800 dark:bg-gray-950">
                <span className="flex-1 text-sm font-medium leading-snug text-gray-800 dark:text-gray-200">
                  {t(field.labelKey)}
                </span>
                <Switch
                  size="sm"
                  checked={Boolean(settings[field.key as keyof ReceiptSettings])}
                  onCheckedChange={(next) => handleChange(field.key as keyof ReceiptSettings, next)}
                  aria-label={t(field.labelKey)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Custom Messages */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Custom Thank You Message */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="mb-2 flex items-start justify-between gap-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.receipt.customMessage')}
              </label>
              <Switch
                size="sm"
                checked={Boolean(settings.showThankYouMessage)}
                onCheckedChange={(next) => handleChange('showThankYouMessage', next)}
                aria-label={t('admin.receipt.showThankYouMessage')}
              />
            </div>
            <textarea
              value={settings.customThankYouMessage || ''}
              onChange={(e) => handleMessageChange(e.target.value)}
              rows={2}
              placeholder={t('admin.receipt.customMessagePlaceholder')}
              disabled={!settings.showThankYouMessage}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-white resize-none"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('admin.receipt.customMessageHelp')}
            </p>
          </div>

          {/* Custom Footer Text */}
          <div
            className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50"
            data-tutorial="receipt-custom-footer"
          >
            <div className="mb-2 flex items-start justify-between gap-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.receipt.customFooterText')}
              </label>
              <Switch
                size="sm"
                checked={Boolean(settings.showCustomFooterText)}
                onCheckedChange={(next) => handleChange('showCustomFooterText', next)}
                aria-label={t('admin.receipt.showCustomFooterText')}
              />
            </div>
            <textarea
              value={settings.customFooterText || ''}
              onChange={(e) => handleFooterTextChange(e.target.value)}
              rows={2}
              placeholder={t('admin.receipt.customFooterPlaceholder')}
              disabled={!settings.showCustomFooterText}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-white resize-none"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('admin.receipt.customFooterHelp')}
            </p>
          </div>
        </div>

      </div>

      {/* Right: Live Preview */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:sticky lg:top-6">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <select
                value={settings.paperSize}
                onChange={(e) => handlePaperSizeChange(e.target.value as '58mm' | '80mm')}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                aria-label={t('admin.receipt.paperSize')}
              >
                <option value="80mm">{t('admin.receipt.paperSize80mm')}</option>
                <option value="58mm">{t('admin.receipt.paperSize58mm')}</option>
              </select>

              <select
                data-tutorial="receipt-language-select"
                value={receiptLanguage}
                onChange={(e) => handleReceiptLanguageChange(e.target.value as 'en' | 'id')}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <option value="id">{t('admin.receipt.languageIndonesian')}</option>
                <option value="en">{t('admin.receipt.languageEnglish')}</option>
              </select>
              <Button
                data-tutorial="receipt-test-print"
                type="button"
                variant="primary"
                size="sm"
                className="h-9 px-3 text-xs"
                onClick={handleTestPrint}
                leftIcon={<FaPrint className="h-3.5 w-3.5" />}
              >
                {t('admin.receipt.testPrint')}
              </Button>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-4">
            <div
              className="mx-auto rounded bg-white shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              style={{ width: `${paperWidthPx}px` }}
            >
              {previewLoading ? (
                <div className="flex h-180 w-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.receipt.previewGenerating')}
                </div>
              ) : previewError ? (
                <div className="flex h-180 w-full items-center justify-center px-4 text-center text-sm text-red-600 dark:text-red-400">
                  {previewError}
                </div>
              ) : previewHtml ? (
                <iframe
                  title="Receipt preview"
                  srcDoc={previewHtml}
                  style={{ width: `${paperWidthPx}px`, height: '720px', border: 0 }}
                />
              ) : (
                <div className="flex h-180 w-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.receipt.previewUnavailable')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptTemplateTab;
