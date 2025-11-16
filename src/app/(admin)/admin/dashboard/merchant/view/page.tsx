"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useAuth } from "@/hooks/useAuth";
import MerchantQRCodeModal from "@/components/merchants/MerchantQRCodeModal";

interface MerchantData {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  isActive: boolean;
  address: string;
  email: string;
  phone: string;
  description: string;
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
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);

  const isMerchantOwner = user?.role === "MERCHANT_OWNER";

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

        let owners: Array<{id: string; name: string; email: string}> = [];
        let staff: Array<{id: string; name: string; email: string}> = [];

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
          isActive: merchantData.isActive,
          address: merchantData.address,
          email: merchantData.email,
          phone: merchantData.phone,
          description: merchantData.description,
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

  const getMerchantUrl = () => {
    if (typeof window !== 'undefined' && merchant) {
      return `${window.location.origin}/${merchant.code}`;
    }
    return '';
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

  if (!merchant) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Merchant Details" />
        <div className="mt-6 py-10 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Merchant not found</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Merchant Details" />

      {/* Header Card */}
      <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-white/3">
        <div className="relative h-32 bg-gradient-to-r from-brand-500 to-brand-600">
          <div className="absolute inset-0 bg-[url('/images/pattern.svg')] opacity-10"></div>
        </div>
        
        <div className="relative px-6 pb-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
            {/* Logo */}
            <div className="-mt-16 shrink-0">
              <div className="relative h-32 w-32 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg dark:border-gray-800">
                {merchant.logoUrl ? (
                  <Image
                    src={merchant.logoUrl}
                    alt={merchant.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-100 to-brand-200 text-4xl font-bold text-brand-600 dark:from-brand-900/20 dark:to-brand-800/20 dark:text-brand-400">
                    {merchant.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {merchant.name}
                  </h1>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Code: <span className="font-mono font-semibold">{merchant.code}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {merchant.isActive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success-100 px-3 py-1.5 text-sm font-medium text-success-700 dark:bg-success-900/20 dark:text-success-400">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                      </svg>
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                      </svg>
                      Inactive
                    </span>
                  )}
                </div>
              </div>

              {merchant.description && (
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  {merchant.description}
                </p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            {isMerchantOwner && (
              <Link
                href="/admin/dashboard/merchant/edit"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Merchant
              </Link>
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
              Go to Store
            </a>

            <button
              onClick={() => setShowQRModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              View QR Code
            </button>
          </div>

          {/* View-only notice for staff */}
          {!isMerchantOwner && (
            <div className="mt-4 rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-900/20">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-warning-600 dark:text-warning-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <h4 className="text-sm font-semibold text-warning-800 dark:text-warning-300">View-Only Access</h4>
                  <p className="mt-1 text-sm text-warning-700 dark:text-warning-400">
                    You have read-only access. Contact the merchant owner to make changes.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contact Information */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Contact Information
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-brand-100 p-2 dark:bg-brand-900/20">
                <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Email</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{merchant.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-brand-100 p-2 dark:bg-brand-900/20">
                <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Phone</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{merchant.phone}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-brand-100 p-2 dark:bg-brand-900/20">
                <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Address</p>
                <p className="mt-1 text-sm text-gray-900 dark:text-white">{merchant.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Opening Hours */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Opening Hours
          </h2>
          <div className="space-y-2.5">
            {merchant.openingHours.map((hour) => (
              <div key={hour.dayOfWeek} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-900/50">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {DAYS[hour.dayOfWeek]}
                </span>
                {hour.isClosed ? (
                  <span className="text-sm text-gray-400 dark:text-gray-500">Closed</span>
                ) : (
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {hour.openTime} - {hour.closeTime}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Owners */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Owners ({merchant.owners.length})
          </h2>
          <div className="space-y-3">
            {merchant.owners.length > 0 ? (
              merchant.owners.map((owner) => (
                <div key={owner.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                    {owner.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{owner.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{owner.email}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No owners assigned</p>
            )}
          </div>
        </div>

        {/* Staff */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            Staff ({merchant.staff.length})
          </h2>
          <div className="space-y-3">
            {merchant.staff.length > 0 ? (
              merchant.staff.map((staffMember) => (
                <div key={staffMember.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    {staffMember.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{staffMember.name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{staffMember.email}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">No staff assigned</p>
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
