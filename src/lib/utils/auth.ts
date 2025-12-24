/**
 * Authentication Utilities
 * JWT token verification for customer authentication
 * 
 * @specification STEP_02_AUTHENTICATION_JWT.txt - JWT Verification
 * 
 * @description
 * Provides JWT token verification using jose library (Next.js standard):
 * - Verify JWT signature with HS256 algorithm
 * - Decode customer ID from token payload
 * - Handle token expiration
 * 
 * @security
 * - JWT_SECRET from environment variables (never hardcoded)
 * - HS256 algorithm (HMAC with SHA-256)
 * - Token expiration validation
 * 
 * @dependencies
 * - jose: ^5.x (Next.js 13+ standard JWT library)
 */

import { jwtVerify } from 'jose';

/**
 * JWT Payload Interface
 * 
 * @specification STEP_02_AUTHENTICATION_JWT.txt - Token Structure
 * 
 * @property customerId - Customer database ID (bigint as string)
 * @property email - Customer email address
 * @property name - Customer display name
 * @property iat - Issued at timestamp (unix seconds)
 * @property exp - Expiration timestamp (unix seconds)
 */
export interface CustomerTokenPayload {
  customerId: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

/**
 * Verify customer JWT token
 * 
 * @param token - JWT token string (without "Bearer " prefix)
 * @returns Decoded payload with customer info, or null if invalid
 * 
 * @specification STEP_02_AUTHENTICATION_JWT.txt - JWT Verification Flow
 * 
 * @security
 * - Validates JWT signature with JWT_SECRET
 * - Checks token expiration automatically
 * - Returns null on any verification failure (safe default)
 * 
 * @example
 * ```typescript
 * const decoded = await verifyCustomerToken(token);
 * if (decoded) {
 *   console.log('Customer ID:', decoded.customerId);
 * } else {
 *   // Invalid or expired token
 * }
 * ```
 * 
 * @throws Never throws - returns null on all errors
 */
export async function verifyCustomerToken(
  token: string
): Promise<CustomerTokenPayload | null> {
  try {
    // ========================================
    // VALIDATION (Security Constraint)
    // ========================================

    if (!token || typeof token !== 'string') {
      return null;
    }

    // ✅ Get JWT_SECRET from environment
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // This is a server configuration error - should be logged
      console.error('[AUTH] JWT_SECRET not configured');
      return null;
    }

    // ========================================
    // JWT VERIFICATION (jose library)
    // ========================================

    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);

    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });

    // ========================================
    // PAYLOAD VALIDATION
    // ========================================

    /**
     * ✅ CRITICAL CHECK: Verify payload has 'customerId' field
     * 
     * Common mistake: Token generated with 'userId' instead of 'customerId'
     * Fix: Update JWT generation in customer-login endpoint
     */
    if (
      !payload.customerId ||
      !payload.email ||
      !payload.name
    ) {
      // Missing fields in token - expected failure, no logging needed
      return null;
    }

    // ✅ Type-safe payload extraction
    return {
      customerId: payload.customerId as string,
      email: payload.email as string,
      name: payload.name as string,
      iat: payload.iat || 0,
      exp: payload.exp || 0,
    };

  } catch {
    // Token verification failures are expected (expired, invalid, etc.)
    // No need to log - just return null
    return null;
  }
}

/**
 * Extract Bearer token from Authorization header
 * 
 * @param authHeader - Authorization header value
 * @returns Token string without "Bearer " prefix, or null
 * 
 * @example
 * ```typescript
 * const token = extractBearerToken(req.headers.get('authorization'));
 * if (token) {
 *   const decoded = await verifyCustomerToken(token);
 * }
 * ```
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove "Bearer " prefix
}