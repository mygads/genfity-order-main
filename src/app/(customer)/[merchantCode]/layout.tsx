'use client';

import { ReactNode, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { getLocaleFromCurrency } from '@/lib/i18n';
import { GroupOrderProvider } from '@/context/GroupOrderContext';
import { CustomerDataProvider, useCustomerData } from '@/context/CustomerDataContext';

interface MerchantLayoutProps {
  children: ReactNode;
}

/**
 * Inner layout component that handles language and data initialization
 */
function MerchantLayoutInner({ children }: MerchantLayoutProps) {
  const params = useParams();
  const merchantCode = params?.merchantCode as string;
  const { setLocale } = useLanguage();
  const { initializeData, merchantInfo } = useCustomerData();

  // Initialize customer data context on mount
  useEffect(() => {
    if (merchantCode) {
      initializeData(merchantCode);
    }
  }, [merchantCode, initializeData]);

  // Update locale based on merchant currency (from context or fetch)
  useEffect(() => {
    if (merchantInfo?.currency) {
      // Only update locale if user hasn't manually changed it (no saved preference)
      const saved = localStorage.getItem('genfity_customer_locale');
      if (!saved) {
        const newLocale = getLocaleFromCurrency(merchantInfo.currency);
        setLocale(newLocale);
      }
    }
  }, [merchantInfo?.currency, setLocale]);

  return (
    <GroupOrderProvider>
      {children}
    </GroupOrderProvider>
  );
}

/**
 * Merchant Code Layout
 * 
 * Provides:
 * - CustomerDataProvider: Centralized data management for menus, categories, merchant info
 * - GroupOrderProvider: Group ordering functionality
 * - Language auto-detection based on merchant currency
 * 
 * @description
 * This layout wraps all [merchantCode] routes to ensure data is shared
 * across pages for instant navigation without re-fetching.
 */
export default function MerchantLayout({ children }: MerchantLayoutProps) {
  return (
    <CustomerDataProvider>
      <MerchantLayoutInner>{children}</MerchantLayoutInner>
    </CustomerDataProvider>
  );
}

