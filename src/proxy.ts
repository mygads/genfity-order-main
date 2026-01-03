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
      pathname === '/admin/reset-password'
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
