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
 * Validate phone number (Australian format)
 * @param phone - Phone number to validate
 * @returns True if valid
 */
export function isValidPhone(phone: string): boolean {
  // Australian phone: +61 or 0, followed by 9 digits
  const phoneRegex = /^(\+?61|0)[2-478](?:[ -]?[0-9]){8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
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
