/**
 * Authentication Middleware
 * Verifies JWT tokens and enforces role-based access control
 */

import { NextRequest, NextResponse } from 'next/server';
import authService from '@/lib/services/AuthService';
import customerAuthService from '@/lib/services/CustomerAuthService';
import influencerAuthService from '@/lib/services/InfluencerAuthService';
import { extractTokenFromHeader } from '@/lib/utils/jwtManager';
import { AuthenticationError, AuthorizationError, ERROR_CODES } from '@/lib/constants/errors';
import { handleError } from '@/lib/middleware/errorHandler';
import type { UserRole } from '@/lib/types/auth';

type NextRouteContext = { params: Promise<unknown> };
type NormalizedRouteContext = { params: Promise<Record<string, string>> };

function normalizeRouteContext(routeContext: NextRouteContext): NormalizedRouteContext {
  return {
    params: (async () => {
      try {
        const rawParams = await routeContext.params;

        if (!rawParams || typeof rawParams !== 'object') {
          return {};
        }

        const normalized: Record<string, string> = {};
        for (const [key, value] of Object.entries(rawParams as Record<string, unknown>)) {
          normalized[key] = typeof value === 'string' ? value : String(value);
        }

        return normalized;
      } catch {
        return {};
      }
    })(),
  };
}

/**
 * Authenticated user context
 */
export interface AuthContext {
  userId: bigint;
  sessionId: bigint;
  role: UserRole;
  email: string;
  merchantId?: bigint; // For MERCHANT_OWNER and MERCHANT_STAFF
}

/**
 * Customer authentication context (separate from admin users)
 */
export interface CustomerAuthContext {
  customerId: bigint;
  sessionId: bigint;
  email: string;
}

/**
 * Influencer authentication context
 */
export interface InfluencerAuthContext {
  influencerId: bigint;
  sessionId: bigint;
  email: string;
}

/**
 * Verify JWT token and return user context
 */
export async function authenticate(request: NextRequest): Promise<AuthContext> {
  // Extract token from Authorization header
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new AuthenticationError(
      'Authorization token required',
      ERROR_CODES.UNAUTHORIZED
    );
  }

  // Verify token and get user context
  const userContext = await authService.verifyToken(token);

  if (!userContext) {
    throw new AuthenticationError(
      'Invalid or expired token',
      ERROR_CODES.TOKEN_INVALID
    );
  }

  return userContext as AuthContext;
}

/**
 * Check if user has required role
 */
export function requireRole(
  userContext: AuthContext,
  allowedRoles: UserRole[]
): void {
  if (!allowedRoles.includes(userContext.role)) {
    throw new AuthorizationError(
      'You do not have permission to access this resource',
      ERROR_CODES.FORBIDDEN
    );
  }
}

/**
 * Middleware wrapper for protected routes
 * Usage: export const GET = withAuth(handler, ['SUPER_ADMIN'])
 */
export function withAuth(
  handler: (
    request: NextRequest,
    context: AuthContext,
    routeContext: NormalizedRouteContext
  ) => Promise<NextResponse>,
  allowedRoles?: UserRole[]
) {
  return async (request: NextRequest, routeContext: NextRouteContext) => {
    try {
      // Authenticate user
      const authContext = await authenticate(request);

      // Check role if specified
      if (allowedRoles && allowedRoles.length > 0) {
        requireRole(authContext, allowedRoles);
      }

      // Call the actual handler with auth context
      return await handler(request, authContext, normalizeRouteContext(routeContext));
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Middleware for Super Admin only routes
 */
export function withSuperAdmin(
  handler: (
    request: NextRequest,
    context: AuthContext,
    routeContext: NormalizedRouteContext
  ) => Promise<NextResponse>
) {
  return withAuth(handler, ['SUPER_ADMIN']);
}

/**
 * Middleware for Merchant (Owner/Staff) routes
 */
export function withMerchant(
  handler: (
    request: NextRequest,
    context: AuthContext,
    routeContext: NormalizedRouteContext
  ) => Promise<NextResponse>
) {
  return withAuth(handler, ['MERCHANT_OWNER', 'MERCHANT_STAFF']);
}

/**
 * Middleware for Merchant Owner only routes
 */
export function withMerchantOwner(
  handler: (
    request: NextRequest,
    context: AuthContext,
    routeContext: NormalizedRouteContext
  ) => Promise<NextResponse>
) {
  return withAuth(handler, ['MERCHANT_OWNER']);
}

/**
 * Middleware for Delivery Driver routes
 */
export function withDelivery(
  handler: (
    request: NextRequest,
    context: AuthContext,
    routeContext: NormalizedRouteContext
  ) => Promise<NextResponse>
) {
  return withAuth(handler, ['DELIVERY']);
}

/**
 * Middleware for Customer routes
 * Uses separate customer authentication system
 */
export function withCustomer(
  handler: (
    request: NextRequest,
    context: CustomerAuthContext,
    routeContext: NormalizedRouteContext
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeContext: NextRouteContext) => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization');
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        throw new AuthenticationError(
          'Authorization token required',
          ERROR_CODES.UNAUTHORIZED
        );
      }

      // Verify customer token
      const customerContext = await customerAuthService.verifyToken(token);

      if (!customerContext) {
        throw new AuthenticationError(
          'Invalid or expired token',
          ERROR_CODES.TOKEN_INVALID
        );
      }

      // Call the actual handler with customer context
      return await handler(request, customerContext, normalizeRouteContext(routeContext));
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Middleware for Merchant routes with permission check
 * Validates that staff has the required permission
 */
export function withMerchantPermission(
  handler: (
    request: NextRequest,
    context: AuthContext,
    routeContext: NormalizedRouteContext
  ) => Promise<NextResponse>,
  requiredPermission?: string
) {
  return async (request: NextRequest, routeContext: NextRouteContext) => {
    try {
      // Authenticate user
      const authContext = await authenticate(request);

      // Check role
      if (!['MERCHANT_OWNER', 'MERCHANT_STAFF'].includes(authContext.role)) {
        throw new AuthorizationError(
          'Merchant access required',
          ERROR_CODES.FORBIDDEN
        );
      }

      // If owner, always allow
      if (authContext.role === 'MERCHANT_OWNER') {
        return await handler(request, authContext, normalizeRouteContext(routeContext));
      }

      // For staff, check permission if specified
      if (authContext.role === 'MERCHANT_STAFF' && authContext.merchantId) {
        // Dynamically import to avoid circular dependency
        const { default: staffPermissionService } = await import('@/lib/services/StaffPermissionService');
        const { getPermissionForApi } = await import('@/lib/constants/permissions');
        
        // Get permission from API path if not explicitly specified
        const permission = requiredPermission || getPermissionForApi(request.nextUrl.pathname);
        
        if (permission) {
          const hasAccess = await staffPermissionService.checkPermission(
            authContext.userId,
            authContext.merchantId,
            permission as import('@/lib/constants/permissions').StaffPermission
          );
          
          if (!hasAccess) {
            throw new AuthorizationError(
              'You do not have permission to access this resource',
              ERROR_CODES.FORBIDDEN
            );
          }
        }
      }

      // Call the actual handler
      return await handler(request, authContext, normalizeRouteContext(routeContext));
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Optional authentication - doesn't fail if no token
 * Returns null if not authenticated
 */
export async function optionalAuth(
  request: NextRequest
): Promise<AuthContext | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return null;
    }

    const userContext = await authService.verifyToken(token);
    return userContext as AuthContext | null;
  } catch {
    return null;
  }
}

/**
 * Optional customer authentication - doesn't fail if no token
 * Returns null if not authenticated
 */
export async function optionalCustomerAuth(
  request: NextRequest
): Promise<CustomerAuthContext | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return null;
    }

    const customerContext = await customerAuthService.verifyToken(token);
    return customerContext;
  } catch {
    return null;
  }
}

/**
 * Middleware for Influencer routes
 * Uses separate influencer authentication system
 */
export function withInfluencer(
  handler: (
    request: NextRequest,
    context: InfluencerAuthContext,
    routeContext: { params: Promise<Record<string, string>> }
  ) => Promise<NextResponse>
) {
  return async (request: NextRequest, routeContext: { params: Promise<Record<string, string>> }) => {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization');
      const token = extractTokenFromHeader(authHeader);

      if (!token) {
        throw new AuthenticationError(
          'Authorization token required',
          ERROR_CODES.UNAUTHORIZED
        );
      }

      // Verify influencer token
      const influencerContext = await influencerAuthService.verifyToken(token);

      if (!influencerContext) {
        throw new AuthenticationError(
          'Invalid or expired token',
          ERROR_CODES.TOKEN_INVALID
        );
      }

      // Call the actual handler with influencer context
      return await handler(request, influencerContext, routeContext);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Optional influencer authentication - doesn't fail if no token
 * Returns null if not authenticated
 */
export async function optionalInfluencerAuth(
  request: NextRequest
): Promise<InfluencerAuthContext | null> {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return null;
    }

    const influencerContext = await influencerAuthService.verifyToken(token);
    return influencerContext;
  } catch {
    return null;
  }
}
