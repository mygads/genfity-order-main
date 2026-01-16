"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FaBuilding,
  FaMapMarkerAlt,
  FaClock,
  FaSlidersH,
  FaPuzzlePiece,
  FaTruck,
  FaMoneyBillWave,
  FaCashRegister,
  FaReceipt,
  FaChair,
  FaLock,
  FaTag,
  FaExclamationTriangle,
} from "react-icons/fa";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminFormFooter from "@/components/common/AdminFormFooter";
import SettingsSidebarNav from "@/components/common/SettingsSidebarNav";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import Button from "@/components/ui/Button";
import Switch from "@/components/ui/Switch";
import { COUNTRIES, CURRENCIES, getCurrencyConfig, getCurrencyForCountry, getDefaultTimezoneForCountry, getTimezonesForCountry } from "@/lib/constants/location";
import { ReceiptTemplateTab } from "@/components/merchants/ReceiptTemplateTab";
import { ReceiptSettings, DEFAULT_RECEIPT_SETTINGS } from "@/lib/types/receiptSettings";
import { useTranslation, tOr } from "@/lib/i18n/useTranslation";
import { TranslationKeys } from "@/lib/i18n";
import SubscriptionRequired from "@/components/subscription/SubscriptionRequired";
import { useContextualHint, CONTEXTUAL_HINTS } from "@/lib/tutorial";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import { getPosCustomItemsSettings } from "@/lib/utils/posCustomItemsSettings";
import BasicInfoTab from "@/components/merchants/merchant-edit/tabs/BasicInfoTab";
import PosSettingsTab from "@/components/merchants/merchant-edit/tabs/PosSettingsTab";
import DeliveryTab from "@/components/merchants/merchant-edit/tabs/DeliveryTab";
import LocationTabComponent from "@/components/merchants/merchant-edit/tabs/LocationTab";
import SaleModesTabComponent from "@/components/merchants/merchant-edit/tabs/SaleModesTab";
import FeaturesTab from "@/components/merchants/merchant-edit/tabs/FeaturesTab";
import DiscountVoucherTab from "@/components/merchants/merchant-edit/tabs/DiscountVoucherTab";
import OpeningHoursTabComponent from "@/components/merchants/merchant-edit/tabs/OpeningHoursTab";
import TableSettingsTabComponent from "@/components/merchants/merchant-edit/tabs/TableSettingsTab";
import FeesTabComponent from "@/components/merchants/merchant-edit/tabs/FeesTab";
import PinTab from "@/components/merchants/merchant-edit/tabs/PinTab";
import type { MerchantFormData, OpeningHour } from "@/components/merchants/merchant-edit/types";
import { hasMerchantUnsavedChanges } from "@/components/merchants/merchant-edit/utils/unsavedChanges";
import type { PerDayModeScheduleHandle } from "@/components/merchants/PerDayModeSchedule";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Edit Merchant Page for Merchant Owner/Staff
 * Allows merchant owners to edit their own merchant information
 * Organized into tabs for better UX
 */
export default function EditMerchantPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { toasts, success: showSuccess, error: showError } = useToast();
  const { showHint } = useContextualHint();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const perDayModeScheduleRef = useRef<PerDayModeScheduleHandle>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [posCustomItemsEnabled, setPosCustomItemsEnabled] = useState(true);
  const [posCustomItemsMaxNameLength, setPosCustomItemsMaxNameLength] = useState<number>(80);
  const [posCustomItemsMaxPrice, setPosCustomItemsMaxPrice] = useState<number>(1);

  const [receiptBillingInfo, setReceiptBillingInfo] = useState<{
    balance: number;
    completedOrderEmailFee: number;
    currency: string;
  } | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [authToken, setAuthToken] = useState<string>("");

  // Discount & voucher feature toggles
  const [posDiscountsEnabled, setPosDiscountsEnabled] = useState<boolean>(true);
  const [customerVouchersEnabled, setCustomerVouchersEnabled] = useState<boolean>(true);
  const [originalDiscountVoucherSettings, setOriginalDiscountVoucherSettings] = useState<{
    posDiscountsEnabled: boolean;
    customerVouchersEnabled: boolean;
  } | null>(null);

  // Unsaved changes tracking
  const [originalFormData, setOriginalFormData] = useState<MerchantFormData | null>(null);
  const [originalOpeningHours, setOriginalOpeningHours] = useState<OpeningHour[]>([]);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Reservations enable wizard
  const [showReservationsWizard, setShowReservationsWizard] = useState(false);
  const [reservationsWizardError, setReservationsWizardError] = useState<string>("");
  const [reservationsWizardTotalTables, setReservationsWizardTotalTables] = useState<number>(0);
  const [reservationsWizardRequirePreorder, setReservationsWizardRequirePreorder] = useState<boolean>(false);
  const [reservationsWizardMinItems, setReservationsWizardMinItems] = useState<number>(0);

  // PIN state
  const [deletePin, setDeletePin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [hasExistingPin, setHasExistingPin] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [savingPin, setSavingPin] = useState(false);
  const [removePinConfirmOpen, setRemovePinConfirmOpen] = useState(false);

  const [formData, setFormData] = useState<MerchantFormData>({
    name: "",
    code: "",
    description: "",
    address: "",
    email: "",
    phoneNumber: "",
    logoUrl: "",
    bannerUrl: "",
    country: "Australia",
    currency: "AUD",
    timezone: "Australia/Sydney",
    latitude: null,
    longitude: null,
    // Delivery settings
    isDeliveryEnabled: false,
    enforceDeliveryZones: true,
    deliveryMaxDistanceKm: null,
    deliveryFeeBase: 0,
    deliveryFeePerKm: 0,
    deliveryFeeMin: null,
    deliveryFeeMax: null,
    // Sale mode settings
    isDineInEnabled: true,
    isTakeawayEnabled: false,
    requireTableNumberForDineIn: false,
    dineInLabel: "",
    takeawayLabel: "",
    deliveryLabel: "",
    dineInScheduleStart: "",
    dineInScheduleEnd: "",
    takeawayScheduleStart: "",
    takeawayScheduleEnd: "",
    deliveryScheduleStart: "",
    deliveryScheduleEnd: "",
    totalTables: null,
    // POS settings
    posPayImmediately: true,
    // Reservation settings
    isReservationEnabled: false,
    reservationMenuRequired: false,
    reservationMinItemCount: 0,
    // Scheduled orders
    isScheduledOrderEnabled: false,
    // Fee settings
    enableTax: false,
    taxPercentage: 0,
    enableServiceCharge: false,
    serviceChargePercent: 0,
    enablePackagingFee: false,
    packagingFeeAmount: 0,
    // Receipt settings
    receiptSettings: { ...DEFAULT_RECEIPT_SETTINGS },
  });

  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([
    { dayOfWeek: 0, openTime: "09:00", closeTime: "22:00", isClosed: false },
    { dayOfWeek: 1, openTime: "09:00", closeTime: "22:00", isClosed: false },
    { dayOfWeek: 2, openTime: "09:00", closeTime: "22:00", isClosed: false },
    { dayOfWeek: 3, openTime: "09:00", closeTime: "22:00", isClosed: false },
    { dayOfWeek: 4, openTime: "09:00", closeTime: "22:00", isClosed: false },
    { dayOfWeek: 5, openTime: "09:00", closeTime: "22:00", isClosed: false },
    { dayOfWeek: 6, openTime: "09:00", closeTime: "22:00", isClosed: false },
  ]);

  // Show contextual hints on first visit
  useEffect(() => {
    if (!loading) {
      showHint(CONTEXTUAL_HINTS.merchantSettingsFirstVisit);
      // Show opening hours tip when on opening hours tab
      if (activeTab === 'hours') {
        showHint(CONTEXTUAL_HINTS.openingHoursTip);
      }
    }
  }, [loading, activeTab, showHint]);

  const tabIds = useMemo(() => {
    return new Set([
      'basic',
      'location',
      'hours',
      'sale-modes',
      'features',
      'delivery',
      'table-settings',
      'fees',
      'discount-voucher',
      'pos-settings',
      'receipt',
      'pin',
    ]);
  }, []);

  useEffect(() => {
    fetchMerchant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const initialTab = new URLSearchParams(window.location.search).get('tab');
    if (initialTab && tabIds.has(initialTab)) {
      setActiveTab(initialTab);
    }
    // Run only once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabIds]);

  const fetchMerchant = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }
      setAuthToken(token);

      const response = await fetch("/api/merchant/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch merchant");
      }

      const merchant = data.data;

      const merchantCurrency = merchant.currency || 'AUD';
      const balanceAmount = merchant?.merchantBalance?.balance
        ? parseFloat(merchant.merchantBalance.balance)
        : 0;
      const completedOrderEmailFee = typeof merchant?.completedOrderEmailFee === 'number'
        ? merchant.completedOrderEmailFee
        : merchant?.completedOrderEmailFee
          ? parseFloat(merchant.completedOrderEmailFee)
          : 0;

      setReceiptBillingInfo({
        balance: Number.isFinite(balanceAmount) ? balanceAmount : 0,
        completedOrderEmailFee: Number.isFinite(completedOrderEmailFee) ? completedOrderEmailFee : 0,
        currency: merchantCurrency,
      });

      // POS settings hydration via dedicated endpoint (avoids relying on profile payload shape)
      try {
        const posSettingsResponse = await fetch("/api/merchant/pos-settings", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const posSettingsData = await posSettingsResponse.json();

        if (posSettingsResponse.ok && posSettingsData?.data?.customItems) {
          setPosCustomItemsEnabled(Boolean(posSettingsData.data.customItems.enabled));
          setPosCustomItemsMaxNameLength(Number(posSettingsData.data.customItems.maxNameLength ?? 80));
          setPosCustomItemsMaxPrice(Number(posSettingsData.data.customItems.maxPrice ?? 1));
        } else {
          // Fallback to computed defaults
          const posCustomItems = getPosCustomItemsSettings({
            features: merchant.features,
            currency: merchantCurrency,
          });
          setPosCustomItemsEnabled(posCustomItems.enabled);
          setPosCustomItemsMaxNameLength(posCustomItems.maxNameLength);
          setPosCustomItemsMaxPrice(posCustomItems.maxPrice);
        }
      } catch {
        const posCustomItems = getPosCustomItemsSettings({
          features: merchant.features,
          currency: merchantCurrency,
        });
        setPosCustomItemsEnabled(posCustomItems.enabled);
        setPosCustomItemsMaxNameLength(posCustomItems.maxNameLength);
        setPosCustomItemsMaxPrice(posCustomItems.maxPrice);
      }

      setFormData({
        name: merchant.name || "",
        code: merchant.code || "",
        description: merchant.description || "",
        address: merchant.address || "",
        email: merchant.email || "",
        phoneNumber: merchant.phoneNumber || "",
        logoUrl: merchant.logoUrl || "",
        bannerUrl: merchant.bannerUrl || "",
        country: merchant.country || "Australia",
        currency: merchantCurrency,
        timezone: merchant.timezone || "Australia/Sydney",
        latitude: merchant.latitude ? parseFloat(merchant.latitude) : null,
        longitude: merchant.longitude ? parseFloat(merchant.longitude) : null,
        // Delivery settings
        isDeliveryEnabled: merchant.isDeliveryEnabled ?? false,
        enforceDeliveryZones: merchant.enforceDeliveryZones ?? true,
        deliveryMaxDistanceKm: merchant.deliveryMaxDistanceKm ? parseFloat(merchant.deliveryMaxDistanceKm) : null,
        deliveryFeeBase: merchant.deliveryFeeBase ? parseFloat(merchant.deliveryFeeBase) : 0,
        deliveryFeePerKm: merchant.deliveryFeePerKm ? parseFloat(merchant.deliveryFeePerKm) : 0,
        deliveryFeeMin: merchant.deliveryFeeMin ? parseFloat(merchant.deliveryFeeMin) : null,
        deliveryFeeMax: merchant.deliveryFeeMax ? parseFloat(merchant.deliveryFeeMax) : null,
        // Sale mode settings
        isDineInEnabled: merchant.isDineInEnabled ?? true,
        isTakeawayEnabled: merchant.isTakeawayEnabled ?? false,
        requireTableNumberForDineIn: merchant.requireTableNumberForDineIn ?? false,
        dineInLabel: merchant.dineInLabel || "",
        takeawayLabel: merchant.takeawayLabel || "",
        deliveryLabel: merchant.deliveryLabel || "",
        dineInScheduleStart: merchant.dineInScheduleStart || "",
        dineInScheduleEnd: merchant.dineInScheduleEnd || "",
        takeawayScheduleStart: merchant.takeawayScheduleStart || "",
        takeawayScheduleEnd: merchant.takeawayScheduleEnd || "",
        deliveryScheduleStart: merchant.deliveryScheduleStart || "",
        deliveryScheduleEnd: merchant.deliveryScheduleEnd || "",
        totalTables: merchant.totalTables ?? null,
        posPayImmediately: merchant.posPayImmediately ?? true,
        // Reservation settings
        isReservationEnabled: merchant.isReservationEnabled ?? false,
        reservationMenuRequired: merchant.reservationMenuRequired ?? false,
        reservationMinItemCount: Number(merchant.reservationMinItemCount ?? 0),
        // Scheduled orders
        isScheduledOrderEnabled: merchant.isScheduledOrderEnabled ?? false,
        // Fee settings
        enableTax: merchant.enableTax || false,
        taxPercentage: merchant.taxPercentage ? parseFloat(merchant.taxPercentage) : 0,
        enableServiceCharge: merchant.enableServiceCharge || false,
        serviceChargePercent: merchant.serviceChargePercent ? parseFloat(merchant.serviceChargePercent) : 0,
        enablePackagingFee: merchant.enablePackagingFee || false,
        packagingFeeAmount: merchant.packagingFeeAmount ? parseFloat(merchant.packagingFeeAmount) : 0,
        // Receipt settings (merge with defaults)
        receiptSettings: {
          ...DEFAULT_RECEIPT_SETTINGS,
          ...(merchant.receiptSettings || {}),
          paperSize: '80mm',
        },
      });

      // Set PIN status
      setHasExistingPin(!!merchant.hasDeletePin);

      // Set opening hours if available
      if (merchant.openingHours && Array.isArray(merchant.openingHours)) {
        const hoursMap = new Map(
          merchant.openingHours.map((h: OpeningHour) => [h.dayOfWeek, h])
        );

        const initialHours = Array.from({ length: 7 }, (_, dayOfWeek) => {
          const existing = hoursMap.get(dayOfWeek) as OpeningHour | undefined;
          return existing ? {
            dayOfWeek,
            openTime: existing.openTime || "09:00",
            closeTime: existing.closeTime || "22:00",
            isClosed: existing.isClosed || false,
          } : {
            dayOfWeek,
            openTime: "09:00",
            closeTime: "22:00",
            isClosed: false,
          };
        });

        setOpeningHours(initialHours);
        setOriginalOpeningHours(JSON.parse(JSON.stringify(initialHours)));
      }

      // Discount/voucher feature flags
      try {
        const settingsRes = await fetch('/api/merchant/order-vouchers/settings', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const settingsJson = await settingsRes.json();
        const nextPos =
          settingsRes.ok && settingsJson?.success && typeof settingsJson?.data?.posDiscountsEnabled === 'boolean'
            ? settingsJson.data.posDiscountsEnabled
            : true;
        const nextCustomerRaw =
          settingsRes.ok && settingsJson?.success && typeof settingsJson?.data?.customerVouchersEnabled === 'boolean'
            ? settingsJson.data.customerVouchersEnabled
            : true;
        const nextCustomer = nextPos ? nextCustomerRaw : false;

        setPosDiscountsEnabled(nextPos);
        setCustomerVouchersEnabled(nextCustomer);
        setOriginalDiscountVoucherSettings({ posDiscountsEnabled: nextPos, customerVouchersEnabled: nextCustomer });
      } catch {
        setPosDiscountsEnabled(true);
        setCustomerVouchersEnabled(true);
        setOriginalDiscountVoucherSettings({ posDiscountsEnabled: true, customerVouchersEnabled: true });
      }

      // Save original form data for change detection
      const originalData = {
        name: merchant.name || "",
        code: merchant.code || "",
        description: merchant.description || "",
        address: merchant.address || "",
        email: merchant.email || "",
        phoneNumber: merchant.phoneNumber || "",
        logoUrl: merchant.logoUrl || "",
        bannerUrl: merchant.bannerUrl || "",
        country: merchant.country || "Australia",
        currency: merchant.currency || "AUD",
        timezone: merchant.timezone || "Australia/Sydney",
        latitude: merchant.latitude ? parseFloat(merchant.latitude) : null,
        longitude: merchant.longitude ? parseFloat(merchant.longitude) : null,
        isDeliveryEnabled: merchant.isDeliveryEnabled ?? false,
        enforceDeliveryZones: merchant.enforceDeliveryZones ?? true,
        deliveryMaxDistanceKm: merchant.deliveryMaxDistanceKm ? parseFloat(merchant.deliveryMaxDistanceKm) : null,
        deliveryFeeBase: merchant.deliveryFeeBase ? parseFloat(merchant.deliveryFeeBase) : 0,
        deliveryFeePerKm: merchant.deliveryFeePerKm ? parseFloat(merchant.deliveryFeePerKm) : 0,
        deliveryFeeMin: merchant.deliveryFeeMin ? parseFloat(merchant.deliveryFeeMin) : null,
        deliveryFeeMax: merchant.deliveryFeeMax ? parseFloat(merchant.deliveryFeeMax) : null,
        isDineInEnabled: merchant.isDineInEnabled ?? true,
        isTakeawayEnabled: merchant.isTakeawayEnabled ?? false,
        requireTableNumberForDineIn: merchant.requireTableNumberForDineIn ?? false,
        dineInLabel: merchant.dineInLabel || "",
        takeawayLabel: merchant.takeawayLabel || "",
        deliveryLabel: merchant.deliveryLabel || "",
        dineInScheduleStart: merchant.dineInScheduleStart || "",
        dineInScheduleEnd: merchant.dineInScheduleEnd || "",
        takeawayScheduleStart: merchant.takeawayScheduleStart || "",
        takeawayScheduleEnd: merchant.takeawayScheduleEnd || "",
        deliveryScheduleStart: merchant.deliveryScheduleStart || "",
        deliveryScheduleEnd: merchant.deliveryScheduleEnd || "",
        totalTables: merchant.totalTables ?? null,
        posPayImmediately: merchant.posPayImmediately ?? true,
        isReservationEnabled: merchant.isReservationEnabled ?? false,
        reservationMenuRequired: merchant.reservationMenuRequired ?? false,
        reservationMinItemCount: Number(merchant.reservationMinItemCount ?? 0),
        isScheduledOrderEnabled: merchant.isScheduledOrderEnabled ?? false,
        enableTax: merchant.enableTax || false,
        taxPercentage: merchant.taxPercentage ? parseFloat(merchant.taxPercentage) : 0,
        enableServiceCharge: merchant.enableServiceCharge || false,
        serviceChargePercent: merchant.serviceChargePercent ? parseFloat(merchant.serviceChargePercent) : 0,
        enablePackagingFee: merchant.enablePackagingFee || false,
        packagingFeeAmount: merchant.packagingFeeAmount ? parseFloat(merchant.packagingFeeAmount) : 0,
        receiptSettings: {
          ...DEFAULT_RECEIPT_SETTINGS,
          ...(merchant.receiptSettings || {}),
          paperSize: '80mm',
        },
      };
      setOriginalFormData(originalData);
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to load merchant data");
    } finally {
      setLoading(false);
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback((): boolean => {
    const baseHasUnsaved = hasMerchantUnsavedChanges({
      formData,
      originalFormData,
      openingHours,
      originalOpeningHours,
      discountVoucherSettings: { posDiscountsEnabled, customerVouchersEnabled },
      originalDiscountVoucherSettings,
    });

    const perDayDirty = perDayModeScheduleRef.current?.isDirty?.() ?? false;
    return baseHasUnsaved || perDayDirty;
  }, [formData, originalFormData, openingHours, originalOpeningHours, posDiscountsEnabled, customerVouchersEnabled, originalDiscountVoucherSettings]);

  const syncActiveTabToUrl = useCallback((tabId: string) => {
    if (typeof window === 'undefined') return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.replaceState(null, '', url.toString());
    } catch {
      // Ignore URL sync failures
    }
  }, []);

  // Handle tab change with unsaved changes check
  const handleTabChange = (newTab: string) => {
    if (hasUnsavedChanges()) {
      setPendingTab(newTab);
      setShowUnsavedModal(true);
    } else {
      setActiveTab(newTab);
      syncActiveTabToUrl(newTab);
    }
  };

  // Confirm tab change without saving
  const confirmTabChange = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      syncActiveTabToUrl(pendingTab);
      setPendingTab(null);
    }
    setShowUnsavedModal(false);
  };

  const discardChangesAndContinue = () => {
    if (originalFormData) {
      setFormData(originalFormData);
    }
    setOpeningHours(JSON.parse(JSON.stringify(originalOpeningHours)));
    if (originalDiscountVoucherSettings) {
      setPosDiscountsEnabled(originalDiscountVoucherSettings.posDiscountsEnabled);
      setCustomerVouchersEnabled(originalDiscountVoucherSettings.customerVouchersEnabled);
    }
    void perDayModeScheduleRef.current?.reset?.();
    confirmTabChange();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOpeningHourChange = (dayOfWeek: number, field: keyof OpeningHour, value: string | boolean) => {
    setOpeningHours(prev => prev.map(hour =>
      hour.dayOfWeek === dayOfWeek
        ? { ...hour, [field]: value }
        : hour
    ));
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - accept all image formats
    if (!file.type.startsWith('image/')) {
      showError('Invalid File', 'Please upload an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('File Too Large', 'File size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'logo');

      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/merchant/upload/merchant-image", {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataUpload,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFormData(prev => ({ ...prev, logoUrl: data.data.url }));
        showSuccess('Success', 'Logo uploaded successfully');
      } else {
        showError('Error', data.message || 'Failed to upload logo');
      }
    } catch {
      showError('Error', 'Failed to upload logo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type - accept all image formats
    if (!file.type.startsWith('image/')) {
      showError('Invalid File', 'Please upload an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('File Too Large', 'File size must be less than 5MB');
      return;
    }

    setUploadingBanner(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'banner');

      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/merchant/upload/merchant-image", {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataUpload,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFormData(prev => ({ ...prev, bannerUrl: data.data.url }));
        showSuccess('Success', 'Banner uploaded successfully');
      } else {
        showError('Error', data.message || 'Failed to upload banner');
      }
    } catch {
      showError('Error', 'Failed to upload banner');
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
    }
  };

  const openReservationsWizard = () => {
    setReservationsWizardError("");
    setReservationsWizardRequirePreorder(Boolean(formData.reservationMenuRequired));
    setReservationsWizardMinItems(Number(formData.reservationMinItemCount ?? 0));
    setShowReservationsWizard(true);
  };

  const confirmEnableReservations = () => {
    const requirePreorder = Boolean(reservationsWizardRequirePreorder);
    let minItems = Math.floor(Number(reservationsWizardMinItems));
    if (!Number.isFinite(minItems) || minItems < 0) minItems = 0;

    // Keep reservation rules consistent
    if (!requirePreorder) {
      minItems = 0;
    } else {
      minItems = Math.max(1, minItems);
    }

    setFormData((prev) => ({
      ...prev,
      isReservationEnabled: true,
      reservationMenuRequired: requirePreorder,
      reservationMinItemCount: minItems,
    }));
    setShowReservationsWizard(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasIncompleteModeSchedule =
      Boolean(formData.dineInScheduleStart) !== Boolean(formData.dineInScheduleEnd) ||
      Boolean(formData.takeawayScheduleStart) !== Boolean(formData.takeawayScheduleEnd) ||
      Boolean(formData.deliveryScheduleStart) !== Boolean(formData.deliveryScheduleEnd);

    if (hasIncompleteModeSchedule) {
      showError('Error', 'Mode availability hours: please fill both From and To for any mode you set.');
      setActiveTab('sale-modes');
      syncActiveTabToUrl('sale-modes');
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      // Update merchant basic info
      // Normalize optional schedule fields to preserve null defaults
      const merchantPayload = {
        ...formData,
        dineInScheduleStart: formData.dineInScheduleStart || null,
        dineInScheduleEnd: formData.dineInScheduleEnd || null,
        takeawayScheduleStart: formData.takeawayScheduleStart || null,
        takeawayScheduleEnd: formData.takeawayScheduleEnd || null,
        deliveryScheduleStart: formData.deliveryScheduleStart || null,
        deliveryScheduleEnd: formData.deliveryScheduleEnd || null,
        reservationMinItemCount: Number.isFinite(Number(formData.reservationMinItemCount)) ? Number(formData.reservationMinItemCount) : 0,
      };

      const merchantResponse = await fetch("/api/merchant/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(merchantPayload),
      });

      const merchantData = await merchantResponse.json();

      if (!merchantResponse.ok) {
        throw new Error(merchantData.message || "Failed to update merchant");
      }

      const posSettingsResponse = await fetch("/api/merchant/pos-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customItems: {
            enabled: posCustomItemsEnabled,
            ...(Number.isFinite(posCustomItemsMaxNameLength) && posCustomItemsMaxNameLength >= 10
              ? { maxNameLength: Math.floor(posCustomItemsMaxNameLength) }
              : {}),
            ...(Number.isFinite(posCustomItemsMaxPrice) && posCustomItemsMaxPrice > 0
              ? { maxPrice: posCustomItemsMaxPrice }
              : {}),
          },
        }),
      });

      const posSettingsData = await posSettingsResponse.json();
      if (!posSettingsResponse.ok) {
        throw new Error(posSettingsData.message || "Failed to update POS settings");
      }

      // Update opening hours
      const hoursResponse = await fetch("/api/merchant/opening-hours", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ openingHours }),
      });

      const hoursData = await hoursResponse.json();

      if (!hoursResponse.ok) {
        throw new Error(hoursData.message || "Failed to update opening hours");
      }

      // Update per-day mode schedules (advanced) via the same fixed footer
      if (perDayModeScheduleRef.current) {
        await perDayModeScheduleRef.current.save({ showToast: false });
      }

      // Update discount/voucher feature settings
      const discountVoucherResponse = await fetch('/api/merchant/order-vouchers/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          posDiscountsEnabled,
          customerVouchersEnabled,
        }),
      });

      const discountVoucherData = await discountVoucherResponse.json();
      if (!discountVoucherResponse.ok || !discountVoucherData?.success) {
        throw new Error(discountVoucherData?.message || 'Failed to update discount/voucher settings');
      }

      const savedPosDiscountsEnabled =
        typeof discountVoucherData?.data?.posDiscountsEnabled === 'boolean'
          ? discountVoucherData.data.posDiscountsEnabled
          : posDiscountsEnabled;
      const savedCustomerVouchersEnabled =
        typeof discountVoucherData?.data?.customerVouchersEnabled === 'boolean'
          ? discountVoucherData.data.customerVouchersEnabled
          : customerVouchersEnabled;

      setPosDiscountsEnabled(savedPosDiscountsEnabled);
      setCustomerVouchersEnabled(savedCustomerVouchersEnabled);
      setOriginalDiscountVoucherSettings({
        posDiscountsEnabled: savedPosDiscountsEnabled,
        customerVouchersEnabled: savedCustomerVouchersEnabled,
      });

      // Update original data to reflect saved state
      setOriginalFormData({ ...formData });
      setOriginalOpeningHours(JSON.parse(JSON.stringify(openingHours)));

      showSuccess("Success", "Merchant information updated successfully!");
      // Stay on the current tab - no reload needed
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to update merchant");
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== TAB CONTENT COMPONENTS ====================

  /**
   * PIN Tab - Delete PIN management
   */
  const handleSavePin = async () => {
    if (deletePin.length !== 4 || !/^\d{4}$/.test(deletePin)) {
      showError("Invalid PIN", "PIN must be exactly 4 digits");
      return;
    }
    if (deletePin !== confirmPin) {
      showError("PIN Mismatch", "PIN and confirmation do not match");
      return;
    }

    setSavingPin(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/merchant/delete-pin", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin: deletePin }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to save PIN");
      }

      showSuccess("Success", hasExistingPin ? "PIN updated successfully" : "PIN set successfully");
      setHasExistingPin(true);
      setDeletePin("");
      setConfirmPin("");
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to save PIN");
    } finally {
      setSavingPin(false);
    }
  };

  const executeRemovePin = async () => {
    setSavingPin(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/merchant/delete-pin", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to remove PIN");
      }

      showSuccess("Success", "PIN removed successfully");
      setHasExistingPin(false);
      setDeletePin("");
      setConfirmPin("");
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to remove PIN");
    } finally {
      setSavingPin(false);
    }
  };

  const handleRemovePin = () => {
    if (savingPin) return;
    setRemovePinConfirmOpen(true);
  };

  // ==================== RENDER ACTIVE TAB CONTENT ====================

  const renderTabContent = () => {
    switch (activeTab) {
      case "basic":
        return (
          <BasicInfoTab
            t={t}
            formData={formData}
            fileInputRef={fileInputRef}
            bannerInputRef={bannerInputRef}
            uploading={uploading}
            uploadingBanner={uploadingBanner}
            onLogoUpload={handleLogoUpload}
            onBannerUpload={handleBannerUpload}
            onChange={handleChange}
          />
        );
      case "pos-settings":
        return (
          <PosSettingsTab
            t={t}
            currency={formData.currency}
            posPayImmediately={formData.posPayImmediately}
            onPosPayImmediatelyChange={(checked) =>
              setFormData((prev) => ({ ...prev, posPayImmediately: checked }))
            }
            posCustomItemsEnabled={posCustomItemsEnabled}
            onPosCustomItemsEnabledChange={setPosCustomItemsEnabled}
            posCustomItemsMaxNameLength={posCustomItemsMaxNameLength}
            onPosCustomItemsMaxNameLengthChange={setPosCustomItemsMaxNameLength}
            posCustomItemsMaxPrice={posCustomItemsMaxPrice}
            onPosCustomItemsMaxPriceChange={setPosCustomItemsMaxPrice}
          />
        );
      case "sale-modes":
        return (
          <SaleModesTabComponent
            t={t}
            formData={formData}
            setFormData={setFormData}
            originalFormData={originalFormData}
            showError={showError}
            onTabChange={handleTabChange}
          />
        );
      case "features":
        return (
          <FeaturesTab
            t={t}
            formData={formData}
            setFormData={setFormData}
            onOpenReservationsWizard={openReservationsWizard}
          />
        );
      case "table-settings":
        return <TableSettingsTabComponent formData={formData} setFormData={setFormData} />;
      case "fees":
        return <FeesTabComponent formData={formData} setFormData={setFormData} />;
      case 'discount-voucher':
        return (
          <DiscountVoucherTab
            t={t}
            posDiscountsEnabled={posDiscountsEnabled}
            onPosDiscountsEnabledChange={(next) => {
              setPosDiscountsEnabled(next);
              if (!next) {
                setCustomerVouchersEnabled(false);
              }
            }}
            customerVouchersEnabled={customerVouchersEnabled}
            onCustomerVouchersEnabledChange={(next) => {
              if (!posDiscountsEnabled) return;
              setCustomerVouchersEnabled(next);
            }}
          />
        );
      case "delivery":
        return (
          <DeliveryTab
            authToken={authToken}
            formData={formData}
            setFormData={setFormData}
            showSuccess={showSuccess}
            showError={showError}
          />
        );
      case "location":
        return (
          <LocationTabComponent t={t} formData={formData} setFormData={setFormData} onChange={handleChange} />
        );
      case "hours":
        return (
          <OpeningHoursTabComponent
            authToken={authToken}
            openingHours={openingHours}
            onOpeningHourChange={handleOpeningHourChange}
            perDayModeScheduleRef={perDayModeScheduleRef}
          />
        );
      case "receipt":
        return (
          <ReceiptTemplateTab
            settings={formData.receiptSettings}
            onChange={(settings) => setFormData(prev => ({ ...prev, receiptSettings: settings }))}
            billingInfo={receiptBillingInfo}
            merchantInfo={{
              name: formData.name,
              code: formData.code,
              logoUrl: formData.logoUrl,
              address: formData.address,
              phone: formData.phoneNumber,
              email: formData.email,
              currency: formData.currency,
            }}
          />
        );
      case "pin":
        return (
          <PinTab
            hasExistingPin={hasExistingPin}
            deletePin={deletePin}
            setDeletePin={setDeletePin}
            confirmPin={confirmPin}
            setConfirmPin={setConfirmPin}
            showPin={showPin}
            setShowPin={setShowPin}
            savingPin={savingPin}
            onSavePin={handleSavePin}
            onRemovePin={handleRemovePin}
          />
        );

      default:
        return (
          <BasicInfoTab
            t={t}
            formData={formData}
            fileInputRef={fileInputRef}
            bannerInputRef={bannerInputRef}
            uploading={uploading}
            uploadingBanner={uploadingBanner}
            onLogoUpload={handleLogoUpload}
            onBannerUpload={handleBannerUpload}
            onChange={handleChange}
          />
        );
    }
  };

  // ==================== MAIN RENDER ====================

  const navGroups = [
    {
      title: tOr(t, 'admin.merchantEdit.nav.group.business', 'Business'),
      items: [
        {
          id: 'basic',
          label: t('admin.merchant.basicInfo'),
          description: tOr(t, 'admin.merchantEdit.nav.basicDesc', 'Branding, contact, and public store info'),
          icon: <FaBuilding className="h-4 w-4" />,
        },
        {
          id: 'location',
          label: t('admin.merchant.location'),
          description: tOr(t, 'admin.merchantEdit.nav.locationDesc', 'Address, timezone, and map pin'),
          icon: <FaMapMarkerAlt className="h-4 w-4" />,
        },
        {
          id: 'hours',
          label: t('admin.merchant.openingHours'),
          description: tOr(t, 'admin.merchantEdit.nav.hoursDesc', 'Weekly hours and schedule overrides'),
          icon: <FaClock className="h-4 w-4" />,
        },
      ],
    },
    {
      title: tOr(t, 'admin.merchantEdit.nav.group.ordering', 'Ordering'),
      items: [
        {
          id: 'sale-modes',
          label: t('admin.merchant.saleModes'),
          description: tOr(t, 'admin.merchantEdit.nav.saleModesDesc', 'Dine-in, takeaway, delivery modes'),
          icon: <FaSlidersH className="h-4 w-4" />,
        },
        {
          id: 'features',
          label: tOr(t, 'admin.merchantEdit.features.navLabel', 'Features'),
          description: tOr(t, 'admin.merchantEdit.features.navDesc', 'Scheduled orders and reservations'),
          icon: <FaPuzzlePiece className="h-4 w-4" />,
        },
        {
          id: 'delivery',
          label: t('admin.merchant.delivery'),
          description: tOr(t, 'admin.merchantEdit.nav.deliveryDesc', 'Zones, fees, distance limits'),
          icon: <FaTruck className="h-4 w-4" />,
        },
        {
          id: 'table-settings',
          label: t('admin.merchant.tableSetting'),
          description: tOr(t, 'admin.merchantEdit.nav.tablesDesc', 'QR tables and dine-in requirements'),
          icon: <FaChair className="h-4 w-4" />,
        },
      ],
    },
    {
      title: tOr(t, 'admin.merchantEdit.nav.group.payments', 'Payments & POS'),
      items: [
        {
          id: 'fees',
          label: t('admin.merchant.feesCharges'),
          description: tOr(t, 'admin.merchantEdit.nav.feesDesc', 'Tax, service charge, packaging fee'),
          icon: <FaMoneyBillWave className="h-4 w-4" />,
        },
        {
          id: 'discount-voucher',
          label: tOr(t, 'admin.merchantEdit.discountVoucher.navLabel', 'Discount & voucher'),
          description: tOr(t, 'admin.merchantEdit.discountVoucher.navDesc', 'Enable/disable POS discounts and customer vouchers'),
          icon: <FaTag className="h-4 w-4" />,
        },
        {
          id: 'pos-settings',
          label: t('admin.merchant.posSettings'),
          description: tOr(t, 'admin.merchantEdit.nav.posDesc', 'POS flow and custom items'),
          icon: <FaCashRegister className="h-4 w-4" />,
        },
        {
          id: 'receipt',
          label: t('admin.merchant.customReceipt'),
          description: tOr(t, 'admin.merchantEdit.nav.receiptDesc', 'Receipt template and settings'),
          icon: <FaReceipt className="h-4 w-4" />,
        },
      ],
    },
    {
      title: tOr(t, 'admin.merchantEdit.nav.group.security', 'Security'),
      items: [
        {
          id: 'pin',
          label: t('admin.merchant.pin'),
          description: tOr(t, 'admin.merchantEdit.nav.pinDesc', 'Protect order deletion with a PIN'),
          icon: <FaLock className="h-4 w-4" />,
        },
      ],
    },
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);

  return (
    <SubscriptionRequired>
      <div data-tutorial="merchant-settings-page">
        <ToastContainer toasts={toasts} />
        <PageBreadcrumb pageTitle={tOr(t, 'admin.merchantEdit.pageTitle', 'Merchant settings')} />

        <ConfirmDialog
          isOpen={removePinConfirmOpen}
          title={t("common.confirm") || "Confirm"}
          message={
            t("admin.merchantEdit.removeDeletePinConfirm")
              || "Are you sure you want to remove the delete PIN? Orders can be deleted without verification."
          }
          confirmText={t("common.remove") || "Remove"}
          cancelText={t("common.cancel") || "Cancel"}
          variant="danger"
          onConfirm={async () => {
            if (savingPin) return;
            setRemovePinConfirmOpen(false);
            await executeRemovePin();
          }}
          onCancel={() => {
            if (savingPin) return;
            setRemovePinConfirmOpen(false);
          }}
        />

        <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3 lg:h-[calc(100vh-220px)] lg:min-h-[560px] lg:max-h-[820px] flex flex-col">
          <div className="border-b border-gray-200 p-6 dark:border-gray-800">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.pageTitle', 'Merchant settings')}
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {tOr(
                    t,
                    'admin.merchantEdit.pageSubtitle',
                    'Manage your storefront, ordering modes, fees, POS behavior, and receipts.'
                  )}
                </p>
              </div>

              {/* Mobile tab selector */}
              <div className="sm:hidden">
                <label className="sr-only" htmlFor="merchant-settings-tab">
                  Settings section
                </label>
                <select
                  id="merchant-settings-tab"
                  data-tutorial="merchant-settings-mobile-select"
                  value={activeTab}
                  onChange={(e) => handleTabChange(e.target.value)}
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                >
                  {allNavItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid flex-1 min-h-0 lg:grid-cols-[240px_1fr]">
            {/* Desktop sidebar */}
            <aside
              data-sidebar
              data-sidebar-scroll
              className="hidden min-h-0 overflow-y-auto border-b border-gray-200 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-950/20 lg:block lg:border-b-0 lg:border-r"
            >
              <div data-tutorial="merchant-settings-tabs">
                <SettingsSidebarNav groups={navGroups} activeId={activeTab} onChange={handleTabChange} />
              </div>
            </aside>

            {/* Content */}
            <div className="min-w-0 min-h-0 overflow-y-auto">
              <form data-tutorial="merchant-settings-form" onSubmit={handleSubmit}>
                <div className="p-6">{renderTabContent()}</div>

                <AdminFormFooter
                  onCancel={() => router.push("/admin/dashboard/merchant/view")}
                  isSubmitting={submitting}
                  submitLabel={t("admin.merchantEdit.saveChanges")}
                  submittingLabel={t("admin.merchantEdit.saving")}
                  submitDataTutorial="settings-save-btn"
                />
              </form>
            </div>
          </div>
        </div>

            {/* Reservations Enable Wizard */}
            {showReservationsWizard && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enable Reservations</h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Configure whether preorders are required. Table assignment happens when staff accepts a reservation.
                  </p>

                  {reservationsWizardError ? (
                    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
                      {reservationsWizardError}
                    </div>
                  ) : null}

                  <div className="mt-5 space-y-4">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">Require preorder menu</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Require customers to select menu items when reserving.</p>
                        </div>
                        <Switch
                          checked={reservationsWizardRequirePreorder}
                          onCheckedChange={setReservationsWizardRequirePreorder}
                          aria-label="Require preorder menu"
                        />
                      </div>

                      {reservationsWizardRequirePreorder && (
                        <div className="mt-4">
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Minimum preorder items</label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={reservationsWizardMinItems}
                            onChange={(e) => setReservationsWizardMinItems(parseInt(e.target.value || '1', 10) || 1)}
                            className="h-10 w-full max-w-55 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            If preorder is required, customers must select at least this many items.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      isFullWidth
                      onClick={() => {
                        setShowReservationsWizard(false);
                        setReservationsWizardError('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="button" variant="primary" isFullWidth onClick={confirmEnableReservations}>
                      Enable
                    </Button>
                  </div>
                </div>
              </div>
            )}

        {/* Unsaved Changes Modal */}
        {showUnsavedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/20">
                <FaExclamationTriangle className="h-6 w-6 text-brand-600 dark:text-brand-300" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Unsaved Changes</h3>
              <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                You have unsaved changes. Please save your changes before switching tabs, or discard them to continue.
              </p>
              <div className="flex gap-3">
                <Button type="button" variant="outline" isFullWidth onClick={() => setShowUnsavedModal(false)}>
                  Cancel
                </Button>
                <Button type="button" variant="primary" isFullWidth onClick={discardChangesAndContinue}>
                  Discard & Continue
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SubscriptionRequired>
  );
}