"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useMerchant } from "@/context/MerchantContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useToast } from "@/context/ToastContext";
import { clearAdminAuth } from "@/lib/utils/adminAuth";
import { clearDriverAuth } from "@/lib/utils/driverAuth";
import ConfirmDialog from "@/components/modals/ConfirmDialog";

/**
 * MerchantInactiveAlert
 *
 * Shows a fixed banner when the current merchant is inactive.
 * This is a UX guard only; APIs still enforce restrictions.
 */
export default function MerchantInactiveAlert() {
  const router = useRouter();
  const { user } = useAuth();
  const { merchant } = useMerchant();
  const { t } = useTranslation();
  const { showError } = useToast();
  const [isDismissed, setIsDismissed] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const isMerchantUser = user?.role === "MERCHANT_OWNER" || user?.role === "MERCHANT_STAFF";
  const isMerchantStaff = user?.role === "MERCHANT_STAFF";
  const isInactive = isMerchantUser && merchant?.isActive === false;

  if (!isInactive || isDismissed) return null;

  const executeLeaveMerchant = async () => {
    if (!merchant?.id || isLeaving) return;
    setIsLeaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        clearAdminAuth();
        clearDriverAuth();
        router.push('/admin/login');
        return;
      }

      const response = await fetch('/api/merchant/staff/leave', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ merchantId: merchant.id }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || t("admin.staff.leaveMerchantError"));
      }

      clearAdminAuth();
      clearDriverAuth();
      router.push('/admin/login');
    } catch (err) {
      showError(err instanceof Error ? err.message : t("admin.staff.leaveMerchantError"), t("common.error"));
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="fixed top-14 md:top-16 left-0 right-0 z-60 border-b-2 border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800/50 dark:bg-gray-900/95 shadow-lg">
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

        <div className="shrink-0 flex items-center gap-2">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 
              bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg transition-colors
              text-sm sm:text-base"
          >
            {t("admin.merchantInactive.backToDashboard")}
          </Link>
          {isMerchantStaff && merchant?.id && (
            <button
              type="button"
              onClick={() => setLeaveConfirmOpen(true)}
              disabled={isLeaving}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700 font-medium transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30 text-sm sm:text-base"
            >
              {isLeaving ? t("common.pleaseWait") : t("admin.staff.leaveMerchant")}
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label={t("common.close")}
            title={t("common.close")}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={leaveConfirmOpen}
        title={t("admin.staff.leaveMerchant")}
        message={t("admin.staff.leaveMerchantConfirm")}
        confirmText={t("admin.staff.leaveMerchant")}
        cancelText={t("common.cancel")}
        variant="warning"
        onConfirm={() => {
          setLeaveConfirmOpen(false);
          executeLeaveMerchant();
        }}
        onCancel={() => setLeaveConfirmOpen(false)}
      />
    </div>
  );
}
