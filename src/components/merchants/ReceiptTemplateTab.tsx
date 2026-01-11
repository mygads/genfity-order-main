/**
 * Receipt Template Tab Component
 * 
 * Allows merchants to customize what appears on their receipts
 * Right-side live preview using an iframe to isolate receipt CSS
 */

'use client';

import React from 'react';
import { FaPrint } from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';
import {
  ReceiptSettings,
  DEFAULT_RECEIPT_SETTINGS,
  RECEIPT_SETTINGS_GROUPS
} from '@/lib/types/receiptSettings';
import { generateReceiptHTML, printReceipt, ReceiptOrderData, ReceiptMerchantInfo } from '@/lib/utils/unifiedReceipt';

// ============================================
// TYPES
// ============================================

interface ReceiptTemplateTabProps {
  settings: Partial<ReceiptSettings> | null;
  onChange: (settings: ReceiptSettings) => void;
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
// MOCK DATA FOR PREVIEW
// ============================================

const MOCK_ORDER: ReceiptOrderData = {
  orderNumber: 'DEMO-1234',
  orderType: 'DINE_IN',
  tableNumber: '5',
  customerName: 'John Doe',
  customerPhone: '+61 412 345 678',
  placedAt: new Date().toISOString(),
  items: [
    {
      quantity: 2,
      menuName: 'Chicken Burger',
      unitPrice: 15.50,
      subtotal: 31.00,
      addons: [
        { addonName: 'Extra Cheese', addonPrice: 2.00 },
        { addonName: 'Bacon', addonPrice: 3.00 },
      ],
      notes: 'No onion please',
    },
    {
      quantity: 1,
      menuName: 'French Fries',
      unitPrice: 8.00,
      subtotal: 8.00,
    },
    {
      quantity: 2,
      menuName: 'Soft Drink',
      unitPrice: 4.50,
      subtotal: 9.00,
    },
  ],
  subtotal: 48.00,
  taxAmount: 4.80,
  serviceChargeAmount: 2.40,
  packagingFeeAmount: 0,
  discountAmount: 5.00,
  totalAmount: 50.20,
  amountPaid: 60.00,
  changeAmount: 9.80,
  paymentMethod: 'Cash',
  paymentStatus: 'COMPLETED',
  cashierName: 'Staff Member',
};

// ============================================
// MAIN COMPONENT
// ============================================

export const ReceiptTemplateTab: React.FC<ReceiptTemplateTabProps> = ({
  settings: initialSettings,
  onChange,
  merchantInfo,
}) => {
  const { t, locale } = useTranslation();

  const inferredLanguage: 'en' | 'id' = merchantInfo.currency === 'IDR' ? 'id' : 'en';
  const rawLanguage = initialSettings?.receiptLanguage;
  const rawPaperSize = initialSettings?.paperSize;

  // Merge settings with defaults, but keep smart defaults for new preferences
  const settings: ReceiptSettings = {
    ...DEFAULT_RECEIPT_SETTINGS,
    ...(initialSettings || {}),
    receiptLanguage: rawLanguage === 'id' || rawLanguage === 'en' ? rawLanguage : inferredLanguage,
    paperSize: rawPaperSize === '58mm' ? '58mm' : '80mm',
  };

  const paperSize = settings.paperSize;
  const paperWidthPx = paperSize === '58mm' ? 200 : 280;

  const receiptLanguage: 'en' | 'id' = settings.receiptLanguage;

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

  const handlePaperSizeChange = (value: '58mm' | '80mm') => {
    onChange({
      ...settings,
      paperSize: value,
    });
  };

  const handleReceiptLanguageChange = (value: 'en' | 'id') => {
    onChange({
      ...settings,
      receiptLanguage: value,
    });
  };

  // Generate preview HTML
  const generatePreviewHtml = (): string => {
    const merchant: ReceiptMerchantInfo = {
      name: merchantInfo.name || 'Your Restaurant',
      code: merchantInfo.code || 'DEMO',
      logoUrl: merchantInfo.logoUrl,
      address: merchantInfo.address,
      phone: merchantInfo.phone,
      email: merchantInfo.email,
      currency: merchantInfo.currency || 'AUD',
    };

    return generateReceiptHTML({
      order: MOCK_ORDER,
      merchant,
      settings,
      language: receiptLanguage || (locale as 'en' | 'id'),
    });
  };

  // Reset to defaults
  const handleReset = () => {
    onChange({ ...DEFAULT_RECEIPT_SETTINGS });
  };

  // Test print
  const handleTestPrint = () => {
    const merchant: ReceiptMerchantInfo = {
      name: merchantInfo.name || 'Your Restaurant',
      logoUrl: merchantInfo.logoUrl,
      address: merchantInfo.address,
      phone: merchantInfo.phone,
      email: merchantInfo.email,
      currency: merchantInfo.currency || 'AUD',
    };

    printReceipt({
      order: MOCK_ORDER,
      merchant,
      settings,
      language: receiptLanguage || (locale as 'en' | 'id'),
    });
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
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 rounded-lg border border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {t('admin.receipt.resetDefaults')}
            </button>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Header Section */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              {t(RECEIPT_SETTINGS_GROUPS.header.titleKey)}
            </h3>
            <div className="space-y-2">
              {RECEIPT_SETTINGS_GROUPS.header.fields.map((field) => (
                <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[field.key as keyof ReceiptSettings] as boolean}
                    onChange={(e) => handleChange(field.key as keyof ReceiptSettings, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t(field.labelKey)}
                  </span>
                </label>
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
                <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[field.key as keyof ReceiptSettings] as boolean}
                    onChange={(e) => handleChange(field.key as keyof ReceiptSettings, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t(field.labelKey)}
                  </span>
                </label>
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
                <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[field.key as keyof ReceiptSettings] as boolean}
                    onChange={(e) => handleChange(field.key as keyof ReceiptSettings, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t(field.labelKey)}
                  </span>
                </label>
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
                <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[field.key as keyof ReceiptSettings] as boolean}
                    onChange={(e) => handleChange(field.key as keyof ReceiptSettings, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {t(field.labelKey)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Section - Full width */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            {t(RECEIPT_SETTINGS_GROUPS.payment.titleKey)}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {RECEIPT_SETTINGS_GROUPS.payment.fields.map((field) => (
              <label key={field.key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings[field.key as keyof ReceiptSettings] as boolean}
                  onChange={(e) => handleChange(field.key as keyof ReceiptSettings, e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {t(field.labelKey)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Messages */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Custom Thank You Message */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('admin.receipt.customMessage')}
            </label>
            <textarea
              value={settings.customThankYouMessage || ''}
              onChange={(e) => handleMessageChange(e.target.value)}
              placeholder={t('admin.receipt.customMessagePlaceholder')}
              rows={2}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white resize-none"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('admin.receipt.customMessageHelp')}
            </p>
          </div>

          {/* Custom Footer Text */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('admin.receipt.customFooterText')}
            </label>
            <textarea
              value={settings.customFooterText || ''}
              onChange={(e) => handleFooterTextChange(e.target.value)}
              placeholder={t('admin.receipt.customFooterPlaceholder')}
              rows={2}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white resize-none"
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
              <div className="flex items-center rounded-lg bg-gray-100 p-0.5 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => handlePaperSizeChange('58mm')}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${paperSize === '58mm'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400'
                    }`}
                >
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => handlePaperSizeChange('80mm')}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors ${paperSize === '80mm'
                      ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400'
                    }`}
                >
                  80mm
                </button>
              </div>

              <select
                value={receiptLanguage}
                onChange={(e) => handleReceiptLanguageChange(e.target.value as 'en' | 'id')}
                className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              >
                <option value="id">{t('admin.receipt.languageIndonesian')}</option>
                <option value="en">{t('admin.receipt.languageEnglish')}</option>
              </select>
              <button
                type="button"
                onClick={handleTestPrint}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-500 text-white text-xs hover:bg-brand-600 transition-colors"
              >
                <FaPrint className="w-3.5 h-3.5" />
                {t('admin.receipt.testPrint')}
              </button>
            </div>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-4">
            <div
              className="mx-auto rounded bg-white shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              style={{ width: `${paperWidthPx}px` }}
            >
              <iframe
                title="Receipt preview"
                sandbox="allow-same-origin"
                srcDoc={generatePreviewHtml()}
                style={{ width: `${paperWidthPx}px`, height: '720px', border: 0 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptTemplateTab;
