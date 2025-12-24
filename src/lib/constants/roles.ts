/**
 * User Role Constants
 * Based on STEP_01_DATABASE_DESIGN.txt
 * 
 * Note: CUSTOMER is no longer part of User roles.
 * Customers are stored in a separate Customer table with their own authentication.
 */

export const USER_ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MERCHANT_OWNER: 'MERCHANT_OWNER',
  MERCHANT_STAFF: 'MERCHANT_STAFF',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const MERCHANT_ROLES = {
  OWNER: 'OWNER',
  STAFF: 'STAFF',
} as const;

export type MerchantRole = typeof MERCHANT_ROLES[keyof typeof MERCHANT_ROLES];

/**
 * Check if user has required role
 */
export function hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if user is admin (Super Admin or Merchant Owner)
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === USER_ROLES.SUPER_ADMIN || userRole === USER_ROLES.MERCHANT_OWNER;
}

/**
 * Check if user is merchant user (Owner or Staff)
 */
export function isMerchantUser(userRole: UserRole): boolean {
  return userRole === USER_ROLES.MERCHANT_OWNER || userRole === USER_ROLES.MERCHANT_STAFF;
}
