/**
 * Driver Authentication Utilities
 * Mirrors adminAuth behavior but for DELIVERY role.
 */

export interface DriverUser {
  id: string;
  name: string;
  email: string;
  role: 'DELIVERY';
  merchantId?: string;
}

export interface DriverAuth {
  accessToken: string;
  refreshToken?: string;
  user: DriverUser;
  expiresAt: string;
}

const DRIVER_AUTH_KEY = 'genfity_driver_auth';
const DRIVER_COOKIE_NAME = 'driver_auth_token';

export function getDriverAuth(options?: { skipRedirect?: boolean }): DriverAuth | null {
  if (typeof window === 'undefined') return null;

  try {
    const data = localStorage.getItem(DRIVER_AUTH_KEY);
    if (!data) return null;

    const auth = JSON.parse(data) as DriverAuth;

    if (new Date(auth.expiresAt) < new Date()) {
      clearDriverAuth();

      if (!options?.skipRedirect && window.location.pathname.startsWith('/driver')) {
        window.location.href = '/driver/login?error=expired';
      }

      return null;
    }

    return auth;
  } catch {
    return null;
  }
}

export function saveDriverAuth(auth: DriverAuth): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(DRIVER_AUTH_KEY, JSON.stringify(auth));

    // Cookie for middleware + server-side checks
    const expiresIn = Math.floor((new Date(auth.expiresAt).getTime() - Date.now()) / 1000);
    document.cookie = `${DRIVER_COOKIE_NAME}=${auth.accessToken}; path=/driver; max-age=${expiresIn}; SameSite=Strict`;
  } catch {
    // ignore
  }
}

export function clearDriverAuth(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(DRIVER_AUTH_KEY);

    // Clear driver-only cookie (do NOT touch admin cookie)
    document.cookie = `${DRIVER_COOKIE_NAME}=; path=/driver; max-age=0`;
  } catch {
    // ignore
  }
}

export function getDriverToken(): string | null {
  const auth = getDriverAuth({ skipRedirect: true });
  return auth?.accessToken ?? null;
}

export function getDriverUser(): DriverUser | null {
  const auth = getDriverAuth({ skipRedirect: true });
  return auth?.user ?? null;
}
