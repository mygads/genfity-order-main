'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils/format';
import {
  buildOrderTotalsRows,
  type BuildOrderTotalsRowsOptions,
  type OrderTotalsAmounts,
  type OrderTotalsRowKey,
} from '@/lib/utils/orderTotals';

export type OrderTotalsLabels = Partial<Record<OrderTotalsRowKey, string>>;

export interface OrderTotalsBreakdownProps {
  amounts: OrderTotalsAmounts;
  currency: string;
  locale?: string;
  labels?: OrderTotalsLabels;
  options?: BuildOrderTotalsRowsOptions;
  formatAmount?: (amount: number) => string;

  showTotalRow?: boolean;

  className?: string;
  rowsContainerClassName?: string;
  rowClassName?: string;
  labelClassName?: string;
  valueClassName?: string;

  discountValueClassName?: string;
  totalRowClassName?: string;
  totalLabelClassName?: string;
  totalValueClassName?: string;
}

const DEFAULT_LABELS_EN: Record<OrderTotalsRowKey, string> = {
  subtotal: 'Subtotal',
  tax: 'Tax',
  serviceCharge: 'Service Charge',
  packagingFee: 'Packaging Fee',
  deliveryFee: 'Delivery Fee',
  discount: 'Discount',
  total: 'Total',
};

const DEFAULT_LABELS_ID: Record<OrderTotalsRowKey, string> = {
  subtotal: 'Subtotal',
  tax: 'Pajak',
  serviceCharge: 'Biaya Layanan',
  packagingFee: 'Biaya Kemasan',
  deliveryFee: 'Biaya Pengantaran',
  discount: 'Diskon',
  total: 'Total',
};

function pickDefaultLabels(locale?: string): Record<OrderTotalsRowKey, string> {
  const normalized = String(locale || '').toLowerCase();
  return normalized.startsWith('id') ? DEFAULT_LABELS_ID : DEFAULT_LABELS_EN;
}

export function OrderTotalsBreakdown(props: OrderTotalsBreakdownProps) {
  const {
    amounts,
    currency,
    locale,
    labels,
    options,
    formatAmount,
    showTotalRow = true,
    className,
    rowsContainerClassName = 'space-y-2 text-sm',
    rowClassName = 'flex justify-between',
    labelClassName = 'text-gray-600',
    valueClassName = 'text-gray-600',
    discountValueClassName = 'font-semibold text-green-600',
    totalRowClassName = 'border-t border-gray-200 pt-2 mt-2 flex justify-between',
    totalLabelClassName = 'font-bold text-gray-900',
    totalValueClassName = 'font-bold text-orange-500',
  } = props;

  const baseLabels = pickDefaultLabels(locale);
  const resolvedLabels: Record<OrderTotalsRowKey, string> = {
    ...baseLabels,
    ...(labels || {}),
  };

  const fmt = (amount: number) => {
    if (formatAmount) return formatAmount(amount);
    return formatCurrency(amount, currency, locale === 'id' ? 'id' : 'en');
  };

  const rows = buildOrderTotalsRows(amounts, options);
  const totalRow = rows.find((r) => r.key === 'total');
  const nonTotalRows = rows.filter((r) => r.key !== 'total');

  return (
    <div className={className}>
      <div className={rowsContainerClassName}>
        {nonTotalRows.map((row) => {
          const label = resolvedLabels[row.key];
          const amountText = row.isDiscount ? `-${fmt(row.amount)}` : fmt(row.amount);

          return (
            <div key={row.key} className={rowClassName}>
              <span className={labelClassName}>{label}</span>
              <span className={row.isDiscount ? discountValueClassName : valueClassName}>{amountText}</span>
            </div>
          );
        })}

        {showTotalRow && totalRow ? (
          <div className={totalRowClassName}>
            <span className={totalLabelClassName}>{resolvedLabels.total}</span>
            <span className={totalValueClassName}>{fmt(totalRow.amount)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default OrderTotalsBreakdown;
