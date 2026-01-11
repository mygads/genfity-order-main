/**
 * PaymentVerificationModal Component
 * 
 * Modal to verify orderNumber and display order details before recording payment
 * Shows customer info, items, total amount, and payment recording form
 */

'use client';

import React, { useState } from 'react';
import { OrderNumberDisplay } from './OrderNumberDisplay';
import { PaymentRecordForm, type PaymentFormData } from './PaymentRecordForm';
import { printReceipt } from '@/lib/utils/unifiedReceipt';
import type { OrderWithDetails } from '@/lib/types/order';
import { DEFAULT_RECEIPT_SETTINGS, type ReceiptSettings } from '@/lib/types/receiptSettings';

interface PaymentVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (orderNumber: string) => Promise<void>;
  onRecordPayment: (data: PaymentFormData) => Promise<void>;
  verifiedOrder: OrderWithDetails | null;
  isLoading?: boolean;
  merchantInfo?: {
    name: string;
    code?: string;
    address?: string;
    phone?: string;
    currency: string;
  };

  receiptSettings?: Partial<ReceiptSettings> | null;
}

export const PaymentVerificationModal: React.FC<PaymentVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerify,
  onRecordPayment,
  verifiedOrder,
  isLoading = false,
  merchantInfo = {
    name: 'GENFITY',
    currency: 'AUD',
  },
  receiptSettings = null,
}) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [step, setStep] = useState<'input' | 'verify' | 'payment'>('input');
  const [isRecording, setIsRecording] = useState(false);

  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    // Special handling for AUD to show A$ prefix
    if (merchantInfo.currency === 'AUD') {
      return `A$${amount.toFixed(2)}`;
    }
    
    // Special handling for IDR - no decimals
    if (merchantInfo.currency === 'IDR') {
      const formatted = new Intl.NumberFormat('id-ID', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Math.round(amount));
      return `Rp ${formatted}`;
    }
    
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: merchantInfo.currency,
    }).format(amount);
  };

  const handleVerify = async () => {
    if (!orderNumber.trim()) return;
    
    await onVerify(orderNumber.trim());
    setStep('verify');
  };

  const handleRecordPayment = async (data: PaymentFormData) => {
    setIsRecording(true);
    try {
      await onRecordPayment(data);
      
      // Print receipt after successful payment
      if (verifiedOrder) {
        const rawSettings = (receiptSettings || {}) as Partial<ReceiptSettings>;
        const inferredLanguage: 'en' | 'id' = merchantInfo.currency === 'IDR' ? 'id' : 'en';
        const language: 'en' | 'id' =
          rawSettings.receiptLanguage === 'id' || rawSettings.receiptLanguage === 'en'
            ? rawSettings.receiptLanguage
            : inferredLanguage;

        const settings: ReceiptSettings = {
          ...DEFAULT_RECEIPT_SETTINGS,
          ...rawSettings,
          receiptLanguage: language,
          paperSize: rawSettings.paperSize === '58mm' ? '58mm' : '80mm',
        };

        printReceipt({
          order: {
            orderNumber: (verifiedOrder as any).orderNumber,
            orderType: (verifiedOrder as any).orderType,
            tableNumber: (verifiedOrder as any).tableNumber,
            customerName: (verifiedOrder as any).customerName,
            customerPhone: (verifiedOrder as any).customerPhone,
            placedAt: ((verifiedOrder as any).placedAt || (verifiedOrder as any).createdAt || new Date().toISOString()) as string,
            items: ((verifiedOrder as any).orderItems || []).map((item: any) => ({
              quantity: item.quantity,
              menuName: item.menuName,
              unitPrice: item.unitPrice,
              subtotal: Number(item.subtotal) || 0,
              notes: item.notes,
              addons: (item.addons || []).map((addon: any) => ({
                addonName: addon.addonName,
                addonPrice: Number(addon.addonPrice) || 0,
              })),
            })),
            subtotal: Number((verifiedOrder as any).subtotal) || 0,
            taxAmount: Number((verifiedOrder as any).taxAmount) || 0,
            serviceChargeAmount: Number((verifiedOrder as any).serviceChargeAmount) || 0,
            packagingFeeAmount: Number((verifiedOrder as any).packagingFeeAmount) || 0,
            discountAmount: Number((verifiedOrder as any).discountAmount) || 0,
            totalAmount: Number((verifiedOrder as any).totalAmount) || 0,
            amountPaid: data.amount,
            changeAmount: 0,
            paymentMethod: data.paymentMethod,
            paymentStatus: 'COMPLETED',
            cashierName: undefined,
          },
          merchant: {
            name: merchantInfo.name,
            code: merchantInfo.code,
            address: merchantInfo.address,
            phone: merchantInfo.phone,
            currency: merchantInfo.currency,
          },
          settings,
          language,
        });
      }
      
      // Close modal and reset
      handleClose();
    } catch (error) {
      console.error('Payment recording failed:', error);
    } finally {
      setIsRecording(false);
    }
  };

  const handleClose = () => {
    setOrderNumber('');
    setStep('input');
    onClose();
  };

  // Check if order already paid
  const isAlreadyPaid =
    verifiedOrder?.payment?.status === 'COMPLETED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              💰 Payment Processing
            </h2>
            <button
              onClick={handleClose}
              className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Input Order Number */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="orderNumber"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Enter Order Number
                </label>
                <div className="flex gap-3">
                  <input
                    id="orderNumber"
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    placeholder="ORD-001234"
                    className="
                      flex-1 h-14 px-4 rounded-lg
                      border-2 border-gray-200 dark:border-gray-800
                      bg-white dark:bg-gray-900
                      text-gray-900 dark:text-white
                      text-xl font-mono font-semibold
                      focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                      uppercase
                    "
                    autoFocus
                  />
                  <button
                    onClick={handleVerify}
                    disabled={!orderNumber.trim() || isLoading}
                    className="
                      h-14 px-8 rounded-lg
                      bg-brand-500 hover:bg-brand-600
                      text-white font-medium
                      transition-colors duration-150
                      disabled:opacity-50 disabled:cursor-not-allowed
                      flex items-center gap-2
                    "
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        <span>Verify</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Scan QR code or enter order number manually
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Order Verification */}
          {step === 'verify' && verifiedOrder && (
            <div className="space-y-6">
              {/* Order Number Display */}
              <OrderNumberDisplay
                orderNumber={verifiedOrder.orderNumber}
                showQRCode={false}
                size="md"
              />

              {/* Payment Status */}
              {isAlreadyPaid ? (
                <div className="bg-success-50 dark:bg-success-900/20 border-2 border-success-200 dark:border-success-800 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">✓</span>
                    <div>
                      <p className="font-bold text-success-700 dark:text-success-400">
                        Payment Already Completed
                      </p>
                      <p className="text-sm text-success-600 dark:text-success-500">
                        This order has been paid on{' '}
                        {new Date(verifiedOrder.payment!.paidAt!).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Customer Info */}
              {verifiedOrder.customer && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                    Customer Information
                  </h3>
                  <div className="space-y-2">
                    <p className="text-gray-900 dark:text-white font-medium">
                      👤 {verifiedOrder.customer.name || 'Guest'}
                    </p>
                    {verifiedOrder.customer.phone && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        📞 {verifiedOrder.customer.phone}
                      </p>
                    )}
                    {verifiedOrder.customer.email && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        📧 {verifiedOrder.customer.email}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                  Order Items
                </h3>
                <div className="space-y-3">
                  {verifiedOrder.orderItems?.map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.quantity}x {item.menuName}
                        </p>
                        {item.addons && item.addons.length > 0 && (
                          <div className="ml-4 mt-1 space-y-0.5">
                            {item.addons.map((addon, addonIdx) => (
                              <p
                                key={addonIdx}
                                className="text-sm text-gray-600 dark:text-gray-400"
                              >
                                + {addon.addonName} {addon.quantity > 1 && `(${addon.quantity}x)`}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(Number(item.subtotal))}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(Number(verifiedOrder.subtotal))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Tax:</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(Number(verifiedOrder.taxAmount))}
                    </span>
                  </div>
                  <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-200 dark:border-gray-800">
                    <span className="text-gray-900 dark:text-white">TOTAL:</span>
                    <span className="text-brand-600 dark:text-brand-400">
                      {formatCurrency(Number(verifiedOrder.totalAmount))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              {!isAlreadyPaid && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                    Record Payment
                  </h3>
                  <PaymentRecordForm
                    orderNumber={verifiedOrder.orderNumber}
                    totalAmount={Number(verifiedOrder.totalAmount)}
                    currency={merchantInfo.currency}
                    onSubmit={handleRecordPayment}
                    onCancel={handleClose}
                    isLoading={isRecording}
                  />
                </div>
              )}

              {/* Back Button (if already paid) */}
              {isAlreadyPaid && (
                <button
                  onClick={handleClose}
                  className="
                    w-full h-12 px-6 rounded-lg
                    border border-gray-200 dark:border-gray-800
                    bg-white dark:bg-gray-900
                    text-gray-800 dark:text-white
                    font-medium
                    hover:bg-gray-50 dark:hover:bg-gray-800
                    transition-colors duration-150
                  "
                >
                  Close
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
