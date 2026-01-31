"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatCurrency } from "@/lib/utils/format";
import { fetchMerchantApi } from "@/lib/utils/orderApiClient";
import { FaArrowLeft, FaSyncAlt } from "react-icons/fa";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

type VoucherAnalytics = {
  summary: { uses: number; totalDiscountAmount: number | null };
  bySource: Array<{
    source: string;
    _count: { id: number };
    _sum: { discountAmount: number | null };
  }>;
  byTemplate: Array<{
    templateId: string;
    templateName: string | null;
    audience: string | null;
    reportCategory: string | null;
    uses: number;
    totalDiscountAmount: number | null;
  }>;
  byReportCategory: Array<{ reportCategory: string; uses: number; totalDiscountAmount: number }>;
  meta: { period: string; timezone: string; startDate: string; endDate: string };
};

function toIsoStartOfDay(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toISOString();
}

function toIsoEndOfDay(dateStr: string): string {
  const d = new Date(`${dateStr}T23:59:59.999`);
  return d.toISOString();
}

export default function OrderVoucherAnalyticsPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();

  const [merchantCurrency, setMerchantCurrency] = useState<string>("IDR");

  const [period, setPeriod] = useState<string>("month");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VoucherAnalytics | null>(null);

  const buildPath = useCallback(() => {
    const url = new URL("/api/merchant/order-vouchers/analytics", "http://localhost");
    url.searchParams.set("period", period);

    if (period === "custom") {
      if (startDate) url.searchParams.set("startDate", toIsoStartOfDay(startDate));
      if (endDate) url.searchParams.set("endDate", toIsoEndOfDay(endDate));
    }

    return `${url.pathname}${url.search}`;
  }, [endDate, period, startDate]);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const [analyticsRes, profileRes] = await Promise.all([
        fetchMerchantApi(buildPath(), {
          token,
        }),
        fetchMerchantApi("/api/merchant/profile", {
          token,
        }),
      ]);

      const analyticsJson = (await analyticsRes.json()) as ApiResponse<VoucherAnalytics>;
      if (!analyticsRes.ok || !analyticsJson.success || !analyticsJson.data) {
        throw new Error(analyticsJson.message || "Failed to load voucher analytics");
      }

      const profileJson = (await profileRes.json()) as ApiResponse<{ currency?: string }>;
      const currency = profileRes.ok && profileJson.success ? profileJson.data?.currency : undefined;
      if (typeof currency === "string" && currency.length > 0) {
        setMerchantCurrency(currency);
      }

      setData(analyticsJson.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load voucher analytics");
    } finally {
      setLoading(false);
    }
  }, [buildPath, router]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const totalDiscount = data?.summary?.totalDiscountAmount ?? 0;

  const topTemplates = useMemo(() => {
    return Array.isArray(data?.byTemplate) ? data!.byTemplate.slice(0, 10) : [];
  }, [data]);

  const bySourceRows = useMemo(() => {
    const rows = Array.isArray(data?.bySource) ? data!.bySource : [];
    return rows.map((r) => ({
      source: r.source,
      uses: r._count.id,
      totalDiscountAmount: r._sum.discountAmount ?? 0,
    }));
  }, [data]);

  const sourceLabel = (source: string) => {
    if (source === "POS_VOUCHER") return t("admin.orderVouchers.analytics.source.pos");
    if (source === "CUSTOMER_VOUCHER") return t("admin.orderVouchers.analytics.source.customer");
    if (source === "MANUAL") return t("admin.orderVouchers.analytics.source.manual");
    return source;
  };

  return (
    <div>
      <PageBreadcrumb pageTitle={t("admin.orderVouchers.analytics.title")} />

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
                {t("admin.orderVouchers.analytics.back")}
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("admin.orderVouchers.analytics.title")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.analytics.subtitle")}</p>
          </div>

          <button
            type="button"
            onClick={fetchAll}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
          >
            <FaSyncAlt className="h-4 w-4" />
            {t("admin.orderVouchers.refresh")}
          </button>
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
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.analytics.filters.period")}</label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="today">{t("admin.orderVouchers.analytics.period.today")}</option>
              <option value="week">{t("admin.orderVouchers.analytics.period.week")}</option>
              <option value="month">{t("admin.orderVouchers.analytics.period.month")}</option>
              <option value="year">{t("admin.orderVouchers.analytics.period.year")}</option>
              <option value="custom">{t("admin.orderVouchers.analytics.period.custom")}</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.analytics.filters.startDate")}</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={period !== "custom"}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 disabled:opacity-60 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.analytics.filters.endDate")}</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={period !== "custom"}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 disabled:opacity-60 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={fetchAll}
              className="h-11 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
            >
              {t("admin.orderVouchers.analytics.filters.apply")}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ) : !data ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.analytics.empty")}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.analytics.emptyDesc")}</p>
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.analytics.cards.uses")}</div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">{data.summary.uses}</div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.analytics.cards.totalDiscount")}</div>
                <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(totalDiscount, merchantCurrency as any, locale)}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <div className="text-xs text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.analytics.cards.timezone")}</div>
                <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{data.meta.timezone}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {new Date(data.meta.startDate).toLocaleString()} → {new Date(data.meta.endDate).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.analytics.sections.bySource")}</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.analytics.table.source")}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.analytics.table.uses")}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.analytics.table.totalDiscount")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {bySourceRows.map((r) => (
                        <tr key={r.source}>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{sourceLabel(r.source)}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.uses}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(r.totalDiscountAmount, merchantCurrency as any, locale)}
                          </td>
                        </tr>
                      ))}
                      {bySourceRows.length === 0 && (
                        <tr>
                          <td className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400" colSpan={3}>
                            {t("admin.orderVouchers.analytics.noRows")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.analytics.sections.byCategory")}</h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.analytics.table.category")}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.analytics.table.uses")}</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.analytics.table.totalDiscount")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {(Array.isArray(data.byReportCategory) ? data.byReportCategory : []).map((r) => (
                        <tr key={r.reportCategory}>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.reportCategory}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.uses}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(r.totalDiscountAmount, merchantCurrency as any, locale)}
                          </td>
                        </tr>
                      ))}
                      {(!Array.isArray(data.byReportCategory) || data.byReportCategory.length === 0) && (
                        <tr>
                          <td className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400" colSpan={3}>
                            {t("admin.orderVouchers.analytics.noRows")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.analytics.sections.topTemplates")}</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.analytics.table.template")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.analytics.table.audience")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.analytics.table.category")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.analytics.table.uses")}</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.analytics.table.totalDiscount")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {topTemplates.map((r) => (
                      <tr key={r.templateId}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">{r.templateName || r.templateId}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.audience || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.reportCategory || t("admin.orderVouchers.analytics.uncategorized")}</td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.uses}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(r.totalDiscountAmount ?? 0, merchantCurrency as any, locale)}
                        </td>
                      </tr>
                    ))}
                    {topTemplates.length === 0 && (
                      <tr>
                        <td className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400" colSpan={5}>
                          {t("admin.orderVouchers.analytics.noRows")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
