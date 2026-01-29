'use client';

import { useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getSafeInternalRef } from '@/lib/utils/safeRef';
import { customerMerchantHomeUrl, customerOrderUrl } from '@/lib/utils/customerRoutes';
import { getLastMerchantCodeClient } from '@/lib/utils/merchantContext';

type UseCustomerBackTargetOptions = {
  merchantCode?: string | null;
  mode?: string | null;
  ref?: string | null;

  /**
   * If provided, this overrides computed fallbacks (used when no safe ref).
   * Useful for pages like edit-profile that should return to profile.
   */
  fallback?: string;

  /**
   * When merchant exists, prefer sending user to `/merchant/[code]/order?mode=...` (if mode exists).
   * Useful for login guest flow.
   */
  preferOrderWhenMerchant?: boolean;

  /**
   * If the safe ref matches any of these substrings, it will be ignored.
   * Useful for preventing guest users from being redirected to protected pages.
   */
  blockedRefPatterns?: string[];

  /**
    * If no ref/merchant/fallback, use last merchant code from localStorage/cookie.
   */
  includeLastMerchantFallback?: boolean;

  /**
   * If there is no target, and browser history exists, use `router.back()`.
   */
  useBrowserBackWhenNoTarget?: boolean;

  /**
   * Final fallback when there is no merchant/ref/fallback.
   */
  fallbackWhenNoMerchant?: string;
};

export function useCustomerBackTarget(options: UseCustomerBackTargetOptions = {}) {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const merchantFromParams = (params as Record<string, string | string[] | undefined>)?.merchantCode;
  const merchantFromQuery = searchParams.get('merchant');
  const resolvedMerchantCode =
    options.merchantCode ??
    (typeof merchantFromParams === 'string' ? merchantFromParams : null) ??
    merchantFromQuery ??
    null;

  const resolvedMode = options.mode ?? searchParams.get('mode');
  const rawRef = options.ref ?? searchParams.get('ref');

  const safeRef = useMemo(() => {
    const initial = getSafeInternalRef(rawRef);
    if (!initial) return null;

    const blocked = options.blockedRefPatterns?.some((pattern) => initial.includes(pattern));
    return blocked ? null : initial;
  }, [rawRef, options.blockedRefPatterns]);

  const backHref = useMemo(() => {
    if (safeRef) return safeRef;

    if (options.fallback) return options.fallback;

    if (resolvedMerchantCode) {
      if (options.preferOrderWhenMerchant) {
        if (resolvedMode) return customerOrderUrl(resolvedMerchantCode, { mode: resolvedMode });
      }
      return customerMerchantHomeUrl(resolvedMerchantCode);
    }

    if (options.includeLastMerchantFallback) {
      const lastMerchant = getLastMerchantCodeClient();
      if (lastMerchant) return customerMerchantHomeUrl(lastMerchant);
    }

    return options.fallbackWhenNoMerchant ?? '/merchant';
  }, [
    safeRef,
    options.fallback,
    options.preferOrderWhenMerchant,
    options.includeLastMerchantFallback,
    options.fallbackWhenNoMerchant,
    resolvedMerchantCode,
    resolvedMode,
  ]);

  const pushBack = useCallback(() => {
    router.push(backHref);
  }, [router, backHref]);

  const goBack = useCallback(() => {
    const hasExplicitTarget = Boolean(safeRef) || Boolean(options.fallback) || Boolean(resolvedMerchantCode);

    if (!hasExplicitTarget && options.useBrowserBackWhenNoTarget) {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        router.back();
        return;
      }
    }

    router.push(backHref);
  }, [router, backHref, safeRef, options.fallback, options.useBrowserBackWhenNoTarget, resolvedMerchantCode]);

  return {
    merchantCode: resolvedMerchantCode,
    mode: resolvedMode,
    safeRef,
    backHref,
    pushBack,
    goBack,
  };
}
