/**
 * Shared RouteContext utilities
 *
 * Next.js route handlers receive a `context` with `params`.
 * In this codebase we consistently model that as an async `params` object,
 * and normalize any non-string values into strings.
 */

export type RouteParams = Record<string, string>;

export type RouteParamErrorBody = {
  success: false;
  error: 'VALIDATION_ERROR';
  message: string;
  param: string;
};

export type RouteParamResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: 400; body: RouteParamErrorBody };

// Next.js route handler context params can be many shapes; we normalize it.
export type NextRouteContext = { params: Promise<unknown> };

// Normalized params used across middleware wrappers + route handlers.
export type RouteContext<TParams extends RouteParams = RouteParams> = {
  params: Promise<TParams>;
};

export type NormalizedRouteContext = RouteContext<RouteParams>;

export function normalizeRouteContext(routeContext: NextRouteContext): NormalizedRouteContext {
  return {
    params: (async () => {
      try {
        const rawParams = await routeContext.params;

        if (!rawParams || typeof rawParams !== 'object') {
          return {};
        }

        const normalized: Record<string, string> = {};
        for (const [key, value] of Object.entries(rawParams as Record<string, unknown>)) {
          if (typeof value === 'string') {
            normalized[key] = value;
            continue;
          }

          // Catch-all params in Next.js can be string[]; we normalize to a path-like string.
          if (Array.isArray(value)) {
            normalized[key] = value.map(v => String(v)).join('/');
            continue;
          }

          normalized[key] = String(value);
        }

        return normalized;
      } catch {
        return {};
      }
    })(),
  };
}

export async function getRouteParams(routeContext: NextRouteContext | RouteContext): Promise<RouteParams> {
  return await normalizeRouteContext(routeContext as NextRouteContext).params;
}

export async function getRouteParam(
  routeContext: NextRouteContext | RouteContext,
  key: string
): Promise<string | undefined> {
  const params = await getRouteParams(routeContext);
  const value = params[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function invalidRouteParam(param: string, message?: string): RouteParamResult<never> {
  return {
    ok: false,
    status: 400,
    body: {
      success: false,
      error: 'VALIDATION_ERROR',
      message: message ?? `Invalid ${param}`,
      param,
    },
  };
}

export async function requireRouteParam(
  routeContext: NextRouteContext | RouteContext,
  key: string,
  message?: string
): Promise<RouteParamResult<string>> {
  const value = await getRouteParam(routeContext, key);
  if (!value) return invalidRouteParam(key, message);
  return { ok: true, value };
}

export async function getIntRouteParam(
  routeContext: NextRouteContext | RouteContext,
  key: string
): Promise<number | null> {
  const value = await getRouteParam(routeContext, key);
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function requireIntRouteParam(
  routeContext: NextRouteContext | RouteContext,
  key: string,
  message?: string
): Promise<RouteParamResult<number>> {
  const value = await getRouteParam(routeContext, key);
  if (!value) return invalidRouteParam(key, message);

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return invalidRouteParam(key, message ?? `Invalid ${key}`);

  return { ok: true, value: parsed };
}

export async function getBigIntRouteParam(
  routeContext: NextRouteContext | RouteContext,
  key: string
): Promise<bigint | null> {
  const value = await getRouteParam(routeContext, key);
  if (!value) return null;

  // BigInt('') throws; we also want to reject non-decimal IDs early.
  if (!/^\d+$/.test(value)) return null;

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export async function requireBigIntRouteParam(
  routeContext: NextRouteContext | RouteContext,
  key: string,
  message?: string
): Promise<RouteParamResult<bigint>> {
  const value = await getRouteParam(routeContext, key);
  if (!value) return invalidRouteParam(key, message);
  if (!/^\d+$/.test(value)) return invalidRouteParam(key, message ?? `Invalid ${key}`);

  try {
    return { ok: true, value: BigInt(value) };
  } catch {
    return invalidRouteParam(key, message ?? `Invalid ${key}`);
  }
}
