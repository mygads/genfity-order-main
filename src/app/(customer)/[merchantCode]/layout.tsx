'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { getLocaleFromCurrency } from '@/lib/i18n';
import { LanguageToggle } from '@/components/common/LanguageSelector';
import { GroupOrderProvider } from '@/context/GroupOrderContext';

interface MerchantLayoutProps {
  children: ReactNode;
}

/**
 * Merchant Code Layout
 * 
 * Updates the language context based on merchant currency:
 * - IDR → Indonesian (id)
 * - Other → English (en)
 * 
 * Also provides a floating language toggle for customers who prefer
 * a different language than the default.
 * 
 * The CustomerLanguageProvider is in the parent layout.
 * This layout just updates the locale based on merchant currency.
 */
export default function MerchantLayout({ children }: MerchantLayoutProps) {
  const params = useParams();
  const merchantCode = params?.merchantCode as string;
  const { setLocale } = useLanguage();
  const [showLanguageToggle, setShowLanguageToggle] = useState(false);

  // Fetch merchant currency and update locale on mount
  useEffect(() => {
    async function fetchMerchantCurrency() {
      if (!merchantCode) return;

      try {
        const response = await fetch(`/api/public/merchants/${merchantCode}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.currency) {
            // Only update locale if user hasn't manually changed it (no saved preference)
            const saved = localStorage.getItem('genfity_customer_locale');
            if (!saved) {
              const newLocale = getLocaleFromCurrency(data.data.currency);
              setLocale(newLocale);
            }
            // Show language toggle after merchant data is loaded
            setShowLanguageToggle(true);
          }
        }
      } catch (error) {
        console.error('Failed to fetch merchant currency:', error);
      }
    }

    fetchMerchantCurrency();
  }, [merchantCode, setLocale]);

  return (
    <GroupOrderProvider>
      {children}

      {/* Floating Language Toggle for Customer Pages */}
      {showLanguageToggle && (
        <div className="fixed bottom-4 right-4 z-50">
          <LanguageToggle className="shadow-lg border border-gray-200 dark:border-gray-700" />
        </div>
      )}
    </GroupOrderProvider>
  );
}

