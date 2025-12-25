/**
 * Country, Currency, and Timezone Constants
 * 
 * SUPPORTED REGIONS:
 * - Indonesia (IDR, Asia/Jakarta timezone)
 * - Australia (AUD, Australia/* timezones)
 * 
 * @specification Multi-currency & Multi-language support
 */

// ============================================================================
// COUNTRIES - Only Indonesia & Australia supported
// ============================================================================

export const COUNTRIES = [
  { value: 'Indonesia', label: 'Indonesia', flag: '🇮🇩', currency: 'IDR', defaultTimezone: 'Asia/Jakarta' },
  { value: 'Australia', label: 'Australia', flag: '🇦🇺', currency: 'AUD', defaultTimezone: 'Australia/Sydney' },
] as const;

export type SupportedCountry = typeof COUNTRIES[number]['value'];

// ============================================================================
// CURRENCIES - Only IDR & AUD supported
// ============================================================================

export const CURRENCIES = [
  { 
    value: 'IDR', 
    label: 'Indonesian Rupiah (IDR)', 
    symbol: 'Rp', 
    flag: '🇮🇩',
    locale: 'id-ID',
    decimals: 0,
    country: 'Indonesia'
  },
  { 
    value: 'AUD', 
    label: 'Australian Dollar (AUD)', 
    symbol: 'A$', 
    flag: '🇦🇺',
    locale: 'en-AU',
    decimals: 2,
    country: 'Australia'
  },
] as const;

export type SupportedCurrency = typeof CURRENCIES[number]['value'];

// ============================================================================
// TIMEZONES - Only Indonesia & Australia timezones
// ============================================================================

export const TIMEZONES = [
  // Indonesia
  { value: 'Asia/Jakarta', label: 'Jakarta (WIB, GMT+7)', region: 'Indonesia', country: 'Indonesia' },
  { value: 'Asia/Makassar', label: 'Makassar (WITA, GMT+8)', region: 'Indonesia', country: 'Indonesia' },
  { value: 'Asia/Jayapura', label: 'Jayapura (WIT, GMT+9)', region: 'Indonesia', country: 'Indonesia' },
  
  // Australia
  { value: 'Australia/Sydney', label: 'Sydney (AEDT, GMT+11)', region: 'Australia', country: 'Australia' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEDT, GMT+11)', region: 'Australia', country: 'Australia' },
  { value: 'Australia/Brisbane', label: 'Brisbane (AEST, GMT+10)', region: 'Australia', country: 'Australia' },
  { value: 'Australia/Perth', label: 'Perth (AWST, GMT+8)', region: 'Australia', country: 'Australia' },
  { value: 'Australia/Adelaide', label: 'Adelaide (ACDT, GMT+10:30)', region: 'Australia', country: 'Australia' },
  { value: 'Australia/Darwin', label: 'Darwin (ACST, GMT+9:30)', region: 'Australia', country: 'Australia' },
  { value: 'Australia/Hobart', label: 'Hobart (AEDT, GMT+11)', region: 'Australia', country: 'Australia' },
] as const;

export type SupportedTimezone = typeof TIMEZONES[number]['value'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get currency for a country
 */
export function getCurrencyForCountry(country: string): SupportedCurrency {
  const found = COUNTRIES.find(c => c.value === country);
  return (found?.currency as SupportedCurrency) || 'AUD';
}

/**
 * Get default timezone for a country
 */
export function getDefaultTimezoneForCountry(country: string): string {
  const found = COUNTRIES.find(c => c.value === country);
  return found?.defaultTimezone || 'Australia/Sydney';
}

/**
 * Get timezones for a country
 */
export function getTimezonesForCountry(country: string): readonly { value: string; label: string; region: string; country: string }[] {
  return TIMEZONES.filter(tz => tz.country === country);
}

/**
 * Get country for a currency
 */
export function getCountryForCurrency(currency: string): string {
  const found = CURRENCIES.find(c => c.value === currency);
  return found?.country || 'Australia';
}

/**
 * Get currency config by code
 */
export function getCurrencyConfig(currency: string) {
  return CURRENCIES.find(c => c.value === currency) || CURRENCIES[1];
}

/**
 * Get country config by name
 */
export function getCountryConfig(country: string) {
  return COUNTRIES.find(c => c.value === country) || COUNTRIES[1];
}

/**
 * Check if country is supported
 */
export function isSupportedCountry(country: string): country is SupportedCountry {
  return COUNTRIES.some(c => c.value === country);
}

/**
 * Check if currency is supported
 */
export function isSupportedCurrency(currency: string): currency is SupportedCurrency {
  return CURRENCIES.some(c => c.value === currency);
}

// ============================================================================
// GROUPED TIMEZONES (for dropdown UI)
// ============================================================================

export const TIMEZONE_GROUPS = TIMEZONES.reduce((acc, tz) => {
  if (!acc[tz.region]) {
    acc[tz.region] = [];
  }
  acc[tz.region].push(tz);
  return acc;
}, {} as Record<string, typeof TIMEZONES[number][]>);

// ============================================================================
// LANGUAGE MAPPING
// ============================================================================

/**
 * Map currency to default language
 * IDR → Indonesian (id)
 * AUD → English (en)
 */
export const CURRENCY_TO_LANGUAGE: Record<SupportedCurrency, 'en' | 'id'> = {
  'IDR': 'id',
  'AUD': 'en',
};

/**
 * Map country to default language
 */
export const COUNTRY_TO_LANGUAGE: Record<SupportedCountry, 'en' | 'id'> = {
  'Indonesia': 'id',
  'Australia': 'en',
};
