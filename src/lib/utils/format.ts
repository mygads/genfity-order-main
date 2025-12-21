/**
 * Formatting Utility Functions
 * Indonesian locale formatters untuk currency, date, time, etc.
 */

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format number to currency based on merchant settings
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'IDR')
 * @example formatCurrency(10000) => "Rp10,000.00"
 * @example formatCurrency(10, 'AUD') => "$10.00"
 */
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  // Special handling for AUD to show A$ prefix
  if (currency === 'AUD') {
    return `A$${amount.toFixed(2)}`;
  }

  // Map currency to appropriate locale
  const localeMap: Record<string, string> = {
    'IDR': 'id-ID',
    'USD': 'en-US',
    'SGD': 'en-SG',
    'MYR': 'ms-MY',
  };

  const locale = localeMap[currency] || 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format currency without "Rp" prefix
 * @example formatCurrencyValue(10000) => "10.000"
 */
export function formatCurrencyValue(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// DATE & TIME FORMATTING
// ============================================================================

/**
 * Format date to Indonesian locale
 * @example formatDate(new Date()) => "10 Nov 2025"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Format date to long format
 * @example formatDateLong(new Date()) => "10 November 2025"
 */
export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Format time to HH:MM
 * @example formatTime(new Date()) => "14:30"
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Format date and time together
 * @example formatDateTime(new Date()) => "10 Nov 2025, 14:30"
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

/**
 * Get relative time (e.g., "2 menit yang lalu")
 */
export function getRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit yang lalu`;
  if (diffHour < 24) return `${diffHour} jam yang lalu`;
  if (diffDay < 7) return `${diffDay} hari yang lalu`;

  return formatDate(d);
}

// ============================================================================
// PHONE NUMBER FORMATTING
// ============================================================================

/**
 * Format phone number to Indonesian format
 * @example formatPhoneNumber("089668176764") => "0896-6817-6764"
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');

  // Format: 0896-6817-6764
  if (cleaned.length === 12) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }

  // Format: 0812-3456-7890 (11 digits)
  if (cleaned.length === 11) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
  }

  // Return as-is if doesn't match expected format
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
  // Generate random 8-character alphanumeric string (uppercase)
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
  // Assuming merchant code is always 7 characters
  // Adjust this logic based on actual merchant code length
  return orderNumber.slice(0, 7);
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
 * Format day name (Indonesian)
 */
export function formatDayName(day: string): string {
  const dayMap: Record<string, string> = {
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

  return dayMap[day.toUpperCase()] || day;
}

// ============================================================================
// STATUS FORMATTING
// ============================================================================

/**
 * Format order status to Indonesian
 */
export function formatOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    PENDING: 'Menunggu',
    CONFIRMED: 'Dikonfirmasi',
    PREPARING: 'Diproses',
    READY: 'Siap',
    COMPLETED: 'Selesai',
    CANCELLED: 'Dibatalkan',
  };

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
  // Must start with 0 and be 10-13 digits
  return /^0\d{9,12}$/.test(cleaned);
}

/**
 * Validate merchant code format
 */
export function isValidMerchantCode(code: string): boolean {
  // Must be 4-10 uppercase alphanumeric characters
  return /^[A-Z0-9]{4,10}$/.test(code);
}
