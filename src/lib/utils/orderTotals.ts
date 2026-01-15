export type OrderTotalsRowKey =
  | 'subtotal'
  | 'tax'
  | 'serviceCharge'
  | 'packagingFee'
  | 'deliveryFee'
  | 'discount'
  | 'total';

export interface OrderTotalsAmounts {
  subtotal: number;
  taxAmount?: number | null;
  serviceChargeAmount?: number | null;
  packagingFeeAmount?: number | null;
  deliveryFeeAmount?: number | null;
  discountAmount?: number | null;
  totalAmount: number;
}

export interface OrderTotalsRow {
  key: OrderTotalsRowKey;
  amount: number;
  isDiscount?: boolean;
}

export interface BuildOrderTotalsRowsOptions {
  showSubtotal?: boolean;
  showTax?: boolean;
  showServiceCharge?: boolean;
  showPackagingFee?: boolean;
  showDeliveryFee?: boolean;
  showDiscount?: boolean;
  hideZero?: boolean;
}

function toNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function buildOrderTotalsRows(
  amounts: OrderTotalsAmounts,
  options: BuildOrderTotalsRowsOptions = {}
): OrderTotalsRow[] {
  const {
    showSubtotal = true,
    showTax = true,
    showServiceCharge = true,
    showPackagingFee = true,
    showDeliveryFee = true,
    showDiscount = true,
    hideZero = true,
  } = options;

  const rows: OrderTotalsRow[] = [];

  const subtotal = toNumber(amounts.subtotal);
  const taxAmount = toNumber(amounts.taxAmount ?? 0);
  const serviceChargeAmount = toNumber(amounts.serviceChargeAmount ?? 0);
  const packagingFeeAmount = toNumber(amounts.packagingFeeAmount ?? 0);
  const deliveryFeeAmount = toNumber(amounts.deliveryFeeAmount ?? 0);
  const discountAmount = toNumber(amounts.discountAmount ?? 0);
  const totalAmount = toNumber(amounts.totalAmount);

  if (showSubtotal) {
    rows.push({ key: 'subtotal', amount: subtotal });
  }

  if (showTax && (!hideZero || taxAmount > 0)) {
    rows.push({ key: 'tax', amount: taxAmount });
  }

  if (showServiceCharge && (!hideZero || serviceChargeAmount > 0)) {
    rows.push({ key: 'serviceCharge', amount: serviceChargeAmount });
  }

  if (showPackagingFee && (!hideZero || packagingFeeAmount > 0)) {
    rows.push({ key: 'packagingFee', amount: packagingFeeAmount });
  }

  if (showDeliveryFee && (!hideZero || deliveryFeeAmount > 0)) {
    rows.push({ key: 'deliveryFee', amount: deliveryFeeAmount });
  }

  if (showDiscount && (!hideZero || discountAmount > 0)) {
    rows.push({ key: 'discount', amount: discountAmount, isDiscount: true });
  }

  rows.push({ key: 'total', amount: totalAmount });

  // If hideZero is enabled, remove any optional rows that are actually 0.
  if (hideZero) {
    return rows.filter((r) => r.key === 'subtotal' || r.key === 'total' || r.amount > 0);
  }

  return rows;
}
