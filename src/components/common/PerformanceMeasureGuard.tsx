'use client';

import { useEffect } from 'react';

/**
 * Guards against rare runtime errors from `performance.measure` throwing
 * "cannot have a negative time stamp" (seen in some browser/Next dev setups).
 *
 * This is a defensive client-side shim: it preserves behavior when possible,
 * and ignores only the specific negative-timestamp error.
 */
export default function PerformanceMeasureGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof performance === 'undefined') return;
    if (typeof performance.measure !== 'function') return;

    const originalMeasure = performance.measure.bind(performance);

    const wrappedMeasure: typeof performance.measure = ((
      name: string,
      startOrOptions?: string | PerformanceMeasureOptions,
      endMark?: string
    ) => {
      try {
        return originalMeasure(name, startOrOptions as any, endMark as any);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.toLowerCase().includes('negative time stamp')) {
          throw error;
        }

        // Best-effort sanitize when measureOptions is used.
        if (startOrOptions && typeof startOrOptions === 'object') {
          const anyOptions = startOrOptions as any;
          const start = typeof anyOptions.start === 'number' ? anyOptions.start : undefined;
          const end = typeof anyOptions.end === 'number' ? anyOptions.end : undefined;

          if (typeof start === 'number' && typeof end === 'number' && end < start) {
            try {
              // Clamp end to start (duration 0) to avoid negative timestamps.
              return originalMeasure(name, { ...anyOptions, end: start });
            } catch {
              // Fall through to ignore
            }
          }
        }

        // Ignore this specific error; it is non-fatal and should not block navigation.
        return undefined as any;
      }
    }) as any;

    // Patch
    performance.measure = wrappedMeasure;

    return () => {
      // Restore
      performance.measure = originalMeasure as any;
    };
  }, []);

  return null;
}
