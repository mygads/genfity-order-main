"use client";

import { isStoreEffectivelyOpen, type OpeningHour } from "@/lib/utils/storeStatus";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface StoreStatusChipProps {
  isActive: boolean;
  isOpen: boolean;
  isManualOverride: boolean;
  openingHours: OpeningHour[];
  timezone?: string;
}

export default function StoreStatusChip({
  isActive,
  isOpen,
  isManualOverride,
  openingHours,
  timezone,
}: StoreStatusChipProps) {
  const { t } = useTranslation();

  if (!isActive) return null;

  const effectivelyOpen = isStoreEffectivelyOpen({
    isOpen,
    isManualOverride,
    openingHours,
    timezone,
  });

  if (effectivelyOpen) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-100 px-3 py-1.5 text-xs font-medium text-success-700 dark:bg-success-900/20 dark:text-success-400">
        <div className="h-2 w-2 rounded-full bg-success-500 animate-pulse"></div>
        {t("admin.merchant.storeOpen")}
        {isManualOverride && (
          <span className="ml-1 opacity-70">({t("admin.merchant.manual")})</span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
      <div className="h-2 w-2 rounded-full bg-red-500"></div>
      {t("admin.merchant.storeClosed")}
      {isManualOverride && (
        <span className="ml-1 opacity-70">({t("admin.merchant.manual")})</span>
      )}
    </span>
  );
}
