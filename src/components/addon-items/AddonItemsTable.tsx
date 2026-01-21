"use client";

import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { TableActionButton } from "@/components/common/TableActionButton";
import { StatusToggle } from "@/components/common/StatusToggle";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatCurrency, type Currency } from "@/lib/utils/format";

interface AddonCategory {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number | null;
}

interface AddonItem {
  id: string;
  addonCategoryId: string;
  name: string;
  description: string | null;
  price: string | number;
  inputType: "SELECT" | "QTY";
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
  lastStockResetAt: string | null;
  createdAt: string;
  addonCategory?: AddonCategory;
}

interface AddonItemsTableProps {
  items: AddonItem[];
  categories: AddonCategory[];
  currency: string;
  onEdit: (item: AddonItem) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string, name: string) => void;
}

export default function AddonItemsTable({
  items,
  categories,
  currency,
  onEdit,
  onToggleActive,
  onDelete,
}: AddonItemsTableProps) {
  const { t, locale } = useTranslation();

  const getPriceDisplay = (price: string | number): { label: string; isFree: boolean } => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    if (!Number.isFinite(numPrice) || numPrice === 0) {
      return { label: t("common.free"), isFree: true };
    }

    return {
      label: formatCurrency(numPrice, (currency || "AUD") as Currency, locale),
      isFree: false,
    };
  };

  const getCategoryName = (item: AddonItem): string => {
    if (item.addonCategory?.name) return item.addonCategory.name;
    const category = categories.find(c => c.id === item.addonCategoryId);
    return category?.name || t("common.unknown");
  };

  const getInputTypeLabel = (item: AddonItem): string => {
    const category = item.addonCategory || categories.find(c => c.id === item.addonCategoryId);
    if (!category) {
      return item.inputType === "SELECT"
        ? t("admin.addonItems.inputType.selection")
        : t("admin.addonItems.inputType.quantity");
    }
    const max = category.maxSelection;
    if (item.inputType === "QTY") return t("admin.addonItems.inputType.quantity");
    return max === 1 ? t("admin.addonItems.inputType.radio") : t("admin.addonItems.inputType.checkbox");
  };

  const getInputTypeBadgeColor = (item: AddonItem): string => {
    const category = item.addonCategory || categories.find(c => c.id === item.addonCategoryId);
    if (item.inputType === "QTY") return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
    const max = category?.maxSelection;
    return max === 1
      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
      : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
  };

  if (items.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("admin.addonItems.noMatch")}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead>
          <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("common.name")}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("common.category")}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("common.type")}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("common.price")}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("common.status")}</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("common.actions")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item, index) => (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
              <td className="px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</p>
                  {item.description && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                  {getCategoryName(item)}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getInputTypeBadgeColor(item)}`}>
                  {getInputTypeLabel(item)}
                </span>
              </td>
              <td className="px-4 py-4">
                {(() => {
                  const { label, isFree } = getPriceDisplay(item.price);
                  return (
                    <span
                      className={`text-sm font-semibold ${isFree
                        ? "text-success-600 dark:text-success-400"
                        : "text-gray-800 dark:text-white/90"
                        }`}
                    >
                      {label}
                    </span>
                  );
                })()}
              </td>

              <td className="px-4 py-4">
                <StatusToggle
                  isActive={item.isActive}
                  onToggle={() => onToggleActive(item.id, item.isActive)}
                  size="sm"
                  activeLabel={t("common.active")}
                  inactiveLabel={t("common.inactive")}
                />
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <TableActionButton
                    icon={FaEdit}
                    onClick={() => onEdit(item)}
                    title={t("common.edit")}
                    aria-label={t("common.edit")}
                    data-tutorial={index === 0 ? "addon-item-edit-btn" : undefined}
                  />
                  <TableActionButton
                    icon={FaTrash}
                    tone="danger"
                    onClick={() => onDelete(item.id, item.name)}
                    title={t("common.delete")}
                    aria-label={t("common.delete")}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
