'use client';

import type { ReactNode } from 'react';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';

export default function LandingLightMode({ children }: { children: ReactNode }) {
  const { theme, setTheme, isInitialized } = useTheme();
  const previousThemeRef = useRef<'light' | 'dark' | null>(null);
  const hasCapturedRef = useRef(false);
  const originalColorSchemeRef = useRef<string>('');

  useLayoutEffect(() => {
    const html = document.documentElement;
    originalColorSchemeRef.current = html.style.colorScheme;

    const enforceLight = () => {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
    };

    enforceLight();

    const observer = new MutationObserver(() => {
      if (html.classList.contains('dark') || html.style.colorScheme !== 'light') {
        enforceLight();
      }
    });

    observer.observe(html, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    return () => {
      observer.disconnect();
      html.style.colorScheme = originalColorSchemeRef.current;
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    if (!hasCapturedRef.current) {
      previousThemeRef.current = theme;
      hasCapturedRef.current = true;
    }

    if (theme !== 'light') setTheme('light');
  }, [isInitialized, setTheme, theme]);

  useEffect(() => {
    return () => {
      const previousTheme = previousThemeRef.current;
      if (previousTheme && isInitialized) setTheme(previousTheme);
    };
  }, [isInitialized, setTheme]);

  return children;
}
