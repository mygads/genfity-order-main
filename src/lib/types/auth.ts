/**
 * Authentication Types
 */

export type UserRole = 'SUPER_ADMIN' | 'MERCHANT_OWNER' | 'MERCHANT_STAFF' | 'DELIVERY';
export type SessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean; // For admin, owner, staff - extends session to 1 week
  merchantId?: string; // Optional: specify which merchant to login to (for multi-merchant users)
  /**
   * Optional client context.
   * - 'admin': default behavior
   * - 'driver': driver login flow (may be a DELIVERY user or a staff granted driver access)
   */
  client?: 'admin' | 'driver';
}

export interface MerchantInfo {
  merchantId: string;
  merchantCode: string;
  merchantName: string;
  merchantLogo: string | null;
  address: string | null;
  city: string | null;
  isOpen: boolean;
  role: string;
  permissions: string[];
  isActive: boolean;
}

export interface LoginResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    merchantId?: string;
    profilePictureUrl?: string;
  };
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number; // Token expiry in seconds
  // Multi-merchant support
  merchants?: MerchantInfo[]; // All merchants user has access to
  needsMerchantSelection?: boolean; // True if user has multiple merchants
  permissions?: string[]; // Current merchant permissions
  merchantRole?: string; // Role at current merchant (OWNER/STAFF)
}

export interface JWTPayload {
  userId: bigint;
  sessionId: bigint;
  role: UserRole | 'CUSTOMER' | 'INFLUENCER'; // CUSTOMER and INFLUENCER are virtual roles
  email: string;
  merchantId?: bigint;
  // Customer-specific fields (used by verifyCustomerToken)
  customerId?: string;
  name?: string;
  // Influencer-specific fields
  influencerId?: string;
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  userId: bigint;
  sessionId: bigint;
  iat?: number;
  exp?: number;
}

export interface SessionData {
  id: bigint;
  userId: bigint;
  token: string;
  status: SessionStatus;
  expiresAt: Date;
  deviceInfo?: string | null;
  ipAddress?: string | null;
}

export interface AuthUser {
  id: bigint;
  name: string;
  email: string;
  role: UserRole;
  merchantId?: bigint;
}

/**
 * Authentication context passed to route handlers
 */
export interface AuthContext {
  userId: bigint;
  sessionId: bigint;
  role: UserRole;
  email: string;
  merchantId?: bigint;
}
