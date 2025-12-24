/**
 * JWT Manager Utility
 * Handles JWT token generation and verification (STEP_02 requirement)
 */

import * as jwt from 'jsonwebtoken';
import { JWTPayload, RefreshTokenPayload, UserRole } from '@/lib/types/auth';

interface DecodedToken {
  userId: string;
  sessionId: string;
  role: UserRole | 'CUSTOMER'; // CUSTOMER is virtual role for customer auth
  email: string;
  merchantId?: string;
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRY = parseInt(process.env.JWT_EXPIRY || '3600'); // 1 hour default
const JWT_REFRESH_EXPIRY = parseInt(process.env.JWT_REFRESH_EXPIRY || '604800'); // 7 days default

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is not set!');
}

/**
 * Generate access token
 * @param payload - JWT payload with user info and session ID
 * @param expiresIn - Optional custom expiry duration in seconds (defaults to JWT_EXPIRY)
 * @returns JWT access token
 */
export function generateAccessToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  expiresIn?: number
): string {
  // Convert BigInt to string for JSON serialization
  const serializedPayload = {
    userId: payload.userId.toString(),
    sessionId: payload.sessionId.toString(),
    role: payload.role,
    email: payload.email,
    ...(payload.merchantId && { merchantId: payload.merchantId.toString() }),
  };
  
  return jwt.sign(serializedPayload, JWT_SECRET, {
    expiresIn: expiresIn || JWT_EXPIRY,
  });
}

/**
 * Generate refresh token
 * @param payload - Refresh token payload with user and session ID
 * @param expiresIn - Optional custom expiry duration in seconds (defaults to JWT_REFRESH_EXPIRY)
 * @returns JWT refresh token
 */
export function generateRefreshToken(
  payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>,
  expiresIn?: number
): string {
  // Convert BigInt to string for JSON serialization
  const serializedPayload = {
    userId: payload.userId.toString(),
    sessionId: payload.sessionId.toString(),
  };
  
  return jwt.sign(serializedPayload, JWT_SECRET, {
    expiresIn: expiresIn || JWT_REFRESH_EXPIRY,
  });
}

/**
 * Verify and decode access token
 * @param token - JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    
    // Convert string IDs back to BigInt
    return {
      userId: BigInt(decoded.userId),
      sessionId: BigInt(decoded.sessionId),
      role: decoded.role,
      email: decoded.email,
      merchantId: decoded.merchantId ? BigInt(decoded.merchantId) : undefined,
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch (error) {
    // Log JWT expiry for debugging
    if (error instanceof Error && error.message.includes('expired')) {
      console.warn('[jwtManager] JWT token expired');
    }
    return null;
  }
}

/**
 * Verify and decode refresh token
 * @param token - JWT refresh token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as Pick<DecodedToken, 'userId' | 'sessionId' | 'iat' | 'exp'>;
    
    // Convert string IDs back to BigInt
    return {
      userId: BigInt(decoded.userId),
      sessionId: BigInt(decoded.sessionId),
      iat: decoded.iat,
      exp: decoded.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader - Authorization header value
 * @returns Token string or null
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}
