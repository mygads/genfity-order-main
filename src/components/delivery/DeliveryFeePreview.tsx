/**
 * Delivery Fee Preview Component
 * Shows estimated delivery fee for customer checkout
 */

'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format';

interface DeliveryFeePreviewProps {
  merchantCode: string;
  deliveryLatitude: number | null;
  deliveryLongitude: number | null;
  deliveryAddress: string;
  currency: string;
  onFeeCalculated?: (fee: number) => void;
  onError?: (error: string) => void;
}

/**
 * Delivery Fee Preview Component
 * Fetches and displays estimated delivery fee
 */
export default function DeliveryFeePreview({
  merchantCode,
  deliveryLatitude,
  deliveryLongitude,
  deliveryAddress,
  currency,
  onFeeCalculated,
  onError,
}: DeliveryFeePreviewProps) {
  const { t, locale } = useTranslation();
  const [fee, setFee] = useState<number | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const formatCurrency = (amount: number): string => formatCurrencyUtil(amount, currency, locale);

  // Fetch delivery fee quote
  useEffect(() => {
    const fetchFeeQuote = async () => {
      // Don't fetch if coordinates are missing
      if (!deliveryLatitude || !deliveryLongitude) {
        setFee(null);
        setDistance(null);
        setError('');
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const response = await fetch(
          `/api/public/merchants/${merchantCode}/delivery/quote`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              latitude: deliveryLatitude,
              longitude: deliveryLongitude,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.message || 'Failed to calculate delivery fee';
          setError(errorMessage);
          if (onError) onError(errorMessage);
          setFee(null);
          setDistance(null);
          return;
        }

        setFee(data.data.feeAmount);
        setDistance(data.data.distanceKm);
        if (onFeeCalculated) onFeeCalculated(data.data.feeAmount);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to calculate delivery fee';
        setError(errorMessage);
        if (onError) onError(errorMessage);
        setFee(null);
        setDistance(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce fee calculation (wait 1 second after coordinate change)
    const timeoutId = setTimeout(fetchFeeQuote, 1000);
    return () => clearTimeout(timeoutId);
  }, [merchantCode, deliveryLatitude, deliveryLongitude, onFeeCalculated, onError]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-3 rounded-lg bg-blue-50 border-l-4 border-blue-500 flex items-center gap-2">
        <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-sm text-blue-700">{t('common.calculating') || 'Calculating delivery fee...'}</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-3 rounded-lg bg-red-50 border-l-4 border-red-500 flex items-center gap-2">
        <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <span className="text-sm text-red-700">{error}</span>
      </div>
    );
  }

  // Show fee when available
  if (fee !== null && distance !== null) {
    return (
      <div
        className="p-3 rounded-lg border-l-4"
        style={{
          backgroundColor: 'rgba(34, 197, 94, 0.05)',
          borderColor: 'rgba(34, 197, 94, 0.5)',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-600 mb-1">
              📍 {distance.toFixed(2)} km {t('customer.delivery.away') || 'away'}
            </p>
            <p className="text-sm font-semibold text-green-700">
              {t('customer.delivery.fee') || 'Delivery Fee'}: {formatCurrency(fee)}
            </p>
          </div>
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      </div>
    );
  }

  // Show placeholder
  return (
    <div className="p-3 rounded-lg bg-gray-50 border-l-4 border-gray-300 text-center">
      <p className="text-sm text-gray-600">
        {t('customer.delivery.pickLocationFirst') || 'Pick a location to calculate delivery fee'}
      </p>
    </div>
  );
}
