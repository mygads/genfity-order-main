'use client';

import { useCallback, useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  Locale,
  TranslationKeys,
  translations,
  localeNames,
  localeFlags,
  defaultLocale,
} from '@/lib/i18n';

// ============================================================================
// Types
// ============================================================================

type InterpolationParams = Record<string, string | number>;

interface UseTranslationReturn {
  /**
   * Translate a key to the current locale
   * 
   * @param key - Translation key (e.g., "common.loading")
   * @param params - Optional interpolation params (e.g., { count: 5 })
   * @returns Translated string
   * 
   * @example
   * t("common.loading") // "Loading..." or "Memuat..."
   * t("common.time.minutesAgo", { count: 5 }) // "5 minutes ago" or "5 menit yang lalu"
   */
  t: (key: TranslationKeys | string, params?: InterpolationParams) => string;
  
  /**
   * Current locale
   */
  locale: Locale;
  
  /**
   * Whether the locale has been initialized
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
  
  /**
   * Human-readable locale name
   */
  localeName: string;
  
  /**
   * Locale flag emoji
   */
  localeFlag: string;
  
  /**
   * All available locales
   */
  availableLocales: { code: Locale; name: string; flag: string }[];
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Translation hook for accessing i18n functionality
 * 
 * Provides:
 * - t(key, params) function for translations
 * - Current locale and toggle functions
 * - Locale metadata (name, flag)
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { t, locale, toggleLocale } = useTranslation();
 *   
 *   return (
 *     <div>
 *       <p>{t("common.loading")}</p>
 *       <p>Current: {locale}</p>
 *       <button onClick={toggleLocale}>Switch Language</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTranslation(): UseTranslationReturn {
  const { locale, isInitialized, setLocale, toggleLocale } = useLanguage();
  
  /**
   * Translate a key with optional interpolation
   */
  const t = useCallback((key: TranslationKeys | string, params?: InterpolationParams): string => {
    // Get translation from current locale, fallback to English, then to key
    const translation = translations[locale]?.[key as TranslationKeys] 
      ?? translations[defaultLocale]?.[key as TranslationKeys] 
      ?? key;
    
    // No params, return as-is
    if (!params) {
      return translation;
    }
    
    // Replace {paramName} with actual values
    return Object.entries(params).reduce((result, [paramKey, paramValue]) => {
      return result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
    }, translation);
  }, [locale]);
  
  /**
   * Available locales with metadata
   */
  const availableLocales = useMemo(() => [
    { code: 'en' as Locale, name: localeNames.en, flag: localeFlags.en },
    { code: 'id' as Locale, name: localeNames.id, flag: localeFlags.id },
  ], []);
  
  return {
    t,
    locale,
    isInitialized,
    setLocale,
    toggleLocale,
    localeName: localeNames[locale],
    localeFlag: localeFlags[locale],
    availableLocales,
  };
}

export function tOr(
  t: (key: TranslationKeys | string, params?: InterpolationParams) => string,
  key: TranslationKeys | string,
  fallback: string,
  params?: InterpolationParams
): string {
  const translated = t(key, params);
  return translated === String(key) ? fallback : translated;
}

// ============================================================================
// Utility Functions (for non-hook usage)
// ============================================================================

/**
 * Get a translation without using hooks (for utility functions)
 * 
 * @param locale - The locale to use
 * @param key - Translation key
 * @param params - Optional interpolation params
 * @returns Translated string
 */
export function translate(
  locale: Locale,
  key: TranslationKeys,
  params?: InterpolationParams
): string {
  const translation = translations[locale]?.[key] 
    ?? translations[defaultLocale]?.[key] 
    ?? key;
  
  if (!params) {
    return translation;
  }
  
  return Object.entries(params).reduce((result, [paramKey, paramValue]) => {
    return result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
  }, translation);
}

export default useTranslation;
