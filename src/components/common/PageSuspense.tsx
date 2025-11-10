import { Suspense, ReactNode } from 'react';

/**
 * Page Suspense Wrapper
 * Wraps pages that use useSearchParams to avoid prerendering issues
 */
export function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mb-4 text-6xl">⏳</div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
