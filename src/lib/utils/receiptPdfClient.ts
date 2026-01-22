/**
 * Client helpers for working with canonical receipt PDFs.
 *
 * These functions are intended for client components only.
 */

import { buildOrderApiUrl } from '@/lib/utils/orderApiBase';

export type ReceiptPrintFailureReason = 'popup_blocked' | 'fetch_failed';

export type ReceiptPrintResult =
  | { ok: true }
  | { ok: false; reason: ReceiptPrintFailureReason };

export async function openMerchantOrderReceiptPdfAndPrint(orderId: string | number): Promise<ReceiptPrintResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'fetch_failed' };

  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return { ok: false, reason: 'fetch_failed' };

    const res = await fetch(buildOrderApiUrl(`/api/merchant/orders/${encodeURIComponent(String(orderId))}/receipt`), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return { ok: false, reason: 'fetch_failed' };

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const win = window.open(url, '_blank');
    if (!win) {
      URL.revokeObjectURL(url);
      return { ok: false, reason: 'popup_blocked' };
    }

    win.onload = () => {
      try {
        win.focus();
        win.print();
      } catch {
        // ignore
      }

      // Give the print dialog a moment, then cleanup.
      window.setTimeout(() => {
        try {
          win.close();
        } catch {
          // ignore
        }
        URL.revokeObjectURL(url);
      }, 500);
    };

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

  const url = `/api/public/orders/${encodeURIComponent(orderNumber)}/receipt?token=${encodeURIComponent(token)}&download=1`;

  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
