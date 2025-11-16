"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";

interface MerchantFormData {
  name: string;
  code: string;
  description: string;
  address: string;
  email: string;
  phoneNumber: string;
  logoUrl?: string;
}

interface OpeningHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function EditMerchantPage() {
  const router = useRouter();
  const params = useParams();
  const merchantId = params?.id as string;
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
  });

  const [openingHours, setOpeningHours] = useState<OpeningHour[]>([
    { dayOfWeek: 0, openTime: "09:00", closeTime: "22:00", isClosed: false }, // Sunday
    { dayOfWeek: 1, openTime: "09:00", closeTime: "22:00", isClosed: false }, // Monday
    { dayOfWeek: 2, openTime: "09:00", closeTime: "22:00", isClosed: false }, // Tuesday
    { dayOfWeek: 3, openTime: "09:00", closeTime: "22:00", isClosed: false }, // Wednesday
    { dayOfWeek: 4, openTime: "09:00", closeTime: "22:00", isClosed: false }, // Thursday
    { dayOfWeek: 5, openTime: "09:00", closeTime: "22:00", isClosed: false }, // Friday
    { dayOfWeek: 6, openTime: "09:00", closeTime: "22:00", isClosed: false }, // Saturday
  ]);

  useEffect(() => {
    const fetchMerchant = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        if (!token) {
          router.push("/admin/login");
          return;
        }

        const response = await fetch(`/api/admin/merchants/${merchantId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch merchant");
        }

        const data = await response.json();
        // API returns { success: true, data: { merchant: {...} } }
        const merchant = data.data?.merchant || data.data;
        
        setFormData({
          name: merchant.name || "",
          code: merchant.code || "",
          description: merchant.description || "",
          address: merchant.address || "",
          email: merchant.email || "",
          phoneNumber: merchant.phone || "",
          logoUrl: merchant.logoUrl || "",
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

    if (merchantId) {
      fetchMerchant();
    }
  }, [merchantId, router, showError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem("accessToken");
      const response = await fetch(`/api/admin/merchants/${merchantId}/upload-logo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setFormData(prev => ({ ...prev, logoUrl: data.data.url }));
        showSuccess('Success', 'Logo uploaded successfully');
      } else {
        showError('Error', data.message || 'Failed to upload logo');
      }
    } catch (err) {
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
      const merchantResponse = await fetch(`/api/admin/merchants/${merchantId}`, {
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
      const hoursResponse = await fetch(`/api/admin/merchants/${merchantId}/opening-hours`, {
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

      showSuccess("Success", "Merchant updated successfully!");
      
      setTimeout(() => {
        router.push(`/admin/dashboard/merchants/${merchantId}`);
      }, 1500);
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

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Update Merchant Information
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Edit merchant details and settings
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Logo Upload Section */}
            <div className="border-b border-gray-200 pb-6 dark:border-gray-800">
              <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Merchant Logo
              </label>
              <div className="flex items-center gap-6">
                <div className="relative h-24 w-24 overflow-hidden rounded-xl border-4 border-gray-200 dark:border-gray-700">
                  {formData.logoUrl ? (
                    <Image
                      src={formData.logoUrl}
                      alt={formData.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-brand-100 text-2xl font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                      {formData.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
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
                    className="h-10 rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {uploading ? 'Uploading...' : 'Change Logo'}
                  </button>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Recommended: Square image, JPEG/PNG/WebP, max 5MB
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Merchant Code <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                required
                disabled
                className="h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-500 cursor-not-allowed dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Merchant code cannot be changed</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Merchant Name <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email <span className="text-error-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone Number <span className="text-error-500">*</span>
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                required
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Address <span className="text-error-500">*</span>
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            {/* Opening Hours Section */}
            <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
              <h4 className="mb-4 text-base font-semibold text-gray-800 dark:text-white/90">
                Opening Hours
              </h4>
              <div className="space-y-3">
                {openingHours.map((hour) => (
                  <div
                    key={hour.dayOfWeek}
                    className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50"
                  >
                    {/* Day Name */}
                    <div className="w-28 font-medium text-gray-800 dark:text-white/90">
                      {DAYS[hour.dayOfWeek]}
                    </div>

                    {/* Is Closed Checkbox */}
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={hour.isClosed}
                        onChange={(e) => handleOpeningHourChange(hour.dayOfWeek, 'isClosed', e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-700"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">Closed</span>
                    </label>

                    {/* Time Inputs */}
                    {!hour.isClosed && (
                      <>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">Open:</label>
                          <input
                            type="time"
                            value={hour.openTime}
                            onChange={(e) => handleOpeningHourChange(hour.dayOfWeek, 'openTime', e.target.value)}
                            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">Close:</label>
                          <input
                            type="time"
                            value={hour.closeTime}
                            onChange={(e) => handleOpeningHourChange(hour.dayOfWeek, 'closeTime', e.target.value)}
                            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                          />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-4 border-t border-gray-200 pt-6 dark:border-gray-800">
              <button
                type="button"
                onClick={() => router.back()}
                className="h-11 rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.05]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-11 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Updating..." : "Update Merchant"}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
}
