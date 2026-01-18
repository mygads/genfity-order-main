'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getAllBackoffStates, setBackoffMetricsHook } from '@/lib/utils/backoff';

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH_SIZE = 25;

function BackoffDebugPanel() {
  const [open, setOpen] = useState(false);
  const [states, setStates] = useState(getAllBackoffStates());

  useEffect(() => {
    if (!open) return;

    const tick = () => setStates(getAllBackoffStates());
    tick();

    const interval = window.setInterval(tick, 2000);
    return () => window.clearInterval(interval);
  }, [open]);

  if (process.env.NODE_ENV === 'production') return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 shadow-md hover:bg-gray-50"
      >
        Backoff
      </button>

      {open ? (
        <div className="mt-2 w-80 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold">Backoff State</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              Close
            </button>
          </div>

          {states.length === 0 ? (
            <div className="text-gray-500">No backoff entries.</div>
          ) : (
            <div className="space-y-2">
              {states.map((state) => {
                const remainingMs = Math.max(0, state.nextAllowedAt - Date.now());
                return (
                  <div key={state.key} className="rounded border border-gray-100 bg-gray-50 p-2">
                    <div className="font-medium text-gray-700">{state.key}</div>
                    <div className="text-gray-500">Failures: {state.failureCount}</div>
                    <div className="text-gray-500">Next in: {Math.ceil(remainingMs / 1000)}s</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function BackoffClientTools() {
  const queueRef = useRef<any[]>([]);
  const timerRef = useRef<number | null>(null);
  const [enabled] = useState(() => {
    if (process.env.NODE_ENV !== 'production') return true;
    return process.env.NEXT_PUBLIC_ENABLE_BACKOFF_METRICS === 'true';
  });

  const flush = useMemo(
    () => () => {
      if (!enabled) return;
      if (queueRef.current.length === 0) return;

      const payload = {
        events: queueRef.current.splice(0, MAX_BATCH_SIZE),
        timestamp: new Date().toISOString(),
      };

      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon('/api/metrics/backoff', blob);
      } else {
        fetch('/api/metrics/backoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {
          // ignore
        });
      }
    },
    [enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    setBackoffMetricsHook((event) => {
      queueRef.current.push(event);

      if (queueRef.current.length >= MAX_BATCH_SIZE) {
        flush();
        return;
      }

      if (timerRef.current) return;
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        flush();
      }, FLUSH_INTERVAL_MS);
    });

    return () => {
      setBackoffMetricsHook(null);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [enabled, flush]);

  return <BackoffDebugPanel />;
}
