/**
 * Client helpers for working with canonical receipt PDFs.
 *
 * These functions are intended for client components only.
 */

import { buildPublicApiUrl, fetchMerchantApi } from '@/lib/utils/orderApiClient';

export type ReceiptPrintFailureReason = 'popup_blocked' | 'fetch_failed';

export type ReceiptPrintResult =
  | { ok: true }
  | { ok: false; reason: ReceiptPrintFailureReason };

function printPdfBlobViaHiddenIframe(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const url = URL.createObjectURL(blob);

      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      // Keep it effectively invisible, but not 0x0 (some browsers/PDF plugins behave oddly).
      iframe.style.position = 'fixed';
      iframe.style.left = '-10000px';
      iframe.style.top = '0';
      iframe.style.width = '1px';
      iframe.style.height = '1px';
      iframe.style.border = '0';
      iframe.style.opacity = '0';
      iframe.style.pointerEvents = 'none';

      let settled = false;
      const settleOnce = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      const cleanup = () => {
        try {
          iframe.remove();
        } catch {
          // ignore
        }
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore
        }
      };

      // Fallback cleanup: do NOT aggressively remove the iframe.
      // Some browsers will cancel/close the PDF viewer if the frame disappears too soon.
      const fallbackCleanupTimeout = window.setTimeout(() => {
        settleOnce(() => {
          cleanup();
          resolve();
        });
      }, 60000);

      iframe.onload = () => {
        try {
          const win = iframe.contentWindow;
          if (!win) throw new Error('no_window');

          const finalize = () => {
            window.clearTimeout(fallbackCleanupTimeout);
            settleOnce(() => {
              cleanup();
              resolve();
            });
          };

          // Best-effort: cleanup after the print dialog completes.
          try {
            win.addEventListener('afterprint', finalize, { once: true });
          } catch {
            // ignore
          }

          // Another best-effort signal: matchMedia("print") flips while printing.
          try {
            const media = win.matchMedia?.('print');
            if (media) {
              const handler = (event: MediaQueryListEvent) => {
                if (!event.matches) finalize();
              };
              media.addEventListener?.('change', handler, { once: true });
            }
          } catch {
            // ignore
          }

          win.focus();
          win.print();

          // If we never get afterprint, the fallback timeout will clean up.
        } catch (err) {
          window.clearTimeout(fallbackCleanupTimeout);
          cleanup();
          reject(err);
        }
      };

      document.body.appendChild(iframe);
      iframe.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

export async function openMerchantOrderReceiptPdfAndPrint(orderId: string | number): Promise<ReceiptPrintResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'fetch_failed' };

  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return { ok: false, reason: 'fetch_failed' };

    // Route via the order API base to respect proxy configuration.
    const res = await fetchMerchantApi(`/api/merchant/orders/${encodeURIComponent(String(orderId))}/receipt`, {
      token,
    });

    if (!res.ok) return { ok: false, reason: 'fetch_failed' };

    const blob = await res.blob();

    // IMPORTANT: do not use window.open after an awaited fetch.
    // Many browsers will treat that as a non-user-initiated popup and block it.
    // Instead, print via a hidden iframe.
    await printPdfBlobViaHiddenIframe(blob);

    return { ok: true };
  } catch {
    return { ok: false, reason: 'fetch_failed' };
  }
}

export function triggerPublicOrderReceiptDownload(args: {
  orderNumber: string;
  token: string;
}): void {
  if (typeof window === 'undefined') return;

  const orderNumber = String(args.orderNumber || '').trim();
  const token = String(args.token || '').trim();
  if (!orderNumber || !token) return;

  const url = buildPublicApiUrl(
    `/api/public/orders/${encodeURIComponent(orderNumber)}/receipt?token=${encodeURIComponent(token)}&download=1`,
  );

  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
