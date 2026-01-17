/**
 * Client helpers for working with merchant receipt HTML (legacy print).
 *
 * Intended for client components only.
 */

export type ReceiptPrintFailureReason = 'popup_blocked' | 'fetch_failed';

export type ReceiptPrintResult =
  | { ok: true }
  | { ok: false; reason: ReceiptPrintFailureReason };

export async function openMerchantOrderReceiptHtmlAndPrint(orderId: string | number): Promise<ReceiptPrintResult> {
  if (typeof window === 'undefined') return { ok: false, reason: 'fetch_failed' };

  try {
    const token = localStorage.getItem('accessToken');
    if (!token) return { ok: false, reason: 'fetch_failed' };

    const res = await fetch(`/api/merchant/orders/${encodeURIComponent(String(orderId))}/receipt-html`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) return { ok: false, reason: 'fetch_failed' };

    const html = await res.text();

    // Print without navigating away: render into a hidden iframe and call print().
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    const cleanup = () => {
      try {
        iframe.remove();
      } catch {
        // ignore
      }
    };

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) return;
        win.focus();
        win.print();
      } catch {
        // ignore
      } finally {
        window.setTimeout(cleanup, 800);
      }
    };

    document.body.appendChild(iframe);
    iframe.srcdoc = html;

    // Fallback cleanup if onload never fires.
    window.setTimeout(cleanup, 5000);

    return { ok: true };
  } catch {
    return { ok: false, reason: 'fetch_failed' };
  }
}
