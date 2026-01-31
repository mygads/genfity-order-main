"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { TableActionButton } from "@/components/common/TableActionButton";
import { useModalImplicitClose } from "@/hooks/useModalImplicitClose";
import { formatCurrency } from "@/lib/utils/format";
import { OrderVoucherTemplateFormModal } from "@/components/order-vouchers/OrderVoucherTemplateFormModal";
import { FaChartBar, FaEdit, FaListAlt, FaPlus, FaSyncAlt, FaToggleOff, FaToggleOn, FaTrash } from "react-icons/fa";
import { fetchMerchantApi } from "@/lib/utils/orderApiClient";

type VoucherTemplate = {
  id: string;
  name: string;
  description?: string | null;
  audience: "POS" | "CUSTOMER" | "BOTH";
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  reportCategory?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: { codes: number; orderDiscounts: number };
};

type VoucherCode = {
  id: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  validFrom?: string | null;
  validUntil?: string | null;
  usedCount?: number;
};

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

export default function OrderVouchersPage() {
  const router = useRouter();
  const { t, locale } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<VoucherTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [merchantCurrency, setMerchantCurrency] = useState<string>("IDR");
  const [merchantTimezone, setMerchantTimezone] = useState<string>("UTC");
  const [customerVouchersEnabled, setCustomerVouchersEnabled] = useState<boolean>(true);
  const [posDiscountsEnabled, setPosDiscountsEnabled] = useState<boolean>(true);
  const [filterAudience, setFilterAudience] = useState<"ALL" | "POS" | "CUSTOMER">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [templateModalMode, setTemplateModalMode] = useState<"create" | "edit">("create");
  const [templateModalInitial, setTemplateModalInitial] = useState<any | null>(null);

  const [codesOpen, setCodesOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<VoucherTemplate | null>(null);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codes, setCodes] = useState<VoucherCode[]>([]);
  const [createCodeOpen, setCreateCodeOpen] = useState(false);
  const [createCodeTab, setCreateCodeTab] = useState<"manual" | "generate">("manual");
  const [codeActionLoadingId, setCodeActionLoadingId] = useState<string | null>(null);
  const [deleteCodeConfirm, setDeleteCodeConfirm] = useState<VoucherCode | null>(null);
  const [generateCount, setGenerateCount] = useState(10);
  const [generateLength, setGenerateLength] = useState(8);
  const [manualCodes, setManualCodes] = useState<string>("");
  const [manualCreateLoading, setManualCreateLoading] = useState<boolean>(false);

  const closeCodesModal = useCallback(() => {
    setCodesOpen(false);
    setSelectedTemplate(null);
    setCodes([]);
    setManualCodes("");
    setCreateCodeOpen(false);
    setDeleteCodeConfirm(null);
  }, []);

  const { onBackdropMouseDown: onCodesBackdropMouseDown } = useModalImplicitClose({
    isOpen: codesOpen,
    onClose: closeCodesModal,
  });

  const closeCreateCodeModal = useCallback(() => {
    setCreateCodeOpen(false);
  }, []);

  const { onBackdropMouseDown: onCreateCodeBackdropMouseDown } = useModalImplicitClose({
    isOpen: createCodeOpen,
    onClose: closeCreateCodeModal,
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const [templatesRes, profileRes, settingsRes] = await Promise.all([
        fetchMerchantApi("/api/merchant/order-vouchers/templates", {
          token,
        }),
        fetchMerchantApi("/api/merchant/profile", {
          token,
        }),
        fetchMerchantApi("/api/merchant/order-vouchers/settings", {
          token,
        }),
      ]);

      const templatesJson = (await templatesRes.json()) as ApiResponse<VoucherTemplate[]>;
      if (!templatesRes.ok || !templatesJson.success) {
        throw new Error(templatesJson.message || "Failed to load voucher templates");
      }

      const profileJson = (await profileRes.json()) as ApiResponse<{ currency?: string; timezone?: string }>;
      const currency = profileRes.ok && profileJson.success ? profileJson.data?.currency : undefined;
      const timezone = profileRes.ok && profileJson.success ? profileJson.data?.timezone : undefined;
      if (typeof currency === "string" && currency.length > 0) {
        setMerchantCurrency(currency);
      }
      if (typeof timezone === "string" && timezone.length > 0) {
        setMerchantTimezone(timezone);
      }

      const settingsJson = (await settingsRes.json()) as ApiResponse<{ customerVouchersEnabled?: boolean; posDiscountsEnabled?: boolean }>;
      if (settingsRes.ok && settingsJson.success) {
        if (typeof settingsJson.data?.customerVouchersEnabled === "boolean") {
          setCustomerVouchersEnabled(settingsJson.data.customerVouchersEnabled);
        }
        if (typeof settingsJson.data?.posDiscountsEnabled === "boolean") {
          setPosDiscountsEnabled(settingsJson.data.posDiscountsEnabled);
        }
      }

      setTemplates(Array.isArray(templatesJson.data) ? templatesJson.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load voucher templates");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (q && !tpl.name.toLowerCase().includes(q)) return false;
      if (filterAudience !== "ALL") {
        if (filterAudience === "POS" && !(tpl.audience === "POS" || tpl.audience === "BOTH")) return false;
        if (filterAudience === "CUSTOMER" && !(tpl.audience === "CUSTOMER" || tpl.audience === "BOTH")) return false;
      }
      if (filterStatus === "ACTIVE" && !tpl.isActive) return false;
      if (filterStatus === "INACTIVE" && tpl.isActive) return false;
      return true;
    });
  }, [templates, searchQuery, filterAudience, filterStatus]);

  const existingReportCategories = useMemo(() => {
    return templates
      .map((t) => (typeof t.reportCategory === "string" ? t.reportCategory.trim() : ""))
      .filter((x) => x.length > 0);
  }, [templates]);

  const formatValidity = (tpl: VoucherTemplate): string => {
    const fmt = (iso: string) => {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat(locale || "en", {
        timeZone: merchantTimezone || "UTC",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    };

    const from = tpl.validFrom ? fmt(tpl.validFrom) : null;
    const until = tpl.validUntil ? fmt(tpl.validUntil) : null;
    if (!from && !until) return t("admin.orderVouchers.validity.always");
    if (from && until) return `${from} - ${until}`;
    if (from) return `${from} -`;
    return `- ${until}`;
  };

  const openDiscountVoucherSettings = () => {
    router.push('/admin/dashboard/merchant/edit?tab=discount-voucher');
  };

  const formatDiscount = (tpl: VoucherTemplate): string => {
    if (tpl.discountType === "PERCENTAGE") {
      const capAmount = typeof tpl.maxDiscountAmount === "number" ? tpl.maxDiscountAmount : null;
      const cap =
        capAmount !== null
          ? ` (${t("admin.orderVouchers.discountCap", {
              amount: formatCurrency(capAmount, merchantCurrency as any, locale),
            })})`
          : "";

      return `${tpl.discountValue}%${cap}`;
    }

    return formatCurrency(tpl.discountValue, merchantCurrency as any, locale);
  };

  const toggleTemplateActive = async (tpl: VoucherTemplate) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetchMerchantApi(`/api/merchant/order-vouchers/templates/${tpl.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !tpl.isActive }),
        token,
      });

      const json = (await res.json()) as ApiResponse<VoucherTemplate>;
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to update template");
      }

      setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? { ...t, isActive: !tpl.isActive } : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update template");
    }
  };

  const openCreateTemplate = () => {
    setTemplateModalMode("create");
    setTemplateModalInitial(null);
    setTemplateModalOpen(true);
  };

  const openEditTemplate = async (tpl: VoucherTemplate) => {
    try {
      setError(null);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetchMerchantApi(`/api/merchant/order-vouchers/templates/${tpl.id}`, {
        token,
      });

      const json = (await res.json()) as ApiResponse<any>;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || "Failed to load template");
      }

      setTemplateModalMode("edit");
      setTemplateModalInitial(json.data);
      setTemplateModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load template");
    }
  };

  const openCodes = async (tpl: VoucherTemplate) => {
    setSelectedTemplate(tpl);
    setCodesOpen(true);
    setCodes([]);

    try {
      setCodesLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetchMerchantApi(`/api/merchant/order-vouchers/templates/${tpl.id}/codes`, {
        token,
      });

      const json = (await res.json()) as ApiResponse<VoucherCode[]>;
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load codes");
      }

      setCodes(Array.isArray(json.data) ? json.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load voucher codes");
    } finally {
      setCodesLoading(false);
    }
  };

  const generateCodes = async () => {
    if (!selectedTemplate) return;

    try {
      setError(null);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetchMerchantApi(`/api/merchant/order-vouchers/templates/${selectedTemplate.id}/codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ count: generateCount, length: generateLength }),
        token,
      });

      const json = (await res.json()) as ApiResponse<VoucherCode[]>;
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to generate codes");
      }

      const newCodes = Array.isArray(json.data) ? json.data : [];
      setCodes((prev) => [...newCodes, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate voucher codes");
    }
  };

  const createManualCodes = async () => {
    if (!selectedTemplate) return;

    const parts = manualCodes
      .split(/[\s,;]+/g)
      .map((x) => x.trim())
      .filter((x) => x.length > 0)
      .map((x) => x.toUpperCase());

    const uniq = Array.from(new Set(parts));
    if (uniq.length === 0) {
      setError(t("admin.orderVouchers.manualCodes.empty") as string);
      return;
    }

    try {
      setError(null);
      setManualCreateLoading(true);

      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const res = await fetchMerchantApi(`/api/merchant/order-vouchers/templates/${selectedTemplate.id}/codes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ manualCodes: uniq }),
        token,
      });

      const json = (await res.json()) as ApiResponse<VoucherCode[]>;
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to add codes");
      }

      const newCodes = Array.isArray(json.data) ? json.data : [];
      setCodes((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        const merged = [...newCodes.filter((c) => !seen.has(c.id)), ...prev];
        return merged;
      });
      setManualCodes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add voucher codes");
    } finally {
      setManualCreateLoading(false);
    }
  };

  const toggleCodeActive = async (code: VoucherCode) => {
    if (!selectedTemplate) return;

    try {
      setError(null);
      setCodeActionLoadingId(code.id);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const res = await fetchMerchantApi(
        `/api/merchant/order-vouchers/templates/${selectedTemplate.id}/codes/${code.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ isActive: !code.isActive }),
          token,
        }
      );

      const json = (await res.json()) as ApiResponse<VoucherCode>;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || 'Failed to update code');
      }

      setCodes((prev) => prev.map((c) => (c.id === code.id ? { ...c, ...json.data } : c)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update code');
    } finally {
      setCodeActionLoadingId(null);
    }
  };

  const confirmDeleteCode = (code: VoucherCode) => {
    setDeleteCodeConfirm(code);
  };

  const deleteCode = async () => {
    if (!selectedTemplate || !deleteCodeConfirm) return;

    try {
      setError(null);
      setCodeActionLoadingId(deleteCodeConfirm.id);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const res = await fetchMerchantApi(
        `/api/merchant/order-vouchers/templates/${selectedTemplate.id}/codes/${deleteCodeConfirm.id}`,
        {
          method: 'DELETE',
          token,
        }
      );

      const json = (await res.json()) as ApiResponse<unknown>;
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to delete code');
      }

      setCodes((prev) => prev.filter((c) => c.id !== deleteCodeConfirm.id));
      setDeleteCodeConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete code');
    } finally {
      setCodeActionLoadingId(null);
    }
  };

  return (
    <div>
      <PageBreadcrumb pageTitle={t("admin.orderVouchers.title")} />

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("admin.orderVouchers.title")}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.subtitle")}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchTemplates}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
            >
              <FaSyncAlt className="h-4 w-4" />
              {t("admin.orderVouchers.refresh")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/dashboard/order-vouchers/analytics")}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
            >
              <FaChartBar className="h-4 w-4" />
              {t("admin.orderVouchers.analytics.action")}
            </button>
            <button
              type="button"
              onClick={openCreateTemplate}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600"
            >
              <FaPlus className="h-4 w-4" />
              {t("admin.orderVouchers.createTemplate")}
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {t("admin.orderVouchers.settings.title") || 'Discount & voucher settings'}
              </div>
              <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                {t("admin.orderVouchers.settings.moved") || 'Settings are managed in Merchant settings → Discount & voucher.'}
              </div>

              {!posDiscountsEnabled ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                  {t('admin.orderVouchers.settings.posDisabled') || 'POS discounts are currently disabled, so the POS payment popup will not show discounts/vouchers.'}
                </div>
              ) : null}

              {!customerVouchersEnabled ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
                  {t('admin.orderVouchers.settings.customerDisabled') || 'Customer vouchers are currently disabled, so customers cannot apply voucher codes during checkout.'}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={openDiscountVoucherSettings}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
            >
              {t('admin.orderVouchers.settings.openMerchantSettings') || 'Open Merchant settings'}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              placeholder={t("admin.orderVouchers.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full max-w-md rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.filters.audience")}</span>
                <select
                  value={filterAudience}
                  onChange={(e) => setFilterAudience(e.target.value as any)}
                  className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="ALL">{t("admin.orderVouchers.filters.all")}</option>
                  <option value="POS">{t("admin.orderVouchers.audience.pos")}</option>
                  <option value="CUSTOMER">{t("admin.orderVouchers.audience.customer")}</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">{t("admin.orderVouchers.filters.status")}</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="ALL">{t("admin.orderVouchers.filters.all")}</option>
                  <option value="ACTIVE">{t("admin.orderVouchers.active")}</option>
                  <option value="INACTIVE">{t("admin.orderVouchers.inactive")}</option>
                </select>
              </div>
            </div>
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

        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        ) : filteredTemplates.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.noTemplates")}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.noTemplatesDesc")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {t("admin.orderVouchers.templateName")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {t("admin.orderVouchers.audience")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {t("admin.orderVouchers.discount")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {t("admin.orderVouchers.status")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {t("admin.orderVouchers.validity")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">
                    {t("admin.orderVouchers.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {filteredTemplates.map((tpl) => (
                  <tr key={tpl.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/40">
                    <td className="px-4 py-4">
                      <div className="font-medium text-gray-900 dark:text-white">{tpl.name}</div>
                      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {typeof tpl._count?.codes === "number"
                          ? t("admin.orderVouchers.codesCount", { count: tpl._count.codes })
                          : ""}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {tpl.audience === "POS"
                        ? t("admin.orderVouchers.audience.pos")
                        : tpl.audience === "CUSTOMER"
                          ? t("admin.orderVouchers.audience.customer")
                          : t("admin.orderVouchers.audience.both")}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{formatDiscount(tpl)}</td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => toggleTemplateActive(tpl)}
                        className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-900"
                        aria-label={tpl.isActive ? (t("admin.orderVouchers.deactivate") as string) : (t("admin.orderVouchers.activate") as string)}
                        title={tpl.isActive ? (t("admin.orderVouchers.deactivate") as string) : (t("admin.orderVouchers.activate") as string)}
                      >
                        {tpl.isActive ? (
                          <FaToggleOn className="h-6 w-6 text-green-600 dark:text-green-400" />
                        ) : (
                          <FaToggleOff className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                        )}
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {tpl.isActive ? t("admin.orderVouchers.active") : t("admin.orderVouchers.inactive")}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">{formatValidity(tpl)}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <TableActionButton
                          icon={FaListAlt}
                          label={t("admin.orderVouchers.manageCodes")}
                          onClick={() => openCodes(tpl)}
                        />
                        <TableActionButton icon={FaEdit} label={t("common.edit")} onClick={() => openEditTemplate(tpl)} />
                        <TableActionButton
                          icon={FaChartBar}
                          label={t("admin.orderVouchers.usage.action")}
                          onClick={() => router.push(`/admin/dashboard/order-vouchers/${tpl.id}/usage`)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OrderVoucherTemplateFormModal
        isOpen={templateModalOpen}
        mode={templateModalMode}
        merchantCurrency={merchantCurrency}
        merchantTimezone={merchantTimezone}
        existingReportCategories={existingReportCategories}
        t={t}
        initial={templateModalInitial}
        onClose={() => setTemplateModalOpen(false)}
        onSaved={(tpl) => {
          setTemplates((prev) => {
            const idx = prev.findIndex((x) => x.id === tpl.id);
            if (idx === -1) return [tpl as VoucherTemplate, ...prev];
            const copy = [...prev];
            copy[idx] = { ...copy[idx], ...(tpl as VoucherTemplate) };
            return copy;
          });
        }}
      />

      {/* Codes Modal */}
      {codesOpen && selectedTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 py-8"
          onMouseDown={onCodesBackdropMouseDown}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-950 max-h-[calc(100vh-4rem)]"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-6 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedTemplate.name}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.manageCodes")}</p>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t("admin.orderVouchers.codesSummary.totalUsed", {
                    count: codes.reduce((sum, c) => sum + (typeof c.usedCount === "number" ? c.usedCount : 0), 0),
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
                  onClick={() => setCreateCodeOpen(true)}
                >
                  {t("admin.orderVouchers.createCode")}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
                  onClick={closeCodesModal}
                >
                  {t("common.close")}
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(100vh-4rem-96px)]">
              {codesLoading ? (
                <div className="h-24 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ) : (
                <div className="overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {t("admin.orderVouchers.codesTable.code")}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {t("admin.orderVouchers.codesTable.used")}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {t("admin.orderVouchers.codesTable.status")}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {t("admin.orderVouchers.codesTable.created")}
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">
                          {t("admin.orderVouchers.codesTable.actions")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {codes.map((c) => (
                        <tr key={c.id}>
                          <td className="px-4 py-3 font-mono text-sm text-gray-900 dark:text-white">{c.code}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {typeof c.usedCount === "number" ? c.usedCount : 0}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 disabled:opacity-60 dark:hover:bg-gray-900"
                              onClick={() => toggleCodeActive(c)}
                              disabled={codeActionLoadingId === c.id}
                              aria-label={c.isActive ? (t("admin.orderVouchers.deactivate") as string) : (t("admin.orderVouchers.activate") as string)}
                              title={c.isActive ? (t("admin.orderVouchers.deactivate") as string) : (t("admin.orderVouchers.activate") as string)}
                            >
                              {c.isActive ? (
                                <FaToggleOn className="h-6 w-6 text-green-600 dark:text-green-400" />
                              ) : (
                                <FaToggleOff className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                              )}
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {c.isActive ? t("admin.orderVouchers.active") : t("admin.orderVouchers.inactive")}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                            {new Date(c.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900/60 dark:bg-gray-900 dark:text-red-300 dark:hover:bg-red-900/20"
                                onClick={() => confirmDeleteCode(c)}
                                disabled={codeActionLoadingId === c.id}
                                aria-label={t("common.delete") as string}
                                title={t("common.delete") as string}
                              >
                                <FaTrash className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {codes.length === 0 && (
                        <tr>
                          <td className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400" colSpan={5}>
                            {t("admin.orderVouchers.noCodes")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Create code modal */}
          {createCodeOpen ? (
            <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 py-10" onMouseDown={onCreateCodeBackdropMouseDown}>
              <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-950 max-h-[calc(100vh-5rem)]" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between gap-4 border-b border-gray-200 p-5 dark:border-gray-800">
                  <div>
                    <div className="text-base font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.createCode")}</div>
                    <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{selectedTemplate.name}</div>
                  </div>
                  <button
                    type="button"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
                    onClick={closeCreateCodeModal}
                  >
                    {t("common.close")}
                  </button>
                </div>

                <div className="p-5 overflow-y-auto">
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900/40">
                    <button
                      type="button"
                      onClick={() => setCreateCodeTab('manual')}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        createCodeTab === 'manual'
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {t('admin.orderVouchers.createCode.tabs.manual')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateCodeTab('generate')}
                      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        createCodeTab === 'generate'
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      {t('admin.orderVouchers.createCode.tabs.generate')}
                    </button>
                  </div>

                  {createCodeTab === 'manual' ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("admin.orderVouchers.manualCodes.label")}
                      </label>
                      <div className="flex flex-col gap-3">
                        <textarea
                          value={manualCodes}
                          onChange={(e) => setManualCodes(e.target.value)}
                          placeholder={t("admin.orderVouchers.manualCodes.placeholder") as string}
                          className="min-h-24 w-full resize-y rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                        <button
                          type="button"
                          className="h-11 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                          onClick={createManualCodes}
                          disabled={manualCreateLoading}
                        >
                          {manualCreateLoading ? (t("common.loading") as string) : (t("admin.orderVouchers.manualCodes.add") as string)}
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.manualCodes.hint")}</div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.count")}</label>
                          <input
                            type="number"
                            value={generateCount}
                            onChange={(e) => setGenerateCount(Number(e.target.value))}
                            min={1}
                            max={500}
                            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.length")}</label>
                          <input
                            type="number"
                            value={generateLength}
                            onChange={(e) => setGenerateLength(Number(e.target.value))}
                            min={6}
                            max={16}
                            className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            type="button"
                            className="h-11 w-full rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
                            onClick={generateCodes}
                          >
                            {t("admin.orderVouchers.generate")}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Delete code confirm */}
          {deleteCodeConfirm ? (
            <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 px-4 py-10" onMouseDown={() => setDeleteCodeConfirm(null)}>
              <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-950" onMouseDown={(e) => e.stopPropagation()}>
                <div className="border-b border-gray-200 p-5 dark:border-gray-800">
                  <div className="text-base font-semibold text-gray-900 dark:text-white">
                    {t('admin.orderVouchers.codes.deleteConfirmTitle')}
                  </div>
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {t('admin.orderVouchers.codes.deleteConfirmDesc', { code: deleteCodeConfirm.code })}
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 p-5">
                  <button
                    type="button"
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
                    onClick={() => setDeleteCodeConfirm(null)}
                    disabled={codeActionLoadingId === deleteCodeConfirm.id}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
                    onClick={deleteCode}
                    disabled={codeActionLoadingId === deleteCodeConfirm.id}
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
