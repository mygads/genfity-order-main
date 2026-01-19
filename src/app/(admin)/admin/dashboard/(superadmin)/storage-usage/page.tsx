"use client";

import React, { useMemo, useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useSWRWithAuth } from "@/hooks/useSWRWithAuth";
import { TableSkeleton } from "@/components/common/SkeletonLoaders";
import { FaDatabase, FaFolderOpen, FaStore } from "react-icons/fa";

interface MerchantUsage {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  totalBytes: number;
  objectCount: number;
}

interface StorageUsageResponse {
  success: boolean;
  data: {
    merchants: MerchantUsage[];
    totals: {
      totalBytes: number;
      objectCount: number;
    };
  };
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let index = 0;
  let value = bytes;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function StorageUsagePage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: usageResponse,
    error: usageError,
    isLoading,
    mutate,
  } = useSWRWithAuth<StorageUsageResponse>(
    "/api/admin/merchants/storage-usage",
    { refreshInterval: 60000 }
  );

  const merchants = useMemo(() => {
    if (!usageResponse?.success) return [];
    return usageResponse.data?.merchants ?? [];
  }, [usageResponse]);

  const totals = usageResponse?.success
    ? usageResponse.data?.totals
    : { totalBytes: 0, objectCount: 0 };

  const filteredMerchants = useMemo(() => {
    if (!searchQuery) return merchants;
    const query = searchQuery.toLowerCase();
    return merchants.filter((merchant) =>
      merchant.name.toLowerCase().includes(query) ||
      merchant.code.toLowerCase().includes(query)
    );
  }, [merchants, searchQuery]);

  const sortedMerchants = useMemo(() => {
    return [...filteredMerchants].sort((a, b) => b.totalBytes - a.totalBytes);
  }, [filteredMerchants]);

  return (
    <div className="w-full min-w-0">
      <PageBreadcrumb pageTitle={t("admin.storageUsage.title")} />

      <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("admin.storageUsage.title")}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("admin.storageUsage.subtitle")}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("admin.storageUsage.totalStorage")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  {formatBytes(totals?.totalBytes ?? 0)}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                <FaDatabase className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("admin.storageUsage.totalObjects")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  {(totals?.objectCount ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                <FaFolderOpen className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {t("admin.storageUsage.totalMerchants")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                  {merchants.length.toLocaleString()}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                <FaStore className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-lg">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder={t("admin.storageUsage.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>

          <button
            onClick={() => mutate()}
            className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t("admin.storageUsage.refresh")}
          </button>
        </div>

        {usageError && !isLoading && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {t("admin.error.loadFailed")}
          </div>
        )}

        {isLoading ? (
          <TableSkeleton rows={6} columns={5} />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap">
                <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:bg-gray-800/50 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">{t("admin.storageUsage.table.merchant")}</th>
                    <th className="px-4 py-3">{t("admin.storageUsage.table.code")}</th>
                    <th className="px-4 py-3">{t("admin.storageUsage.table.status")}</th>
                    <th className="px-4 py-3 text-right">{t("admin.storageUsage.table.objects")}</th>
                    <th className="px-4 py-3 text-right">{t("admin.storageUsage.table.storage")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {sortedMerchants.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400"
                      >
                        {t("admin.storageUsage.empty")}
                      </td>
                    </tr>
                  ) : (
                    sortedMerchants.map((merchant) => (
                      <tr key={merchant.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {merchant.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {merchant.code}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              merchant.isActive
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                            }`}
                          >
                            {merchant.isActive ? t("common.active") : t("common.inactive")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                          {merchant.objectCount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                          {formatBytes(merchant.totalBytes)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
