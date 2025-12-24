/**
 * Error Codes and Messages
 * Based on GENFITY requirements and security best practices
 */

export const ERROR_CODES = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  SESSION_REVOKED: 'SESSION_REVOKED',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  
  // User
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  MUST_CHANGE_PASSWORD: 'MUST_CHANGE_PASSWORD',
  PASSWORD_NOT_SET: 'PASSWORD_NOT_SET',
  
  // Customer
  CUSTOMER_NOT_FOUND: 'CUSTOMER_NOT_FOUND',
  CUSTOMER_INACTIVE: 'CUSTOMER_INACTIVE',
  
  // Merchant
  MERCHANT_NOT_FOUND: 'MERCHANT_NOT_FOUND',
  MERCHANT_DISABLED: 'MERCHANT_DISABLED',
  MERCHANT_CLOSED: 'MERCHANT_CLOSED',
  MERCHANT_CODE_EXISTS: 'MERCHANT_CODE_EXISTS',
  MERCHANT_ALREADY_HAS_OWNER: 'MERCHANT_ALREADY_HAS_OWNER',
  MERCHANT_INACTIVE: 'MERCHANT_INACTIVE',
  
  // Menu & Addons
  MENU_NOT_FOUND: 'MENU_NOT_FOUND',
  MENU_INACTIVE: 'MENU_INACTIVE',
  MENU_OUT_OF_STOCK: 'MENU_OUT_OF_STOCK',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  ADDON_NOT_FOUND: 'ADDON_NOT_FOUND',
  ADDON_INACTIVE: 'ADDON_INACTIVE',
  ADDON_OUT_OF_STOCK: 'ADDON_OUT_OF_STOCK',
  INVALID_ADDON_SELECTION: 'INVALID_ADDON_SELECTION',
  
  // Order
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  INVALID_ORDER_STATUS: 'INVALID_ORDER_STATUS',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  EMPTY_CART: 'EMPTY_CART',
  
  // General
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  CONFLICT: 'CONFLICT',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Error Messages
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Authentication & Authorization
  INVALID_CREDENTIALS: 'Invalid email or password',
  UNAUTHORIZED: 'Authentication required',
  FORBIDDEN: 'You do not have permission to access this resource',
  TOKEN_EXPIRED: 'Your session has expired. Please login again',
  TOKEN_INVALID: 'Invalid authentication token',
  SESSION_REVOKED: 'Your session has been revoked. Please login again',
  SESSION_NOT_FOUND: 'Session not found',
  
  // Validation
  VALIDATION_ERROR: 'Validation error',
  VALIDATION_FAILED: 'Validation failed',
  INVALID_EMAIL: 'Invalid email format',
  INVALID_PASSWORD: 'Password must be at least 8 characters long',
  REQUIRED_FIELD: 'This field is required',
  
  // User
  USER_NOT_FOUND: 'User not found',
  USER_INACTIVE: 'User account is inactive',
  USER_ALREADY_EXISTS: 'User already exists',
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  MUST_CHANGE_PASSWORD: 'You must change your password before continuing',
  PASSWORD_NOT_SET: 'Password has not been set. Please set your password first',
  
  // Customer
  CUSTOMER_NOT_FOUND: 'Customer not found',
  CUSTOMER_INACTIVE: 'Customer account is inactive',
  
  // Merchant
  MERCHANT_NOT_FOUND: 'Merchant not found',
  MERCHANT_DISABLED: 'Merchant is currently disabled',
  MERCHANT_CODE_EXISTS: 'Merchant code already exists',
  MERCHANT_ALREADY_HAS_OWNER: 'This merchant already has an owner',
  MERCHANT_INACTIVE: 'Merchant is currently inactive',
  MERCHANT_CLOSED: 'Merchant is currently closed',
  
  // Menu & Addons
  MENU_NOT_FOUND: 'Menu item not found',
  MENU_INACTIVE: 'Menu item is not available',
  MENU_OUT_OF_STOCK: 'Menu item is out of stock',
  CATEGORY_NOT_FOUND: 'Category not found',
  ADDON_NOT_FOUND: 'Addon not found',
  ADDON_INACTIVE: 'Addon is not available',
  ADDON_OUT_OF_STOCK: 'Addon is out of stock',
  INVALID_ADDON_SELECTION: 'Invalid addon selection',
  
  // Order
  ORDER_NOT_FOUND: 'Order not found',
  INVALID_ORDER_STATUS: 'Invalid order status',
  INVALID_STATUS_TRANSITION: 'Invalid status transition',
  EMPTY_CART: 'Cart is empty',
  
  // General
  INTERNAL_ERROR: 'An internal error occurred. Please try again later',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Invalid request',
  CONFLICT: 'Resource conflict',
  DATABASE_ERROR: 'Database error occurred',
};

/**
 * Custom Error Class
 */
export class CustomError extends Error {
  constructor(
    public errorCode: ErrorCode,
    public statusCode: number,
    message?: string
  ) {
    super(message || ERROR_MESSAGES[errorCode]);
    this.name = 'CustomError';
  }
}

/**
 * Specific Error Classes
 */
export class ValidationError extends CustomError {
  constructor(message?: string, errorCode: ErrorCode = ERROR_CODES.VALIDATION_ERROR) {
    super(errorCode, 400, message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends CustomError {
  constructor(message?: string, errorCode: ErrorCode = ERROR_CODES.UNAUTHORIZED) {
    super(errorCode, 401, message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends CustomError {
  constructor(message?: string, errorCode: ErrorCode = ERROR_CODES.FORBIDDEN) {
    super(errorCode, 403, message);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends CustomError {
  constructor(message?: string, errorCode: ErrorCode = ERROR_CODES.NOT_FOUND) {
    super(errorCode, 404, message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends CustomError {
  constructor(message?: string, errorCode: ErrorCode = ERROR_CODES.CONFLICT) {
    super(errorCode, 409, message);
    this.name = 'ConflictError';
  }
}

export class InternalError extends CustomError {
  constructor(message?: string, errorCode: ErrorCode = ERROR_CODES.INTERNAL_ERROR) {
    super(errorCode, 500, message);
    this.name = 'InternalError';
  }
}
