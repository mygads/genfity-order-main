/**
 * Server-side authentication utilities for dashboard pages
 */

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { redirect } from 'next/navigation';

export type UserRole = 'SUPER_ADMIN' | 'MERCHANT_OWNER' | 'MERCHANT_STAFF' | 'CUSTOMER';

export interface AuthUser {
  id: bigint;
  role: UserRole;
  merchantId?: bigint;
  sessionId: bigint;
}

/**
 * Get authenticated user from JWT token in cookies
 * Returns null if not authenticated
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const payload = jwt.verify(token, secret) as {
      userId: string;
      sessionId: string;
      role: string;
      email: string;
      merchantId?: string;
    };

    return {
      id: BigInt(payload.userId),
      role: payload.role as UserRole,
      merchantId: payload.merchantId ? BigInt(payload.merchantId) : undefined,
      sessionId: BigInt(payload.sessionId),
    };
  } catch {
    // Token verification failures are expected (expired, invalid, etc.)
    // No need to log - just return null
    return null;
  }
}

/**
 * Require authentication - redirect to signin if not authenticated
 */
export async function requireAuth(redirectTo?: string): Promise<AuthUser> {
  const user = await getAuthUser();

  if (!user) {
    const params = redirectTo
      ? `?redirect=${encodeURIComponent(redirectTo)}`
      : '';
    redirect(`/admin/login${params}`);
  }

  return user;
}

/**
 * Require specific role(s) - redirect to dashboard if not authorized
 */
export async function requireRole(
  allowedRoles: UserRole[],
  redirectTo?: string
): Promise<AuthUser> {
  const user = await requireAuth(redirectTo);

  if (!allowedRoles.includes(user.role)) {
    redirect('/dashboard?error=forbidden');
  }

  return user;
}

/**
 * Require super admin role
 */
export async function requireSuperAdmin(redirectTo?: string): Promise<AuthUser> {
  return requireRole(['SUPER_ADMIN'], redirectTo);
}

/**
 * Require merchant role (owner or staff)
 */
export async function requireMerchant(redirectTo?: string): Promise<AuthUser> {
  return requireRole(['MERCHANT_OWNER', 'MERCHANT_STAFF'], redirectTo);
}

/**
 * Require merchant owner role
 */
export async function requireMerchantOwner(
  redirectTo?: string
): Promise<AuthUser> {
  return requireRole(['MERCHANT_OWNER'], redirectTo);
}

/**
 * Check if user has permission to access merchant data
 */
export async function canAccessMerchant(
  merchantId: bigint
): Promise<boolean> {
  const user = await getAuthUser();

  if (!user) return false;

  // Super admin can access all merchants
  if (user.role === 'SUPER_ADMIN') return true;

  // Merchant users can only access their own merchant
  if (user.merchantId && user.merchantId === merchantId) return true;

  return false;
}
