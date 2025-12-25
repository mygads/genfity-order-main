"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AdminFormFooter from "@/components/common/AdminFormFooter";
import TabsNavigation from "@/components/common/TabsNavigation";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import { COUNTRIES, CURRENCIES, TIMEZONES } from "@/lib/constants/location";
import PerDayModeSchedule from "@/components/merchants/PerDayModeSchedule";
import SpecialHoursManager from "@/components/merchants/SpecialHoursManager";

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
  // Sale mode settings
  isDineInEnabled: boolean;
  isTakeawayEnabled: boolean;
  dineInLabel: string;
  takeawayLabel: string;
  dineInScheduleStart: string;
  dineInScheduleEnd: string;
  takeawayScheduleStart: string;
  takeawayScheduleEnd: string;
  totalTables: number | null;
  // Fee settings
  enableTax: boolean;
  taxPercentage: number;
  enableServiceCharge: boolean;
  serviceChargePercent: number;
  enablePackagingFee: boolean;
  packagingFeeAmount: number;
}

interface OpeningHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Tab configuration
const TABS = [
  { id: "basic", label: "Basic Info" },
  { id: "sale-modes", label: "Sale Modes" },
  { id: "fees", label: "Fees & Charges" },
  { id: "location", label: "Location" },
  { id: "hours", label: "Opening Hours" },
];

/**
 * Edit Merchant Page for Merchant Owner/Staff
 * Allows merchant owners to edit their own merchant information
 * Organized into tabs for better UX
 */
export default function EditMerchantPage() {
  const router = useRouter();
  const { toasts, success: showSuccess, error: showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [authToken, setAuthToken] = useState<string>("");

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
    // Sale mode settings
    isDineInEnabled: true,
    isTakeawayEnabled: true,
    dineInLabel: "",
    takeawayLabel: "",
    dineInScheduleStart: "",
    dineInScheduleEnd: "",
    takeawayScheduleStart: "",
    takeawayScheduleEnd: "",
    totalTables: null,
    // Fee settings
    enableTax: false,
    taxPercentage: 0,
    enableServiceCharge: false,
    serviceChargePercent: 0,
    enablePackagingFee: false,
    packagingFeeAmount: 0,
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
        // Sale mode settings
        isDineInEnabled: merchant.isDineInEnabled ?? true,
        isTakeawayEnabled: merchant.isTakeawayEnabled ?? true,
        dineInLabel: merchant.dineInLabel || "",
        takeawayLabel: merchant.takeawayLabel || "",
        dineInScheduleStart: merchant.dineInScheduleStart || "",
        dineInScheduleEnd: merchant.dineInScheduleEnd || "",
        takeawayScheduleStart: merchant.takeawayScheduleStart || "",
        takeawayScheduleEnd: merchant.takeawayScheduleEnd || "",
        totalTables: merchant.totalTables ?? null,
        // Fee settings
        enableTax: merchant.enableTax || false,
        taxPercentage: merchant.taxPercentage ? parseFloat(merchant.taxPercentage) : 0,
        enableServiceCharge: merchant.enableServiceCharge || false,
        serviceChargePercent: merchant.serviceChargePercent ? parseFloat(merchant.serviceChargePercent) : 0,
        enablePackagingFee: merchant.enablePackagingFee || false,
        packagingFeeAmount: merchant.packagingFeeAmount ? parseFloat(merchant.packagingFeeAmount) : 0,
      });

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
      }
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to load merchant data");
    } finally {
      setLoading(false);
    }
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
      const merchantResponse = await fetch("/api/merchant/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
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

      showSuccess("Success", "Merchant information updated successfully!");

      setTimeout(() => {
        router.push("/admin/dashboard/merchant/view");
      }, 1000);
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
          Store Logo
        </label>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Square image (1:1 ratio). Displayed on mode selection page and header.
        </p>
        <div className="flex items-center gap-5">
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
              {uploading ? 'Uploading...' : 'Change Logo'}
            </button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              All image formats supported. Max 5MB
            </p>
          </div>
        </div>
      </div>

      {/* Banner Upload */}
      <div>
        <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Store Banner
        </label>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          Wide image (2:1 ratio recommended). Displayed at the top of order page.
        </p>
        <div className="flex flex-col gap-3">
          <div className="relative h-32 w-full overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-700">
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
                  <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">No banner uploaded</p>
                </div>
              </div>
            )}
          </div>
          <div>
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
              className="inline-flex h-9 items-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {uploadingBanner ? 'Uploading...' : 'Change Banner'}
            </button>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              All image formats supported. Max 5MB. Recommended: 800x400px (2:1)
            </p>
          </div>
        </div>
      </div>

      {/* Merchant Code (read-only) */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Merchant Code
        </label>
        <input
          type="text"
          name="code"
          value={formData.code}
          disabled
          className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-400"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Cannot be changed</p>
      </div>

      {/* Store Name */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Store Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {/* Email & Phone Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email <span className="text-red-500">*</span>
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
            Phone Number <span className="text-red-500">*</span>
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
          Description
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

  /**
   * Sale Modes Tab - Dine in, Takeaway toggles, labels, schedules, tables
   */
  const SaleModesTab = () => (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Configure which ordering modes are available for customers. At least one mode must be enabled.
      </p>

      {/* Mode Toggles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Dine In Toggle */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Dine In</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Allow customers to order for eating at your place</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={formData.isDineInEnabled}
                onChange={(e) => {
                  if (!e.target.checked && !formData.isTakeawayEnabled) {
                    showError("Error", "At least one sale mode must be enabled");
                    return;
                  }
                  setFormData(prev => ({ ...prev, isDineInEnabled: e.target.checked }));
                }}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
            </label>
          </div>
        </div>

        {/* Takeaway Toggle */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Takeaway / Pick Up</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Allow customers to order for takeaway</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={formData.isTakeawayEnabled}
                onChange={(e) => {
                  if (!e.target.checked && !formData.isDineInEnabled) {
                    showError("Error", "At least one sale mode must be enabled");
                    return;
                  }
                  setFormData(prev => ({ ...prev, isTakeawayEnabled: e.target.checked }));
                }}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
            </label>
          </div>
        </div>
      </div>

      {/* Custom Labels */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">Custom Button Labels</h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Dine In Button Label
            </label>
            <input
              type="text"
              value={formData.dineInLabel}
              onChange={(e) => setFormData(prev => ({ ...prev, dineInLabel: e.target.value }))}
              placeholder="Dine In"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave empty to use default</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Takeaway Button Label
            </label>
            <input
              type="text"
              value={formData.takeawayLabel}
              onChange={(e) => setFormData(prev => ({ ...prev, takeawayLabel: e.target.value }))}
              placeholder="Takeaway"
              className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave empty to use default</p>
          </div>
        </div>
      </div>

      {/* Mode Schedules */}
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white">Mode Schedules</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400">Set time ranges when each mode is available. Leave empty for 24/7 availability.</p>
        </div>
        
        {/* Dine In Schedule */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Dine In Available Hours</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">From</label>
              <input
                type="time"
                value={formData.dineInScheduleStart}
                onChange={(e) => setFormData(prev => ({ ...prev, dineInScheduleStart: e.target.value }))}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">To</label>
              <input
                type="time"
                value={formData.dineInScheduleEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, dineInScheduleEnd: e.target.value }))}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Takeaway Schedule */}
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
          <p className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Takeaway Available Hours</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">From</label>
              <input
                type="time"
                value={formData.takeawayScheduleStart}
                onChange={(e) => setFormData(prev => ({ ...prev, takeawayScheduleStart: e.target.value }))}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">To</label>
              <input
                type="time"
                value={formData.takeawayScheduleEnd}
                onChange={(e) => setFormData(prev => ({ ...prev, takeawayScheduleEnd: e.target.value }))}
                className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Per-Day Mode Schedules */}
      {authToken && (
        <PerDayModeSchedule token={authToken} />
      )}

      {/* Special Hours / Holidays */}
      {authToken && (
        <SpecialHoursManager token={authToken} />
      )}

      {/* Total Tables */}
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
          className="h-10 w-full max-w-[200px] rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
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
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
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
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
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
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-brand-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none dark:bg-gray-700" />
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
   */
  const LocationTab = () => (
    <div className="space-y-6">
      {/* Address */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Address <span className="text-red-500">*</span>
        </label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleChange}
          required
          rows={2}
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
        />
      </div>

      {/* Regional Settings */}
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Country <span className="text-red-500">*</span>
          </label>
          <select
            name="country"
            value={formData.country}
            onChange={handleChange}
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
            Currency <span className="text-red-500">*</span>
          </label>
          <select
            name="currency"
            value={formData.currency}
            onChange={handleChange}
            required
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          >
            {CURRENCIES.map((currency) => (
              <option key={currency.value} value={currency.value}>
                {currency.symbol} {currency.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Timezone <span className="text-red-500">*</span>
          </label>
          <select
            name="timezone"
            value={formData.timezone}
            onChange={handleChange}
            required
            className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Map Location Picker */}
      <div>
        <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
          Store Location on Map
        </h4>
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
          Set your store&apos;s location for customers to find and navigate to your store.
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

  /**
   * Opening Hours Tab - 7-day schedule
   */
  const OpeningHoursTab = () => (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Set your store&apos;s operating hours for each day of the week.
      </p>
      <div className="space-y-2">
        {openingHours.map((hour) => (
          <div
            key={hour.dayOfWeek}
            className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50"
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
    </div>
  );

  // ==================== RENDER ACTIVE TAB CONTENT ====================

  const renderTabContent = () => {
    switch (activeTab) {
      case "basic":
        return <BasicInfoTab />;
      case "sale-modes":
        return <SaleModesTab />;
      case "fees":
        return <FeesTab />;
      case "location":
        return <LocationTab />;
      case "hours":
        return <OpeningHoursTab />;
      default:
        return <BasicInfoTab />;
    }
  };

  // ==================== LOADING STATE ====================

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Edit Merchant" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading merchant...</p>
        </div>
      </div>
    );
  }

  // ==================== MAIN RENDER ====================

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <PageBreadcrumb pageTitle="Edit Merchant" />

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Merchant Information
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update your store details and settings
          </p>
        </div>

        {/* Tabs Navigation */}
        <div className="px-6 pt-4">
          <TabsNavigation
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>

        {/* Tab Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {renderTabContent()}
          </div>

          {/* Fixed Footer */}
          <AdminFormFooter
            onCancel={() => router.push("/admin/dashboard/merchant/view")}
            isSubmitting={submitting}
            submitLabel="Save Changes"
            submittingLabel="Saving..."
          />
        </form>
      </div>
    </div>
  );
}
