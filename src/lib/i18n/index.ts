/**
 * i18n - Internationalization Module
 * 
 * This module provides multi-language support for the application.
 * 
 * Supported languages:
 * - English (en) - Default for AUD currency merchants
 * - Indonesian (id) - Default for IDR currency merchants
 * 
 * Architecture:
 * - Client-side only for SSR safety
 * - localStorage persistence with separate keys for customer/admin
 * - Default language based on merchant currency
 */

import en from './translations/en';
import id from './translations/id';

export type Locale = 'en' | 'id';

export type TranslationKeys = keyof typeof en;

export const translations = {
  en,
  id,
} as const;

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇦🇺', // Australia flag for English
  id: '🇮🇩', // Indonesia flag for Indonesian
};

/**
 * Language display info with flags
 */
export const LANGUAGE_OPTIONS = [
  { code: 'en' as Locale, name: 'English', flag: '🇦🇺', nativeName: 'English' },
  { code: 'id' as Locale, name: 'Bahasa Indonesia', flag: '🇮🇩', nativeName: 'Indonesia' },
] as const;

/**
 * Get locale based on merchant currency
 * IDR merchants default to Indonesian, others to English
 */
export function getLocaleFromCurrency(currency: string | null | undefined): Locale {
  if (currency === 'IDR') {
    return 'id';
  }
  return 'en';
}

/**
 * localStorage keys for persisting locale preferences
 * Separate keys for customer and admin interfaces
 */
export const LOCALE_STORAGE_KEYS = {
  customer: 'genfity_customer_locale',
  admin: 'genfity_admin_locale',
} as const;

/**
 * Get translation for a key with optional interpolation
 * 
 * @param locale - The locale to use
 * @param key - The translation key
 * @param params - Optional parameters for interpolation (e.g., {count: 5})
 * @returns The translated string
 * 
 * @example
 * getTranslation('en', 'common.loading') // "Loading..."
 * getTranslation('id', 'common.time.minutesAgo', { count: 5 }) // "5 menit yang lalu"
 */
export function getTranslation(
  locale: Locale,
  key: TranslationKeys,
  params?: Record<string, string | number>
): string {
  const translation = translations[locale]?.[key] ?? translations.en[key] ?? key;
  
  if (!params) {
    return translation;
  }
  
  // Replace {paramName} with actual values
  return Object.entries(params).reduce((result, [paramKey, paramValue]) => {
    return result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
  }, translation);
}

/**
 * Check if a locale is valid
 */
export function isValidLocale(locale: string | null | undefined): locale is Locale {
  return locale === 'en' || locale === 'id';
}

/**
 * Get saved locale from localStorage (client-side only)
 * 
 * @param type - 'customer' or 'admin'
 * @returns The saved locale or null if not found
 */
export function getSavedLocale(type: 'customer' | 'admin'): Locale | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEYS[type]);
    if (isValidLocale(saved)) {
      return saved;
    }
  } catch {
    // localStorage not available
  }
  
  return null;
}

/**
 * Save locale to localStorage (client-side only)
 * 
 * @param type - 'customer' or 'admin'
 * @param locale - The locale to save
 */
export function saveLocale(type: 'customer' | 'admin', locale: Locale): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(LOCALE_STORAGE_KEYS[type], locale);
  } catch {
    // localStorage not available
  }
}

export { en, id };
