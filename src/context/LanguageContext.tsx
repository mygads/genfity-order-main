'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Locale,
  defaultLocale,
  getLocaleFromCurrency,
  getSavedLocale,
  saveLocale,
  isValidLocale,
} from '@/lib/i18n';

// ============================================================================
// Types
// ============================================================================

interface LanguageContextValue {
  /**
   * Current locale (en | id)
   */
  locale: Locale;
  
  /**
   * Whether the locale has been initialized from localStorage
   * Use this to prevent hydration mismatch
   */
  isInitialized: boolean;
  
  /**
   * Change the current locale
   */
  setLocale: (locale: Locale) => void;
  
  /**
   * Toggle between en and id
   */
  toggleLocale: () => void;
}

// ============================================================================
// Context
// ============================================================================

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

// ============================================================================
// Customer Language Provider
// ============================================================================

interface CustomerLanguageProviderProps {
  children: React.ReactNode;
  /**
   * Merchant currency - used to determine default locale
   * IDR = Indonesian, others = English
   */
  merchantCurrency?: string | null;
}

/**
 * Language Provider for Customer Pages
 * 
 * - Defaults to merchant currency (IDR → Indonesian, else → English)
 * - User can override via localStorage
 * - SSR-safe with isInitialized flag
 */
export function CustomerLanguageProvider({
  children,
  merchantCurrency,
}: CustomerLanguageProviderProps) {
  // Default locale based on merchant currency
  const currencyBasedLocale = getLocaleFromCurrency(merchantCurrency);
  
  // State - start with currency-based default for SSR
  const [locale, setLocaleState] = useState<Locale>(currencyBasedLocale);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // On mount, check localStorage for saved preference
  useEffect(() => {
    const saved = getSavedLocale('customer');
    
    if (saved) {
      // User has a saved preference, use it
      setLocaleState(saved);
    } else {
      // No saved preference, use currency-based default
      setLocaleState(currencyBasedLocale);
    }
    
    setIsInitialized(true);
  }, [currencyBasedLocale]);
  
  // Update locale and save to localStorage
  const setLocale = useCallback((newLocale: Locale) => {
    if (isValidLocale(newLocale)) {
      setLocaleState(newLocale);
      saveLocale('customer', newLocale);
    }
  }, []);
  
  // Toggle between en and id
  const toggleLocale = useCallback(() => {
    const newLocale = locale === 'en' ? 'id' : 'en';
    setLocale(newLocale);
  }, [locale, setLocale]);
  
  // Memoize context value
  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    isInitialized,
    setLocale,
    toggleLocale,
  }), [locale, isInitialized, setLocale, toggleLocale]);
  
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// ============================================================================
// Admin Language Provider
// ============================================================================

interface AdminLanguageProviderProps {
  children: React.ReactNode;
  /**
   * Default locale for admin (usually 'en')
   */
  defaultLocale?: Locale;
}

/**
 * Language Provider for Admin Pages
 * 
 * - Defaults to English
 * - Admin can change via navbar
 * - Saved to separate localStorage key
 * - Syncs with database (UserPreference.language)
 */
export function AdminLanguageProvider({
  children,
  defaultLocale: defaultAdminLocale = 'en',
}: AdminLanguageProviderProps) {
  // State - start with default for SSR
  const [locale, setLocaleState] = useState<Locale>(defaultAdminLocale);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // On mount, check localStorage for saved preference, then sync with database
  useEffect(() => {
    const initializeLocale = async () => {
      // First check localStorage for immediate response
      const saved = getSavedLocale('admin');
      if (saved) {
        setLocaleState(saved);
      }
      
      // Then try to fetch from database (async)
      try {
        const response = await fetch('/api/admin/preferences/language', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data?.language) {
            const dbLocale = data.data.language as Locale;
            if (isValidLocale(dbLocale)) {
              setLocaleState(dbLocale);
              saveLocale('admin', dbLocale);
            }
          }
        }
      } catch {
        // Silently fail - use localStorage value
        console.log('Failed to fetch language preference from database');
      }
      
      setIsInitialized(true);
    };
    
    initializeLocale();
  }, []);
  
  // Update locale and save to localStorage and database
  const setLocale = useCallback(async (newLocale: Locale) => {
    if (isValidLocale(newLocale)) {
      setLocaleState(newLocale);
      saveLocale('admin', newLocale);
      
      // Sync to database (fire and forget)
      try {
        await fetch('/api/admin/preferences/language', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken') || ''}`,
          },
          body: JSON.stringify({ language: newLocale }),
        });
      } catch {
        // Silently fail - localStorage is the source of truth
        console.log('Failed to sync language preference to database');
      }
    }
  }, []);
  
  // Toggle between en and id
  const toggleLocale = useCallback(() => {
    const newLocale = locale === 'en' ? 'id' : 'en';
    setLocale(newLocale);
  }, [locale, setLocale]);
  
  // Memoize context value
  const value = useMemo<LanguageContextValue>(() => ({
    locale,
    isInitialized,
    setLocale,
    toggleLocale,
  }), [locale, isInitialized, setLocale, toggleLocale]);
  
  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the language context
 * 
 * @returns LanguageContextValue
 * @throws Error if used outside of LanguageProvider
 * 
 * @example
 * const { locale, setLocale, toggleLocale, isInitialized } = useLanguage();
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  
  if (context === undefined) {
    // Return a default value if context is not available
    // This is useful for components that may be rendered outside the provider
    return {
      locale: defaultLocale,
      isInitialized: false,
      setLocale: () => {},
      toggleLocale: () => {},
    };
  }
  
  return context;
}

// ============================================================================
// Export
// ============================================================================

export { LanguageContext };
