/**
 * Authentication Types
 */

export type UserRole = 'SUPER_ADMIN' | 'MERCHANT_OWNER' | 'MERCHANT_STAFF';
export type SessionStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean; // For admin, owner, staff - extends session to 1 week
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
}

export interface JWTPayload {
  userId: bigint;
  sessionId: bigint;
  role: UserRole | 'CUSTOMER'; // CUSTOMER is virtual role for customer auth
  email: string;
  merchantId?: bigint;
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
