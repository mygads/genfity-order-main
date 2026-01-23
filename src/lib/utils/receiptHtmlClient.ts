/**
 * Client helpers for working with merchant receipt HTML (legacy print).
 *
 * Intended for client components only.
 */

import { openMerchantOrderReceiptPdfAndPrint, type ReceiptPrintResult } from '@/lib/utils/receiptPdfClient';

export type { ReceiptPrintFailureReason, ReceiptPrintResult } from '@/lib/utils/receiptPdfClient';

export async function openMerchantOrderReceiptHtmlAndPrint(orderId: string | number): Promise<ReceiptPrintResult> {
  // NOTE: despite the name, we print the canonical PDF receipt.
  // Rationale:
  // - HTML receipt diverged in layout/sections and caused missing logo/details.
  // - window.open after async fetch often triggers popup blockers.
  // - PDF endpoint is the canonical representation used by customer download.
  return openMerchantOrderReceiptPdfAndPrint(orderId);
}
