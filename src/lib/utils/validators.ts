/**
 * Input Validation Utilities
 */

import { ValidationError, ERROR_CODES } from '@/lib/constants/errors';

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate email format
 * @param email - Email to validate
 * @returns True if valid
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate email or throw error
 * @param email - Email to validate
 * @throws ValidationError if invalid
 */
export function validateEmail(email: string): void {
  if (!email || !email.trim()) {
    throw new ValidationError('Email is required', ERROR_CODES.REQUIRED_FIELD);
  }
  
  if (!isValidEmail(email)) {
    throw new ValidationError('Invalid email format', ERROR_CODES.INVALID_EMAIL);
  }
}

/**
 * Validate password strength
 * Minimum 8 characters (STEP_02 requirement)
 * @param password - Password to validate
 * @returns True if valid
 */
export function isValidPassword(password: string): boolean {
  return Boolean(password && password.length >= 8);
}

/**
 * Validate password or throw error
 * @param password - Password to validate
 * @throws ValidationError if invalid
 */
export function validatePassword(password: string): void {
  if (!password) {
    throw new ValidationError('Password is required', ERROR_CODES.REQUIRED_FIELD);
  }
  
  if (!isValidPassword(password)) {
    throw new ValidationError(
      'Password must be at least 8 characters long',
      ERROR_CODES.INVALID_PASSWORD
    );
  }
}

/**
 * Validate required field
 * @param value - Value to check
 * @param fieldName - Field name for error message
 * @throws ValidationError if empty
 */
export function validateRequired(value: unknown, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(
      `${fieldName} is required`,
      ERROR_CODES.REQUIRED_FIELD
    );
  }
}

/**
 * Phone validation regex patterns by country
 * Supports Indonesia and Australia phone formats
 */
const PHONE_PATTERNS = {
  // Indonesia: +62xxx, 62xxx, 08xxx (10-13 digits total)
  ID: /^(?:\+?62|0)8[1-9][0-9]{7,10}$/,
  // Australia: +61xxx, 61xxx, 04xxx, 02xxx, etc (9-10 digits after country code)
  AU: /^(?:\+?61|0)[2-478][0-9]{8}$/,
  // Generic international: starts with + and 8-15 digits
  INTL: /^\+[1-9][0-9]{7,14}$/,
};

/**
 * Validate phone number (supports Indonesia & Australia formats)
 * @param phone - Phone number to validate
 * @param country - Optional country code ('ID', 'AU') for specific validation
 * @returns True if valid
 */
export function isValidPhone(phone: string, country?: 'ID' | 'AU' | 'INTL'): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  // Clean the phone number (remove spaces, dashes, parentheses)
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If specific country requested, validate against that pattern only
  if (country && PHONE_PATTERNS[country]) {
    return PHONE_PATTERNS[country].test(cleaned);
  }
  
  // Otherwise, check against all supported patterns
  return (
    PHONE_PATTERNS.ID.test(cleaned) || 
    PHONE_PATTERNS.AU.test(cleaned) ||
    PHONE_PATTERNS.INTL.test(cleaned)
  );
}

/**
 * Detect country from phone number format
 * @param phone - Phone number to analyze
 * @returns Country code or null if unknown
 */
export function detectPhoneCountry(phone: string): 'ID' | 'AU' | 'INTL' | null {
  if (!phone) return null;
  
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Check Indonesia first (most common)
  if (PHONE_PATTERNS.ID.test(cleaned)) return 'ID';
  
  // Check Australia
  if (PHONE_PATTERNS.AU.test(cleaned)) return 'AU';
  
  // Check generic international
  if (PHONE_PATTERNS.INTL.test(cleaned)) return 'INTL';
  
  return null;
}

/**
 * Normalize phone number to international format
 * @param phone - Phone number to normalize
 * @param defaultCountry - Default country code if no country prefix found
 * @returns Normalized phone number with country code
 */
export function normalizePhoneNumber(phone: string, defaultCountry: 'ID' | 'AU' = 'ID'): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Already has international prefix
  if (cleaned.startsWith('+')) return cleaned;
  
  // Indonesia local format (08xx)
  if (cleaned.startsWith('08') || cleaned.startsWith('628')) {
    return cleaned.startsWith('08') 
      ? '+62' + cleaned.slice(1) 
      : '+' + cleaned;
  }
  
  // Australia local format (04xx, 02xx, etc)
  if (/^0[2-478]/.test(cleaned) || cleaned.startsWith('61')) {
    return cleaned.startsWith('0') 
      ? '+61' + cleaned.slice(1) 
      : '+' + cleaned;
  }
  
  // Fallback: add default country code
  const countryPrefixes = { ID: '+62', AU: '+61' };
  if (cleaned.startsWith('0')) {
    return countryPrefixes[defaultCountry] + cleaned.slice(1);
  }
  
  return cleaned;
}

/**
 * Sanitize string input (remove dangerous characters)
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Validate merchant code format
 * Alphanumeric, 3-20 characters, no spaces
 * @param code - Merchant code to validate
 * @returns True if valid
 */
export function isValidMerchantCode(code: string): boolean {
  const codeRegex = /^[a-zA-Z0-9_-]{3,20}$/;
  return codeRegex.test(code);
}

/**
 * Validate merchant code or throw error
 * @param code - Merchant code to validate
 * @throws ValidationError if invalid
 */
export function validateMerchantCode(code: string): void {
  if (!code || !code.trim()) {
    throw new ValidationError('Merchant code is required', ERROR_CODES.REQUIRED_FIELD);
  }
  
  if (!isValidMerchantCode(code)) {
    throw new ValidationError(
      'Merchant code must be 3-20 alphanumeric characters',
      ERROR_CODES.VALIDATION_ERROR
    );
  }
}
