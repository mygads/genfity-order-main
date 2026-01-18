"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useMerchant } from "@/context/MerchantContext";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * MerchantInactiveAlert
 *
 * Shows a fixed banner when the current merchant is inactive.
 * This is a UX guard only; APIs still enforce restrictions.
 */
export default function MerchantInactiveAlert() {
  const { user } = useAuth();
  const { merchant } = useMerchant();
  const { t } = useTranslation();

  const isMerchantUser = user?.role === "MERCHANT_OWNER" || user?.role === "MERCHANT_STAFF";
  const isInactive = isMerchantUser && merchant?.isActive === false;

  if (!isInactive) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-60 border-b-2 border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800/50 dark:bg-gray-900/95 shadow-lg">
      <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-900/40 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <div>
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">{t("admin.merchantInactive.title")}</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{t("admin.merchantInactive.message")}</p>
          </div>
        </div>

        <Link
          href="/admin/dashboard"
          className="shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2 
            bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg transition-colors
            text-sm sm:text-base"
        >
          {t("admin.merchantInactive.backToDashboard")}
        </Link>
      </div>
    </div>
  );
}
