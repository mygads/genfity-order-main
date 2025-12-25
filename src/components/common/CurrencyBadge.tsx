'use client';

import React from 'react';
import { useMerchant } from '@/context/MerchantContext';

/**
 * Currency Badge Component
 * 
 * Displays the current merchant's currency with country flag
 * Shows in admin navbar to indicate active currency
 * 
 * @example
 * IDR merchant: [🇮🇩 IDR]
 * AUD merchant: [🇦🇺 AUD]
 */
export function CurrencyBadge() {
  const { currency, isLoading } = useMerchant();

  // Currency to flag mapping
  const currencyConfig: Record<string, { flag: string; label: string }> = {
    IDR: { flag: '🇮🇩', label: 'IDR' },
    AUD: { flag: '🇦🇺', label: 'AUD' },
  };

  const config = currencyConfig[currency] || currencyConfig.AUD;

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
        <span className="text-xs text-gray-400">...</span>
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300"
      title={`Merchant Currency: ${config.label}`}
    >
      <span className="text-base leading-none">{config.flag}</span>
      <span className="text-xs uppercase">{config.label}</span>
    </div>
  );
}

export default CurrencyBadge;
