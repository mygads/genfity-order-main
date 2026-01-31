"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatCurrency } from "@/lib/utils/format";
import { FaArrowLeft, FaSyncAlt } from "react-icons/fa";
import { fetchMerchantApi } from "@/lib/utils/orderApiClient";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

type VoucherTemplate = {
  id: string;
  name: string;
  audience: "POS" | "CUSTOMER" | "BOTH";
  reportCategory?: string | null;
};

type VoucherCode = {
  id: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  usedCount?: number;
};

type UsageRow = {
  id: string;
  createdAt: string;
  source: "POS_VOUCHER" | "CUSTOMER_VOUCHER" | "MANUAL";
  label: string;
  discountAmount: number;
  voucherCode?: { id: string; code: string } | null;
  appliedByUser?: { id: string; name: string | null; email: string | null } | null;
  appliedByCustomer?: { id: string; name: string | null; phone: string | null } | null;
  order: {
    id: string;
    orderNumber: string;
    orderType: string;
    status: string;
    placedAt: string;
    subtotal: number;
    discountAmount: number;
    totalAmount: number;
    customer?: { id: string; name: string | null; phone: string | null } | null;
  };
};

type UsageResponse = {
  items: UsageRow[];
  nextCursor: string | null;
};

function toIsoStartOfDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toISOString();
}

function toIsoEndOfDay(dateStr: string): string {
  const d = new Date(`${dateStr}T23:59:59.999`);
  return d.toISOString();
}

export default function VoucherTemplateUsagePage() {
  const router = useRouter();
  const { t, locale } = useTranslation();

  const routeParams = useParams();
  const templateId = typeof routeParams?.id === "string" ? routeParams.id : "";

  const [merchantCurrency, setMerchantCurrency] = useState<string>("IDR");
  const [merchantTimezone, setMerchantTimezone] = useState<string>("UTC");
  const [template, setTemplate] = useState<VoucherTemplate | null>(null);
  const [codes, setCodes] = useState<VoucherCode[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<UsageRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [selectedCode, setSelectedCode] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchBase = useCallback(async () => {
    if (!templateId) {
      throw new Error("Missing voucher template id");
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    const [templateRes, profileRes, codesRes] = await Promise.all([
      fetchMerchantApi(`/api/merchant/order-vouchers/templates/${templateId}`, {
        token,
      }),
      fetchMerchantApi("/api/merchant/profile", {
        token,
      }),
      fetchMerchantApi(`/api/merchant/order-vouchers/templates/${templateId}/codes?take=500`, {
        token,
      }),
    ]);

    const templateJson = (await templateRes.json()) as ApiResponse<VoucherTemplate>;
    if (!templateRes.ok || !templateJson.success || !templateJson.data) {
      throw new Error(templateJson.message || "Failed to load voucher template");
    }

    setTemplate(templateJson.data);

    const profileJson = (await profileRes.json()) as ApiResponse<{ currency?: string; timezone?: string }>;
    const currency = profileRes.ok && profileJson.success ? profileJson.data?.currency : undefined;
    const timezone = profileRes.ok && profileJson.success ? profileJson.data?.timezone : undefined;
    if (typeof currency === "string" && currency.length > 0) {
      setMerchantCurrency(currency);
    }
    if (typeof timezone === "string" && timezone.length > 0) {
      setMerchantTimezone(timezone);
    }

    const codesJson = (await codesRes.json()) as ApiResponse<VoucherCode[]>;
    if (codesRes.ok && codesJson.success) {
      setCodes(Array.isArray(codesJson.data) ? codesJson.data : []);
    } else {
      setCodes([]);
    }
  }, [router, templateId]);

  const buildUsagePath = useCallback(
    (cursor?: string | null) => {
      if (!templateId) {
        throw new Error("Missing voucher template id");
      }

      const url = new URL(`/api/merchant/order-vouchers/templates/${templateId}/usage`, "http://localhost");
      url.searchParams.set("take", "50");

      const trimmedCode = selectedCode.trim();
      if (trimmedCode) url.searchParams.set("code", trimmedCode);

      if (startDate) url.searchParams.set("startDate", toIsoStartOfDay(startDate));
      if (endDate) url.searchParams.set("endDate", toIsoEndOfDay(endDate));

      if (cursor) url.searchParams.set("cursor", cursor);

      return `${url.pathname}${url.search}`;
    },
    [endDate, selectedCode, startDate, templateId]
  );

  const fetchUsage = useCallback(async () => {
    if (!templateId) {
      setError("Missing voucher template id");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      router.push("/admin/login");
      return;
    }

    const res = await fetchMerchantApi(buildUsagePath(null), {
      token,
    });

    const json = (await res.json()) as ApiResponse<UsageResponse>;
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Failed to load voucher usage");
    }

    setItems(Array.isArray(json.data?.items) ? json.data!.items : []);
    setNextCursor(typeof json.data?.nextCursor === "string" ? json.data.nextCursor : null);
  }, [buildUsagePath, router]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;

    try {
      setLoadingMore(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetchMerchantApi(buildUsagePath(nextCursor), {
        token,
      });

      const json = (await res.json()) as ApiResponse<UsageResponse>;
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load more voucher usage");
      }

      const newItems = Array.isArray(json.data?.items) ? json.data!.items : [];
      setItems((prev) => [...prev, ...newItems]);
      setNextCursor(typeof json.data?.nextCursor === "string" ? json.data.nextCursor : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more voucher usage");
    } finally {
      setLoadingMore(false);
    }
  }, [buildUsagePath, loadingMore, nextCursor, router]);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await fetchBase();
      await fetchUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load voucher usage");
    } finally {
      setLoading(false);
    }
  }, [fetchBase, fetchUsage]);

  useEffect(() => {
    if (!templateId) return;
    refresh();
  }, [refresh]);

  const totals = useMemo(() => {
    const count = items.length;
    const totalDiscount = items.reduce((sum, r) => sum + (typeof r.discountAmount === "number" ? r.discountAmount : 0), 0);
    const bySource = items.reduce(
      (acc, r) => {
        acc[r.source] = (acc[r.source] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return { count, totalDiscount, bySource };
  }, [items]);

  const renderSource = (value: UsageRow["source"]) => {
    if (value === "POS_VOUCHER") return t("admin.orderVouchers.usage.source.pos");
    if (value === "CUSTOMER_VOUCHER") return t("admin.orderVouchers.usage.source.customer");
    return t("admin.orderVouchers.usage.source.manual");
  };

  return (
    <div>
      <PageBreadcrumb pageTitle={t("admin.orderVouchers.usage.title")} />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/admin/dashboard/order-vouchers")}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
              >
                <FaArrowLeft className="h-4 w-4" />
                {t("admin.orderVouchers.usage.back")}
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t("admin.orderVouchers.usage.title")}
              {template?.name ? <span className="ml-2 text-gray-500 dark:text-gray-400">• {template.name}</span> : null}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.usage.subtitle")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
            >
              <FaSyncAlt className="h-4 w-4" />
              {t("admin.orderVouchers.refresh")}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">
              {t("common.close")}
            </button>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.usage.filters.code")}</label>
            <select
              value={selectedCode}
              onChange={(e) => setSelectedCode(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="">{t("admin.orderVouchers.usage.filters.codeAll")}</option>
              {codes.map((c) => (
                <option key={c.id} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.usage.filters.startDate")}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.usage.filters.endDate")}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-300">
          <div>
            <span className="font-medium">{t("admin.orderVouchers.usage.summary.uses")}</span>: {totals.count}
          </div>
          <div>
            <span className="font-medium">{t("admin.orderVouchers.usage.summary.totalDiscount")}</span>: {formatCurrency(totals.totalDiscount, merchantCurrency as any, locale)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {t("admin.orderVouchers.usage.summary.bySource", {
              pos: totals.bySource.POS_VOUCHER || 0,
              customer: totals.bySource.CUSTOMER_VOUCHER || 0,
              manual: totals.bySource.MANUAL || 0,
            })}
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCode("");
              setStartDate("");
              setEndDate("");
            }}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
          >
            {t("admin.orderVouchers.usage.filters.clear")}
          </button>
          <button
            type="button"
            onClick={fetchUsage}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            {t("admin.orderVouchers.usage.filters.apply")}
          </button>
        </div>

        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ) : items.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.usage.empty")}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.usage.emptyDesc")}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.usage.table.appliedAt")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.usage.table.order")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.usage.table.source")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.usage.table.code")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.usage.table.discount")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.usage.table.appliedBy")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.usage.table.customer")}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.usage.table.orderTotal")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {items.map((row) => {
                    const appliedAt = row.order?.placedAt ? new Date(row.order.placedAt) : new Date(row.createdAt);
                    const appliedBy = row.appliedByUser?.name || row.appliedByUser?.email || row.appliedByCustomer?.name || row.appliedByCustomer?.phone || "-";
                    const customer = row.order?.customer?.name || row.order?.customer?.phone || "-";

                    return (
                      <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {appliedAt.toLocaleString(locale || undefined, { timeZone: merchantTimezone || "UTC" })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{row.order.orderNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{renderSource(row.source)}</td>
                        <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-white">{row.voucherCode?.code || "-"}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(row.discountAmount, merchantCurrency as any, locale)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{appliedBy}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{customer}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{formatCurrency(row.order.totalAmount, merchantCurrency as any, locale)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {nextCursor ? (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? t("admin.orderVouchers.usage.loadingMore") : t("admin.orderVouchers.usage.loadMore")}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
