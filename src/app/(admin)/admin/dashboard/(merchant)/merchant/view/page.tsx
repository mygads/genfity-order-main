"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/hooks/useAuth";
import MerchantQRCodeModal from "@/components/merchants/MerchantQRCodeModal";
import { isStoreEffectivelyOpen } from "@/lib/utils/storeStatus";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatCurrency } from "@/lib/utils/format";
import { useContextualHint, CONTEXTUAL_HINTS } from "@/lib/tutorial/components/ContextualHint";

// Dynamically import map component
const MapContent = dynamic(() => import("@/components/maps/MapContent"), { ssr: false });

interface MerchantData {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  isActive: boolean;
  isOpen: boolean;
  isManualOverride: boolean;
  address: string;
  email: string;
  phone: string;
  description: string;
  country: string;
  currency: string;
  timezone: string;
  latitude: string | null;
  longitude: string | null;
  // Tax & Fees
  enableTax: boolean;
  taxPercentage: number;
  enableServiceCharge: boolean;
  serviceChargePercent: number;
  enablePackagingFee: boolean;
  packagingFeeAmount: number;
  owners: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  staff: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  openingHours: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isClosed: boolean;
  }>;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Merchant View Page
 * Displays comprehensive merchant information
 * Available for MERCHANT_OWNER and MERCHANT_STAFF
 */
export default function ViewMerchantPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { showHint } = useContextualHint();
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [isTogglingOpen, setIsTogglingOpen] = useState(false);

  const isMerchantOwner = user?.role === "MERCHANT_OWNER";

  // Show contextual hint on first visit
  useEffect(() => {
    if (!loading && merchant) {
      showHint(CONTEXTUAL_HINTS.merchantViewTip);
    }
  }, [loading, merchant, showHint]);

  useEffect(() => {
    fetchMerchantDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMerchantDetails = async () => {
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

      if (response.ok) {
        const data = await response.json();
        const merchantData = data.data?.merchant || data.data;

        // Fetch users associated with this merchant
        const usersResponse = await fetch("/api/merchant/users", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        let owners: Array<{ id: string; name: string; email: string }> = [];
        let staff: Array<{ id: string; name: string; email: string }> = [];

        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          const users = usersData.data?.users || [];

          interface UserItem {
            id: string;
            name: string;
            email: string;
            role: string;
          }

          owners = users.filter((u: UserItem) => u.role === 'MERCHANT_OWNER').map((u: UserItem) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          }));

          staff = users.filter((u: UserItem) => u.role === 'MERCHANT_STAFF').map((u: UserItem) => ({
            id: u.id,
            name: u.name,
            email: u.email,
          }));
        }

        setMerchant({
          id: merchantData.id,
          name: merchantData.name,
          code: merchantData.code,
          logoUrl: merchantData.logoUrl,
          bannerUrl: merchantData.bannerUrl,
          isActive: merchantData.isActive,
          isOpen: merchantData.isOpen ?? true,
          isManualOverride: merchantData.isManualOverride ?? false,
          address: merchantData.address,
          email: merchantData.email,
          phone: merchantData.phoneNumber || merchantData.phone || '',
          description: merchantData.description,
          country: merchantData.country || "Australia",
          currency: merchantData.currency || "AUD",
          timezone: merchantData.timezone || "Australia/Sydney",
          latitude: merchantData.latitude || null,
          longitude: merchantData.longitude || null,
          // Fee settings
          enableTax: merchantData.enableTax || false,
          taxPercentage: Number(merchantData.taxPercentage) || 0,
          enableServiceCharge: merchantData.enableServiceCharge || false,
          serviceChargePercent: Number(merchantData.serviceChargePercent) || 0,
          enablePackagingFee: merchantData.enablePackagingFee || false,
          packagingFeeAmount: Number(merchantData.packagingFeeAmount) || 0,
          openingHours: merchantData.openingHours || [],
          owners,
          staff,
        });
      }
    } catch (error) {
      console.error("Failed to fetch merchant details:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleStoreOpen = async () => {
    if (!merchant || !isMerchantOwner) return;

    try {
      setIsTogglingOpen(true);
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      // Calculate effective status to determine action
      const effectivelyOpen = isStoreEffectivelyOpen({
        isOpen: merchant.isOpen,
        isManualOverride: merchant.isManualOverride,
        openingHours: merchant.openingHours.map(h => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
          isClosed: h.isClosed,
        })),
        timezone: merchant.timezone,
      });

      // If currently in manual mode, switch to auto
      if (merchant.isManualOverride) {
        const response = await fetch("/api/merchant/toggle-open", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isManualOverride: false,
          }),
        });

        if (response.ok) {
          await fetchMerchantDetails();
          window.dispatchEvent(new Event('merchantStatusUpdated'));
        }
      } else {
        // Auto mode - toggle to manual with opposite of effective status
        const response = await fetch("/api/merchant/toggle-open", {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isOpen: !effectivelyOpen,
            isManualOverride: true,
          }),
        });

        if (response.ok) {
          await fetchMerchantDetails();
          window.dispatchEvent(new Event('merchantStatusUpdated'));
        }
      }
    } catch (error) {
      console.error("Failed to toggle store open status:", error);
    } finally {
      setIsTogglingOpen(false);
    }
  };

  const getMerchantUrl = () => {
    if (typeof window !== 'undefined' && merchant) {
      return `${window.location.origin}/${merchant.code}`;
    }
    return '';
  };

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle={t("admin.merchant.pageTitle")} />
        
        {/* Skeleton Loader */}
        <div className="mt-6 space-y-6">
          {/* Header Skeleton */}
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
            {/* Banner Skeleton */}
            <div className="h-40 w-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
            
            <div className="px-6 py-8">
              {/* Logo & Info Skeleton */}
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                <div className="mt-4 h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                <div className="mt-2 h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                
                {/* Status Badges Skeleton */}
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                  <div className="h-7 w-24 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
                </div>
                
                {/* Description Skeleton */}
                <div className="mt-4 space-y-2">
                  <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-4 w-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
              
              {/* Action Buttons Skeleton */}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Content Sections Skeleton */}
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
              <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-5"></div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j}>
                    <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <div>
        <PageBreadcrumb pageTitle={t("admin.merchant.pageTitle")} />
        <div className="mt-6 py-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.merchant.notFound")}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle={t("admin.merchant.pageTitle")} />

      {/* Header - Centered Layout */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
        {/* Banner Image */}
        {merchant.bannerUrl && (
          <div className="relative h-40 w-full overflow-hidden">
            <Image
              src={merchant.bannerUrl}
              alt={`${merchant.name} banner`}
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="px-6 py-8">
          {/* Logo & Basic Info - Centered */}
          <div className="flex flex-col items-center text-center">
            {/* Logo */}
            <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
              {merchant.logoUrl ? (
                <Image
                  src={merchant.logoUrl}
                  alt={merchant.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-brand-100 to-brand-200 text-3xl font-bold text-brand-600 dark:from-brand-900/20 dark:to-brand-800/20 dark:text-brand-400">
                  {merchant.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name & Code */}
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
              {merchant.name}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Code: <span className="font-mono font-semibold">{merchant.code}</span>
            </p>

            {/* Status Badges */}
            <div className="mt-3 flex items-center gap-2">
              {merchant.isActive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success-100 px-3 py-1.5 text-xs font-medium text-success-700 dark:bg-success-900/20 dark:text-success-400">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                  {t("admin.merchant.statusActive")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                  </svg>
                  {t("admin.merchant.statusInactive")}
                </span>
              )}

              {merchant.isActive && (
                (() => {
                  const effectivelyOpen = isStoreEffectivelyOpen({
                    isOpen: merchant.isOpen,
                    isManualOverride: merchant.isManualOverride,
                    openingHours: merchant.openingHours.map(h => ({
                      dayOfWeek: h.dayOfWeek,
                      openTime: h.openTime,
                      closeTime: h.closeTime,
                      isClosed: h.isClosed,
                    })),
                    timezone: merchant.timezone,
                  });
                  return effectivelyOpen ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-100 px-3 py-1.5 text-xs font-medium text-success-700 dark:bg-success-900/20 dark:text-success-400">
                      <div className="h-2 w-2 rounded-full bg-success-500 animate-pulse"></div>
                      {t("admin.merchant.storeOpen")}
                      {merchant.isManualOverride && <span className="ml-1 opacity-70">(Manual)</span>}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      <div className="h-2 w-2 rounded-full bg-red-500"></div>
                      {t("admin.merchant.storeClosed")}
                      {merchant.isManualOverride && <span className="ml-1 opacity-70">(Manual)</span>}
                    </span>
                  );
                })()
              )}
            </div>

            {/* Description */}
            {merchant.description && (
              <p className="mt-4 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                {merchant.description}
              </p>
            )}
          </div>

          {/* Quick Actions - Centered */}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {isMerchantOwner && (
              <>
                <Link
                  href="/admin/dashboard/merchant/edit"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t("admin.merchant.edit")}
                </Link>

                <button
                  onClick={toggleStoreOpen}
                  disabled={isTogglingOpen || !merchant.isActive}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors ${
                    merchant.isManualOverride
                      ? 'bg-brand-500 hover:bg-brand-600'
                      : isStoreEffectivelyOpen({
                          isOpen: merchant.isOpen,
                          isManualOverride: merchant.isManualOverride,
                          openingHours: merchant.openingHours.map(h => ({
                            dayOfWeek: h.dayOfWeek,
                            openTime: h.openTime,
                            closeTime: h.closeTime,
                            isClosed: h.isClosed,
                          })),
                          timezone: merchant.timezone,
                        })
                        ? 'bg-brand-500 hover:bg-brand-600'
                        : 'bg-green-500 hover:bg-green-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isTogglingOpen ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {t("admin.merchant.processing")}
                    </>
                  ) : merchant.isManualOverride ? (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Switch to Auto
                    </>
                  ) : isStoreEffectivelyOpen({
                      isOpen: merchant.isOpen,
                      isManualOverride: merchant.isManualOverride,
                      openingHours: merchant.openingHours.map(h => ({
                        dayOfWeek: h.dayOfWeek,
                        openTime: h.openTime,
                        closeTime: h.closeTime,
                        isClosed: h.isClosed,
                      })),
                      timezone: merchant.timezone,
                    }) ? (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t("admin.merchant.closeStore")}
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {t("admin.merchant.openStore")}
                    </>
                  )}
                </button>

                {!merchant.isActive && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("admin.merchant.storeMustBeActive")}
                  </p>
                )}
              </>
            )}

            <a
              href={getMerchantUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {t("admin.merchant.goToStore")}
            </a>

            <button
              onClick={() => setShowQRModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              {t("admin.merchant.viewQRCode")}
            </button>
          </div>

          {/* View-only notice for staff - Centered */}
          {!isMerchantOwner && (
            <div className="mt-6 mx-auto max-w-2xl rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-900/20">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-warning-600 dark:text-warning-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-warning-800 dark:text-warning-300">{t("admin.merchant.viewOnlyAccess")}</h4>
                  <p className="mt-1 text-sm text-warning-700 dark:text-warning-400">
                    {t("admin.merchant.viewOnlyDesc")}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Sections - Single Column Clean Layout */}
      <div className="space-y-6">
        {/* Contact Information */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
            {t("admin.merchant.contactInfo")}
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("admin.merchant.email")}</p>
              <p className="text-sm text-gray-900 dark:text-white">{merchant.email}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("admin.merchant.phone")}</p>
              <p className="text-sm text-gray-900 dark:text-white">{merchant.phone}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("admin.merchant.country")}</p>
              <p className="text-sm text-gray-900 dark:text-white">{merchant.country}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("admin.merchant.currency")}</p>
              <p className="text-sm text-gray-900 dark:text-white">{merchant.currency}</p>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("admin.merchant.timezone")}</p>
              <p className="text-sm text-gray-900 dark:text-white">{merchant.timezone}</p>
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("admin.merchant.address")}</p>
              <p className="text-sm text-gray-900 dark:text-white">{merchant.address}</p>
            </div>
          </div>
        </div>

        {/* Fees & Charges */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("admin.merchant.feesCharges")}
            </h2>
            {isMerchantOwner && (
              <Link
                href="/admin/dashboard/merchant/edit"
                className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                {t("admin.merchant.editSettings")}
              </Link>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Tax */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("admin.merchant.tax")}</p>
                {merchant.enableTax ? (
                  <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-900/20 dark:text-success-400">
                    {t("admin.merchant.enabled")}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {t("admin.merchant.disabled")}
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {merchant.enableTax ? `${merchant.taxPercentage}%` : '-'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("admin.merchant.appliedToAllOrders")}</p>
            </div>

            {/* Service Charge */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("admin.merchant.serviceCharge")}</p>
                {merchant.enableServiceCharge ? (
                  <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-900/20 dark:text-success-400">
                    {t("admin.merchant.enabled")}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {t("admin.merchant.disabled")}
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {merchant.enableServiceCharge ? `${merchant.serviceChargePercent}%` : '-'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("admin.merchant.appliedToAllOrders")}</p>
            </div>

            {/* Packaging Fee */}
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{t("admin.merchant.packagingFee")}</p>
                {merchant.enablePackagingFee ? (
                  <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-900/20 dark:text-success-400">
                    {t("admin.merchant.enabled")}
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {t("admin.merchant.disabled")}
                  </span>
                )}
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {merchant.enablePackagingFee ? formatCurrency(merchant.packagingFeeAmount, merchant.currency) : '-'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t("admin.merchant.takeawayOnly")}</p>
            </div>
          </div>
        </div>

        {/* Map Location */}
        {merchant.latitude && merchant.longitude && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
            <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
              {t("admin.merchant.mapLocation")}
            </h2>
            <div className="space-y-3">
              <div className="pointer-events-none">
                <MapContent
                  latitude={parseFloat(merchant.latitude)}
                  longitude={parseFloat(merchant.longitude)}
                  onLocationChange={() => { }} // Read-only
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
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
            {t("admin.merchant.openingHours")}
          </h2>
          {merchant.openingHours && merchant.openingHours.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {merchant.openingHours.map((hour) => (
                <div key={hour.dayOfWeek} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {DAYS[hour.dayOfWeek]}
                  </p>
                  {hour.isClosed ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500">{t("admin.merchant.closed")}</p>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {hour.openTime} - {hour.closeTime}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-8 text-center dark:border-gray-700 dark:bg-gray-900/50">
              <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No opening hours set</p>
              {isMerchantOwner && (
                <Link
                  href="/admin/dashboard/merchant/edit"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                >
                  Set opening hours
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Team Section - Owners & Staff Combined */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-5 text-lg font-semibold text-gray-900 dark:text-white">
            {t("admin.merchant.team")}
          </h2>
          <div className="space-y-4">
            {/* Owners */}
            {merchant.owners.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("admin.merchant.owners")} ({merchant.owners.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {merchant.owners.map((owner) => (
                    <div key={owner.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                        {owner.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{owner.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{owner.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Staff */}
            {merchant.staff.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("admin.merchant.staff")} ({merchant.staff.length})
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {merchant.staff.map((staffMember) => (
                    <div key={staffMember.id} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {staffMember.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{staffMember.name}</p>
                        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{staffMember.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {merchant.owners.length === 0 && merchant.staff.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.merchant.noStaff")}</p>
            )}
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <MerchantQRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        merchantName={merchant.name}
        merchantCode={merchant.code}
        merchantUrl={getMerchantUrl()}
      />
    </div>
  );
}
