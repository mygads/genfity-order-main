import type { OrderType, PaymentStatus } from '@prisma/client';

export type PaymentDisplayInput = {
  orderType?: OrderType | string | null;
  paymentStatus?: PaymentStatus | string | null;
  paymentMethod?: string | null;
};

export type PaymentDisplayOptions = {
  t?: (key: string, params?: Record<string, string | number>) => string;
};

function isPaid(status: PaymentDisplayInput['paymentStatus']): boolean {
  return String(status || '').toUpperCase() === 'COMPLETED';
}

function tr(
  t: PaymentDisplayOptions['t'],
  key: string,
  fallback: string,
  params?: Record<string, string | number>
): string {
  if (!t) return fallback;
  const translated = t(key, params);
  return translated === key ? fallback : translated;
}

/**
 * User-facing payment method label.
 *
 * Rules:
 * - For dine-in/takeaway: if not paid yet, show "Pay at cashier".
 * - If paid: show the recorded method as "Cash at cashier" / "Card at cashier".
 * - For delivery: keep "Cash on delivery" semantics.
 */
export function formatPaymentMethodLabel(
  input: PaymentDisplayInput,
  options: PaymentDisplayOptions = {}
): string {
  const method = String(input.paymentMethod || '').toUpperCase();
  const type = String(input.orderType || '').toUpperCase();
  const paid = isPaid(input.paymentStatus);

  if (type === 'DELIVERY') {
    if (method === 'CASH_ON_DELIVERY') {
      return tr(options.t, 'payment.display.cashOnDelivery', 'Cash on delivery');
    }
    if (method === 'CARD_ON_DELIVERY') {
      return tr(options.t, 'payment.display.cardOnDelivery', 'Card on delivery');
    }
    return input.paymentMethod ? String(input.paymentMethod).replace(/_/g, ' ') : '—';
  }

  // DINE_IN / TAKEAWAY
  if (!paid) {
    return tr(options.t, 'payment.display.payAtCashier', 'Pay at cashier');
  }

  if (method === 'CASH_ON_COUNTER') {
    return tr(options.t, 'payment.display.cashAtCashier', 'Cash at cashier');
  }
  if (method === 'CARD_ON_COUNTER') {
    return tr(options.t, 'payment.display.cardAtCashier', 'Card at cashier');
  }

  return input.paymentMethod ? String(input.paymentMethod).replace(/_/g, ' ') : '—';
}

export function formatPaymentStatusLabel(
  status: PaymentDisplayInput['paymentStatus'],
  options: PaymentDisplayOptions = {}
): string {
  const s = String(status || '').toUpperCase();
  if (!s) return '—';
  if (s === 'PENDING') return tr(options.t, 'admin.payment.unpaid', 'Unpaid');
  if (s === 'COMPLETED') return tr(options.t, 'admin.payment.paid', 'Paid');
  if (s === 'FAILED') return tr(options.t, 'admin.payment.failed', 'Failed');
  if (s === 'REFUNDED') return tr(options.t, 'admin.payment.refunded', 'Refunded');
  if (s === 'CANCELLED') return tr(options.t, 'admin.payment.cancelled', 'Cancelled');
  return String(status);
}
