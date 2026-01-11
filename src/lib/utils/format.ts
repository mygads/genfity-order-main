/**
 * Formatting Utility Functions
 * Multi-locale formatters for currency, date, time, etc.
 * 
 * Supports:
 * - English (en) - for AUD currency (Australia)
 * - Indonesian (id) - for IDR currency (Indonesia)
 * 
 * @specification Multi-currency & Multi-language support
 */

import type { Locale } from '@/lib/i18n';
import { getCurrencyConfig } from '@/lib/constants/location';

// ============================================================================
// TYPES
// ============================================================================

export type Currency = 'AUD' | 'IDR' | string;

// ============================================================================
// LOCALE MAPPING
// ============================================================================

/**
 * Map app locale to Intl locale for formatting
 */
const appLocaleToIntlLocale: Record<Locale, string> = {
  en: 'en-AU',
  id: 'id-ID',
};

/**
 * Map currency to Intl locale (used when locale not provided)
 */
const currencyToIntlLocale: Record<string, string> = {
  'IDR': 'id-ID',
  'AUD': 'en-AU',
};

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format number to currency based on merchant settings
 * 
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'IDR')
 * @param locale - Optional app locale (en/id), affects number formatting
 * 
 * @example formatCurrency(10000, 'IDR') => "Rp 10.000"
 * @example formatCurrency(10.50, 'AUD') => "A$10.50"
 * 
 * @specification
 * - IDR: No decimals, uses Rp prefix, Indonesian number format (10.000)
 * - AUD: 2 decimals, uses A$ prefix, Australian number format (10.00)
 */
export function formatCurrency(
  amount: number,
  currency: Currency = 'AUD',
  locale?: Locale
): string {
  // Be defensive: some call-sites (emails/serializers) may pass undefined/NaN.
  const safeAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  const config = getCurrencyConfig(currency);
  
  // Special handling for AUD to show A$ prefix
  if (currency === 'AUD') {
    return `A$${safeAmount.toFixed(2)}`;
  }
  
  // Special handling for IDR - no decimals, Rp prefix
  if (currency === 'IDR') {
    const formatted = new Intl.NumberFormat('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(safeAmount));
    return `Rp ${formatted}`;
  }

  // Fallback for other currencies (shouldn't happen with current setup)
  const intlLocale = locale
    ? appLocaleToIntlLocale[locale]
    : (currencyToIntlLocale[currency] || 'en-US');

  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: config?.decimals ?? 2,
    maximumFractionDigits: config?.decimals ?? 2,
  }).format(safeAmount);
}

/**
 * Format currency with symbol only (no currency code)
 * 
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns Formatted string with symbol
 * 
 * @example formatCurrencyWithSymbol(10000, 'IDR') => "Rp 10.000"
 * @example formatCurrencyWithSymbol(10.50, 'AUD') => "A$10.50"
 */
export function formatCurrencyWithSymbol(amount: number, currency: Currency = 'AUD'): string {
  return formatCurrency(amount, currency);
}

/**
 * Get currency symbol
 * 
 * @param currency - Currency code
 * @returns Currency symbol
 */
export function getCurrencySymbol(currency: Currency): string {
  const config = getCurrencyConfig(currency);
  return config?.symbol || '$';
}

/**
 * Format currency without symbol prefix
 * @param amount - Amount to format
 * @param locale - Optional app locale (en/id)
 * @example formatCurrencyValue(10000) => "10.000" (id) or "10,000" (en)
 */
export function formatCurrencyValue(amount: number, locale?: Locale): string {
  const intlLocale = locale ? appLocaleToIntlLocale[locale] : 'id-ID';

  return new Intl.NumberFormat(intlLocale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}


// ============================================================================
// DATE & TIME FORMATTING
// ============================================================================

/**
 * Format date to locale-appropriate format
 * @param date - Date to format
 * @param locale - App locale (en/id)
 * @example formatDate(new Date(), 'id') => "10 Nov 2025"
 * @example formatDate(new Date(), 'en') => "Nov 10, 2025"
 */
export function formatDate(date: Date | string, locale?: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const intlLocale = locale ? appLocaleToIntlLocale[locale] : 'id-ID';

  return new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Format date to long format
 * @param date - Date to format
 * @param locale - App locale (en/id)
 * @example formatDateLong(new Date(), 'id') => "10 November 2025"
 * @example formatDateLong(new Date(), 'en') => "November 10, 2025"
 */
export function formatDateLong(date: Date | string, locale?: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const intlLocale = locale ? appLocaleToIntlLocale[locale] : 'id-ID';

  return new Intl.DateTimeFormat(intlLocale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Format time to HH:MM
 * @example formatTime(new Date()) => "14:30"
 */
export function formatTime(date: Date | string, locale?: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const intlLocale = locale ? appLocaleToIntlLocale[locale] : 'id-ID';

  return new Intl.DateTimeFormat(intlLocale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Format date and time together
 * @example formatDateTime(new Date(), 'id') => "10 Nov 2025, 14:30"
 */
export function formatDateTime(date: Date | string, locale?: Locale): string {
  return `${formatDate(date, locale)}, ${formatTime(date, locale)}`;
}

/**
 * Get relative time with locale support
 * @param date - Date to compare
 * @param locale - App locale (en/id)
 * @example getRelativeTime(new Date(), 'id') => "Baru saja"
 * @example getRelativeTime(new Date(), 'en') => "Just now"
 */
export function getRelativeTime(date: Date | string, locale?: Locale): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  const isIndonesian = locale === 'id' || locale === undefined;

  if (diffSec < 60) {
    return isIndonesian ? 'Baru saja' : 'Just now';
  }
  if (diffMin < 60) {
    return isIndonesian
      ? `${diffMin} menit yang lalu`
      : `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  }
  if (diffHour < 24) {
    return isIndonesian
      ? `${diffHour} jam yang lalu`
      : `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  }
  if (diffDay < 7) {
    return isIndonesian
      ? `${diffDay} hari yang lalu`
      : `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  }

  return formatDate(d, locale);
}

// ============================================================================
// PHONE NUMBER FORMATTING
// ============================================================================

/**
 * Format phone number to Indonesian format
 * @example formatPhoneNumber("089668176764") => "0896-6817-6764"
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 12) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }

  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }

  return phone;
}

/**
 * Unformat phone number (remove dashes)
 * @example unformatPhoneNumber("0896-6817-6764") => "089668176764"
 */
export function unformatPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

// ============================================================================
// ORDER NUMBER GENERATION
// ============================================================================

/**
 * Generate unique order number
 * Format: [MERCHANTCODE][UNIQUE8]
 * @example generateOrderNumber("BRJOBNG") => "BRJOBNGCBDJNDU1"
 */
export function generateOrderNumber(merchantCode: string): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let unique = '';

  for (let i = 0; i < 8; i++) {
    unique += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return `${merchantCode}${unique}`;
}

/**
 * Parse order number to extract merchant code
 * @example parseOrderNumber("BRJOBNGCBDJNDU1") => "BRJOBNG"
 */
export function parseMerchantCodeFromOrderNumber(orderNumber: string): string {
  return orderNumber.slice(0, 7);
}

/**
 * Format order number for display in admin/POS.
 *
 * Current DB `orderNumber` can be a short code (e.g. 4 chars). For merchant-facing
 * surfaces we want to show the full reference including merchant code.
 *
 * Examples:
 * - formatFullOrderNumber('A1BC', 'BRJOBNG') => 'BRJOBNG-A1BC'
 * - formatFullOrderNumber('BRJOBNG-A1BC', 'BRJOBNG') => 'BRJOBNG-A1BC'
 */
export function formatFullOrderNumber(
  orderNumber: string | null | undefined,
  merchantCode?: string | null
): string {
  if (!orderNumber) return '';

  const normalizedMerchantCode = (merchantCode ?? '').trim();
  if (!normalizedMerchantCode) return orderNumber;

  const upperMerchantCode = normalizedMerchantCode.toUpperCase();
  const upperOrderNumber = orderNumber.toUpperCase();

  // If the stored value already starts with merchant code, don't prefix again.
  if (upperOrderNumber.startsWith(upperMerchantCode)) return orderNumber;

  return `${upperMerchantCode}-${orderNumber}`;
}

/**
 * Show only the suffix part of an order number after the first dash.
 *
 * Examples:
 * - formatOrderNumberSuffix('BRJOBNG-A1BC') => 'A1BC'
 * - formatOrderNumberSuffix('BRJOBNG-OFFLINE-123') => 'OFFLINE-123'
 * - formatOrderNumberSuffix('A1BC') => 'A1BC'
 */
export function formatOrderNumberSuffix(orderNumber: string | null | undefined): string {
  if (!orderNumber) return '';

  const idx = orderNumber.indexOf('-');
  if (idx === -1) return orderNumber;
  return orderNumber.slice(idx + 1);
}

// ============================================================================
// TEXT FORMATTING
// ============================================================================

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Format day name with locale support
 * @param day - Day name in English (MONDAY, TUESDAY, etc.)
 * @param locale - App locale (en/id)
 */
export function formatDayName(day: string, locale?: Locale): string {
  const isIndonesian = locale === 'id' || locale === undefined;

  const dayMapId: Record<string, string> = {
    MONDAY: 'Senin',
    TUESDAY: 'Selasa',
    WEDNESDAY: 'Rabu',
    THURSDAY: 'Kamis',
    FRIDAY: 'Jumat',
    SATURDAY: 'Sabtu',
    SUNDAY: 'Minggu',
    SENIN: 'Senin',
    SELASA: 'Selasa',
    RABU: 'Rabu',
    KAMIS: 'Kamis',
    JUMAT: 'Jumat',
    SABTU: 'Sabtu',
    MINGGU: 'Minggu',
  };

  const dayMapEn: Record<string, string> = {
    MONDAY: 'Monday',
    TUESDAY: 'Tuesday',
    WEDNESDAY: 'Wednesday',
    THURSDAY: 'Thursday',
    FRIDAY: 'Friday',
    SATURDAY: 'Saturday',
    SUNDAY: 'Sunday',
    SENIN: 'Monday',
    SELASA: 'Tuesday',
    RABU: 'Wednesday',
    KAMIS: 'Thursday',
    JUMAT: 'Friday',
    SABTU: 'Saturday',
    MINGGU: 'Sunday',
  };

  const dayMap = isIndonesian ? dayMapId : dayMapEn;
  return dayMap[day.toUpperCase()] || day;
}

// ============================================================================
// STATUS FORMATTING
// ============================================================================

/**
 * Format order status with locale support
 * @param status - Order status
 * @param locale - App locale (en/id)
 */
export function formatOrderStatus(status: string, locale?: Locale): string {
  const isIndonesian = locale === 'id' || locale === undefined;

  const statusMapId: Record<string, string> = {
    PENDING: 'Menunggu',
    CONFIRMED: 'Dikonfirmasi',
    PREPARING: 'Diproses',
    READY: 'Siap',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
  };

  const statusMapEn: Record<string, string> = {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY: 'Ready',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
  };

  const statusMap = isIndonesian ? statusMapId : statusMapEn;
  return statusMap[status.toUpperCase()] || status;
}

/**
 * Get status color (Tailwind class)
 */
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    PENDING: 'bg-warning-500 text-white',
    CONFIRMED: 'bg-blue-light-500 text-white',
    PREPARING: 'bg-blue-light-500 text-white',
    READY: 'bg-success-500 text-white',
    COMPLETED: 'bg-success-500 text-white',
    CANCELLED: 'bg-error-500 text-white',
  };

  return colorMap[status.toUpperCase()] || 'bg-gray-500 text-white';
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Indonesian phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return /^0\d{9,12}$/.test(cleaned);
}

/**
 * Validate merchant code format
 */
export function isValidMerchantCode(code: string): boolean {
  return /^[A-Z0-9]{4,10}$/.test(code);
}
