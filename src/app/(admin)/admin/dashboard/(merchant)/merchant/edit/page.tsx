"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import { FaKey, FaEye, FaEyeSlash, FaChevronDown, FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaImage } from "react-icons/fa";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminFormFooter from "@/components/common/AdminFormFooter";
import TabsNavigation from "@/components/common/TabsNavigation";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import { COUNTRIES, CURRENCIES, getCurrencyForCountry, getDefaultTimezoneForCountry, getTimezonesForCountry } from "@/lib/constants/location";
import PerDayModeSchedule from "@/components/merchants/PerDayModeSchedule";
import SpecialHoursManager from "@/components/merchants/SpecialHoursManager";
import { ReceiptTemplateTab } from "@/components/merchants/ReceiptTemplateTab";
import DeliverySettingsTab from "@/components/merchants/DeliverySettingsTab";
import { ReceiptSettings, DEFAULT_RECEIPT_SETTINGS } from "@/lib/types/receiptSettings";
import { useTranslation, tOr } from "@/lib/i18n/useTranslation";
import { TranslationKeys } from "@/lib/i18n";
import SubscriptionRequired from "@/components/subscription/SubscriptionRequired";
import { useContextualHint, CONTEXTUAL_HINTS } from "@/lib/tutorial";
import ConfirmDialog from "@/components/modals/ConfirmDialog";

// Dynamically import map component
const MapLocationPicker = dynamic(() => import("@/components/maps/MapLocationPicker"), { ssr: false });

interface MerchantFormData {
  name: string;
  code: string;
  description: string;
  address: string;
  email: string;
  phoneNumber: string;
  logoUrl?: string;
  bannerUrl?: string;
  country: string;
  currency: string;
  timezone: string;
  latitude?: number | null;
  longitude?: number | null;
  // Delivery settings
  isDeliveryEnabled: boolean;
  enforceDeliveryZones: boolean;
  deliveryMaxDistanceKm: number | null;
  deliveryFeeBase: number;
  deliveryFeePerKm: number;
  deliveryFeeMin: number | null;
  deliveryFeeMax: number | null;
  // Sale mode settings
  isDineInEnabled: boolean;
  isTakeawayEnabled: boolean;
  requireTableNumberForDineIn: boolean;
  dineInLabel: string;
  takeawayLabel: string;
  deliveryLabel: string;
  dineInScheduleStart: string;
  dineInScheduleEnd: string;
  takeawayScheduleStart: string;
  takeawayScheduleEnd: string;
  deliveryScheduleStart: string;
  deliveryScheduleEnd: string;
  totalTables: number | null;
  // POS settings
  posPayImmediately: boolean;
  // Reservation settings
  isReservationEnabled: boolean;
  reservationMenuRequired: boolean;
  reservationMinItemCount: number;
  // Scheduled orders
  isScheduledOrderEnabled: boolean;
  // Fee settings
  enableTax: boolean;
  taxPercentage: number;
  enableServiceCharge: boolean;
  serviceChargePercent: number;
  enablePackagingFee: boolean;
  packagingFeeAmount: number;
  // Receipt settings
  receiptSettings: ReceiptSettings;
}

interface OpeningHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Tab configuration - keys for translation
const TAB_KEYS: Array<{ id: string; key: TranslationKeys }> = [
  { id: "basic", key: "admin.merchant.basicInfo" },
  { id: "location", key: "admin.merchant.location" },
  { id: "sale-modes", key: "admin.merchant.saleModes" },
  { id: "delivery", key: "admin.merchant.delivery" },
  { id: "fees", key: "admin.merchant.feesCharges" },
  { id: "hours", key: "admin.merchant.openingHours" },
  { id: "receipt", key: "admin.merchant.customReceipt" },
  { id: "table-settings", key: "admin.merchant.tableSetting" },
  { id: "pin", key: "admin.merchant.pin" },
];

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

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [authToken, setAuthToken] = useState<string>("");

  // Unsaved changes tracking
  const [originalFormData, setOriginalFormData] = useState<MerchantFormData | null>(null);
  const [originalOpeningHours, setOriginalOpeningHours] = useState<OpeningHour[]>([]);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Collapsible sections
  const [showPerDayModeSchedules, setShowPerDayModeSchedules] = useState(false);
  const [showSpecialHours, setShowSpecialHours] = useState(false);

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

  useEffect(() => {
    fetchMerchant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        currency: merchant.currency || "AUD",
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
    if (!originalFormData) return false;

    // Check form data changes
    const formChanged = JSON.stringify(formData) !== JSON.stringify(originalFormData);

    // Check opening hours changes
    const hoursChanged = JSON.stringify(openingHours) !== JSON.stringify(originalOpeningHours);

    return formChanged || hoursChanged;
  }, [formData, originalFormData, openingHours, originalOpeningHours]);

  // Handle tab change with unsaved changes check
  const handleTabChange = (newTab: string) => {
    if (hasUnsavedChanges()) {
      setPendingTab(newTab);
      setShowUnsavedModal(true);
    } else {
      setActiveTab(newTab);
    }
  };

  // Confirm tab change without saving
  const confirmTabChange = () => {
    if (pendingTab) {
      setActiveTab(pendingTab);
      setPendingTab(null);
    }
    setShowUnsavedModal(false);
  };

  const discardChangesAndContinue = () => {
    if (originalFormData) {
      setFormData(originalFormData);
    }
    setOpeningHours(JSON.parse(JSON.stringify(originalOpeningHours)));
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
   * Basic Info Tab - Logo, banner, name, contact info, description
   */
  const BasicInfoTab = () => (
    <div className="space-y-6">
      {/* Logo Upload */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("admin.merchantEdit.storeLogo")}
        </label>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          {t("admin.merchantEdit.logoDesc")}
        </p>
        <div className="flex items-center gap-5" data-tutorial="store-logo-upload">
          <div className="relative h-20 w-20 overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-700">
            {formData.logoUrl ? (
              <Image
                src={formData.logoUrl}
                alt={formData.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-brand-100 text-xl font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                {formData.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex h-9 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {uploading ? t("admin.merchantEdit.uploadingLogo") : t("admin.merchantEdit.changeLogo")}
            </button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t("admin.merchantEdit.logoFormats")}
            </p>
          </div>
        </div>
      </div>

      {/* Banner Upload */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("admin.merchantEdit.storeBanner")}
        </label>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          {t("admin.merchantEdit.bannerDesc")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 items-start" data-tutorial="store-banner-upload">
          {/* Banner Preview - 2:1 aspect ratio */}
          <div className="relative w-full sm:flex-1 overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-700" style={{ aspectRatio: '2/1' }}>
            {formData.bannerUrl ? (
              <Image
                src={formData.bannerUrl}
                alt={`${formData.name} banner`}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gray-100 dark:bg-gray-800">
                <div className="text-center">
                  <FaImage className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("admin.merchantEdit.noBanner")}</p>
                </div>
              </div>
            )}
          </div>
          {/* Upload Button - on right for desktop, below for mobile */}
          <div className="flex flex-col items-start">
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {uploadingBanner ? t("admin.merchantEdit.uploadingBanner") : t("admin.merchantEdit.changeBanner")}
            </button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t("admin.merchantEdit.bannerFormats")}
            </p>
          </div>
        </div>
      </div>

      {/* Merchant Code (read-only) */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("admin.merchantEdit.merchantCode")}
        </label>
        <input
          type="text"
          name="code"
          value={formData.code}
          disabled
          className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t("admin.merchantEdit.cannotChange")}</p>
      </div>

      {/* Store Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("admin.merchantEdit.storeName")} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          data-tutorial="store-name-input"
          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {/* Email & Phone Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("admin.merchant.email")} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("admin.merchantEdit.phoneNumber")} <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            required
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("admin.merchantEdit.description")}
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />
      </div>
    </div>
  );

  const DeliveryTab = () => (
    <DeliverySettingsTab
      authToken={authToken}
      formData={formData as unknown as Record<string, unknown> & {
        code: string;
        currency: string;
        latitude: number | null;
        longitude: number | null;
        isDeliveryEnabled: boolean;
        enforceDeliveryZones: boolean;
        deliveryMaxDistanceKm: number | null;
        deliveryFeeBase: number;
        deliveryFeePerKm: number;
        deliveryFeeMin: number | null;
        deliveryFeeMax: number | null;
      }}
      setFormData={(updater) =>
        setFormData((prev) => updater(prev as unknown as any) as unknown as MerchantFormData)
      }
      showSuccess={showSuccess}
      showError={showError}
    />
  );

  /**
   * Sale Modes Tab - Dine in, Takeaway toggles, labels, schedules, tables
   */
  const SaleModesTab = () => {
    const hasLocation = formData.latitude !== null && formData.longitude !== null;
    const enabledModes = [formData.isDineInEnabled, formData.isTakeawayEnabled, formData.isDeliveryEnabled].filter(Boolean).length;

    const hasCustomLabels = Boolean(
      (formData.dineInLabel || '').trim() ||
      (formData.takeawayLabel || '').trim() ||
      (formData.deliveryLabel || '').trim()
    );

    const hasModeSchedules = Boolean(
      formData.dineInScheduleStart ||
      formData.dineInScheduleEnd ||
      formData.takeawayScheduleStart ||
      formData.takeawayScheduleEnd ||
      formData.deliveryScheduleStart ||
      formData.deliveryScheduleEnd
    );

    const showDineInLabel = formData.isDineInEnabled || Boolean((formData.dineInLabel || '').trim());
    const showTakeawayLabel = formData.isTakeawayEnabled || Boolean((formData.takeawayLabel || '').trim());
    const showDeliveryLabel = formData.isDeliveryEnabled || Boolean((formData.deliveryLabel || '').trim());

    const showDineInSchedule =
      formData.isDineInEnabled || Boolean(formData.dineInScheduleStart || formData.dineInScheduleEnd);
    const showTakeawaySchedule =
      formData.isTakeawayEnabled || Boolean(formData.takeawayScheduleStart || formData.takeawayScheduleEnd);
    const showDeliverySchedule =
      formData.isDeliveryEnabled || Boolean(formData.deliveryScheduleStart || formData.deliveryScheduleEnd);

    const [labelsOpen, setLabelsOpen] = useState(false);
    const [schedulesOpen, setSchedulesOpen] = useState(false);
    const didInitAdvanced = useRef(false);

    useEffect(() => {
      if (didInitAdvanced.current) return;
      if (!originalFormData) return;

      setLabelsOpen(hasCustomLabels);
      setSchedulesOpen(hasModeSchedules);
      didInitAdvanced.current = true;
    }, [originalFormData, hasCustomLabels, hasModeSchedules]);

    return (
      <div className="space-y-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Configure which ordering modes are available to customers and how POS + optional features behave.
        </p>

        {!hasLocation ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
            Delivery requires merchant coordinates. Set merchant location in the Location tab.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Core modes + mode options */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {tOr(t, 'admin.merchantEdit.modes.chooseTitle', 'Order modes')}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {tOr(t, 'admin.merchantEdit.modes.chooseDescription', 'Choose which ordering modes are available for customers.')}
                  </p>
                </div>
                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                  {enabledModes} enabled
                </span>
              </div>

              <div className="mt-4 divide-y divide-gray-200 dark:divide-gray-800">
                {/* Dine In */}
                <div className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('admin.merchantEdit.modes.dineInTitle')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.modes.dineInDesc')}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={formData.isDineInEnabled}
                        onChange={(e) => {
                          if (!e.target.checked && !formData.isTakeawayEnabled && !formData.isDeliveryEnabled) {
                            showError(t('common.error'), t('admin.merchantEdit.orderModes.atLeastOneRequired'));
                            return;
                          }
                          setFormData((prev) => ({ ...prev, isDineInEnabled: e.target.checked }));
                        }}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
                    </label>
                  </div>

                  {formData.isDineInEnabled && (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {tOr(t, 'admin.merchantEdit.modes.requireTableNumberTitle', 'Require table number')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {tOr(
                              t,
                              'admin.merchantEdit.modes.requireTableNumberDesc',
                              'If enabled, customers/admin must provide a table number for Dine In orders.'
                            )}
                          </p>
                        </div>

                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={formData.requireTableNumberForDineIn}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, requireTableNumberForDineIn: e.target.checked }))
                            }
                            className="peer sr-only"
                          />
                          <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {/* Takeaway */}
                <div className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('admin.merchantEdit.orderModes.takeawayTitle')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.orderModes.takeawayDesc')}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={formData.isTakeawayEnabled}
                        onChange={(e) => {
                          if (!e.target.checked && !formData.isDineInEnabled && !formData.isDeliveryEnabled) {
                            showError(t('common.error'), t('admin.merchantEdit.orderModes.atLeastOneRequired'));
                            return;
                          }
                          setFormData((prev) => ({ ...prev, isTakeawayEnabled: e.target.checked }));
                        }}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
                    </label>
                  </div>
                </div>

                {/* Delivery */}
                <div className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {t('admin.merchantEdit.orderModes.deliveryTitle')}
                        </p>
                        {!hasLocation && !formData.isDeliveryEnabled ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
                            Location required
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.orderModes.deliveryDesc')}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={formData.isDeliveryEnabled}
                        disabled={!hasLocation && !formData.isDeliveryEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          if (next && !hasLocation) {
                            showError(t('common.error'), t('admin.merchantEdit.orderModes.deliveryRequiresLocation'));
                            return;
                          }
                          if (!next && !formData.isDineInEnabled && !formData.isTakeawayEnabled) {
                            showError(t('common.error'), t('admin.merchantEdit.orderModes.atLeastOneRequired'));
                            return;
                          }
                          setFormData((prev) => ({ ...prev, isDeliveryEnabled: next }));
                        }}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 dark:bg-gray-700" />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Mode labels & availability</h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Optional. Customize customer-facing button labels and set mode availability hours.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('hours')}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                >
                  Manage overrides in Opening Hours
                </button>
              </div>

              <div className="mt-4 grid gap-4">
                {/* Labels */}
                <details
                  className="group rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
                  open={labelsOpen}
                  onToggle={(e) => setLabelsOpen((e.target as HTMLDetailsElement).open)}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Customer button labels</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Leave empty to use default translations.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasCustomLabels ? (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
                          Configured
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          Optional
                        </span>
                      )}
                      <FaChevronDown className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>

                  <div className="border-t border-gray-200 p-4 dark:border-gray-800">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {showDineInLabel ? (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Dine In button label
                          </label>
                          <input
                            type="text"
                            value={formData.dineInLabel}
                            onChange={(e) => setFormData((prev) => ({ ...prev, dineInLabel: e.target.value }))}
                            placeholder={tOr(t, 'customer.mode.dineIn', 'Dine In')}
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                          />
                        </div>
                      ) : null}

                      {showTakeawayLabel ? (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Takeaway button label
                          </label>
                          <input
                            type="text"
                            value={formData.takeawayLabel}
                            onChange={(e) => setFormData((prev) => ({ ...prev, takeawayLabel: e.target.value }))}
                            placeholder={tOr(t, 'customer.mode.pickUp', 'Takeaway')}
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                          />
                        </div>
                      ) : null}

                      {showDeliveryLabel ? (
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Delivery button label
                          </label>
                          <input
                            type="text"
                            value={formData.deliveryLabel}
                            onChange={(e) => setFormData((prev) => ({ ...prev, deliveryLabel: e.target.value }))}
                            placeholder={tOr(t, 'customer.mode.delivery', 'Delivery')}
                            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                          />
                          {!formData.isDeliveryEnabled ? (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Delivery is currently disabled.</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">Preview</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {([
                          {
                            key: 'dinein',
                            enabled: formData.isDineInEnabled,
                            label: (formData.dineInLabel || '').trim() || tOr(t, 'customer.mode.dineIn', 'Dine In'),
                          },
                          {
                            key: 'takeaway',
                            enabled: formData.isTakeawayEnabled,
                            label: (formData.takeawayLabel || '').trim() || tOr(t, 'customer.mode.pickUp', 'Takeaway'),
                          },
                          {
                            key: 'delivery',
                            enabled: formData.isDeliveryEnabled,
                            label: (formData.deliveryLabel || '').trim() || tOr(t, 'customer.mode.delivery', 'Delivery'),
                          },
                        ] as const)
                          .filter((item) => item.enabled)
                          .map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              disabled
                              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-900 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                            >
                              {item.label}
                            </button>
                          ))}
                      </div>
                      {enabledModes === 0 ? (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">Enable at least one mode above.</div>
                      ) : null}
                    </div>
                  </div>
                </details>

                {/* Mode schedules */}
                <details
                  className="group rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40"
                  open={schedulesOpen}
                  onToggle={(e) => setSchedulesOpen((e.target as HTMLDetailsElement).open)}
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Mode availability hours</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        Leave empty to follow opening hours. Overrides live in the Opening Hours tab.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasModeSchedules ? (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
                          Configured
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                          Optional
                        </span>
                      )}
                      <FaChevronDown className="h-4 w-4 text-gray-500 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>

                  <div className="space-y-4 border-t border-gray-200 p-4 dark:border-gray-800">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Quick presets</p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Applies to all modes (including disabled ones).</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              dineInScheduleStart: '',
                              dineInScheduleEnd: '',
                              takeawayScheduleStart: '',
                              takeawayScheduleEnd: '',
                              deliveryScheduleStart: '',
                              deliveryScheduleEnd: '',
                            }))
                          }
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                        >
                          Always available
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              dineInScheduleStart: '11:00',
                              dineInScheduleEnd: '21:00',
                              takeawayScheduleStart: '11:00',
                              takeawayScheduleEnd: '21:00',
                              deliveryScheduleStart: '11:00',
                              deliveryScheduleEnd: '21:00',
                            }))
                          }
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                        >
                          Standard (11:00–21:00)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              dineInScheduleStart: '17:00',
                              dineInScheduleEnd: '22:00',
                              takeawayScheduleStart: '17:00',
                              takeawayScheduleEnd: '22:00',
                              deliveryScheduleStart: '17:00',
                              deliveryScheduleEnd: '22:00',
                            }))
                          }
                          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200"
                        >
                          Dinner only (17:00–22:00)
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      {showDineInSchedule ? (
                        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Dine In</p>
                            {!formData.isDineInEnabled ? (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                                Disabled
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">From</label>
                              <input
                                type="time"
                                value={formData.dineInScheduleStart}
                                onChange={(e) => setFormData((prev) => ({ ...prev, dineInScheduleStart: e.target.value }))}
                                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">To</label>
                              <input
                                type="time"
                                value={formData.dineInScheduleEnd}
                                onChange={(e) => setFormData((prev) => ({ ...prev, dineInScheduleEnd: e.target.value }))}
                                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {showTakeawaySchedule ? (
                        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Takeaway</p>
                            {!formData.isTakeawayEnabled ? (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                                Disabled
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">From</label>
                              <input
                                type="time"
                                value={formData.takeawayScheduleStart}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, takeawayScheduleStart: e.target.value }))
                                }
                                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">To</label>
                              <input
                                type="time"
                                value={formData.takeawayScheduleEnd}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, takeawayScheduleEnd: e.target.value }))
                                }
                                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {showDeliverySchedule ? (
                        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Delivery</p>
                            {!formData.isDeliveryEnabled ? (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                                Disabled
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div>
                              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">From</label>
                              <input
                                type="time"
                                value={formData.deliveryScheduleStart}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, deliveryScheduleStart: e.target.value }))
                                }
                                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">To</label>
                              <input
                                type="time"
                                value={formData.deliveryScheduleEnd}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, deliveryScheduleEnd: e.target.value }))
                                }
                                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                          {!formData.isDeliveryEnabled ? (
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Delivery is currently disabled.</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* Right: POS + Features */}
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                {tOr(t, 'admin.merchantEdit.pos.sectionTitle', 'POS & checkout')}
              </h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Control cashier flow and POS order creation behavior.
              </p>

              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {tOr(t, 'admin.merchantEdit.pos.payBehaviorTitle', 'POS payment behavior')}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {formData.posPayImmediately
                        ? tOr(
                            t,
                            'admin.merchantEdit.pos.payBehaviorDescPayNow',
                            'Pay immediately: show the payment modal right after creating an order in POS.'
                          )
                        : tOr(
                            t,
                            'admin.merchantEdit.pos.payBehaviorDescPayLater',
                            'Pay later: show “Order created” first, with options to print receipt or record payment.'
                          )}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={formData.posPayImmediately}
                      onChange={(e) => setFormData((prev) => ({ ...prev, posPayImmediately: e.target.checked }))}
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Features</h3>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Optional customer flows and reservation settings.
              </p>

              <div className="mt-4 space-y-4">
                {/* Scheduled Orders */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.merchantEdit.scheduledOrders.title')}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.scheduledOrders.desc')}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={formData.isScheduledOrderEnabled}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, isScheduledOrderEnabled: e.target.checked }))
                        }
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
                    </label>
                  </div>
                </div>

                {/* Reservations */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.merchantEdit.reservations.title')}</p>
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.reservations.desc')}</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        type="checkbox"
                        checked={formData.isReservationEnabled}
                        onChange={(e) => {
                          const next = e.target.checked;
                          if (next) {
                            openReservationsWizard();
                            return;
                          }
                          setFormData((prev) => ({ ...prev, isReservationEnabled: false }));
                        }}
                        className="peer sr-only"
                      />
                      <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
                    </label>
                  </div>

                  {formData.isReservationEnabled ? (
                    <div className="mt-4 space-y-4">
                      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('admin.merchantEdit.reservations.requirePreorderTitle')}</p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t('admin.merchantEdit.reservations.requirePreorderDesc')}</p>
                          </div>
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={formData.reservationMenuRequired}
                              onChange={(e) =>
                                setFormData((prev) => ({ ...prev, reservationMenuRequired: e.target.checked }))
                              }
                              className="peer sr-only"
                            />
                            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
                          </label>
                        </div>
                      </div>

                      {formData.reservationMenuRequired ? (
                        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('admin.merchantEdit.reservations.minPreorderItemsLabel')}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="99"
                            value={formData.reservationMinItemCount ?? 1}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                reservationMinItemCount: e.target.value
                                  ? Math.max(1, parseInt(e.target.value, 10) || 1)
                                  : 1,
                              }))
                            }
                              className="h-10 w-full max-w-55 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {t('admin.merchantEdit.reservations.minPreorderItemsHelp')}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /**
   * Table Settings Tab - Total tables used for QR generation
   */
  const TableSettingsTab = () => (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/20">
            <FaInfoCircle className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">Table settings</h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Configure table count for QR code ordering.</p>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Total Tables
        </label>
        <input
          type="number"
          min="0"
          max="999"
          value={formData.totalTables ?? ""}
          onChange={(e) => setFormData(prev => ({ ...prev, totalTables: e.target.value ? parseInt(e.target.value) : null }))}
          placeholder="e.g. 20"
          className="h-10 w-full max-w-50 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Number of tables for QR code generation. Leave empty if not applicable.</p>
      </div>
    </div>
  );

  /**
   * Fees & Charges Tab - Tax, service charge, packaging fee
   */
  const FeesTab = () => (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Configure tax, service charge, and packaging fee for your orders.
      </p>

      {/* Tax Settings */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Tax</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Apply tax percentage to all orders</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={formData.enableTax}
              onChange={(e) => setFormData(prev => ({ ...prev, enableTax: e.target.checked }))}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
          </label>
        </div>
        {formData.enableTax && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Tax Percentage (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.taxPercentage}
              onChange={(e) => setFormData(prev => ({ ...prev, taxPercentage: parseFloat(e.target.value) || 0 }))}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              placeholder="e.g. 10"
            />
          </div>
        )}
      </div>

      {/* Service Charge Settings */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Service Charge</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Apply service charge percentage to all orders</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={formData.enableServiceCharge}
              onChange={(e) => setFormData(prev => ({ ...prev, enableServiceCharge: e.target.checked }))}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
          </label>
        </div>
        {formData.enableServiceCharge && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Service Charge Percentage (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={formData.serviceChargePercent}
              onChange={(e) => setFormData(prev => ({ ...prev, serviceChargePercent: parseFloat(e.target.value) || 0 }))}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              placeholder="e.g. 5"
            />
          </div>
        )}
      </div>

      {/* Packaging Fee Settings */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Enable Packaging Fee</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Apply fixed packaging fee for takeaway orders only</p>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={formData.enablePackagingFee}
              onChange={(e) => setFormData(prev => ({ ...prev, enablePackagingFee: e.target.checked }))}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
          </label>
        </div>
        {formData.enablePackagingFee && (
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Packaging Fee Amount ({formData.currency === 'AUD' ? 'A$' : formData.currency})
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.packagingFeeAmount}
              onChange={(e) => setFormData(prev => ({ ...prev, packagingFeeAmount: parseFloat(e.target.value) || 0 }))}
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              placeholder="e.g. 2.00"
            />
          </div>
        )}
      </div>
    </div>
  );

  /**
   * Location Tab - Address, country, currency, timezone, map
   * 
   * Auto-sync behavior:
   * - When country changes, currency and timezone are auto-updated
   * - Only Indonesia and Australia are supported
   */
  const LocationTab = () => {
    // Get available timezones for selected country
    const availableTimezones = getTimezonesForCountry(formData.country);

    // Handle country change with auto-sync
    const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newCountry = e.target.value;
      const newCurrency = getCurrencyForCountry(newCountry);
      const newTimezone = getDefaultTimezoneForCountry(newCountry);

      setFormData(prev => ({
        ...prev,
        country: newCountry,
        currency: newCurrency,
        timezone: newTimezone,
      }));
    };

    return (
      <div className="space-y-6">
        {/* Address */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("admin.merchantEdit.address")} <span className="text-red-500">*</span>
          </label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
            rows={2}
            data-tutorial="store-address-input"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          />
        </div>


        {/* Regional Settings */}
        <div className="grid gap-5 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("admin.merchantEdit.country")} <span className="text-red-500">*</span>
            </label>
            <select
              name="country"
              value={formData.country}
              onChange={handleCountryChange}
              required
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            >
              {COUNTRIES.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.flag} {country.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("admin.merchantEdit.currency")} <span className="text-red-500">*</span>
            </label>
            <select
              name="currency"
              value={formData.currency}
              disabled
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-100 px-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed"
            >
              {CURRENCIES.map((currency) => (
                <option key={currency.value} value={currency.value}>
                  {currency.flag} {currency.symbol} - {currency.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("admin.merchantEdit.currencyAutoSet") || "Auto-set based on country"}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t("admin.merchantEdit.timezone")} <span className="text-red-500">*</span>
            </label>
            <select
              name="timezone"
              value={formData.timezone}
              onChange={handleChange}
              required
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            >
              {availableTimezones.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Map Location Picker */}
        <div data-tutorial="store-map-picker">
          <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
            {t("admin.merchantEdit.storeLocation") || "Store Location on Map"}
          </h4>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {t("admin.merchantEdit.storeLocationDesc") || "Set your store's location for customers to find and navigate to your store."}
          </p>
          <MapLocationPicker
            latitude={formData.latitude}
            longitude={formData.longitude}
            onLocationChange={(lat, lng) => {
              setFormData(prev => ({
                ...prev,
                latitude: lat,
                longitude: lng,
              }));
            }}
            height="350px"
          />
        </div>
      </div>
    );
  };

  /**
   * Opening Hours Tab - 7-day schedule
   */
  const OpeningHoursTab = () => (
    <div className="space-y-6" data-tutorial="opening-hours-tab-content">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Set your store&apos;s operating hours and schedule overrides.
      </p>

      <div className="space-y-2" data-tutorial="opening-hours-list">
        {openingHours.map((hour) => (
          <div
            key={hour.dayOfWeek}
            className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50"
            data-tutorial="opening-hours-row"
          >
            <div className="w-24 text-sm font-medium text-gray-900 dark:text-white">
              {DAYS[hour.dayOfWeek]}
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hour.isClosed}
                onChange={(e) => handleOpeningHourChange(hour.dayOfWeek, 'isClosed', e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">Closed</span>
            </label>

            {!hour.isClosed && (
              <div className="flex flex-1 items-center gap-3">
                <input
                  type="time"
                  value={hour.openTime}
                  onChange={(e) => handleOpeningHourChange(hour.dayOfWeek, 'openTime', e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="time"
                  value={hour.closeTime}
                  onChange={(e) => handleOpeningHourChange(hour.dayOfWeek, 'closeTime', e.target.value)}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Per-Day Mode Schedules (advanced) */}
      {authToken && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setShowPerDayModeSchedules((v) => !v)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Per-Day Mode Schedules</h4>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Optional. Override mode availability by day (e.g. delivery only on weekends).
              </p>
            </div>
            <FaChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${showPerDayModeSchedules ? 'rotate-180' : ''}`} />
          </button>
          {showPerDayModeSchedules && (
            <div className="border-t border-gray-200 p-4 dark:border-gray-800">
              <PerDayModeSchedule token={authToken} embedded />
            </div>
          )}
        </div>
      )}

      {/* Special Hours / Holidays (advanced) */}
      {authToken && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-800">
          <button
            type="button"
            onClick={() => setShowSpecialHours((v) => !v)}
            className="flex w-full items-center justify-between p-4 text-left"
          >
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white">Special Hours / Holidays</h4>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Optional. Add one-off hours (holidays, events) and delivery overrides.
              </p>
            </div>
            <FaChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${showSpecialHours ? 'rotate-180' : ''}`} />
          </button>
          {showSpecialHours && (
            <div className="border-t border-gray-200 p-4 dark:border-gray-800">
              <SpecialHoursManager token={authToken} embedded />
            </div>
          )}
        </div>
      )}
    </div>
  );

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
        return <BasicInfoTab />;
      case "sale-modes":
        return <SaleModesTab />;
      case "table-settings":
        return <TableSettingsTab />;
      case "fees":
        return <FeesTab />;
      case "delivery":
        return <DeliveryTab />;
      case "location":
        return <LocationTab />;
      case "hours":
        return <OpeningHoursTab />;
      case "receipt":
        return (
          <ReceiptTemplateTab
            settings={formData.receiptSettings}
            onChange={(settings) => setFormData(prev => ({ ...prev, receiptSettings: settings }))}
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
        // PIN tab rendered inline to avoid re-mount on state change
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/20">
                  <FaKey className="h-5 w-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Delete PIN Protection
                  </h4>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Set a 4-digit PIN to protect order deletion. When enabled, staff must enter this PIN before deleting void order.
                  </p>
                </div>
              </div>
            </div>

            {hasExistingPin && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                <div className="flex items-center gap-2">
                  <FaCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Delete PIN is currently enabled
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {hasExistingPin ? "New PIN" : "Set PIN"} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPin ? "text" : "password"}
                    value={deletePin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                      setDeletePin(val);
                    }}
                    placeholder="Enter 4-digit PIN"
                    maxLength={4}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 pr-12 text-lg tracking-widest text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPin ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">Numbers only, exactly 4 digits</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm PIN <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPin ? "text" : "password"}
                  value={confirmPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setConfirmPin(val);
                  }}
                  placeholder="Confirm 4-digit PIN"
                  maxLength={4}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-lg tracking-widest text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
                {confirmPin && deletePin !== confirmPin && (
                  <p className="mt-1 text-xs text-red-500">PINs do not match</p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSavePin}
                  disabled={savingPin || deletePin.length !== 4 || deletePin !== confirmPin}
                  className="inline-flex h-10 items-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingPin ? "Saving..." : hasExistingPin ? "Update PIN" : "Set PIN"}
                </button>
                {hasExistingPin && (
                  <button
                    type="button"
                    onClick={handleRemovePin}
                    disabled={savingPin}
                    className="inline-flex h-10 items-center rounded-lg border border-red-300 px-4 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Remove PIN
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      default:
        return <BasicInfoTab />;
    }
  };

  // ==================== LOADING STATE ====================

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Edit Merchant" />

        {/* Skeleton Loader */}
        <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          {/* Header Skeleton */}
          <div className="border-b border-gray-200 p-6 dark:border-gray-800">
            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* Tabs Skeleton */}
          <div className="border-b border-gray-200 px-6 dark:border-gray-800">
            <div className="flex gap-4 overflow-x-auto">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse my-2"></div>
              ))}
            </div>
          </div>

          {/* Form Content Skeleton */}
          <div className="p-6 space-y-6">
            {/* Logo Upload Skeleton */}
            <div>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
              <div className="h-3 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
              <div className="flex items-center gap-5">
                <div className="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              </div>
            </div>

            {/* Banner Upload Skeleton */}
            <div>
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3"></div>
              <div className="h-32 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse mb-3"></div>
              <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>

            {/* Form Fields Skeleton */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              </div>
            ))}

            {/* Grid Fields Skeleton */}
            <div className="grid gap-5 md:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                </div>
              ))}
            </div>

            {/* Textarea Skeleton */}
            <div>
              <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
              <div className="h-24 w-full bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Footer Skeleton */}
          <div className="border-t border-gray-200 p-6 dark:border-gray-800">
            <div className="flex justify-end gap-3">
              <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
              <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================

  return (
    <SubscriptionRequired>
      <div data-tutorial="merchant-settings-page">
        <ToastContainer toasts={toasts} />
        <PageBreadcrumb pageTitle="Edit Merchant" />

        <ConfirmDialog
          isOpen={removePinConfirmOpen}
          title={t("common.confirm") || "Confirm"}
          message={
            t("admin.merchantEdit.removeDeletePinConfirm")
              || "Are you sure you want to remove the delete PIN? Orders can be deleted without verification."
          }
          confirmText={t("common.remove") || "Remove"}
          cancelText={t("common.cancel") || "Cancel"}
          variant="warning"
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

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          {/* Header */}
          <div className="border-b border-gray-200 p-6 dark:border-gray-800">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {t("admin.merchantEdit.pageTitle")}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t("admin.merchantEdit.setOpeningHours")}
            </p>
          </div>

          {/* Tabs Navigation */}
          <div data-tutorial="merchant-settings-tabs" className="px-6 pt-4">
            <TabsNavigation
              tabs={TAB_KEYS.map(tab => ({ id: tab.id, label: t(tab.key) }))}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>

          {/* Tab Content */}
          <form data-tutorial="merchant-settings-form" onSubmit={handleSubmit}>
            <div className="p-6">
              {renderTabContent()}
            </div>

            {/* Fixed Footer */}
            <AdminFormFooter
              onCancel={() => router.push("/admin/dashboard/merchant/view")}
              isSubmitting={submitting}
              submitLabel={t("admin.merchantEdit.saveChanges")}
              submittingLabel={t("admin.merchantEdit.saving")}
              submitDataTutorial="settings-save-btn"
            />
          </form>
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
                        <label className="relative inline-flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={reservationsWizardRequirePreorder}
                            onChange={(e) => setReservationsWizardRequirePreorder(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
                        </label>
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
                    <button
                      type="button"
                      onClick={() => {
                        setShowReservationsWizard(false);
                        setReservationsWizardError('');
                      }}
                      className="h-11 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={confirmEnableReservations}
                      className="h-11 flex-1 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600"
                    >
                      Enable
                    </button>
                  </div>
                </div>
              </div>
            )}

        {/* Unsaved Changes Modal */}
        {showUnsavedModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning-100 dark:bg-warning-900/30">
                <FaExclamationTriangle className="h-6 w-6 text-warning-600 dark:text-warning-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">Unsaved Changes</h3>
              <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
                You have unsaved changes. Please save your changes before switching tabs, or discard them to continue.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowUnsavedModal(false)}
                  className="h-11 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={discardChangesAndContinue}
                  className="h-11 flex-1 rounded-lg bg-warning-500 text-sm font-medium text-white hover:bg-warning-600"
                >
                  Discard & Continue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SubscriptionRequired>
  );
}