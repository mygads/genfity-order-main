'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format';
import { ReceiptSettings } from '@/lib/types/receiptSettings';

/**
 * Merchant Context
 * 
 * Global state for merchant profile data to avoid multiple API calls.
 * Every page was calling /api/merchant/profile just to get currency.
 * 
 * Benefits:
 * - Single source of truth for merchant data
 * - Reduces API calls from 10+ to 1 per session
 * - Auto-refresh on merchant updates
 * - Centralized formatCurrency helper
 */

interface Merchant {
  id: string;
  name: string;
  code: string;
  currency: 'AUD' | 'IDR';
  timezone?: string;
  isOpen: boolean;
  requireTableNumberForDineIn?: boolean;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  hasDeletePin?: boolean;
  receiptSettings?: Partial<ReceiptSettings> | null;
}

interface MerchantContextType {
  merchant: Merchant | null;
  /** Current merchant currency, defaults to 'AUD' */
  currency: 'AUD' | 'IDR';
  /** Format amount using merchant's currency */
  formatCurrency: (amount: number) => string;
  isLoading: boolean;
  error: string | null;
  refreshMerchant: () => Promise<void>;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

export function MerchantProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Derived currency with default
  const currency: 'AUD' | 'IDR' = (merchant?.currency as 'AUD' | 'IDR') || 'AUD';

  // Memoized formatCurrency function using merchant's currency
  const formatCurrency = useCallback((amount: number): string => {
    return formatCurrencyUtil(amount, currency);
  }, [currency]);

  const fetchMerchant = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Check if user is Super Admin (stored in localStorage during login)
      const userRole = localStorage.getItem('userRole');
      if (userRole === 'SUPER_ADMIN') {
        // Super Admin doesn't have a merchant profile - this is expected
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/merchant/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle 403/404 gracefully - user might not have merchant access
      if (response.status === 403 || response.status === 404) {
        // Not a merchant user - this is OK, not an error
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch merchant profile');
      }

      const data = await response.json();
      if (data.success && data.data) {
        setMerchant(data.data);
        setError(null);
      }
    } catch (err) {
      console.error('Merchant fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load merchant');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshMerchant = async () => {
    setIsLoading(true);
    await fetchMerchant();
  };

  useEffect(() => {
    fetchMerchant();
  }, []);

  return (
    <MerchantContext.Provider value={{ merchant, currency, formatCurrency, isLoading, error, refreshMerchant }}>
      {children}
    </MerchantContext.Provider>
  );
}

/**
 * Hook to access merchant context
 * 
 * Usage:
 * ```tsx
 * const { merchant, currency, formatCurrency, isLoading } = useMerchant();
 * 
 * // Use formatCurrency helper (automatically uses merchant's currency)
 * <span>{formatCurrency(10000)}</span>
 * // IDR merchant: "Rp 10.000"
 * // AUD merchant: "A$10000.00"
 * 
 * // Or access currency directly
 * const currency = merchant?.currency || 'AUD';
 * ```
 */
export function useMerchant() {
  const context = useContext(MerchantContext);
  if (context === undefined) {
    throw new Error('useMerchant must be used within a MerchantProvider');
  }
  return context;
}
