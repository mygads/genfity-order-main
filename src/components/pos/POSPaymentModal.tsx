/**
 * POS Payment Modal Component
 * 
 * Modal for recording payment after order creation
 * - Payment method selection (Cash, Card, Split)
 * - Split payment support (partial cash + partial card)
 * - Discount input (percentage or fixed amount)
 * - Amount input with change calculation
 * - Quick cash buttons
 * - Print receipt functionality
 * - Orange theme consistent with POS
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FaTimes,
  FaMoneyBillWave,
  FaCreditCard,
  FaCheck,
  FaReceipt,
  FaPrint,
  FaToggleOn,
  FaToggleOff,
  FaPercent,
  FaDollarSign,
  FaExchangeAlt,
} from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { printReceipt as printUnifiedReceipt } from '@/lib/utils/unifiedReceipt';
import { DEFAULT_RECEIPT_SETTINGS, type ReceiptSettings } from '@/lib/types/receiptSettings';
import { useMerchant } from '@/context/MerchantContext';
import { formatCurrency, formatDateTimeInTimeZone, formatFullOrderNumber } from '@/lib/utils/format';
import OrderTotalsBreakdown from '@/components/orders/OrderTotalsBreakdown';

// ============================================
// TYPES
// ============================================

export type POSPaymentMethod =
  | 'CASH_ON_COUNTER'
  | 'CARD_ON_COUNTER'
  | 'SPLIT';

export type DiscountType = 'percentage' | 'fixed';

interface PaymentMethodOption {
  value: POSPaymentMethod;
  label: string;
  labelId: string;
  icon: React.ReactNode;
  enabled: boolean;
}

interface POSPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentData: POSPaymentData) => Promise<void>;
  orderId?: string | number;
  orderNumber: string;
  totalAmount: number;
  currency: string;
  // Optional order details for receipt printing
  orderDetails?: {
    orderType: 'DINE_IN' | 'TAKEAWAY';
    tableNumber?: string;
    placedAt: Date;
    items: Array<{
      menuName: string;
      quantity: number;
      subtotal: number;
      addons?: Array<{
        addonName: string;
        addonPrice: number;
        quantity: number;
      }>;
    }>;
    subtotal: number;
    taxAmount?: number;
    serviceChargeAmount?: number;
    packagingFeeAmount?: number;
  };
  merchantInfo?: {
    name: string;
    code?: string;
    address?: string;
    phone?: string;
    email?: string;
    logoUrl?: string;
  };

  receiptSettings?: Partial<ReceiptSettings> | null;
}

export interface POSPaymentData {
  method: POSPaymentMethod;
  amountPaid: number;
  change: number;
  notes?: string;
  voucherTemplateId?: string;
  // Split payment details
  cashAmount?: number;
  cardAmount?: number;
  // Discount details
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  finalTotal?: number;
  // Print option
  printReceipt?: boolean;
}

// ============================================
// COMPONENT
// ============================================

export const POSPaymentModal: React.FC<POSPaymentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  orderId,
  orderNumber,
  totalAmount,
  currency,
  orderDetails,
  merchantInfo,
  receiptSettings,
}) => {
  const { t, locale } = useTranslation();
  const { merchant } = useMerchant();

  const getAutoPrintStorageKey = useCallback(() => {
    const merchantId = merchant?.id ? String(merchant.id) : '';
    return merchantId ? `pos_auto_print_receipt:${merchantId}` : 'pos_auto_print_receipt';
  }, [merchant?.id]);

  // State
  const [paymentMethod, setPaymentMethod] = useState<POSPaymentMethod>('CASH_ON_COUNTER');
  const [amount, setAmount] = useState<number>(totalAmount);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Split payment state
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [cardAmount, setCardAmount] = useState<number>(0);

  // Discount state
  const [discountType, setDiscountType] = useState<DiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [showDiscount, setShowDiscount] = useState(false);

  const [discountEntryMode, setDiscountEntryMode] = useState<'VOUCHER' | 'MANUAL'>('VOUCHER');

  // Voucher state (POS)
  const [voucherTemplates, setVoucherTemplates] = useState<Array<{
    id: string;
    name: string;
    description?: string | null;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    maxDiscountAmount?: number | null;
    minOrderAmount?: number | null;
  }>>([]);
  const [selectedVoucherTemplateId, setSelectedVoucherTemplateId] = useState<string>('');
  const [isLoadingVoucherTemplates, setIsLoadingVoucherTemplates] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    kind: 'CODE' | 'TEMPLATE';
    code?: string;
    templateId?: string;
    label?: string;
    discountAmount: number;
  } | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  const posDiscountsEnabled = merchant?.posDiscountsEnabled !== false;

  const getVoucherReasonMessage = useCallback(
    (json: any, fallback: string) => {
      const errorCode = typeof json?.error === 'string' ? json.error : '';
      const reasonKey = errorCode ? `voucher.reason.${errorCode}` : '';
      const translated = reasonKey ? (t(reasonKey) as string) : '';
      if (typeof translated === 'string' && translated.trim() !== '' && translated !== reasonKey) return translated;
      if (typeof json?.message === 'string' && json.message.trim() !== '') return json.message;
      return fallback;
    },
    [t]
  );

  const buildVoucherDetailsHint = useCallback(
    (details: unknown): string => {
      if (!details || typeof details !== 'object' || Array.isArray(details)) return '';
      const d = details as Record<string, unknown>;

      const parts: string[] = [];

      const minOrderAmount = typeof d.minOrderAmount === 'number' ? d.minOrderAmount : Number(d.minOrderAmount);
      if (Number.isFinite(minOrderAmount) && minOrderAmount > 0) {
        parts.push(`${t('voucher.meta.minOrder') || 'Minimum order'}: ${formatCurrency(minOrderAmount, currency, locale)}`);
      }

      const totalDiscountCap = typeof d.totalDiscountCap === 'number' ? d.totalDiscountCap : Number(d.totalDiscountCap);
      if (Number.isFinite(totalDiscountCap) && totalDiscountCap > 0) {
        parts.push(`${t('voucher.meta.cap') || 'Cap'}: ${formatCurrency(totalDiscountCap, currency, locale)}`);
      }

      const validFrom = typeof d.validFrom === 'string' ? d.validFrom : null;
      if (validFrom) {
        parts.push(
          `${t('voucher.meta.validFrom') || 'Valid from'}: ${formatDateTimeInTimeZone(validFrom, merchant?.timezone || 'UTC', (locale as any) || 'en')}`
        );
      }

      const validUntil = typeof d.validUntil === 'string' ? d.validUntil : null;
      if (validUntil) {
        parts.push(
          `${t('voucher.meta.validUntil') || 'Valid until'}: ${formatDateTimeInTimeZone(validUntil, merchant?.timezone || 'UTC', (locale as any) || 'en')}`
        );
      }

      const startTime = typeof d.startTime === 'string' ? d.startTime : '';
      const endTime = typeof d.endTime === 'string' ? d.endTime : '';
      if (startTime && endTime) {
        parts.push(`${t('voucher.meta.timeWindow') || 'Time'}: ${startTime}–${endTime}`);
      }

      const maxUsesTotal = typeof d.maxUsesTotal === 'number' ? d.maxUsesTotal : Number(d.maxUsesTotal);
      const used = typeof d.used === 'number' ? d.used : Number(d.used);
      if (Number.isFinite(maxUsesTotal) && Number.isFinite(used) && maxUsesTotal > 0) {
        parts.push(`${t('voucher.meta.usage') || 'Usage'}: ${used}/${maxUsesTotal}`);
      }

      const maxUsesPerCustomer = typeof d.maxUsesPerCustomer === 'number' ? d.maxUsesPerCustomer : Number(d.maxUsesPerCustomer);
      const usedByCustomer = typeof d.usedByCustomer === 'number' ? d.usedByCustomer : Number(d.usedByCustomer);
      if (Number.isFinite(maxUsesPerCustomer) && Number.isFinite(usedByCustomer) && maxUsesPerCustomer > 0) {
        parts.push(`${t('voucher.meta.usage') || 'Usage'}: ${usedByCustomer}/${maxUsesPerCustomer}`);
      }

      return parts.length > 0 ? ` (${parts.join(' • ')})` : '';
    },
    [currency, locale, merchant?.timezone, t]
  );

  // Print receipt option
  const [printReceipt, setPrintReceipt] = useState(false);

  // Calculate discount amount
  const discountAmount = useMemo(() => {
    if (discountValue <= 0) return 0;
    if (discountType === 'percentage') {
      return totalAmount * (Math.min(discountValue, 100) / 100);
    }
    return Math.min(discountValue, totalAmount);
  }, [discountType, discountValue, totalAmount]);

  const voucherDiscountAmount = useMemo(() => {
    if (!appliedVoucher) return 0;
    const raw = typeof appliedVoucher.discountAmount === 'number' ? appliedVoucher.discountAmount : 0;
    return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  }, [appliedVoucher]);

  const effectiveDiscountAmount = useMemo(() => {
    return voucherDiscountAmount > 0 ? voucherDiscountAmount : discountAmount;
  }, [voucherDiscountAmount, discountAmount]);

  // Final total after discount
  const finalTotal = useMemo(() => {
    return Math.max(0, totalAmount - effectiveDiscountAmount);
  }, [totalAmount, effectiveDiscountAmount]);

  const totalsBreakdownAmounts = useMemo(() => {
    if (!orderDetails) return null;

    return {
      subtotal: orderDetails.subtotal,
      taxAmount: orderDetails.taxAmount ?? 0,
      serviceChargeAmount: orderDetails.serviceChargeAmount ?? 0,
      packagingFeeAmount: orderDetails.packagingFeeAmount ?? 0,
      deliveryFeeAmount: 0,
      discountAmount: effectiveDiscountAmount > 0 ? effectiveDiscountAmount : 0,
      totalAmount: finalTotal,
    };
  }, [effectiveDiscountAmount, finalTotal, orderDetails]);

  const isDirty = useMemo(() => {
    const hasNotes = Boolean(notes.trim());
    const hasDiscount = discountValue > 0;
    const hasVoucher = Boolean(appliedVoucher) || Boolean(selectedVoucherTemplateId);
    const methodChanged = paymentMethod !== 'CASH_ON_COUNTER';
    const splitChanged = paymentMethod === 'SPLIT' ? cashAmount > 0 || cardAmount > 0 : false;
    const amountChanged = paymentMethod !== 'SPLIT' ? amount !== finalTotal : false;
    return hasNotes || hasDiscount || hasVoucher || methodChanged || splitChanged || amountChanged;
  }, [notes, discountValue, appliedVoucher, selectedVoucherTemplateId, paymentMethod, cashAmount, cardAmount, amount, finalTotal]);

  const clearManualDiscount = useCallback(() => {
    setDiscountValue(0);
    setShowDiscount(false);
  }, []);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('CASH_ON_COUNTER');
      setAmount(totalAmount);
      setNotes('');
      setIsSubmitting(false);
      setCashAmount(0);
      setCardAmount(0);
      setDiscountType('percentage');
      setDiscountValue(0);
      setShowDiscount(false);
      setDiscountEntryMode('VOUCHER');
      setVoucherTemplates([]);
      setSelectedVoucherTemplateId('');
      setIsLoadingVoucherTemplates(false);
      setAppliedVoucher(null);
      setVoucherError(null);
      setIsValidatingVoucher(false);
      try {
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem(getAutoPrintStorageKey());
          setPrintReceipt(stored === 'true');
        }
      } catch {
        setPrintReceipt(false);
      }
    }
  }, [isOpen, totalAmount, getAutoPrintStorageKey]);

  useEffect(() => {
    if (!isOpen) return;
    if (!posDiscountsEnabled) {
      setVoucherTemplates([]);
      setSelectedVoucherTemplateId('');
      setAppliedVoucher(null);
      setVoucherError(null);
      return;
    }

    const fetchTemplates = async () => {
      setIsLoadingVoucherTemplates(true);
      try {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('/api/merchant/orders/pos/voucher-templates', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const json = await res.json();
        if (!res.ok || !json?.success || !Array.isArray(json?.data)) {
          setVoucherTemplates([]);
          return;
        }

        const normalized = (json.data as any[])
          .map((row) => {
            const discountType = row?.discountType === 'PERCENTAGE'
              ? ('PERCENTAGE' as const)
              : ('FIXED_AMOUNT' as const);

            return {
              id: String(row?.id ?? ''),
              name: String(row?.name ?? ''),
              description: typeof row?.description === 'string' ? (row.description as string) : null,
              discountType,
              discountValue: Number(row?.discountValue ?? 0),
              maxDiscountAmount: row?.maxDiscountAmount != null ? Number(row.maxDiscountAmount) : null,
              minOrderAmount: row?.minOrderAmount != null ? Number(row.minOrderAmount) : null,
            };
          })
          .filter((t) => t.id && t.name);

        setVoucherTemplates(normalized);
      } catch {
        setVoucherTemplates([]);
      } finally {
        setIsLoadingVoucherTemplates(false);
      }
    };

    void fetchTemplates();
  }, [isOpen, posDiscountsEnabled]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isSubmitting) return;
      if (isDirty) return;
      onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, isDirty, isSubmitting]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(getAutoPrintStorageKey(), String(printReceipt));
    } catch {
      // ignore storage failures
    }
  }, [printReceipt, getAutoPrintStorageKey]);

  // Update amount when final total changes
  useEffect(() => {
    if (paymentMethod !== 'SPLIT') {
      setAmount(finalTotal);
    }
  }, [finalTotal, paymentMethod]);

  const formatMoney = useCallback(
    (value: number) => formatCurrency(value, currency, locale),
    [currency, locale]
  );

  // Calculate change
  const change = useMemo(() => {
    if (paymentMethod === 'SPLIT') {
      return Math.max(0, cashAmount - (finalTotal - cardAmount));
    }
    return Math.max(0, amount - finalTotal);
  }, [amount, finalTotal, paymentMethod, cashAmount, cardAmount]);

  // Check if split payment is valid
  const isSplitValid = useMemo(() => {
    if (paymentMethod !== 'SPLIT') return true;
    return (cashAmount + cardAmount) >= finalTotal;
  }, [paymentMethod, cashAmount, cardAmount, finalTotal]);

  // Quick cash buttons
  const quickCashButtons = useMemo(() => {
    const baseAmount = finalTotal;
    if (currency === 'IDR') {
      // Round up to nearest common denominations
      const base = Math.ceil(baseAmount / 10000) * 10000;
      return [base, base + 10000, base + 20000, base + 50000].filter(v => v >= baseAmount);
    } else {
      // AUD/other - round up to nearest 10, 20, 50
      const base = Math.ceil(baseAmount / 10) * 10;
      return [base, base + 10, base + 20, base + 50].filter(v => v >= baseAmount);
    }
  }, [finalTotal, currency]);

  // Payment method options
  const paymentMethods: PaymentMethodOption[] = [
    {
      value: 'CASH_ON_COUNTER',
      label: t('pos.payment.cash') || 'Cash',
      labelId: t('pos.payment.cash') || 'Cash',
      icon: <FaMoneyBillWave className="w-6 h-6" />,
      enabled: true,
    },
    {
      value: 'CARD_ON_COUNTER',
      label: t('pos.payment.card') || 'Card',
      labelId: t('pos.payment.card') || 'Card',
      icon: <FaCreditCard className="w-6 h-6" />,
      enabled: true,
    },
    {
      value: 'SPLIT',
      label: t('pos.payment.split') || 'Split',
      labelId: t('pos.payment.split') || 'Split',
      icon: <FaExchangeAlt className="w-6 h-6" />,
      enabled: true,
    },
  ];

  // Print receipt function
  const handlePrintReceipt = useCallback(async () => {
    if (!orderDetails || !merchantInfo) return;

    const rawSettings = (receiptSettings || {}) as Partial<ReceiptSettings>;
    const inferredLanguage: 'en' | 'id' = locale === 'id' ? 'id' : 'en';
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

    let trackingToken: string | null = null;
    if (settings.showTrackingQRCode && orderId != null) {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const res = await fetch(`/api/merchant/orders/${orderId}/tracking-token`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const json = await res.json();
          if (res.ok && json?.success) {
            trackingToken = json?.data?.trackingToken || null;
          }
        }
      } catch {
        trackingToken = null;
      }
    }

    printUnifiedReceipt({
      order: {
        orderId: orderId != null ? String(orderId) : undefined,
        orderNumber,
        orderType: orderDetails.orderType,
        tableNumber: orderDetails.tableNumber,
        placedAt: orderDetails.placedAt.toISOString(),
        trackingToken,
        items: orderDetails.items.map((item) => ({
          quantity: item.quantity,
          menuName: item.menuName,
          subtotal: item.subtotal,
          addons: (item.addons || []).map((addon) => ({
            addonName: addon.quantity && addon.quantity > 1 ? `${addon.quantity}x ${addon.addonName}` : addon.addonName,
            addonPrice: addon.addonPrice * (addon.quantity || 1),
          })),
        })),
        subtotal: orderDetails.subtotal,
        taxAmount: orderDetails.taxAmount,
        serviceChargeAmount: orderDetails.serviceChargeAmount,
        packagingFeeAmount: orderDetails.packagingFeeAmount,
        discountAmount: effectiveDiscountAmount > 0 ? effectiveDiscountAmount : undefined,
        discountLabel: appliedVoucher?.label || undefined,
        totalAmount: finalTotal,
        amountPaid: paymentMethod === 'SPLIT' ? cashAmount + cardAmount : amount,
        changeAmount: change,
        paymentMethod:
          paymentMethod === 'SPLIT'
            ? 'SPLIT'
            : paymentMethod === 'CASH_ON_COUNTER'
              ? 'CASH'
              : 'CARD',
        paymentStatus: 'COMPLETED',
        cashierName: undefined,
      },
      merchant: {
        name: merchantInfo.name,
        code: merchantInfo.code || merchant?.code,
        logoUrl: merchantInfo.logoUrl,
        address: merchantInfo.address,
        phone: merchantInfo.phone,
        email: merchantInfo.email,
        currency: currency,
      },
      settings,
      language,
    });
  }, [orderDetails, merchantInfo, merchant?.code, orderNumber, effectiveDiscountAmount, appliedVoucher?.label, finalTotal, paymentMethod, amount, change, cashAmount, cardAmount, currency, receiptSettings, locale, orderId]);

  const handleApplyVoucherTemplate = useCallback(async () => {
    if (!orderId) {
      setVoucherError(t('pos.payment.voucher.orderRequired') || 'Order is required to validate a voucher');
      return;
    }

    if (!selectedVoucherTemplateId) {
      setVoucherError(t('pos.payment.voucher.templateRequired') || 'Voucher template is required');
      return;
    }

    setIsValidatingVoucher(true);
    setVoucherError(null);

    try {
      const token = localStorage.getItem('accessToken');

      const res = await fetch('/api/merchant/orders/pos/validate-voucher-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          voucherTemplateId: selectedVoucherTemplateId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.success) {
        setAppliedVoucher(null);
        const base = getVoucherReasonMessage(json, t('pos.payment.voucher.invalid') || 'Invalid voucher');
        setVoucherError(`${base}${buildVoucherDetailsHint(json?.details)}`);
        return;
      }

      const discountAmount = typeof json?.data?.discountAmount === 'number'
        ? json.data.discountAmount
        : Number(json?.data?.discountAmount);

      const fallbackLabel = voucherTemplates.find((x) => x.id === selectedVoucherTemplateId)?.name;

      setAppliedVoucher({
        kind: 'TEMPLATE',
        templateId: selectedVoucherTemplateId,
        label: typeof json?.data?.label === 'string' ? json.data.label : fallbackLabel,
        discountAmount: Number.isFinite(discountAmount) ? discountAmount : 0,
      });

      // Prevent double discounts: voucher OR manual
      setDiscountValue(0);
      setShowDiscount(false);
      setDiscountEntryMode('VOUCHER');
    } catch (error) {
      console.error('[POSPaymentModal] validate voucher template error:', error);
      setAppliedVoucher(null);
      setVoucherError(t('pos.payment.voucher.failed') || 'Failed to validate voucher');
    } finally {
      setIsValidatingVoucher(false);
    }
  }, [orderId, selectedVoucherTemplateId, t, getVoucherReasonMessage, voucherTemplates]);

  const handleRemoveVoucher = useCallback(() => {
    setAppliedVoucher(null);
    setVoucherError(null);
    setSelectedVoucherTemplateId('');
  }, []);

  const switchToManualDiscount = useCallback(() => {
    // Switching to manual discount should clear voucher selection/applied state
    setDiscountEntryMode('MANUAL');
    setAppliedVoucher(null);
    setVoucherError(null);
    setSelectedVoucherTemplateId('');
    setShowDiscount(true);
    setDiscountValue(0);
  }, []);

  const switchToVoucherTemplate = useCallback(() => {
    // Switching to voucher template should clear manual discount state
    setDiscountEntryMode('VOUCHER');
    setDiscountValue(0);
    setShowDiscount(false);
  }, []);

  // Handle submit
  const handleSubmit = async () => {
    // Validate based on payment method
    if (paymentMethod === 'SPLIT') {
      if (!isSplitValid) return;
    } else if (amount < finalTotal) {
      return;
    }

    setIsSubmitting(true);
    try {
      const isUsingVoucher = Boolean(appliedVoucher);
      const isUsingTemplateVoucher = appliedVoucher?.kind === 'TEMPLATE' && Boolean(appliedVoucher.templateId);

      await onConfirm({
        method: paymentMethod,
        amountPaid: paymentMethod === 'SPLIT' ? (cashAmount + cardAmount) : amount,
        change: change,
        notes: notes.trim() || undefined,
        voucherTemplateId: isUsingTemplateVoucher ? appliedVoucher?.templateId : undefined,
        cashAmount: paymentMethod === 'SPLIT' ? cashAmount : undefined,
        cardAmount: paymentMethod === 'SPLIT' ? cardAmount : undefined,
        discountType: !isUsingVoucher && discountAmount > 0 ? discountType : undefined,
        discountValue: !isUsingVoucher && discountAmount > 0 ? discountValue : undefined,
        discountAmount: !isUsingVoucher && discountAmount > 0 ? discountAmount : undefined,
        finalTotal: finalTotal,
        printReceipt: printReceipt,
      });

      // Print receipt after successful payment if option is enabled
      if (printReceipt && orderDetails && merchantInfo) {
        setTimeout(() => {
          void handlePrintReceipt();
        }, 50);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (isSubmitting) return;
          if (isDirty) return;
          onClose();
        }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 max-h-[90vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-brand-500 dark:bg-brand-600">
          <div className="flex items-center gap-3">
            <FaReceipt className="w-5 h-5 text-white" />
            <h2 className="text-lg font-semibold text-white">
              {t('pos.payment.title') || 'Payment'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/20 text-white hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Order Info */}
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              {t('pos.payment.orderNumber') || 'Order #'}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              {formatFullOrderNumber(orderNumber, merchant?.code)}
            </p>
          </div>

          {/* Total Amount */}
          <div className="bg-brand-50 dark:bg-brand-900/20 rounded-lg p-4 border border-brand-200 dark:border-brand-800">
            <div className="text-center">
              <p className="text-sm text-brand-600 dark:text-brand-400 font-medium mb-1">
                {t('pos.payment.totalAmount') || 'Total Amount'}
              </p>
              <p className={`text-3xl font-bold ${effectiveDiscountAmount > 0 ? 'text-gray-400 line-through text-2xl' : 'text-brand-600 dark:text-brand-400'}`}>
                {formatMoney(totalAmount)}
              </p>
            </div>

            {totalsBreakdownAmounts ? (
              <div className="mt-3 pt-3 border-t border-brand-200 dark:border-brand-700">
                <OrderTotalsBreakdown
                  amounts={totalsBreakdownAmounts}
                  currency={currency}
                  locale={locale}
                  labels={{
                    subtotal: t('pos.orderConfirm.subtotal') || 'Subtotal',
                    tax: t('pos.orderConfirm.tax') || 'Tax',
                    serviceCharge: t('pos.orderConfirm.service') || 'Service Charge',
                    packagingFee: t('pos.orderConfirm.packaging') || 'Packaging Fee',
                    discount: appliedVoucher
                      ? (t('pos.payment.voucher.title') || 'Voucher')
                      : `${t('pos.payment.discount') || 'Discount'}${discountType === 'percentage' && discountValue > 0 ? ` (${discountValue}%)` : ''}`,
                    total: t('pos.payment.finalTotal') || 'Final Total',
                  }}
                  options={{
                    showDiscount: effectiveDiscountAmount > 0,
                    showDeliveryFee: false,
                  }}
                  showTotalRow={effectiveDiscountAmount > 0}
                  rowsContainerClassName="space-y-1.5 text-sm"
                  labelClassName="text-gray-700 dark:text-gray-300"
                  valueClassName="text-gray-700 dark:text-gray-300"
                  discountValueClassName="font-semibold text-green-600 dark:text-green-400"
                  totalRowClassName="pt-2 mt-2 border-t border-brand-200 dark:border-brand-700 flex justify-between"
                  totalLabelClassName="font-bold text-brand-600 dark:text-brand-400"
                  totalValueClassName="font-bold text-brand-600 dark:text-brand-400"
                />

                {effectiveDiscountAmount > 0 && appliedVoucher?.label ? (
                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                    {appliedVoucher.label}
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Voucher Code */}
            {posDiscountsEnabled ? (
              <>
                {/* Discount/Voucher Switch */}
                <div className="mt-3 pt-3 border-t border-brand-200 dark:border-brand-700">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={switchToVoucherTemplate}
                      disabled={isSubmitting || isValidatingVoucher}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${discountEntryMode === 'VOUCHER'
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                      {t('pos.payment.voucher.title') || 'Voucher'}
                    </button>

                    <button
                      type="button"
                      onClick={switchToManualDiscount}
                      disabled={isSubmitting || isValidatingVoucher}
                      className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${discountEntryMode === 'MANUAL'
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                    >
                      <FaPercent className="w-3 h-3" />
                      {t('pos.payment.addDiscount') || 'Manual discount'}
                    </button>
                  </div>

                  {/* Voucher Template (shown only in voucher mode) */}
                  {discountEntryMode === 'VOUCHER' ? (
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('pos.payment.voucher.title') || 'Voucher'}
                        </div>
                        {appliedVoucher ? (
                          <button
                            type="button"
                            onClick={handleRemoveVoucher}
                            className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                          >
                            {t('pos.payment.voucher.remove') || 'Remove'}
                          </button>
                        ) : null}
                      </div>

                      {!appliedVoucher ? (
                        <div className="mt-2 space-y-2">
                          <div className="flex gap-2">
                            <select
                              value={selectedVoucherTemplateId}
                              onChange={(e) => {
                                setSelectedVoucherTemplateId(e.target.value);
                                setVoucherError(null);
                              }}
                              disabled={isSubmitting || isValidatingVoucher}
                              className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600"
                            >
                              <option value="">
                                {isLoadingVoucherTemplates
                                  ? (t('pos.payment.voucher.loadingTemplates') || 'Loading vouchers...')
                                  : (t('pos.payment.voucher.selectTemplate') || 'Select voucher')}
                              </option>
                              {voucherTemplates.map((tpl) => {
                                const discountLabel = tpl.discountType === 'PERCENTAGE'
                                  ? `${tpl.discountValue}%`
                                  : `${formatMoney(tpl.discountValue)}`;

                                const meta: string[] = [];
                                if (tpl.minOrderAmount != null && Number.isFinite(tpl.minOrderAmount) && tpl.minOrderAmount > 0) {
                                  meta.push(`${t('voucher.meta.min') || 'Min'} ${formatMoney(tpl.minOrderAmount)}`);
                                }
                                if (tpl.discountType === 'PERCENTAGE' && tpl.maxDiscountAmount != null && Number.isFinite(tpl.maxDiscountAmount) && tpl.maxDiscountAmount > 0) {
                                  meta.push(`${t('voucher.meta.cap') || 'Cap'} ${formatMoney(tpl.maxDiscountAmount)}`);
                                }

                                const value = meta.length > 0
                                  ? `${tpl.name} — ${discountLabel} (${meta.join(', ')})`
                                  : `${tpl.name} — ${discountLabel}`;
                                return (
                                  <option key={tpl.id} value={tpl.id}>
                                    {value}
                                  </option>
                                );
                              })}
                            </select>
                            <button
                              type="button"
                              onClick={handleApplyVoucherTemplate}
                              disabled={
                                isSubmitting
                                || isValidatingVoucher
                                || !selectedVoucherTemplateId
                                || !orderId
                              }
                              className="px-3 py-2 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isValidatingVoucher
                                ? (t('pos.payment.voucher.validating') || 'Validating...')
                                : (t('pos.payment.voucher.applyTemplate') || 'Apply')}
                            </button>
                          </div>

                          {voucherError ? (
                            <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                              {voucherError}
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {appliedVoucher ? (
                        <div className="mt-2 text-xs text-green-600 dark:text-green-400">
                          {(t('pos.payment.voucher.applied') || 'Applied')}: {appliedVoucher.label || ''}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Manual Discount Input (shown only in manual mode) */}
                  {discountEntryMode === 'MANUAL' ? (
                    <div className="mt-3">
                      <div className="flex gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setDiscountType('percentage')}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${discountType === 'percentage'
                            ? 'bg-brand-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                          <FaPercent className="w-3 h-3" />
                          {t('pos.payment.percentage') || 'Percentage'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDiscountType('fixed')}
                          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${discountType === 'fixed'
                            ? 'bg-brand-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                            }`}
                        >
                          <FaDollarSign className="w-3 h-3" />
                          {t('pos.payment.fixed') || 'Fixed'}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step={discountType === 'percentage' ? '1' : (currency === 'IDR' ? '1000' : '0.01')}
                          min="0"
                          max={discountType === 'percentage' ? 100 : totalAmount}
                          value={discountValue || ''}
                          onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                          placeholder={discountType === 'percentage' ? '0' : formatMoney(0)}
                          className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm font-semibold text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          {discountType === 'percentage' ? '%' : currency}
                        </span>
                      </div>
                      {/* Quick discount buttons */}
                      {discountType === 'percentage' && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {[5, 10, 15, 20, 25].map((pct) => (
                            <button
                              key={pct}
                              type="button"
                              onClick={() => setDiscountValue(pct)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${discountValue === pct
                                ? 'bg-brand-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      )}

                      {discountValue > 0 ? (
                        <button
                          type="button"
                          onClick={clearManualDiscount}
                          disabled={isSubmitting || isValidatingVoucher}
                          className="mt-2 w-full py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          {t('pos.payment.clearDiscount') || 'Clear discount'}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              {t('pos.payment.selectMethod') || 'Select Payment Method'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => method.enabled && setPaymentMethod(method.value)}
                  disabled={!method.enabled}
                  className={`
                    relative p-4 rounded-lg border-2 text-center transition-all duration-150
                    ${paymentMethod === method.value
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                    }
                    ${!method.enabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-brand-300 dark:hover:border-brand-700 cursor-pointer'
                    }
                  `}
                >
                  <div className={`
                    flex flex-col items-center gap-2
                    ${paymentMethod === method.value
                      ? 'text-brand-600 dark:text-brand-400'
                      : 'text-gray-600 dark:text-gray-400'
                    }
                  `}>
                    {method.icon}
                    <span className="font-medium text-sm">
                      {method.label}
                    </span>
                  </div>
                  {paymentMethod === method.value && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                      <FaCheck className="w-3 h-3 text-white" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Split Payment Inputs */}
          {paymentMethod === 'SPLIT' && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('pos.payment.splitPayment') || 'Split Payment'}
              </label>

              {/* Cash Amount */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FaMoneyBillWave className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('pos.payment.cash') || 'Cash'}
                  </span>
                </div>
                <input
                  type="number"
                  step={currency === 'IDR' ? '1000' : '0.01'}
                  min="0"
                  value={cashAmount || ''}
                  onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                  placeholder={formatMoney(0)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-lg font-semibold text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600"
                />
              </div>

              {/* Card Amount */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FaCreditCard className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t('pos.payment.card') || 'Card'}
                  </span>
                </div>
                <input
                  type="number"
                  step={currency === 'IDR' ? '1000' : '0.01'}
                  min="0"
                  value={cardAmount || ''}
                  onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                  placeholder={formatMoney(0)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-lg font-semibold text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600"
                />
              </div>

              {/* Split Summary */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>{t('pos.payment.totalReceived') || 'Total Received'}</span>
                  <span className="font-medium">{formatMoney(cashAmount + cardAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>{t('pos.payment.amountDue') || 'Amount Due'}</span>
                  <span className="font-medium">{formatMoney(finalTotal)}</span>
                </div>
                {(cashAmount + cardAmount) >= finalTotal && change > 0 && (
                  <div className="flex justify-between text-sm text-green-600 dark:text-green-400 pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span>{t('pos.payment.change') || 'Change'}</span>
                    <span className="font-bold">{formatMoney(change)}</span>
                  </div>
                )}
                {(cashAmount + cardAmount) < finalTotal && (
                  <div className="flex justify-between text-sm text-red-600 dark:text-red-400 pt-1 border-t border-gray-200 dark:border-gray-700">
                    <span>{t('pos.payment.remaining') || 'Remaining'}</span>
                    <span className="font-bold">{formatMoney(finalTotal - cashAmount - cardAmount)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Amount Input (only for Cash) */}
          {paymentMethod === 'CASH_ON_COUNTER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('pos.payment.amountReceived') || 'Amount Received'}
              </label>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setAmount(finalTotal)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${amount === finalTotal
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {t('pos.payment.exact') || 'Exact'}
                </button>
                {quickCashButtons.slice(0, 4).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmount(value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${amount === value
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                  >
                    {formatMoney(value)}
                  </button>
                ))}
              </div>

              {/* Amount Input */}
              <input
                type="number"
                step={currency === 'IDR' ? '1000' : '0.01'}
                min={finalTotal}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-lg font-semibold text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600"
              />

              {/* Change */}
              {change > 0 && (
                <div className="mt-3 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                    {t('pos.payment.change') || 'Change'}
                  </p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatMoney(change)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('pos.payment.notes') || 'Notes'} <span className="text-gray-400">({t('common.optional')})</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('pos.payment.notesPlaceholder') || 'Add payment notes...'}
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600"
              rows={2}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {/* Print Receipt Toggle */}
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPrintReceipt((v) => !v)}
                className="inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label={t('pos.payment.printReceipt') || 'Print Receipt'}
                title={t('pos.payment.printReceipt') || 'Print Receipt'}
              >
                {printReceipt ? (
                  <FaToggleOn className="w-7 h-7 text-brand-500" />
                ) : (
                  <FaToggleOff className="w-7 h-7 text-gray-400" />
                )}
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <FaPrint className="w-4 h-4" />
                <span>{t('pos.payment.printReceipt') || 'Print Receipt'}</span>
              </div>
            </div>

            {/* Manual Print Button */}
            {orderDetails && merchantInfo && (
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2 transition-colors"
              >
                <FaPrint className="w-3 h-3" />
                {t('pos.payment.printNow') || 'Print Now'}
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (paymentMethod === 'SPLIT' ? !isSplitValid : amount < finalTotal)}
              className="flex-1 py-3 rounded-lg text-sm font-medium bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{t('pos.payment.processing') || 'Processing...'}</span>
                </>
              ) : (
                <>
                  <FaCheck className="w-4 h-4" />
                  <span>{t('pos.payment.confirm') || 'Confirm Payment'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSPaymentModal;
