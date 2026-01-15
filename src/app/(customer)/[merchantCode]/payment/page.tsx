'use client';

// Force dynamic rendering for useSearchParams
export const dynamic = 'force-dynamic';

import { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { clearReservationDetails, clearTableNumber, getCustomerAuth, getReservationDetails, getTableNumber, saveRecentOrder } from '@/lib/utils/localStorage';
import type { OrderMode } from '@/lib/types/customer';
import PaymentConfirmationModal from '@/components/modals/PaymentConfirmationModal';
import DeliveryAddressPicker from '@/components/delivery/DeliveryAddressPicker';
import DeliveryFeePreview from '@/components/delivery/DeliveryFeePreview';
import { useCart } from '@/context/CartContext';
import { useGroupOrder } from '@/context/GroupOrderContext';
import { useCustomerData } from '@/context/CustomerDataContext';
import { calculateCartSubtotal } from '@/lib/utils/priceCalculator';
import { formatCurrency as formatCurrencyUtil } from '@/lib/utils/format';
import { useTranslation, tOr } from '@/lib/i18n/useTranslation';
import { FaArrowLeft, FaCheckCircle, FaChevronDown, FaClock, FaEnvelope, FaExclamationCircle, FaPhone, FaTable, FaTag, FaToggleOff, FaToggleOn, FaUser, FaUsers } from 'react-icons/fa';
import ReservationDetailsModal, { type ReservationDetails } from '@/components/customer/ReservationDetailsModal';

function isValidHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function formatTimeHHMM(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hh = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const mm = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return `${hh}:${mm}`;
}

function hhmmToMinutes(value: string): number | null {
  if (!isValidHHMM(value)) return null;
  const [h, m] = value.split(':').map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function minutesToHHMM(totalMinutes: number): string {
  const clamped = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hh = String(Math.floor(clamped / 60)).padStart(2, '0');
  const mm = String(clamped % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function suggestNextTimeFromNowLabel(nowLabel: string | null, stepMinutes = 15): string {
  const nowMinutes = nowLabel ? hhmmToMinutes(nowLabel) : null;
  if (nowMinutes === null) return '';

  // Always suggest a time *after* now.
  const base = nowMinutes + stepMinutes;
  const remainder = base % stepMinutes;
  const rounded = remainder === 0 ? base : base + (stepMinutes - remainder);
  return minutesToHHMM(rounded);
}

/**
 * Payment Page - Customer Order Payment
 * 
 * @specification FRONTEND_SPECIFICATION.md (Tasks 21-24)
 * 
 * @description
 * Payment form with customer info collection:
 * - Order mode badge (Dine-in/Takeaway)
 * - Customer form (Name*, Email*, Phone, Table Number*)
 * - Payment instructions card
 * - Total summary display
 * - Confirmation modal before order creation
 * 
 * @flow
 * 1. User fills form → Click "Process Order"
 * 2. Validation: Email required + format check
 * 3. Confirmation modal → Click "Pay Now"
 * 4. Create order via POST /api/public/orders (API auto-registers customer)
 * 5. Auto-login guest customer (get JWT token for order tracking)
 * 6. Clear cart → Navigate to order summary
 * 
 * @security
 * - Email validation (required + format)
 * - JWT token from customer-login endpoint
 * - Optional Bearer auth for order creation
 * - Auto-login after order for guest users
 */
export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useTranslation();

  const merchantCode = params.merchantCode as string;
  const mode = (searchParams.get('mode') || 'takeaway') as OrderMode;
  const flow = searchParams.get('flow') || '';
  const isReservationFlow = flow === 'reservation';
  const scheduled = searchParams.get('scheduled') || '';
  const isScheduledRequested = scheduled === '1' || scheduled === 'true';
  const _isGroupOrderCheckout = searchParams.get('groupOrder') === 'true';

  const { cart, initializeCart, clearCart: clearCartContext } = useCart();
  const {
    submitOrder: _submitGroupOrder,
    clearGroupOrderState: _clearGroupOrderState,
    session: _groupSession,
    splitBill: _splitBill
  } = useGroupOrder();

  // ✅ Use CustomerData Context for instant merchant info access
  const { merchantInfo: contextMerchantInfo, initializeData, isInitialized } = useCustomerData();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [apiError, setApiError] = useState(''); // For API submission errors

  // ✅ NEW: Voucher state (customer checkout)
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherStatus, setVoucherStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [voucherMessage, setVoucherMessage] = useState<string>('');
  const [voucherLabel, setVoucherLabel] = useState<string>('');
  const [voucherDiscountAmount, setVoucherDiscountAmount] = useState<number>(0);
  const [voucherDiscountType, setVoucherDiscountType] = useState<'PERCENTAGE' | 'FIXED_AMOUNT' | null>(null);
  const [voucherDiscountValue, setVoucherDiscountValue] = useState<number>(0);

  // ✅ NEW: Per-field validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
    tableNumber?: string;
    deliveryAddress?: string;
    scheduledTime?: string;
  }>({});

  // ✅ NEW: Refs for focusing invalid fields
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const tableNumberInputRef = useRef<HTMLInputElement>(null);

  // ✅ NEW: State untuk table number dan merchant data
  const [tableNumber, setTableNumber] = useState<string>('');
  const [merchantTaxPercentage, setMerchantTaxPercentage] = useState(0);
  const [merchantServiceChargePercent, setMerchantServiceChargePercent] = useState(0);
  const [merchantPackagingFee, setMerchantPackagingFee] = useState(0);
  const [merchantCurrency, setMerchantCurrency] = useState('AUD');

  // ✅ NEW: Scheduled order (same-day only; validated on server in merchant timezone)
  const [isScheduledOrder, setIsScheduledOrder] = useState(isReservationFlow ? false : isScheduledRequested);
  const [scheduledTime, setScheduledTime] = useState('');
  const [merchantNowTimeLabel, setMerchantNowTimeLabel] = useState<string | null>(null);

  const [availableScheduledSlots, setAvailableScheduledSlots] = useState<string[]>([]);
  const [availableScheduledSlotsLoading, setAvailableScheduledSlotsLoading] = useState(false);
  const [availableScheduledSlotsError, setAvailableScheduledSlotsError] = useState<string>('');

  const isScheduledOrderEnabled = contextMerchantInfo?.isScheduledOrderEnabled === true;
  const requireTableNumberForDineIn = contextMerchantInfo?.requireTableNumberForDineIn === true;
  const shouldShowTableNumberField = mode === 'dinein' && requireTableNumberForDineIn && !isReservationFlow;

  const isCustomerVoucherEnabled = (contextMerchantInfo as any)?.customerVouchersEnabled !== false;

  // If user entered payment via "Schedule Order" flow, pre-enable scheduled ordering.
  useEffect(() => {
    if (!isScheduledOrderEnabled) return;
    if (isReservationFlow) return;
    if (!isScheduledRequested) return;
    setIsScheduledOrder(true);
  }, [isScheduledOrderEnabled, isScheduledRequested, isReservationFlow]);

  // Reservation flow never supports scheduled ordering UI/payload.
  useEffect(() => {
    if (!isReservationFlow) return;

    if (isScheduledOrder) setIsScheduledOrder(false);
    setScheduledTime('');
    setFieldErrors((prev) => ({ ...prev, scheduledTime: undefined }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReservationFlow]);

  // Load reservation details for payment display/edit.
  useEffect(() => {
    if (!isReservationFlow) {
      setReservationDetails(null);
      setShowReservationDetailsModal(false);
      return;
    }

    const saved = getReservationDetails(merchantCode);
    if (saved) {
      setReservationDetails({
        partySize: saved.partySize,
        reservationDate: saved.reservationDate,
        reservationTime: saved.reservationTime,
      });
      return;
    }

    setReservationDetails(null);
    setShowReservationDetailsModal(true);
  }, [isReservationFlow, merchantCode]);

  // If merchant disables scheduled orders, force UI state back to normal order
  useEffect(() => {
    if (!isScheduledOrderEnabled && isScheduledOrder) {
      setIsScheduledOrder(false);
      setScheduledTime('');
      if (fieldErrors.scheduledTime) {
        setFieldErrors((prev) => ({ ...prev, scheduledTime: undefined }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScheduledOrderEnabled]);

  // ✅ NEW: Delivery-specific state
  const [deliveryUnit, setDeliveryUnit] = useState('');
  const [deliveryBuildingName, setDeliveryBuildingName] = useState('');
  const [deliveryBuildingNumber, setDeliveryBuildingNumber] = useState('');
  const [deliveryFloor, setDeliveryFloor] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryAddressParts, setDeliveryAddressParts] = useState<{
    streetLine?: string | null;
    neighbourhood?: string | null;
    suburb?: string | null;
    city?: string | null;
    state?: string | null;
    postcode?: string | null;
    country?: string | null;
  } | null>(null);
  const [deliveryLatitude, setDeliveryLatitude] = useState<number | null>(null);
  const [deliveryLongitude, setDeliveryLongitude] = useState<number | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryFeeError, setDeliveryFeeError] = useState('');
  const [isDeliveryAvailable, setIsDeliveryAvailable] = useState(false);

  const auth = getCustomerAuth();
  const [reservationDetails, setReservationDetails] = useState<ReservationDetails | null>(null);
  const [showReservationDetailsModal, setShowReservationDetailsModal] = useState(false);

  const formatCurrency = (amount: number): string => formatCurrencyUtil(amount, merchantCurrency, locale);

  const formatDateTimeInMerchantTz = (iso: string): string => {
    const tz = contextMerchantInfo?.timezone || 'UTC';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return iso;
    return new Intl.DateTimeFormat(locale || 'en', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(dt);
  };

  const buildVoucherDetailsHint = (details: unknown): string => {
    if (!details || typeof details !== 'object' || Array.isArray(details)) return '';
    const d = details as Record<string, unknown>;

    const parts: string[] = [];

    const minOrderAmount = typeof d.minOrderAmount === 'number' ? d.minOrderAmount : Number(d.minOrderAmount);
    if (Number.isFinite(minOrderAmount) && minOrderAmount > 0) {
      parts.push(`${tOr(t, 'voucher.meta.minOrder', 'Minimum order')}: ${formatCurrency(minOrderAmount)}`);
    }

    const totalDiscountCap = typeof d.totalDiscountCap === 'number' ? d.totalDiscountCap : Number(d.totalDiscountCap);
    if (Number.isFinite(totalDiscountCap) && totalDiscountCap > 0) {
      parts.push(`${tOr(t, 'voucher.meta.cap', 'Cap')}: ${formatCurrency(totalDiscountCap)}`);
    }

    const validFrom = typeof d.validFrom === 'string' ? d.validFrom : null;
    if (validFrom) {
      parts.push(`${tOr(t, 'voucher.meta.validFrom', 'Valid from')}: ${formatDateTimeInMerchantTz(validFrom)}`);
    }

    const validUntil = typeof d.validUntil === 'string' ? d.validUntil : null;
    if (validUntil) {
      parts.push(`${tOr(t, 'voucher.meta.validUntil', 'Valid until')}: ${formatDateTimeInMerchantTz(validUntil)}`);
    }

    const startTime = typeof d.startTime === 'string' ? d.startTime : '';
    const endTime = typeof d.endTime === 'string' ? d.endTime : '';
    if (startTime && endTime) {
      parts.push(`${tOr(t, 'voucher.meta.timeWindow', 'Time')}: ${startTime}–${endTime}`);
    }

    const maxUsesTotal = typeof d.maxUsesTotal === 'number' ? d.maxUsesTotal : Number(d.maxUsesTotal);
    const used = typeof d.used === 'number' ? d.used : Number(d.used);
    if (Number.isFinite(maxUsesTotal) && Number.isFinite(used) && maxUsesTotal > 0) {
      parts.push(`${tOr(t, 'voucher.meta.usage', 'Usage')}: ${used}/${maxUsesTotal}`);
    }

    const maxUsesPerCustomer = typeof d.maxUsesPerCustomer === 'number' ? d.maxUsesPerCustomer : Number(d.maxUsesPerCustomer);
    const usedByCustomer = typeof d.usedByCustomer === 'number' ? d.usedByCustomer : Number(d.usedByCustomer);
    if (Number.isFinite(maxUsesPerCustomer) && Number.isFinite(usedByCustomer) && maxUsesPerCustomer > 0) {
      parts.push(`${tOr(t, 'voucher.meta.usage', 'Usage')}: ${usedByCustomer}/${maxUsesPerCustomer}`);
    }

    return parts.length > 0 ? ` (${parts.join(' • ')})` : '';
  };

  const orderTypeForApi = useMemo<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>(() => {
    if (mode === 'dinein') return 'DINE_IN';
    if (mode === 'takeaway') return 'TAKEAWAY';
    return 'DELIVERY';
  }, [mode]);

  // If customer vouchers are disabled for this merchant, clear any existing voucher state.
  useEffect(() => {
    if (isCustomerVoucherEnabled) return;
    if (!voucherCode && voucherStatus === 'idle') return;
    setVoucherCode('');
    setVoucherStatus('idle');
    setVoucherMessage('');
    setVoucherLabel('');
    setVoucherDiscountAmount(0);
    setVoucherDiscountType(null);
    setVoucherDiscountValue(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCustomerVoucherEnabled]);

  const buildVoucherCandidateItems = useMemo(() => {
    if (!cart) return [] as Array<{ menuId: string; subtotal: number }>;
    return cart.items
      .map((item) => {
        const addonsTotal = (item.addons || []).reduce((sum, addon) => sum + (Number(addon.price) || 0), 0);
        const subtotal = (Number(item.price) + addonsTotal) * Number(item.quantity || 0);
        return { menuId: item.menuId.toString(), subtotal };
      })
      .filter((i) => i.menuId && Number.isFinite(i.subtotal) && i.subtotal > 0);
  }, [cart]);

  const normalizeVoucherCode = (value: string): string => value.toUpperCase();

  const stripDiscountCodeSuffix = (label: string): string => {
    // Historically labels could be "Voucher Name (CODE)".
    // Payment UI should not show the code.
    const trimmed = label.trim();
    const match = trimmed.match(/^(.*)\(([A-Z0-9_-]{3,})\)\s*$/);
    if (!match) return trimmed;
    return match[1].trim();
  };

  const validateVoucher = async (codeRaw: string) => {
    if (!isCustomerVoucherEnabled) {
      setVoucherStatus('idle');
      setVoucherMessage('');
      setVoucherLabel('');
      setVoucherDiscountAmount(0);
      return;
    }

    const trimmed = codeRaw.trim().toUpperCase();
    if (!trimmed) {
      setVoucherStatus('idle');
      setVoucherMessage('');
      setVoucherLabel('');
      setVoucherDiscountAmount(0);
      return;
    }

    if (!cart || buildVoucherCandidateItems.length === 0) {
      setVoucherStatus('invalid');
      setVoucherMessage(tOr(t, 'customer.payment.voucher.cartEmpty', 'Add items to your cart before applying a voucher.'));
      setVoucherLabel('');
      setVoucherDiscountAmount(0);
      return;
    }

    setVoucherStatus('checking');
    setVoucherMessage('');

    try {
      const isAuthed = Boolean(auth?.accessToken);
      const endpoint = isAuthed ? '/api/customer/vouchers/validate' : '/api/public/vouchers/validate';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isAuthed ? { Authorization: `Bearer ${auth!.accessToken}` } : {}),
        },
        body: JSON.stringify({
          merchantCode,
          voucherCode: trimmed,
          orderType: orderTypeForApi,
          items: buildVoucherCandidateItems.map((i) => ({ menuId: i.menuId, subtotal: i.subtotal })),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.success) {
        const errorCode = typeof json?.error === 'string' ? json.error : '';
        const reasonKey = errorCode ? `voucher.reason.${errorCode}` : '';
        const reasonMessage = reasonKey ? (t(reasonKey) as string) : '';
        const message =
          typeof reasonMessage === 'string' && reasonMessage.trim() !== '' && reasonMessage !== reasonKey
            ? reasonMessage
            : (typeof json?.message === 'string'
              ? json.message
              : tOr(t, 'customer.payment.voucher.invalid', 'Voucher is invalid.'));

        const detailsHint = buildVoucherDetailsHint(json?.details);
        setVoucherStatus('invalid');
        setVoucherMessage(`${message}${detailsHint}`);
        setVoucherLabel('');
        setVoucherDiscountAmount(0);
        return;
      }

      const label = typeof json?.data?.label === 'string' ? json.data.label : trimmed;
      const discountAmount = Number(json?.data?.discountAmount || 0);

      const discountTypeRaw = typeof json?.data?.discountType === 'string' ? json.data.discountType : null;
      const discountType: 'PERCENTAGE' | 'FIXED_AMOUNT' | null =
        discountTypeRaw === 'PERCENTAGE' || discountTypeRaw === 'FIXED_AMOUNT' ? discountTypeRaw : null;
      const discountValue = Number(json?.data?.discountValue ?? 0);

      setVoucherStatus('valid');
      setVoucherMessage(tOr(t, 'customer.payment.voucher.applied', 'Voucher applied.'));
      setVoucherLabel(stripDiscountCodeSuffix(label));
      setVoucherDiscountAmount(Number.isFinite(discountAmount) ? discountAmount : 0);
      setVoucherDiscountType(discountType);
      setVoucherDiscountValue(Number.isFinite(discountValue) ? discountValue : 0);
    } catch (e) {
      const message = e instanceof Error ? e.message : tOr(t, 'customer.payment.voucher.failed', 'Failed to validate voucher.');
      setVoucherStatus('invalid');
      setVoucherMessage(message);
      setVoucherLabel('');
      setVoucherDiscountAmount(0);
      setVoucherDiscountType(null);
      setVoucherDiscountValue(0);
    }
  };

  // Initialize cart on mount
  useEffect(() => {
    initializeCart(merchantCode, mode);

    const cartKey = `cart_${merchantCode}_${mode}`;
    const storedCart = localStorage.getItem(cartKey);
    console.log('📦 Payment page - Cart from localStorage:', JSON.parse(storedCart || '{}'));

    // ✅ Load table number from localStorage (only if enabled)
    if (mode === 'dinein') {
      const tableData = getTableNumber(merchantCode);
      console.log('📍 Payment page - Table number from localStorage:', tableData);

      if (tableData && tableData.tableNumber) {
        setTableNumber(tableData.tableNumber);
      }
    }
  }, [merchantCode, mode, initializeCart]);

  // If merchant does not require table numbers, clear any stored values and hide UI.
  useEffect(() => {
    if (mode !== 'dinein') return;
    if (requireTableNumberForDineIn) return;

    if (tableNumber) setTableNumber('');
    clearTableNumber(merchantCode);
    if (fieldErrors.tableNumber) {
      setFieldErrors((prev) => ({ ...prev, tableNumber: undefined }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merchantCode, mode, requireTableNumberForDineIn]);

  // ✅ Initialize context for this merchant
  useEffect(() => {
    initializeData(merchantCode);
  }, [merchantCode, initializeData]);

  // ✅ Use Context data when available (instant navigation)
  useEffect(() => {
    if (isInitialized && contextMerchantInfo) {
      console.log('✅ [PAYMENT] Using CustomerData Context - instant load');

      if (contextMerchantInfo.enableTax) {
        setMerchantTaxPercentage(Number(contextMerchantInfo.taxPercentage) || 0);
      }
      if (contextMerchantInfo.enableServiceCharge) {
        setMerchantServiceChargePercent(Number(contextMerchantInfo.serviceChargePercent) || 0);
      }
      if (contextMerchantInfo.enablePackagingFee && mode === 'takeaway') {
        setMerchantPackagingFee(Number(contextMerchantInfo.packagingFeeAmount) || 0);
      }
      setMerchantCurrency(contextMerchantInfo.currency || 'AUD');

      // ✅ NEW: Check if delivery is available
      const isDeliveryEnabled = (contextMerchantInfo as any).isDeliveryEnabled === true;
      setIsDeliveryAvailable(isDeliveryEnabled);
    }
  }, [isInitialized, contextMerchantInfo, mode]);

  // Load valid scheduled slots for today (merchant timezone) when scheduling is enabled.
  useEffect(() => {
    if (!isScheduledOrderEnabled || !isScheduledOrder) {
      setAvailableScheduledSlots([]);
      setAvailableScheduledSlotsError('');
      setAvailableScheduledSlotsLoading(false);
      return;
    }

    const controller = new AbortController();
    const modeParam = mode === 'dinein' ? 'DINE_IN' : mode === 'takeaway' ? 'TAKEAWAY' : 'DELIVERY';

    const fetchSlots = async () => {
      try {
        setAvailableScheduledSlotsLoading(true);
        setAvailableScheduledSlotsError('');

        const res = await fetch(
          `/api/public/merchants/${encodeURIComponent(merchantCode)}/available-times?mode=${encodeURIComponent(modeParam)}`,
          { signal: controller.signal }
        );

        const json = await res.json();
        const slots = Array.isArray(json?.data?.slots) ? (json.data.slots as string[]) : [];
        const normalized = slots.filter((s) => typeof s === 'string' && isValidHHMM(s));

        setAvailableScheduledSlots(normalized);

        if (normalized.length === 0) {
          setAvailableScheduledSlotsError(t('customer.payment.scheduled.noSlots'));
          return;
        }

        const tz = contextMerchantInfo?.timezone;
        const nowLabel = tz ? formatTimeHHMM(new Date(), tz) : null;
        const nowMinutes = nowLabel ? hhmmToMinutes(nowLabel) : null;
        const targetMinutes = (nowMinutes ?? 0) + 15;
        const recommendedSlot =
          normalized.find((slot) => {
            const mins = hhmmToMinutes(slot);
            return mins !== null && mins >= targetMinutes;
          }) ?? normalized[0];

        // Keep scheduledTime aligned with currently valid slots.
        if (!scheduledTime || !normalized.includes(scheduledTime)) {
          setScheduledTime(recommendedSlot);
          if (fieldErrors.scheduledTime) setFieldErrors((prev) => ({ ...prev, scheduledTime: undefined }));
        }
      } catch (e) {
        if ((e as any)?.name === 'AbortError') return;
        setAvailableScheduledSlots([]);
        setAvailableScheduledSlotsError(t('customer.payment.scheduled.slotsLoadFailed'));
      } finally {
        setAvailableScheduledSlotsLoading(false);
      }
    };

    fetchSlots();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScheduledOrderEnabled, isScheduledOrder, merchantCode, mode]);

  // Keep a lightweight “merchant now” hint for scheduled orders.
  useEffect(() => {
    const tz = contextMerchantInfo?.timezone;
    if (!tz) {
      setMerchantNowTimeLabel(null);
      return;
    }

    const update = () => {
      try {
        setMerchantNowTimeLabel(formatTimeHHMM(new Date(), tz));
      } catch {
        setMerchantNowTimeLabel(null);
      }
    };

    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [contextMerchantInfo?.timezone]);

  /**
   * ✅ FIXED: Only redirect if NOT processing order
   * 
   * @description
   * Prevents redirect loop during order creation.
   * The flag `isProcessingOrder` is set to true when "Proses Pesanan" is clicked,
   * and remains true until navigation to order-summary-cash completes.
   * 
   * @specification Emergency Troubleshooting - copilot-instructions.md
   */
  useEffect(() => {
    // ✅ Skip redirect if currently processing order
    if (isProcessingOrder) {
      console.log('🔄 Order processing in progress, skipping redirect check');
      return;
    }

    if (cart !== null && (!cart || cart.items.length === 0)) {
      console.log('⚠️ Cart is empty, redirecting to order page...');
      router.push(`/${merchantCode}/order?mode=${mode}${isReservationFlow ? '&flow=reservation' : ''}${isScheduledRequested ? '&scheduled=1' : ''}`);
    }
  }, [cart, merchantCode, mode, router, isProcessingOrder]);

  // Auto-fill form if authenticated
  useEffect(() => {
    if (auth) {
      setName(auth.customer.name);
      setEmail(auth.customer.email);
      setPhone(auth.customer.phone || '');
    }
  }, [auth]);

  /**
   * Form submission handler
   * 
   * @description
   * Validates form before showing confirmation modal:
   * - Name is required
   * - Table number required for dine-in (already in cart)
   * - Delivery address + coordinates required for delivery
   * 
   * @specification FRONTEND_SPECIFICATION.md - Payment Page Validation
   */
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cart) return;

    const errors: typeof fieldErrors = {};
    let firstInvalidRef: React.RefObject<HTMLInputElement | null> | null = null;

    // Validate required fields with inline error
    if (!name.trim()) {
      errors.name = t('customer.payment.error.nameRequired');
      if (!firstInvalidRef) firstInvalidRef = nameInputRef;
    }

    // Validate phone is required
    if (!phone.trim()) {
      errors.phone = t('customer.payment.error.phoneRequired');
      if (!firstInvalidRef) firstInvalidRef = phoneInputRef;
    }

    // Validate email is required
    if (!email.trim()) {
      errors.email = t('customer.payment.error.emailRequired');
      if (!firstInvalidRef) firstInvalidRef = emailInputRef;
    } else {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = t('customer.payment.error.invalidEmail');
        if (!firstInvalidRef) firstInvalidRef = emailInputRef;
      }
    }

    // Validate table number for dine-in (only when merchant requires it)
    // Not required when scheduling for later, and not required for reservation flow.
    if (mode === 'dinein' && requireTableNumberForDineIn && !isScheduledOrder && !isReservationFlow && !tableNumber.trim()) {
      errors.tableNumber = t('customer.payment.error.tableRequired');
      if (!firstInvalidRef) firstInvalidRef = tableNumberInputRef;
    }

    // ✅ NEW: Validate delivery address and coordinates for delivery mode
    if (mode === 'delivery') {
      if (!deliveryAddress.trim()) {
        errors.deliveryAddress = t('customer.payment.error.deliveryAddressRequired') || 'Delivery address is required';
        if (!firstInvalidRef) firstInvalidRef = null; // No ref for delivery address yet
      }
      if (deliveryLatitude === null || deliveryLongitude === null) {
        errors.deliveryAddress = t('customer.payment.error.deliveryLocationRequired') || 'Please pick delivery location on map';
        if (!firstInvalidRef) firstInvalidRef = null;
      }
    }

    // ✅ NEW: Validate scheduled time (same-day; final validation happens server-side in merchant timezone)
    if (isScheduledOrder) {
      if (!scheduledTime || !isValidHHMM(scheduledTime)) {
        errors.scheduledTime = t('customer.payment.error.scheduledTimeInvalid');
      } else if (availableScheduledSlots.length > 0 && !availableScheduledSlots.includes(scheduledTime)) {
        errors.scheduledTime = t('customer.payment.error.scheduledTimeUnavailable');
      }
    }

    // If there are errors, set them and focus first invalid field
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (firstInvalidRef?.current) {
        firstInvalidRef.current.focus();
        firstInvalidRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Clear errors and show confirmation modal
    setFieldErrors({});
    setShowConfirmModal(true);
  };

  /**
   * ✅ FIXED: Clear cart AFTER navigation using setTimeout
   * 
   * @flow
   * 1. Set isProcessingOrder flag (prevents redirect)
   * 2. Create order via API (API auto-registers customer if needed)
   * 3. Auto-login guest customer (if not logged in) to get JWT token
   * 4. Clear localStorage (mode + cart cache)
   * 5. Navigate to order-summary-cash
   * 6. Clear cart context AFTER navigation (100ms delay)
   * 
   * @security
   * - JWT Bearer token authentication (optional for guests)
   * - Auto-login after order for guest tracking
   * 
   * @specification STEP_06_BUSINESS_FLOWS.txt - Order creation
   */
  const handleConfirmPayment = async () => {
    if (!cart) return;

    setIsLoading(true);
    setApiError('');
    setShowConfirmModal(false);
    setIsProcessingOrder(true);

    try {
      // ========================================
      // STEP 1: Get Access Token (if logged in)
      // ========================================
      const accessToken = auth?.accessToken;

      // ========================================
      // STEP 2: Prepare Order Payload
      // ========================================
      const orderType = mode === 'dinein' ? 'DINE_IN' : mode === 'takeaway' ? 'TAKEAWAY' : 'DELIVERY';
      // ✅ FIXED: Gunakan tableNumber dari state (bukan cart)
      const orderTableNumber = mode === 'dinein' && requireTableNumberForDineIn && !isReservationFlow ? tableNumber : null;

      // Reservation flow submits a reservation (optionally with preorder items) instead of creating an order immediately.
      if (isReservationFlow) {
        if (!reservationDetails) {
          setShowReservationDetailsModal(true);
          throw new Error(tOr(t, 'customer.reservation.error.detailsMissing', 'Reservation details are required.'));
        }

        const reservationPayload: any = {
          merchantCode: cart.merchantCode,
          customerName: name.trim(),
          customerEmail: email.trim() || undefined,
          customerPhone: phone.trim() || undefined,
          partySize: reservationDetails.partySize,
          reservationDate: reservationDetails.reservationDate,
          reservationTime: reservationDetails.reservationTime,
          items: cart.items.map((item) => ({
            menuId: item.menuId.toString(),
            quantity: item.quantity,
            notes: item.notes || undefined,
            addons: Object.values((item.addons || []).reduce((acc: Record<string, { addonItemId: string; quantity: number }>, addon: { id: string | number }) => {
              const key = addon.id.toString();
              if (!acc[key]) acc[key] = { addonItemId: key, quantity: 0 };
              acc[key].quantity += 1;
              return acc;
            }, {} as Record<string, { addonItemId: string; quantity: number }>)).map((s) => ({ addonItemId: s.addonItemId, quantity: s.quantity })),
          })),
        };

        console.log('📦 Reservation Payload:', JSON.stringify(reservationPayload, null, 2));

        const reservationResponse = await fetch('/api/public/reservations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(reservationPayload),
        });

        const reservationData = await reservationResponse.json();

        if (!reservationResponse.ok || reservationData?.success !== true) {
          throw new Error(reservationData?.message || 'Failed to submit reservation');
        }

        const reservationId = reservationData?.data?.id as string | undefined;
        if (!reservationId) {
          throw new Error('Reservation submitted, but no reservationId was returned');
        }

        // Clear local state/storage and go to history.
        localStorage.removeItem(`mode_${merchantCode}`);
        localStorage.removeItem(`cart_${merchantCode}_${mode}`);
        clearReservationDetails(merchantCode);

        router.push(`/${merchantCode}/history`);
        setTimeout(() => {
          clearCartContext();
        }, 100);

        return;
      }

      const orderPayload: any = {
        merchantCode: cart.merchantCode,
        orderType,
        tableNumber: orderTableNumber,
        customerName: name.trim(),
        customerEmail: email.trim() || undefined,
        customerPhone: phone.trim() || undefined,
        paymentMethod: mode === 'delivery' ? 'CASH_ON_DELIVERY' : 'CASH_ON_COUNTER',
        items: cart.items.map((item) => ({
          menuId: item.menuId.toString(),
          quantity: item.quantity,
          notes: item.notes || undefined,
          // Aggregate duplicate addon entries into counts (cart stores duplicates to represent qty)
          addons: Object.values((item.addons || []).reduce((acc: Record<string, { addonItemId: string; quantity: number }>, addon: { id: string | number }) => {
            const key = addon.id.toString();
            if (!acc[key]) acc[key] = { addonItemId: key, quantity: 0 };
            acc[key].quantity += 1;
            return acc;
          }, {} as Record<string, { addonItemId: string; quantity: number }>)).map((s) => ({ addonItemId: s.addonItemId, quantity: s.quantity })),
        })),
      };

      // ✅ NEW: Optional voucher code
      // Only apply voucher when customer explicitly validated it.
      if (isCustomerVoucherEnabled && voucherStatus === 'valid' && voucherCode.trim()) {
        orderPayload.voucherCode = voucherCode.trim().toUpperCase();
      }

      // ✅ NEW: Scheduled order (same-day validation happens server-side in merchant timezone)
      if (isScheduledOrder) {
        const trimmed = scheduledTime.trim();
        if (trimmed) {
          orderPayload.scheduledTime = trimmed;
        }
      }

      // ✅ NEW: Add delivery fields if delivery mode
      if (mode === 'delivery') {
        orderPayload.deliveryUnit = deliveryUnit.trim() || undefined;
        orderPayload.deliveryAddress = deliveryAddress.trim();
        orderPayload.deliveryLatitude = deliveryLatitude;
        orderPayload.deliveryLongitude = deliveryLongitude;

        orderPayload.deliveryBuildingName = deliveryBuildingName.trim() || undefined;
        orderPayload.deliveryBuildingNumber = deliveryBuildingNumber.trim() || undefined;
        orderPayload.deliveryFloor = deliveryFloor.trim() || undefined;

        const parts = deliveryAddressParts;
        if (parts) {
          orderPayload.deliveryStreetLine = parts.streetLine || undefined;
          orderPayload.deliverySuburb = parts.suburb || undefined;
          orderPayload.deliveryCity = parts.city || undefined;
          orderPayload.deliveryState = parts.state || undefined;
          orderPayload.deliveryPostcode = parts.postcode || undefined;
          orderPayload.deliveryCountry = parts.country || undefined;
        }

        const instructions = deliveryInstructions.trim();
        if (instructions) {
          orderPayload.deliveryInstructions = instructions;
        }
      }

      // ✅ Debug logging BEFORE API call
      console.log('📦 Order Payload:', JSON.stringify(orderPayload, null, 2));

      // ========================================
      // STEP 3: Create Order
      // ========================================
      const orderResponse = await fetch('/api/public/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }), // ✅ Optional auth header
        },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await orderResponse.json();

      // ✅ Log response for debugging
      console.log('📥 Order Response:', {
        status: orderResponse.status,
        ok: orderResponse.ok,
        data: orderData,
      });

      if (!orderResponse.ok) {
        console.error('❌ Order creation failed:', orderData);
        throw new Error(orderData.message || 'Failed to create order');
      }

      console.log('✅ Order created:', orderData.data.orderNumber);

      const trackingToken = typeof orderData?.data?.trackingToken === 'string' ? orderData.data.trackingToken : null;

      // ========================================
      // STEP 4: Save order for push notification tracking (24h expiry)
      // ========================================
      saveRecentOrder(orderData.data.orderNumber, merchantCode);
      console.log('📱 Order saved for push notifications:', orderData.data.orderNumber);

      // ========================================
      // STEP 5: Clear localStorage ONLY (not cart context yet)
      // ========================================

      // ✅ 2. Clear mode cache
      localStorage.removeItem(`mode_${merchantCode}`);
      console.log('🗑️ Mode cache cleared:', `mode_${merchantCode}`);

      // ✅ 3. Clear cart localStorage
      localStorage.removeItem(`cart_${merchantCode}_${mode}`);
      console.log('🗑️ Cart cache cleared:', `cart_${merchantCode}_${mode}`);

      // ✅ 4. Verify cleanup
      const modeCheck = localStorage.getItem(`mode_${merchantCode}`);
      const cartCheck = localStorage.getItem(`cart_${merchantCode}_${mode}`);
      console.log('🔍 Cleanup verification:', {
        modeCache: modeCheck === null ? 'CLEARED ✅' : `STILL EXISTS: ${modeCheck}`,
        cartCache: cartCheck === null ? 'CLEARED ✅' : `STILL EXISTS: ${cartCheck}`,
      });

      // ========================================
      // STEP 5: Navigate FIRST, then clear cart context
      // ========================================

      // ✅ 5. Navigate to summary
      router.push(
        `/${merchantCode}/order-summary-cash?orderNumber=${encodeURIComponent(orderData.data.orderNumber)}&mode=${encodeURIComponent(mode)}${trackingToken ? `&token=${encodeURIComponent(trackingToken)}` : ''}`
      );

      // ✅ 6. Clear cart context AFTER navigation (delayed)
      setTimeout(() => {
        clearCartContext();
        console.log('🗑️ Cart context cleared (delayed)');
      }, 100);

    } catch (err) {
      console.error('❌ Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setApiError(errorMessage);
      setIsLoading(false);
      setIsProcessingOrder(false);
      setShowConfirmModal(false);

      // ✅ Scroll to top to show error message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ✅ FIXED: Calculate with all fees
  const cartSubtotal = cart ? calculateCartSubtotal(cart.items) : 0;
  const taxAmount = cartSubtotal * (merchantTaxPercentage / 100);
  const serviceChargeAmount = cartSubtotal * (merchantServiceChargePercent / 100);
  const packagingFeeAmount = merchantPackagingFee;
  const totalPayment = cartSubtotal + taxAmount + serviceChargeAmount + packagingFeeAmount + (mode === 'delivery' ? deliveryFee : 0);
  const voucherDiscountApplied = isCustomerVoucherEnabled ? Math.min(Math.max(0, voucherDiscountAmount), totalPayment) : 0;
  const totalPaymentAfterVoucher = Math.max(0, totalPayment - voucherDiscountApplied);

  const voucherTypeLabel = (() => {
    if (voucherStatus !== 'valid') return '';
    if (!voucherDiscountType) return '';
    if (voucherDiscountType === 'PERCENTAGE') {
      const pct = Math.max(0, Math.min(100, voucherDiscountValue));
      return `${pct}%`;
    }
    if (voucherDiscountType === 'FIXED_AMOUNT') {
      return formatCurrency(Math.max(0, voucherDiscountValue));
    }
    return '';
  })();

  // Loading state while cart initializes
  if (cart === null) {
    return (
      <>
        {/* Header Skeleton */}
        <div className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 h-14">
            <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
            <div className="w-24 h-5 bg-gray-200 rounded animate-pulse" />
            <div className="w-10" />
          </div>
        </div>

        <main className="flex-1 overflow-y-auto py-4 pb-6">
          {/* Order Type Badge Skeleton */}
          <section className="pb-3">
            <div className="mt-4 mx-4 h-9 bg-gray-100 rounded-lg animate-pulse" />
          </section>

          {/* Customer Info Form Skeleton */}
          <div className="p-4 pb-0">
            <div className="w-48 h-5 bg-gray-200 rounded mb-3 animate-pulse" />

            {/* Name Field Skeleton */}
            <div className="w-24 h-4 bg-gray-200 rounded mb-1 animate-pulse" />
            <div className="w-full h-12 bg-gray-100 rounded-xl mb-3 animate-pulse" />

            {/* Phone Field Skeleton */}
            <div className="w-32 h-4 bg-gray-200 rounded mb-1 animate-pulse" />
            <div className="w-full h-12 bg-gray-100 rounded-xl mb-3 animate-pulse" />

            {/* Email Field Skeleton */}
            <div className="w-36 h-4 bg-gray-200 rounded mb-1 animate-pulse" />
            <div className="w-full h-12 bg-gray-100 rounded-xl mb-3 animate-pulse" />
          </div>

          {/* Cashier Image Skeleton */}
          <div className="flex flex-col items-center text-center mb-20 px-8 py-8">
            <div className="w-64 h-48 bg-gray-200 rounded-lg mb-3 animate-pulse" />
            <div className="w-56 h-4 bg-gray-200 rounded mb-2 animate-pulse" />
            <div className="w-48 h-4 bg-gray-200 rounded animate-pulse" />
          </div>
        </main>

        {/* Bottom Payment Bar Skeleton */}
        <div
          className="fixed bottom-0 left-0 right-0 bg-white z-10"
          style={{
            boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
            borderRadius: '16px 16px 0 0',
            maxWidth: '500px',
            margin: '0 auto'
          }}
        >
          <div className="flex pt-3 px-4 pb-2 m-4 items-center gap-4">
            <div className="flex flex-col w-1/2 gap-2">
              <div className="w-28 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="w-24 h-6 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="w-1/2 h-12 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header - Profile Style */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => router.push(`/${merchantCode}/view-order?mode=${mode}${isReservationFlow ? '&flow=reservation' : ''}${isScheduledRequested ? '&scheduled=1' : ''}`)}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label="Back"
          >
            <FaArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-gray-900 text-base pr-10">
            {t('customer.payment.title')}
          </h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto  py-4 pb-6">

        {/* API Error Message */}
        {apiError && (
          <div className="m-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center gap-2">
              <FaExclamationCircle className="w-4 h-4" />
              <span>{apiError}</span>
            </p>
          </div>
        )}

        <section className="pb-3">
          <div
            className="flex items-center justify-between mt-4 mx-4 relative"
            style={{
              height: '36px',
              fontSize: '0.8rem',
              padding: '8px 16px',
              border: '1px solid #f05a28',
              borderRadius: '8px',
              backgroundColor: 'rgba(240, 90, 40, 0.1)'
            }}
          >
            <span className="text-gray-700">{t('order.type')}</span>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {mode === 'dinein'
                  ? t('customer.mode.dineIn')
                  : mode === 'takeaway'
                    ? t('customer.mode.pickUp')
                      : tOr(t, 'customer.mode.delivery', 'Delivery')}
              </span>
              <FaCheckCircle style={{ width: '18px', height: '18px', color: '#212529' }} />
            </div>
          </div>
        </section>

        {/* Reservation Summary (Reservation flow only) */}
        {isReservationFlow && (
          <div className="mx-4 -mt-1">
            <button
              type="button"
              onClick={() => setShowReservationDetailsModal(true)}
              className="w-full text-left"
              aria-label={tOr(t, 'customer.reservationDetails.editAriaLabel', 'Edit reservation details')}
              style={{
                backgroundColor: '#fff7ed',
                padding: '12px 16px',
                borderRadius: '16px',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2" style={{ fontSize: '14px', fontWeight: 600, color: '#212529' }}>
                    <FaUsers className="w-4 h-4" />
                    <span>{tOr(t, 'customer.reservationDetails.pillLabel', 'Reservation')}</span>
                  </div>

                  {reservationDetails ? (
                    <div className="mt-1 flex flex-wrap items-center gap-2" style={{ fontSize: '14px', fontWeight: 500, color: '#212529' }}>
                      <span style={{ fontWeight: 700 }}>{reservationDetails.partySize}</span>
                      <span>•</span>
                      <span>{reservationDetails.reservationDate}</span>
                      <span>•</span>
                      <span>{reservationDetails.reservationTime}</span>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-gray-700">
                      {tOr(t, 'customer.reservationDetails.detailsMissing', 'Tap to add date, time, and number of people.')}
                    </p>
                  )}
                </div>
                      <span className="text-sm font-semibold">{t('common.edit')}</span>
                <div className="shrink-0 flex items-center gap-2 text-gray-700">
                  <span className="text-sm font-semibold">Edit</span>
                  <FaChevronDown className="w-4 h-4" style={{ transform: 'rotate(-90deg)' }} />
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Customer Info Form (ESB Exact Match) */}
        <div className="p-4 pb-0">
          <div className="flex items-center mb-2">
            <span
              className="font-semibold"
              style={{ fontSize: '16px', color: '#101828' }}
            >
              {t('customer.payment.customerInfo')}
            </span>
          </div>

          <form onSubmit={handleFormSubmit} className="flex flex-col">
            {/* Full Name */}
            <label
              htmlFor="name"
              className="mb-1"
              style={{ fontSize: '14px', color: '#212529' }}
            >
              {t('auth.fullName')}<span className="text-red-500">*</span>
            </label>
            <div className="relative mb-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: fieldErrors.name ? '#EF4444' : '#9CA3AF' }}>
                <FaUser className="w-5 h-5" />
              </div>
              <input
                ref={nameInputRef}
                id="name"
                type="text"
                required
                maxLength={100}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                }}
                disabled={!!(auth && auth.customer.name)}
                className={`w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm focus:outline-none transition-colors ${fieldErrors.name
                  ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]'
                  } ${(auth && auth.customer.name) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                placeholder={t('auth.fullName')}
              />
            </div>
            {fieldErrors.name && (
              <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                <FaExclamationCircle className="w-3 h-3" />
                {fieldErrors.name}
              </p>
            )}
            {!fieldErrors.name && <div className="mb-2" />}

            {/* Phone Number */}
            <label
              htmlFor="phone"
              className="mb-1"
              style={{ fontSize: '14px', color: '#212529' }}
            >
              {t('auth.phoneNumber')}<span className="text-red-500">*</span>
            </label>
            <div className="relative mb-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: fieldErrors.phone ? '#EF4444' : '#9CA3AF' }}>
                <FaPhone className="w-5 h-5" />
              </div>
              <input
                ref={phoneInputRef}
                id="phone"
                type="tel"
                inputMode="numeric"
                minLength={9}
                maxLength={18}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: undefined }));
                }}
                disabled={!!(auth && auth.customer.phone)}
                className={`w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm focus:outline-none transition-colors ${fieldErrors.phone
                  ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]'
                  } ${(auth && auth.customer.phone) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                placeholder={t('auth.phoneNumber')}
              />
            </div>
            {fieldErrors.phone && (
              <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                <FaExclamationCircle className="w-3 h-3" />
                {fieldErrors.phone}
              </p>
            )}
            {!fieldErrors.phone && <div className="mb-2" />}

            {/* Email */}
            <label
              htmlFor="email"
              className="mb-1"
              style={{ fontSize: '14px', color: '#212529' }}
            >
              {t('customer.payment.sendReceipt')}<span className="text-red-500">*</span>
            </label>
            <div className="relative mb-1">
              <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: fieldErrors.email ? '#EF4444' : '#9CA3AF' }}>
                <FaEnvelope className="w-5 h-5" />
              </div>
              <input
                ref={emailInputRef}
                id="email"
                type="email"
                required
                maxLength={50}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                }}
                disabled={!!(auth && auth.customer.email)}
                className={`w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm focus:outline-none transition-colors ${fieldErrors.email
                  ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]'
                  } ${(auth && auth.customer.email) ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
                placeholder={t('auth.email')}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                <FaExclamationCircle className="w-3 h-3" />
                {fieldErrors.email}
              </p>
            )}
            {!fieldErrors.email && <div className="mb-2" />}

            {/* Table Number (Dine-in only; shown only if merchant uses tables) */}
            {shouldShowTableNumberField && (
              <>
                <label
                  htmlFor="tableNumber"
                  className="mb-1"
                  style={{ fontSize: '14px', color: '#212529' }}
                >
                  {t('customer.table.title')}{!isScheduledOrder ? <span className="text-red-500">*</span> : null}
                </label>
                <div className="relative mb-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: fieldErrors.tableNumber ? '#EF4444' : '#9CA3AF' }}>
                    <FaTable className="w-5 h-5" />
                  </div>
                  <input
                    ref={tableNumberInputRef}
                    id="tableNumber"
                    type="text"
                    required={!isScheduledOrder}
                    maxLength={50}
                    value={tableNumber}
                    onChange={(e) => {
                      setTableNumber(e.target.value);
                      if (fieldErrors.tableNumber) setFieldErrors(prev => ({ ...prev, tableNumber: undefined }));
                    }}
                    className={`w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm bg-white focus:outline-none transition-colors ${fieldErrors.tableNumber
                      ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]'
                      }`}
                    placeholder={t('customer.table.title')}
                  />
                </div>
                {fieldErrors.tableNumber && (
                  <p className="text-xs text-red-500 mb-2 flex items-center gap-1">
                    <FaExclamationCircle className="w-3 h-3" />
                    {fieldErrors.tableNumber}
                  </p>
                )}
                {!fieldErrors.tableNumber && <div className="mb-2" />}
              </>
            )}

            {/* ✅ NEW: Scheduled order (same-day) */}
            {isScheduledOrderEnabled && !isReservationFlow && (
              <>
                <div className="mb-4 mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isScheduledOrder}
                      onClick={() => {
                        const next = !isScheduledOrder;
                        setIsScheduledOrder(next);

                        if (!next) {
                          setScheduledTime('');
                          if (fieldErrors.scheduledTime) setFieldErrors((prev) => ({ ...prev, scheduledTime: undefined }));
                          return;
                        }

                        // Pre-fill with a best-effort "merchant now" suggestion; available-times fetch may refine it.
                        const suggested = suggestNextTimeFromNowLabel(merchantNowTimeLabel, 15);
                        setScheduledTime(suggested);
                        if (fieldErrors.tableNumber) setFieldErrors((prev) => ({ ...prev, tableNumber: undefined }));
                      }}
                      className="flex w-full items-start gap-3 text-left cursor-pointer select-none"
                    >
                      <span className="mt-0.5">
                        {isScheduledOrder ? (
                          <FaToggleOn className="h-5 w-5 text-[#f05a28]" />
                        ) : (
                          <FaToggleOff className="h-5 w-5 text-gray-400" />
                        )}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2" style={{ fontSize: '14px', color: '#212529' }}>
                          <FaClock className="w-4 h-4" style={{ color: fieldErrors.scheduledTime ? '#EF4444' : '#9CA3AF' }} />
                          <span className="font-medium">{t('customer.payment.scheduled.title')}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {t('customer.payment.scheduled.hint')}
                          {contextMerchantInfo?.timezone ? ` (${contextMerchantInfo.timezone})` : ''}.
                          {merchantNowTimeLabel ? ` ${t('customer.payment.scheduled.now')}: ${merchantNowTimeLabel}` : ''}
                        </p>
                      </div>
                    </button>
                  </div>

                  {isScheduledOrder && (
                    <div className="mt-3">
                      <label
                        htmlFor="scheduledTime"
                        className="mb-1 block"
                        style={{ fontSize: '14px', color: '#212529' }}
                      >
                        {t('customer.payment.scheduled.timeLabel')}
                      </label>
                      {availableScheduledSlots.length > 0 ? (
                        <select
                          id="scheduledTime"
                          value={scheduledTime}
                          onChange={(e) => {
                            setScheduledTime(e.target.value);
                            if (fieldErrors.scheduledTime) setFieldErrors((prev) => ({ ...prev, scheduledTime: undefined }));
                          }}
                          disabled={availableScheduledSlotsLoading}
                          className={`w-full h-12 px-4 border-2 rounded-xl text-sm font-semibold bg-white focus:outline-none transition-colors ${fieldErrors.scheduledTime
                            ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]'
                            }`}
                        >
                          {availableScheduledSlots.map((slot) => (
                            <option key={slot} value={slot}>
                              {slot}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          id="scheduledTime"
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => {
                            setScheduledTime(e.target.value);
                            if (fieldErrors.scheduledTime) setFieldErrors((prev) => ({ ...prev, scheduledTime: undefined }));
                          }}
                          className={`w-full h-12 px-4 border-2 rounded-xl text-sm font-semibold bg-white focus:outline-none transition-colors ${fieldErrors.scheduledTime
                            ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                            : 'border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]'
                            }`}
                        />
                      )}

                      {availableScheduledSlotsError ? (
                        <p className="text-xs text-gray-500 mt-2">{availableScheduledSlotsError}</p>
                      ) : null}
                      {fieldErrors.scheduledTime && (
                        <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                          <FaExclamationCircle className="w-3 h-3" />
                          {fieldErrors.scheduledTime}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ✅ NEW: Delivery Mode - Address & Map Picker */}
            {mode === 'delivery' && isDeliveryAvailable && (
              <>
                <div className="mb-4 mt-4 pt-4 border-t border-gray-200">
                  <DeliveryAddressPicker
                    deliveryUnit={deliveryUnit}
                    onUnitChange={setDeliveryUnit}
                    deliveryBuildingName={deliveryBuildingName}
                    onBuildingNameChange={setDeliveryBuildingName}
                    deliveryBuildingNumber={deliveryBuildingNumber}
                    onBuildingNumberChange={setDeliveryBuildingNumber}
                    deliveryFloor={deliveryFloor}
                    onFloorChange={setDeliveryFloor}
                    deliveryInstructions={deliveryInstructions}
                    onInstructionsChange={setDeliveryInstructions}
                    onAddressPartsChange={setDeliveryAddressParts}
                    onAddressChange={setDeliveryAddress}
                    onCoordinatesChange={(lat, lng) => {
                      setDeliveryLatitude(lat);
                      setDeliveryLongitude(lng);
                    }}
                    deliveryAddress={deliveryAddress}
                    deliveryLatitude={deliveryLatitude}
                    deliveryLongitude={deliveryLongitude}
                    merchantLatitude={(contextMerchantInfo as any)?.latitude !== undefined && (contextMerchantInfo as any)?.latitude !== null
                      ? Number((contextMerchantInfo as any).latitude)
                      : null}
                    merchantLongitude={(contextMerchantInfo as any)?.longitude !== undefined && (contextMerchantInfo as any)?.longitude !== null
                      ? Number((contextMerchantInfo as any).longitude)
                      : null}
                    error={fieldErrors.deliveryAddress}
                  />
                </div>

                {/* Delivery Fee Preview */}
                <div className="mb-4">
                  <DeliveryFeePreview
                    merchantCode={merchantCode}
                    deliveryLatitude={deliveryLatitude}
                    deliveryLongitude={deliveryLongitude}
                    deliveryAddress={deliveryAddress}
                    currency={merchantCurrency}
                    onFeeCalculated={setDeliveryFee}
                    onError={setDeliveryFeeError}
                  />
                </div>
              </>
            )}
          </form>

          {/* Voucher */}
          {isCustomerVoucherEnabled ? (
            <div className="mx-4 mt-4 rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  {tOr(t, 'customer.payment.voucher.title', 'Voucher')}
                </div>
                {voucherStatus === 'valid' && voucherCode.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setVoucherCode('');
                      setVoucherStatus('idle');
                      setVoucherMessage('');
                      setVoucherLabel('');
                      setVoucherDiscountAmount(0);
                      setVoucherDiscountType(null);
                      setVoucherDiscountValue(0);
                    }}
                    className="text-xs font-semibold text-gray-600 hover:text-gray-900"
                  >
                    {tOr(t, 'customer.payment.voucher.remove', 'Remove')}
                  </button>
                )}
              </div>

              {voucherStatus === 'valid' && voucherDiscountApplied > 0 ? (
                <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-green-800 truncate">
                        {voucherLabel || tOr(t, 'customer.payment.voucher.title', 'Voucher')}
                      </div>
                      {voucherTypeLabel ? (
                        <div className="mt-0.5 text-xs font-semibold text-green-700">
                          {voucherTypeLabel}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 text-sm font-bold text-green-800">
                      -{formatCurrency(voucherDiscountApplied)}
                    </div>
                  </div>
                  {voucherMessage ? (
                    <div className="mt-1 text-xs text-green-700">{voucherMessage}</div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2">
                  <label
                    htmlFor="voucherCode"
                    className="mb-1 block"
                    style={{ fontSize: '14px', color: '#212529' }}
                  >
                    {tOr(t, 'customer.payment.voucher.codeLabel', 'Voucher code')}
                  </label>

                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: voucherStatus === 'invalid' ? '#EF4444' : '#9CA3AF' }}>
                        <FaTag className="w-5 h-5" />
                      </div>
                      <input
                        id="voucherCode"
                        value={voucherCode}
                        onChange={(e) => {
                          setVoucherCode(normalizeVoucherCode(e.target.value));
                          if (voucherStatus !== 'idle') {
                            setVoucherStatus('idle');
                            setVoucherMessage('');
                            setVoucherLabel('');
                            setVoucherDiscountAmount(0);
                            setVoucherDiscountType(null);
                            setVoucherDiscountValue(0);
                          }
                        }}
                        placeholder={tOr(t, 'customer.payment.voucher.placeholder', 'Enter voucher code')}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        spellCheck={false}
                        inputMode="text"
                        className={`w-full h-12 pl-11 pr-4 border-2 rounded-xl text-sm bg-white focus:outline-none transition-colors ${voucherStatus === 'invalid'
                          ? 'border-red-500 ring-1 ring-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:ring-1 focus:ring-[#f05a28] focus:border-[#f05a28]'
                          }`}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={voucherStatus === 'checking' || !voucherCode.trim()}
                      onClick={() => validateVoucher(voucherCode)}
                      className="h-12 rounded-xl px-4 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ backgroundColor: '#f05a28' }}
                    >
                      {voucherStatus === 'checking'
                        ? tOr(t, 'customer.payment.voucher.checking', 'Checking...')
                        : tOr(t, 'customer.payment.voucher.check', 'Check')}
                    </button>
                  </div>

                  {voucherStatus === 'invalid' && voucherMessage && (
                    <div className="mt-2 text-sm text-red-700">{voucherMessage}</div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Payment instructions */}
        <div
          className="flex flex-col items-center text-center mb-20"
          style={{
            padding: '32px',
            gap: '12px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            letterSpacing: '0.25px',
            lineHeight: '20px',
            color: '#212529'
          }}
        >
          <div>
            <Image
              src={mode === 'delivery' ? '/images/cod.png' : '/images/cashier.png'}
              alt={mode === 'delivery'
                ? tOr(t, 'customer.payment.altPayOnDelivery', 'Pay on Delivery')
                : tOr(t, 'customer.payment.altPayAtCashier', 'Pay at Cashier')}
              width={300}
              height={300}
              style={{ maxWidth: '300px', height: 'auto' }}
            />
          </div>
          <div>
            <span>
              {mode === 'delivery'
                ? (t('customer.payment.payOnDeliveryHint') || 'Pay on delivery. You can track your driver after the order is accepted.')
                : t('customer.payment.showQRCode')}
            </span>
          </div>
        </div>
      </main>

      {/* ===== FIXED BOTTOM PAYMENT BAR (ESB Exact Match) ===== */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white z-10"
        style={{
          boxShadow: '0 -4px 12px rgba(0,0,0,0.15)',
          borderRadius: '16px 16px 0 0',
          maxWidth: '500px',
          margin: '0 auto',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          letterSpacing: '0.25px',
          lineHeight: '20px'
        }}
      >
        {/* Detail Payment Section (shown when expanded) */}
        {showPaymentDetails && (
          <div className="flex flex-col px-4 pt-4 mt-2 mx-2">
            {/* Tax Row */}
            {taxAmount > 0 && (
              <div
                className="flex mb-1"
                style={{ fontSize: '0.9rem', color: '#AEB3BE' }}
              >
                <div className="grow">{t('customer.payment.inclTax')}</div>
                <div>{formatCurrency(taxAmount)}</div>
              </div>
            )}
            {/* Service Charge Row */}
            {serviceChargeAmount > 0 && (
              <div
                className="flex mb-1"
                style={{ fontSize: '0.9rem', color: '#AEB3BE' }}
              >
                <div className="grow">{t('customer.payment.serviceCharge')}</div>
                <div>{formatCurrency(serviceChargeAmount)}</div>
              </div>
            )}
            {/* Packaging Fee Row */}
            {packagingFeeAmount > 0 && (
              <div
                className="flex mb-1"
                style={{ fontSize: '0.9rem', color: '#AEB3BE' }}
              >
                <div className="grow">{t('customer.payment.packagingFee')}</div>
                <div>{formatCurrency(packagingFeeAmount)}</div>
              </div>
            )}
            {/* ✅ NEW: Delivery Fee Row */}
            {mode === 'delivery' && deliveryFee > 0 && (
              <div
                className="flex mb-1"
                style={{ fontSize: '0.9rem', color: '#AEB3BE' }}
              >
                <div className="grow">{t('customer.delivery.fee') || 'Delivery Fee'}</div>
                <div>{formatCurrency(deliveryFee)}</div>
              </div>
            )}

            {/* Voucher Discount Row */}
            {voucherDiscountApplied > 0 && (
              <div
                className="flex mb-1"
                style={{ fontSize: '0.9rem', color: '#AEB3BE' }}
              >
                <div className="grow">
                  {(() => {
                    const base = tOr(t, 'customer.payment.voucher.discount', 'Voucher discount');
                    const parts = [voucherLabel || null, voucherTypeLabel || null].filter(Boolean).join(' • ');
                    return parts ? `${base} (${parts})` : base;
                  })()}
                </div>
                <div>-{formatCurrency(voucherDiscountApplied)}</div>
              </div>
            )}
          </div>
        )}

        {/* Payment Total + Button */}
        <div className="flex pt-3 px-4 pb-2 m-4 items-center">
          {/* Left: Payment Total */}
          <div className="flex flex-col w-1/2">
            <div
              className="flex items-center cursor-pointer"
              style={{ lineHeight: 1, color: '#212529' }}
              onClick={() => setShowPaymentDetails(!showPaymentDetails)}
            >
              {t('customer.payment.paymentTotal')}
                <FaChevronDown
                  style={{
                    width: '20px',
                    height: '20px',
                    marginLeft: '4px',
                    transform: showPaymentDetails ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                  }}
                />
            </div>
            <div
              className="flex items-center"
              style={{ fontWeight: 'bold', fontSize: '20px', lineHeight: 1.5, color: '#101828' }}
            >
              {formatCurrency(totalPaymentAfterVoucher)}
            </div>
          </div>

          {/* Right: Pay at Cashier Button */}
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={isLoading}
            className="w-1/2 py-3 text-white font-semibold rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: '#f05a28',
              fontSize: '16px'
            }}
          >
            {isLoading
              ? t('customer.payment.processing')
              : (mode === 'delivery'
                ? tOr(t, 'customer.payment.placeDeliveryOrder', 'Place delivery order')
                : t('customer.payment.payAtCashier'))}
          </button>
        </div>
      </div>

      {/* Reservation Details Modal (Reservation flow only) */}
      {isReservationFlow && (
        <ReservationDetailsModal
          merchantCode={merchantCode}
          merchantTimezone={contextMerchantInfo?.timezone || 'Australia/Sydney'}
          isOpen={showReservationDetailsModal}
          onConfirm={(details) => {
            setReservationDetails(details);
            setShowReservationDetailsModal(false);
          }}
        />
      )}

      {/* Payment Confirmation Modal */}
      <PaymentConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmPayment}
        mode={mode}
      />
    </>
  );
}
