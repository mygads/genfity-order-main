'use client';

import React from 'react';
import { useMerchant } from '@/context/MerchantContext';

/**
 * Currency Badge Component
 * 
 * Displays the current merchant's currency with symbol
 * Shows in admin navbar to indicate active currency
 * 
 * @example
 * IDR merchant: [IDR Rp]
 * AUD merchant: [AUD$]
 */
export function CurrencyBadge() {
  const { currency, isLoading } = useMerchant();

  // Currency to symbol mapping
  const currencyConfig: Record<string, { symbol: string; label: string }> = {
    IDR: { symbol: '', label: 'IDR' },
    AUD: { symbol: '$', label: 'AUD' },
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
      <span className="text-xs uppercase">{config.label}{config.symbol}</span>
    </div>
  );
}

export default CurrencyBadge;
