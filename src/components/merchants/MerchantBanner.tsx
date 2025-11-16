"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface MerchantData {
  id: string;
  name: string;
  code: string;
  logoUrl: string | null;
  isActive: boolean;
  isOpen: boolean;
}

interface MerchantBannerProps {
  isExpanded: boolean;
}

interface OpeningHour {
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

/**
 * Merchant Banner Component
 * Displays merchant info in sidebar with logo, name, and status
 * Clickable to navigate to merchant view page
 */
const MerchantBanner: React.FC<MerchantBannerProps> = ({ isExpanded }) => {
  const router = useRouter();
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkIfOpen = useCallback((openingHours: OpeningHour[]): boolean => {
    if (!openingHours || openingHours.length === 0) return false;

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    const todayHours = openingHours.find((h) => h.dayOfWeek === currentDay);
    if (!todayHours || todayHours.isClosed) return false;

    return currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
  }, []);

  const fetchMerchantData = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch("/api/merchant/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const merchantData = data.data?.merchant || data.data;
        
        // Determine if merchant is currently open based on opening hours
        const isOpen = checkIfOpen(merchantData.openingHours || []);
        
        setMerchant({
          id: merchantData.id,
          name: merchantData.name,
          code: merchantData.code,
          logoUrl: merchantData.logoUrl,
          isActive: merchantData.isActive,
          isOpen,
        });
      }
    } catch (error) {
      console.error("Failed to fetch merchant data:", error);
    } finally {
      setLoading(false);
    }
  }, [checkIfOpen]);

  useEffect(() => {
    fetchMerchantData();
  }, [fetchMerchantData]);

  const handleClick = () => {
    router.push("/admin/dashboard/merchant/view");
  };

  if (loading) {
    return (
      <div className="mb-6 animate-pulse">
        <div className={`flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/50 ${isExpanded ? '' : 'justify-center'}`}>
          <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700"></div>
          {isExpanded && (
            <div className="flex-1">
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
              <div className="mt-2 h-3 w-16 rounded bg-gray-200 dark:bg-gray-700"></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!merchant) return null;

  // Determine status color and text
  const getStatusConfig = () => {
    if (!merchant.isActive) {
      return {
        color: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-50 dark:bg-gray-900/50",
        borderColor: "border-gray-200 dark:border-gray-700",
        dotColor: "bg-gray-400",
        text: "Inactive",
      };
    }
    
    if (merchant.isOpen) {
      return {
        color: "text-success-700 dark:text-success-400",
        bgColor: "bg-success-50 dark:bg-success-900/20",
        borderColor: "border-success-200 dark:border-success-800",
        dotColor: "bg-success-500",
        text: "Open Now",
      };
    }
    
    return {
      color: "text-gray-700 dark:text-gray-300",
      bgColor: "bg-white dark:bg-gray-900",
      borderColor: "border-gray-200 dark:border-gray-700",
      dotColor: "bg-gray-400",
      text: "Closed",
    };
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="mb-6 px-1">
      <button
        onClick={handleClick}
        className={`group relative w-full overflow-hidden rounded-2xl border ${statusConfig.borderColor} bg-linear-to-br ${statusConfig.bgColor} p-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
          isExpanded ? '' : 'flex flex-col items-center'
        }`}
      >
        {/* Background decoration */}
        <div className="absolute right-0 top-0 h-20 w-20 -translate-y-8 translate-x-8 rounded-full bg-brand-500/5 blur-2xl transition-all group-hover:scale-150"></div>
        
        <div className={`relative ${isExpanded ? 'flex items-center gap-4' : 'flex flex-col items-center gap-2'}`}>
          {/* Logo with status indicator */}
          <div className="relative shrink-0">
            <div className={`relative overflow-hidden rounded-xl ${isExpanded ? 'h-14 w-14' : 'h-12 w-12'} border-2 ${statusConfig.borderColor} bg-white shadow-sm dark:bg-gray-800`}>
              {merchant.logoUrl ? (
                <Image
                  src={merchant.logoUrl}
                  alt={merchant.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className={`flex h-full w-full items-center justify-center bg-linear-to-br from-brand-100 to-brand-200 font-bold ${statusConfig.color} dark:from-brand-900/20 dark:to-brand-800/20 ${isExpanded ? 'text-xl' : 'text-lg'}`}>
                  {merchant.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {/* Status dot indicator */}
            <div className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full ${statusConfig.dotColor} border-2 border-white dark:border-gray-900 shadow-sm`}></div>
          </div>

          {/* Merchant Info */}
          {isExpanded ? (
            <div className="flex-1 text-left">
              <h3 className="line-clamp-1 text-sm font-bold text-gray-900 dark:text-white">
                {merchant.name}
              </h3>
              <div className={`mt-1 flex items-center gap-1.5 text-xs font-semibold ${statusConfig.color}`}>
                <div className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColor} animate-pulse`}></div>
                <span>{statusConfig.text}</span>
              </div>
            </div>
          ) : (
            <div className={`text-[10px] font-bold uppercase tracking-wide ${statusConfig.color}`}>
              {statusConfig.text}
            </div>
          )}

          {/* Arrow indicator when expanded */}
          {isExpanded && (
            <svg
              className={`h-5 w-5 shrink-0 ${statusConfig.color} transition-transform group-hover:translate-x-1`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </div>
      </button>
    </div>
  );
};

export default MerchantBanner;
