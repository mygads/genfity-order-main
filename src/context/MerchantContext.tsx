'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
 */

interface Merchant {
  id: string;
  name: string;
  code: string;
  currency: string;
  isOpen: boolean;
  logoUrl?: string;
  address?: string;
  phone?: string;
}

interface MerchantContextType {
  merchant: Merchant | null;
  isLoading: boolean;
  error: string | null;
  refreshMerchant: () => Promise<void>;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

export function MerchantProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMerchant = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/merchant/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

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
    <MerchantContext.Provider value={{ merchant, isLoading, error, refreshMerchant }}>
      {children}
    </MerchantContext.Provider>
  );
}

/**
 * Hook to access merchant context
 * 
 * Usage:
 * ```tsx
 * const { merchant, isLoading } = useMerchant();
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
