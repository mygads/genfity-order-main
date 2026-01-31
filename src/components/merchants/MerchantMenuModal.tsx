"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import MerchantQRCodeModal from "@/components/merchants/MerchantQRCodeModal";
import { fetchMerchantApi } from "@/lib/utils/orderApiClient";

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

interface MerchantMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Merchant Menu Modal Component
 * Shows merchant information and provides quick actions:
 * - Edit Merchant
 * - Go to Customer Page
 * - View QR Code
 * - View Owner/Staff list
 * - View Opening Hours
 */
const MerchantMenuModal: React.FC<MerchantMenuModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  
  const isMerchantOwner = user?.role === "MERCHANT_OWNER";

  useEffect(() => {
    if (isOpen) {
      fetchMerchantDetails();
    }
  }, [isOpen]);

  const fetchMerchantDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetchMerchantApi("/api/merchant/profile", {
        token,
      });

      if (response.ok) {
        const data = await response.json();
        const merchantData = data.data?.merchant || data.data;
        
        // Fetch users associated with this merchant
        const usersResponse = await fetchMerchantApi(`/api/merchant/users`, {
          token,
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

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-[1000] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        {loading ? (
          <div className="py-10 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading merchant details...</p>
          </div>
        ) : merchant ? (
          <>
            {/* Header */}
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border-2 border-gray-200 dark:border-gray-700">
                  {merchant.logoUrl ? (
                    <Image
                      src={merchant.logoUrl}
                      alt={merchant.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-brand-100 text-2xl font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                      {merchant.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {merchant.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Code: {merchant.code}
                  </p>
                  <div className="mt-1">
                    {merchant.isActive ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-900/20 dark:text-success-400">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                        </svg>
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Quick Actions */}
            <div className={`mb-6 grid ${isMerchantOwner ? 'grid-cols-3' : 'grid-cols-2'} gap-3`}>
              {/* Edit Merchant - Only for MERCHANT_OWNER */}
              {isMerchantOwner && (
                <Link
                  href="/admin/dashboard/merchant/edit"
                  className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center transition-all hover:border-brand-300 hover:bg-brand-50 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-brand-700 dark:hover:bg-brand-900/20"
                  onClick={onClose}
                >
                  <svg className="h-6 w-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Edit Merchant</span>
                </Link>
              )}

              <a
                href={getMerchantUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center transition-all hover:border-brand-300 hover:bg-brand-50 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-brand-700 dark:hover:bg-brand-900/20"
              >
                <svg className="h-6 w-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Go to Store</span>
              </a>

              <button
                onClick={() => setShowQRModal(true)}
                className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center transition-all hover:border-brand-300 hover:bg-brand-50 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-brand-700 dark:hover:bg-brand-900/20"
              >
                <svg className="h-6 w-6 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View QR Code</span>
              </button>
            </div>

            {/* Merchant Details */}
            <div className="space-y-4">
              {!isMerchantOwner && (
                <div className="mb-4">
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                    Merchant Details
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    View-only access. Contact merchant owner to make changes.
                  </p>
                </div>
              )}
              {/* Basic Info */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Contact Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-400">{merchant.email}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-400">{merchant.phone}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-gray-600 dark:text-gray-400">{merchant.address}</span>
                  </div>
                </div>
              </div>

              {/* Opening Hours */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Opening Hours</h3>
                <div className="space-y-1.5 text-sm">
                  {merchant.openingHours.map((hour) => (
                    <div key={hour.dayOfWeek} className="flex items-center justify-between">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {DAYS[hour.dayOfWeek]}
                      </span>
                      {hour.isClosed ? (
                        <span className="text-gray-400 dark:text-gray-500">Closed</span>
                      ) : (
                        <span className="text-gray-600 dark:text-gray-400">
                          {hour.openTime} - {hour.closeTime}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Owners and Staff */}
              <div className="grid grid-cols-2 gap-4">
                {/* Owners */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                  <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Owners ({merchant.owners.length})
                  </h3>
                  <div className="space-y-2">
                    {merchant.owners.length > 0 ? (
                      merchant.owners.map((owner) => (
                        <div key={owner.id} className="text-sm">
                          <div className="font-medium text-gray-700 dark:text-gray-300">{owner.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{owner.email}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500">No owners assigned</p>
                    )}
                  </div>
                </div>

                {/* Staff */}
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                  <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Staff ({merchant.staff.length})
                  </h3>
                  <div className="space-y-2">
                    {merchant.staff.length > 0 ? (
                      merchant.staff.map((staffMember) => (
                        <div key={staffMember.id} className="text-sm">
                          <div className="font-medium text-gray-700 dark:text-gray-300">{staffMember.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{staffMember.email}</div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 dark:text-gray-500">No staff assigned</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Failed to load merchant details</p>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {merchant && (
        <MerchantQRCodeModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          merchantName={merchant.name}
          merchantCode={merchant.code}
          merchantUrl={getMerchantUrl()}
        />
      )}
    </>
  );
};

export default MerchantMenuModal;
