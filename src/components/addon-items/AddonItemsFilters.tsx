"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface AddonCategory {
  id: string;
  name: string;
}

interface AddonItemsFiltersProps {
  searchQuery: string;
  filterCategory: string;
  filterInputType: string;
  filterStatus: string;
  categories: AddonCategory[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onInputTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export default function AddonItemsFilters({
  searchQuery,
  filterCategory,
  filterInputType,
  filterStatus,
  categories,
  onSearchChange,
  onCategoryChange,
  onInputTypeChange,
  onStatusChange,
}: AddonItemsFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
      <div>
        <input
          type="text"
          placeholder={t("admin.addonItems.searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        />
      </div>
      <div>
        <select
          value={filterCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
        >
          <option value="all">{t("admin.addonItems.allCategories")}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      <div>
        <select
          value={filterInputType}
          onChange={(e) => onInputTypeChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
        >
          <option value="all">{t("admin.addonItems.filters.allInputTypes")}</option>
          <option value="SELECT">{t("admin.addonItems.filters.selectOnly")}</option>
          <option value="QTY">{t("admin.addonItems.filters.qtyOnly")}</option>
        </select>
      </div>
      <div>
        <select
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
        >
          <option value="all">{t("admin.addonItems.allStatus")}</option>
          <option value="active">{t("common.active")}</option>
          <option value="inactive">{t("common.inactive")}</option>
        </select>
      </div>
    </div>
  );
}
