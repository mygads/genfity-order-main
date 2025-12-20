"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import { COUNTRIES, CURRENCIES, TIMEZONES } from "@/lib/constants/location";

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
  country: string;
  currency: string;
  timezone: string;
  latitude?: number | null;
  longitude?: number | null;
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

/**
 * Edit Merchant Page for Merchant Owner/Staff
 * Allows merchant owners to edit their own merchant information
 */
export default function EditMerchantPage() {
  const router = useRouter();
  const { toasts, success: showSuccess, error: showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState<MerchantFormData>({
    name: "",
    code: "",
    description: "",
    address: "",
    email: "",
    phoneNumber: "",
    logoUrl: "",
    country: "Australia",
    currency: "AUD",
    timezone: "Australia/Sydney",
    latitude: null,
    longitude: null,
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
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/merchant/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch merchant");
      }

      const data = await response.json();
      const merchant = data.data?.merchant || data.data;

      setFormData({
        name: merchant.name || "",
        code: merchant.code || "",
        description: merchant.description || "",
        address: merchant.address || "",
        email: merchant.email || "",
        phoneNumber: merchant.phone || "",
        logoUrl: merchant.logoUrl || "",
        country: merchant.country || "Australia",
        currency: merchant.currency || "AUD",
        timezone: merchant.timezone || "Australia/Sydney",
        latitude: merchant.latitude ? parseFloat(merchant.latitude) : null,
        longitude: merchant.longitude ? parseFloat(merchant.longitude) : null,
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

    // Validate file type
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      showError('Invalid File', 'Only JPEG, PNG, and WebP images are allowed');
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

      const token = localStorage.getItem("accessToken");
      const response = await fetch("/api/merchant/upload-logo", {
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

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <PageBreadcrumb pageTitle="Edit Merchant" />

      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <div className="mb-6 border-b border-gray-200 pb-5 dark:border-gray-800">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Merchant Information
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update your store details and regional settings
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-5">
            {/* Logo Upload */}
            <div>
              <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Store Logo
              </label>
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
                    accept="image/jpeg,image/jpg,image/png,image/webp"
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
                    JPG, PNG or WebP. Max 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Merchant Code */}
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

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Regional Settings */}
          <div className="space-y-5 border-t border-gray-200 pt-6 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Regional Settings
            </h3>
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
          </div>

          {/* Fees & Charges */}
          <div className="space-y-5 border-t border-gray-200 pt-6 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Fees & Charges
            </h3>
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
                    Packaging Fee Amount (A$)
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

          {/* Store Location */}
          <div className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Store Location
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
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

          {/* Opening Hours */}
          <div className="space-y-4 border-t border-gray-200 pt-6 dark:border-gray-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              Opening Hours
            </h3>
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

          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard/merchant/view")}
              className="h-10 rounded-lg border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/3 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 rounded-lg bg-brand-500 px-5 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
