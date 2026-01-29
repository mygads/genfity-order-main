import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Proxy for route protection and authentication
 * 
 * Protects:
 * - /admin/* routes: Require SUPER_ADMIN | MERCHANT_OWNER | MERCHANT_STAFF
 * - Redirects unauthenticated users to /admin/login
 * - Blocks CUSTOMER role from accessing admin dashboard
 * 
 * Public Routes (no auth required):
 * - /admin/login
 * - /admin/forgot-password
 * - /admin/reset-password
 * 
 * Note: JWT verification is done in API routes and server components
 * This proxy only checks for token presence and redirects accordingly
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const setLastMerchantCookie = (response: NextResponse, merchantCode: string) => {
    try {
      response.cookies.set('last_merchant_code', merchantCode, {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    } catch {
      // Ignore cookie failures
    }
    return response;
  };

  // Skip middleware for public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    // Allow public auth pages
    if (
      pathname === '/admin/login' ||
      pathname === '/admin/forgot-password' ||
      pathname === '/admin/reset-password' ||
      pathname === '/admin/register'
    ) {
      // If already logged in, redirect to dashboard (except forgot/reset password)
      const token = request.cookies.get('auth_token')?.value;
      if (token && pathname === '/admin/login') {
        const url = request.nextUrl.clone();
        url.pathname = '/admin/dashboard';
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Check authentication for all other admin routes
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      // Redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Token exists - allow access
    // Full JWT verification and role checking will be done in server components
    return NextResponse.next();
  }

  // Driver routes protection
  if (pathname.startsWith('/driver')) {
    // Allow public driver auth pages
    if (
      pathname === '/driver/login' ||
      pathname === '/driver/forgot-password' ||
      pathname === '/driver/reset-password'
    ) {
      // If already logged in, redirect to driver dashboard
      const token = request.cookies.get('driver_auth_token')?.value;
      if (token && pathname === '/driver/login') {
        const url = request.nextUrl.clone();
        url.pathname = '/driver/dashboard';
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Check authentication for all other driver routes
    const token = request.cookies.get('driver_auth_token')?.value;

    if (!token) {
      const url = request.nextUrl.clone();
      url.pathname = '/driver/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // ========================================
  // Legacy Customer Route Redirects
  // Redirect /login, /profile etc to /customer/...
  // ========================================
  const legacyCustomerRoutes = ['/login', '/profile', '/history', '/forgot-password', '/reset-password', '/verify-code'];
  if (legacyCustomerRoutes.includes(pathname)) {
    const lastMerchant = request.cookies.get('last_merchant_code')?.value;

    // Prefer merchant-scoped pages when we have context.
    if (lastMerchant && (pathname === '/profile' || pathname === '/history')) {
      const url = request.nextUrl.clone();
      url.pathname = `/merchant/${lastMerchant}${pathname}`;
      return NextResponse.redirect(url);
    }

    const url = request.nextUrl.clone();
    url.pathname = `/customer${pathname}`;
    return NextResponse.redirect(url);
  }

  // ========================================
  // Case-insensitive merchant code handling
  // Redirects lowercase merchant codes to uppercase
  // Example: /merchant/well/order → /merchant/WELL/order
  // ========================================

  if (pathname.startsWith('/merchant/')) {
    const segments = pathname.split('/').filter(Boolean);
    // segments[0] is 'merchant'
    if (segments.length >= 2) {
      const merchantCode = segments[1];
      const linkSegment = 'merchant';

      // Skip if it's the register page or other static pages under /merchant if any
      if (merchantCode.toLowerCase() === 'register') {
        return NextResponse.next();
      }

      const uppercaseMerchantCode = merchantCode.toUpperCase();

      // If merchant code contains lowercase letters, redirect to uppercase version
      if (merchantCode !== uppercaseMerchantCode) {
        // Reconstruct path: /merchant/CODE/...
        const restOfPath = segments.slice(2).join('/');
        const newPathname = `/${linkSegment}/${uppercaseMerchantCode}${restOfPath ? '/' + restOfPath : ''}${request.nextUrl.search}`;
        
        const url = request.nextUrl.clone();
        url.href = url.origin + newPathname;

        // 301 = permanent redirect for SEO
        return NextResponse.redirect(url, { status: 301 });
      }

      // Merchant code looks good - remember it for later /profile, /history, etc.
      const res = NextResponse.next();
      return setLastMerchantCookie(res, uppercaseMerchantCode);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
