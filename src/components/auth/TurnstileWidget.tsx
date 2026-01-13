'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset?: (widgetId: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  siteKey: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
  className?: string;
};

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    if (window.turnstile) {
      resolve();
      return;
    }

    const existing = document.querySelector(
      'script[data-cf-turnstile="true"]'
    ) as HTMLScriptElement | null;

    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.dataset.cfTurnstile = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile script failed to load'));

    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export function TurnstileWidget({
  siteKey,
  onVerify,
  onExpire,
  onError,
  theme = 'auto',
  size = 'normal',
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  const options = useMemo(
    () => ({
      sitekey: siteKey,
      callback: (token: string) => onVerify(token),
      'expired-callback': () => onExpire?.(),
      'error-callback': () => onError?.(),
      theme,
      size,
    }),
    [onError, onExpire, onVerify, siteKey, size, theme]
  );

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;

      try {
        await loadTurnstileScript();
        if (cancelled) return;
        if (!window.turnstile) return;

        // Avoid double-render
        if (widgetIdRef.current) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, options);
        setReady(true);
      } catch {
        onError?.();
      }
    }

    init();

    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      setReady(false);
      if (widgetId && window.turnstile?.remove) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [onError, options]);

  return (
    <div className={className}>
      <div ref={containerRef} />
      {!ready && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Loading verification...
        </div>
      )}
    </div>
  );
}
