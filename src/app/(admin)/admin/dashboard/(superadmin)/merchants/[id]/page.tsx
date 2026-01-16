"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ComponentCard from "@/components/common/ComponentCard";
import BalanceSubscriptionModal from "@/components/merchants/BalanceSubscriptionModal";
import AlertDialog from "@/components/modals/AlertDialog";
import { StatusToggle } from "@/components/common/StatusToggle";
import { useTranslation } from "@/lib/i18n/useTranslation";

// Dynamically import map component
const MapContent = dynamic(() => import("@/components/maps/MapContent"), { ssr: false });

interface MerchantDetails {
  id: string;
  code: string;
  name: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  logoUrl: string | null;
  isActive: boolean;
  isOpen: boolean;
  currency: string;
  country: string;
  timezone: string;
  latitude: string | null;
  longitude: string | null;
  mapUrl: string | null;
  createdAt: string;
  openingHours: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
  merchantUsers: Array<{
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function MerchantDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const merchantId = params?.id as string;
  const { t } = useTranslation();

  const [merchant, setMerchant] = useState<MerchantDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingOpen, setIsTogglingOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

  useEffect(() => {
    const fetchMerchant = async () => {
      try {
        setLoading(true);
        setError(null);

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
          if (response.status === 401) {
            router.push("/admin/login");
            return;
          }
          throw new Error("Failed to fetch merchant");
        }

        const data = await response.json();
        
        // Handle response format: { success: true, data: { merchant: {...} } }
        if (data.success && data.data && data.data.merchant) {
          setMerchant(data.data.merchant);
        } else if (data.data) {
          // Fallback if API returns merchant directly
          setMerchant(data.data);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.error("Fetch merchant error:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (merchantId) {
      fetchMerchant();
    }
  }, [merchantId, router]);

  const handleToggleStatus = async () => {
    if (!merchant) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/admin/merchants/${merchant.id}/toggle`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to toggle status");
      }

      // Update local state
      setMerchant({ ...merchant, isActive: !merchant.isActive });
    } catch (err) {
      setAlertMessage(err instanceof Error ? err.message : "Failed to toggle status");
      setAlertOpen(true);
    }
  };

  const toggleStoreOpen = async () => {
    if (!merchant) return;
    
    try {
      setIsTogglingOpen(true);
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/admin/merchants/${merchant.id}/toggle-open`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isOpen: !merchant.isOpen,
        }),
      });

      if (response.ok) {
        // Update local state
        setMerchant({ ...merchant, isOpen: !merchant.isOpen });
      } else {
        throw new Error("Failed to toggle store open status");
      }
    } catch (err) {
      setAlertMessage(err instanceof Error ? err.message : "Failed to toggle store open status");
      setAlertOpen(true);
    } finally {
      setIsTogglingOpen(false);
    }
  };

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Merchant Details" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading merchant details...</p>
        </div>
      </div>
    );
  }

  if (error || !merchant) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Merchant Details" />
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Error</h3>
          <div className="rounded-lg bg-error-50 p-4 dark:bg-error-900/20">
            <p className="text-sm text-error-600 dark:text-error-400">
              {error || "Merchant not found"}
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/dashboard/merchants")}
            className="mt-4 text-sm text-brand-500 hover:text-brand-600 hover:underline dark:text-brand-400"
          >
            ← Back to Merchants
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle={merchant.name} />

      <AlertDialog
        isOpen={alertOpen}
        title="Error"
        message={alertMessage}
        variant="danger"
        onClose={() => setAlertOpen(false)}
      />

      <ComponentCard title="Merchant Details" className="space-y-6">
        {/* Merchant Logo & Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="flex flex-col items-center gap-4 md:flex-row md:items-start">
            {/* Logo */}
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border-4 border-gray-200 dark:border-gray-700 md:h-32 md:w-32">
              {merchant.logoUrl ? (
                <Image
                  src={merchant.logoUrl}
                  alt={merchant.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-100 text-4xl font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400 md:text-5xl">
                  {merchant.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Header Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="mb-2 text-2xl font-bold text-gray-800 dark:text-white/90">
                {merchant.name}
              </h2>
              <p className="mb-3 font-mono text-sm text-gray-500 dark:text-gray-400">
                {merchant.code}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <StatusToggle
                  isActive={merchant.isActive}
                  onToggle={handleToggleStatus}
                  size="sm"
                  activeLabel={t("common.active")}
                  inactiveLabel={t("common.inactive")}
                  activateTitle="Activate"
                  deactivateTitle="Deactivate"
                />
                
                {merchant.isActive && (
                  merchant.isOpen ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-100 px-3 py-1.5 text-xs font-medium text-success-700 dark:bg-success-900/20 dark:text-success-400">
                      <div className="h-2 w-2 rounded-full bg-success-500 animate-pulse"></div>
                      Store Open
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      Store Closed
                    </span>
                  )
                )}
                
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                  {merchant.currency}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Information */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Contact Information</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-400">
                Merchant Name
              </label>
              <p className="text-gray-800 dark:text-white/90">{merchant.name}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-400">
                Email
              </label>
              <p className="text-gray-800 dark:text-white/90">{merchant.email}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-400">
                Phone
              </label>
              <p className="text-gray-800 dark:text-white/90">{merchant.phone}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-400">
                Currency
              </label>
              <p className="text-gray-800 dark:text-white/90">{merchant.currency}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-400">
                Country
              </label>
              <p className="text-gray-800 dark:text-white/90">{merchant.country}</p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-400">
                Timezone
              </label>
              <p className="text-gray-800 dark:text-white/90">{merchant.timezone}</p>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-400">
                Address
              </label>
              <p className="text-gray-800 dark:text-white/90">{merchant.address}</p>
            </div>

            {merchant.description && (
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-400">
                  Description
                </label>
                <p className="text-gray-800 dark:text-white/90">{merchant.description}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
            <button
              onClick={() => router.push(`/admin/dashboard/merchants/${merchant.id}/edit`)}
              className="h-11 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
            >
              Edit Merchant
            </button>
            <button
              onClick={() => setIsBalanceModalOpen(true)}
              className="h-11 rounded-lg bg-purple-500 px-6 text-sm font-medium text-white hover:bg-purple-600 focus:outline-none focus:ring-3 focus:ring-purple-500/20"
            >
              Manage Balance & Subscription
            </button>
            <button
              onClick={toggleStoreOpen}
              disabled={isTogglingOpen || !merchant.isActive}
              className={`h-11 rounded-lg px-6 text-sm font-medium text-white focus:outline-none focus:ring-3 disabled:cursor-not-allowed disabled:opacity-50 ${
                merchant.isOpen
                  ? 'bg-brand-500 hover:bg-brand-600 focus:ring-brand-500/20'
                  : 'bg-green-500 hover:bg-green-600 focus:ring-green-500/20'
              }`}
            >
              {isTogglingOpen ? 'Processing...' : merchant.isOpen ? 'Close Store' : 'Open Store'}
            </button>
            <button
              onClick={() => router.push("/admin/dashboard/merchants")}
              className="h-11 rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/3 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Back to List
            </button>
          </div>
        </div>

        {/* Map Location */}
        {merchant.latitude && merchant.longitude && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
            <h3 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
              Store Location
            </h3>
            <div className="space-y-3">
              <div className="pointer-events-none">
                <MapContent
                  latitude={parseFloat(merchant.latitude)}
                  longitude={parseFloat(merchant.longitude)}
                  onLocationChange={() => {}} // Read-only
                  height="300px"
                />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">GPS Coordinates</p>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {parseFloat(merchant.latitude).toFixed(6)}, {parseFloat(merchant.longitude).toFixed(6)}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/maps?q=${merchant.latitude},${merchant.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand-500 px-3 text-sm font-medium text-white hover:bg-brand-600"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  View in Maps
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Opening Hours */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Opening Hours</h3>
          {merchant.openingHours && merchant.openingHours.length > 0 ? (
            <div className="space-y-3">
              {merchant.openingHours.map((hour) => (
                <div
                  key={hour.dayOfWeek}
                  className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0 dark:border-gray-800"
                >
                  <span className="font-medium text-gray-800 dark:text-white/90">
                    {DAYS[hour.dayOfWeek]}
                  </span>
                  {hour.isClosed ? (
                    <span className="text-error-600 dark:text-error-400">Closed</span>
                  ) : (
                    <span className="text-gray-800 dark:text-white/90">
                      {hour.openTime} - {hour.closeTime}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No opening hours configured</p>
          )}
        </div>

        {/* Staff/Owners */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Staff & Owners</h3>
          {merchant.merchantUsers && merchant.merchantUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Name
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Email
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {merchant.merchantUsers.map((mu, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                        {mu.user.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                        {mu.user.email}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            mu.role === "OWNER"
                              ? "bg-brand-100 text-brand-700 dark:bg-brand-900/20 dark:text-brand-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {mu.role}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No staff members found</p>
          )}
        </div>

        {/* Metadata */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90">Metadata</h3>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-400">
                Merchant ID
              </label>
              <p className="font-mono text-sm text-gray-800 dark:text-white/90">
                {merchant.id}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-500 dark:text-gray-400">
                Created At
              </label>
              <p className="text-gray-800 dark:text-white/90">
                {new Date(merchant.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>
      </ComponentCard>

      {/* Balance & Subscription Modal */}
      <BalanceSubscriptionModal
        isOpen={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
        merchantId={merchant.id}
        merchantName={merchant.name}
        currency={merchant.currency}
      />
    </div>
  );
}
