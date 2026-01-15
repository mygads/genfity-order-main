"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import IconToggle from "@/components/ui/IconToggle";
import { useModalImplicitClose } from "@/hooks/useModalImplicitClose";
import { useTranslation } from "@/lib/i18n/useTranslation";

export type MerchantTransactionToggleKey = "newOrder" | "stockOut" | "lowStock" | "payment" | "subscription";
export type StaffActivityToggleKey = "login" | "logout";

interface Props {
  open: boolean;
  onClose: () => void;
  isLoading: boolean;
  savingKey: string | null;
  data?: {
    settings: {
      accountTransactions: boolean;
      merchant: Record<MerchantTransactionToggleKey, boolean>;
      staff: Record<StaffActivityToggleKey, boolean>;
    };
    availability: {
      merchant: Record<MerchantTransactionToggleKey, boolean>;
      staff: Record<StaffActivityToggleKey, boolean>;
    };
  };
  onToggleAccountTransactions: (nextValue: boolean) => Promise<void>;
  onToggleMerchantKey: (key: MerchantTransactionToggleKey, nextValue: boolean) => Promise<void>;
  onToggleStaffKey: (key: StaffActivityToggleKey, nextValue: boolean) => Promise<void>;
}

export default function NotificationSettingsModal({
  open,
  onClose,
  isLoading,
  savingKey,
  data,
  onToggleAccountTransactions,
  onToggleMerchantKey,
  onToggleStaffKey,
}: Props) {
  const { t } = useTranslation();
  const [isMounted, setIsMounted] = useState(false);

  const disableImplicitClose = isLoading || Boolean(savingKey);
  const { onBackdropMouseDown } = useModalImplicitClose({
    isOpen: open,
    onClose,
    disableImplicitClose,
  });

  const staffAvailability = data?.availability?.staff ?? { login: false, logout: false };
  const staffSettings = data?.settings?.staff ?? { login: true, logout: true };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!open || !isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900"
        role="dialog"
        aria-modal="true"
        aria-label={t("notifications.settings.title") || "Notification Settings"}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              {t("notifications.settings.title") || "Notification Settings"}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t("notifications.settings.subtitle") || "Control which notifications you receive."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
            aria-label={t("common.close") || "Close"}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5">
          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 animate-pulse">
              <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
              <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
              <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
              <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
          ) : data ? (
            <div className="grid gap-4">
              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <IconToggle
                  checked={data.settings.accountTransactions}
                  onChange={onToggleAccountTransactions}
                  disabled={savingKey === "accountTransactions"}
                  label={t("notifications.settings.account.title") || "Account transaction notifications"}
                  description={t("notifications.settings.account.desc") || "Profile and security updates for your account."}
                />
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("notifications.settings.merchant.title") || "Merchant transaction notifications"}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t("notifications.settings.merchant.desc") || "Order, stock, payment, and subscription updates for your store."}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {data.availability.merchant.newOrder ? (
                    <IconToggle
                      checked={data.settings.merchant.newOrder}
                      onChange={(v) => onToggleMerchantKey("newOrder", v)}
                      disabled={savingKey === "merchant:newOrder"}
                      size="sm"
                      label={t("notifications.settings.merchant.newOrder") || "New orders"}
                      description={t("notifications.settings.merchant.newOrderDesc") || "Get notified when a new order arrives."}
                    />
                  ) : null}

                  {data.availability.merchant.stockOut ? (
                    <IconToggle
                      checked={data.settings.merchant.stockOut}
                      onChange={(v) => onToggleMerchantKey("stockOut", v)}
                      disabled={savingKey === "merchant:stockOut"}
                      size="sm"
                      label={t("notifications.settings.merchant.stockOut") || "Out of stock"}
                      description={t("notifications.settings.merchant.stockOutDesc") || "Items that become out of stock."}
                    />
                  ) : null}

                  {data.availability.merchant.lowStock ? (
                    <IconToggle
                      checked={data.settings.merchant.lowStock}
                      onChange={(v) => onToggleMerchantKey("lowStock", v)}
                      disabled={savingKey === "merchant:lowStock"}
                      size="sm"
                      label={t("notifications.settings.merchant.lowStock") || "Low stock"}
                      description={t("notifications.settings.merchant.lowStockDesc") || "Items that are running low."}
                    />
                  ) : null}

                  {data.availability.merchant.payment ? (
                    <IconToggle
                      checked={data.settings.merchant.payment}
                      onChange={(v) => onToggleMerchantKey("payment", v)}
                      disabled={savingKey === "merchant:payment"}
                      size="sm"
                      label={t("notifications.settings.merchant.payment") || "Payments"}
                      description={t("notifications.settings.merchant.paymentDesc") || "Payment status updates."}
                    />
                  ) : null}

                  {data.availability.merchant.subscription ? (
                    <IconToggle
                      checked={data.settings.merchant.subscription}
                      onChange={(v) => onToggleMerchantKey("subscription", v)}
                      disabled={savingKey === "merchant:subscription"}
                      size="sm"
                      label={t("notifications.settings.merchant.subscription") || "Subscription"}
                      description={t("notifications.settings.merchant.subscriptionDesc") || "Trial and subscription reminders."}
                    />
                  ) : null}

                  {!Object.values(data.availability.merchant).some(Boolean) ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t("notifications.settings.merchant.none") || "No merchant notification toggles available for your role."}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t("notifications.settings.staff.title") || "Staff activity notifications"}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t("notifications.settings.staff.desc") || "Get notified when staff members log in or out."}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {staffAvailability.login ? (
                    <IconToggle
                      checked={staffSettings.login}
                      onChange={(v) => onToggleStaffKey("login", v)}
                      disabled={savingKey === "staff:login"}
                      size="sm"
                      label={t("notifications.settings.staff.login") || "Staff login"}
                      description={t("notifications.settings.staff.loginDesc") || "When a staff member logs in."}
                    />
                  ) : null}

                  {staffAvailability.logout ? (
                    <IconToggle
                      checked={staffSettings.logout}
                      onChange={(v) => onToggleStaffKey("logout", v)}
                      disabled={savingKey === "staff:logout"}
                      size="sm"
                      label={t("notifications.settings.staff.logout") || "Staff logout"}
                      description={t("notifications.settings.staff.logoutDesc") || "When a staff member logs out."}
                    />
                  ) : null}

                  {!Object.values(staffAvailability).some(Boolean) ? (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {t("notifications.settings.staff.none") || "Staff activity toggles are only available to merchant owners."}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t("notifications.settings.loadFailed") || "Failed to load notification settings."}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-200 p-5 dark:border-gray-800">
          <button
            onClick={onClose}
            className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t("common.close") || "Close"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
