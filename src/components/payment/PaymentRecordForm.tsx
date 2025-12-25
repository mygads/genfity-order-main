/**
 * PaymentRecordForm Component
 * 
 * Form to record payment for an order
 * Features: Payment method selection, amount input, notes
 */

'use client';

import React, { useState } from 'react';


export type PaymentMethod =
  | 'CASH_ON_COUNTER'
  | 'CARD_ON_COUNTER'
  | 'BANK_TRANSFER'
  | 'E_WALLET'
  | 'QRIS'
  | 'CREDIT_CARD';

interface PaymentRecordFormProps {
  orderNumber: string;
  totalAmount: number;
  currency?: string;
  onSubmit: (data: PaymentFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

export interface PaymentFormData {
  paymentMethod: PaymentMethod;
  amount: number;
  notes?: string;
}

const PAYMENT_METHOD_OPTIONS: Array<{
  value: PaymentMethod;
  label: string;
  icon: string;
  description: string;
}> = [
    {
      value: 'CASH_ON_COUNTER',
      label: 'Cash',
      icon: '💵',
      description: 'Pay with cash at counter',
    },
    {
      value: 'CARD_ON_COUNTER',
      label: 'Card',
      icon: '💳',
      description: 'Pay with debit/credit card',
    },
    {
      value: 'BANK_TRANSFER',
      label: 'Bank Transfer',
      icon: '🏦',
      description: 'Bank transfer (future)',
    },
    {
      value: 'E_WALLET',
      label: 'E-Wallet',
      icon: '📱',
      description: 'GoPay, OVO, etc (future)',
    },
    {
      value: 'QRIS',
      label: 'QRIS',
      icon: '🔲',
      description: 'QRIS payment (future)',
    },
  ];

export const PaymentRecordForm: React.FC<PaymentRecordFormProps> = ({
  orderNumber,
  totalAmount,
  currency = 'AUD',
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<PaymentFormData>({
    paymentMethod: 'CASH_ON_COUNTER',
    amount: totalAmount,
    notes: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof PaymentFormData, string>>>({});

  const formatCurrency = (amount: number) => {
    // Special handling for AUD to show A$ prefix
    if (currency === 'AUD') {
      return `A$${amount.toFixed(2)}`;
    }
    
    // Special handling for IDR - no decimals
    if (currency === 'IDR') {
      const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(amount));
      return `Rp ${formatted}`;
    }
    
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PaymentFormData, string>> = {};

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (formData.amount < totalAmount) {
      newErrors.amount = `Amount cannot be less than ${formatCurrency(totalAmount)}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Number Display */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
          Order Number
        </p>
        <p className="text-2xl font-black text-gray-900 dark:text-white font-mono">
          {orderNumber}
        </p>
      </div>

      {/* Payment Method Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Payment Method
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PAYMENT_METHOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, paymentMethod: option.value }))
              }
              disabled={option.value !== 'CASH_ON_COUNTER' && option.value !== 'CARD_ON_COUNTER'}
              className={`
                relative p-4 rounded-lg border-2 text-left transition-all duration-150
                ${formData.paymentMethod === option.value
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                }
                ${option.value !== 'CASH_ON_COUNTER' && option.value !== 'CARD_ON_COUNTER'
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{option.icon}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {option.description}
                  </p>
                </div>
                {formData.paymentMethod === option.value && (
                  <span className="text-brand-500 text-xl">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Amount Input */}
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Amount
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
            {currency}
          </span>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))
            }
            className={`
              w-full h-12 pl-16 pr-4 rounded-lg
              border-2 ${errors.amount ? 'border-error-300' : 'border-gray-200 dark:border-gray-800'}
              bg-white dark:bg-gray-900
              text-gray-900 dark:text-white
              text-lg font-semibold
              focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
            `}
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-sm text-error-600 dark:text-error-400">
            {errors.amount}
          </p>
        )}
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Order total: <span className="font-semibold">{formatCurrency(totalAmount)}</span>
        </p>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
        >
          Notes (Optional)
        </label>
        <textarea
          id="notes"
          rows={3}
          value={formData.notes}
          onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
          placeholder="Add payment notes..."
          className="
            w-full px-4 py-3 rounded-lg
            border-2 border-gray-200 dark:border-gray-800
            bg-white dark:bg-gray-900
            text-gray-900 dark:text-white
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
            resize-none
          "
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="
              flex-1 h-12 px-6 rounded-lg
              border border-gray-200 dark:border-gray-800
              bg-white dark:bg-gray-900
              text-gray-800 dark:text-white
              font-medium
              hover:bg-gray-50 dark:hover:bg-gray-800
              transition-colors duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="
            flex-1 h-12 px-6 rounded-lg
            bg-success-500 hover:bg-success-600
            text-white font-medium
            transition-colors duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            flex items-center justify-center gap-2
          "
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Recording...</span>
            </>
          ) : (
            <>
              <span>✓</span>
              <span>Record Payment</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};
