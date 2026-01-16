"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useModalImplicitClose } from "@/hooks/useModalImplicitClose";
import { getCurrencyConfig } from "@/lib/constants/location";
import { getCurrencySymbol } from "@/lib/utils/format";
import { StatusToggle } from "@/components/common/StatusToggle";
import { FaCalendarAlt, FaCashRegister, FaCoins, FaLayerGroup, FaShoppingCart, FaTag, FaTasks, FaUser } from "react-icons/fa";

type ApiResponse<T> = { success: boolean; data?: T; message?: string };

type MenuLite = { id: string; name: string };

type CategoryLite = { id: string; name: string };

type TemplateDetail = {
  id: string;
  name: string;
  description?: string | null;
  audience: "POS" | "CUSTOMER" | "BOTH";
  discountType: "PERCENTAGE" | "FIXED_AMOUNT";
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount?: number | null;
  maxUsesTotal?: number | null;
  maxUsesPerCustomer?: number | null;
  maxUsesPerOrder?: number;
  totalDiscountCap?: number | null;
  allowedOrderTypes?: Array<"DINE_IN" | "TAKEAWAY" | "DELIVERY">;
  daysOfWeek?: number[];
  startTime?: string | null;
  endTime?: string | null;
  includeAllItems?: boolean;
  reportCategory?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: boolean;
  createdAt?: string;
  _count?: { codes: number; orderDiscounts: number };
  requiresCustomerLogin?: boolean;
  menuScopes?: Array<{ menu?: { id: string; name: string } }>; // from GET include
  categoryScopes?: Array<{ category?: { id: string; name: string } }>; // from GET include
};

type Props = {
  isOpen: boolean;
  mode: "create" | "edit";
  merchantCurrency: string;
  merchantTimezone: string;
  existingReportCategories?: string[];
  t: (key: string, vars?: Record<string, any>) => string;
  initial?: TemplateDetail | null;
  onClose: () => void;
  onSaved: (tpl: TemplateDetail) => void;
};

function getTzParts(date: Date, timeZone: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  // Offset = (UTC time represented by TZ wall clock parts) - (actual UTC time)
  const tz = getTzParts(date, timeZone);
  const asUtc = Date.UTC(tz.year, tz.month - 1, tz.day, tz.hour, tz.minute, tz.second);
  return asUtc - date.getTime();
}

function zonedDateTimeLocalToUtcIso(dateTimeLocal: string, timeZone: string): string | null {
  const trimmed = dateTimeLocal.trim();
  if (!trimmed) return null;
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2})$/.exec(trimmed);
  if (!m) return null;

  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const hour = Number(m[4]);
  const minute = Number(m[5]);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute)
  ) {
    return null;
  }

  const assumedUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const assumedUtc = new Date(assumedUtcMs);
  const offset1 = getTimeZoneOffsetMs(assumedUtc, timeZone);
  const corrected1 = new Date(assumedUtcMs - offset1);
  const offset2 = getTimeZoneOffsetMs(corrected1, timeZone);
  const corrected2 = new Date(assumedUtcMs - offset2);
  return corrected2.toISOString();
}

function utcIsoToZonedDateTimeLocal(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const tz = getTzParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${tz.year}-${pad(tz.month)}-${pad(tz.day)}T${pad(tz.hour)}:${pad(tz.minute)}`;
}

function parseOptionalNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalInt(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const n = Math.floor(Number(trimmed));
  return Number.isFinite(n) ? n : null;
}

export function OrderVoucherTemplateFormModal({
  isOpen,
  mode,
  merchantCurrency,
  merchantTimezone,
  existingReportCategories,
  t,
  initial,
  onClose,
  onSaved,
}: Props) {
  const { onBackdropMouseDown } = useModalImplicitClose({ isOpen, onClose });

  const reportCategoryOptions = useMemo(() => {
    const raw = Array.isArray(existingReportCategories) ? existingReportCategories : [];
    return Array.from(new Set(raw.map((c) => (typeof c === 'string' ? c.trim() : '')).filter((c) => c.length > 0))).sort(
      (a, b) => a.localeCompare(b)
    );
  }, [existingReportCategories]);

  const currencySymbol = useMemo(() => {
    return getCurrencySymbol(merchantCurrency as any);
  }, [merchantCurrency]);

  const currencyStep = useMemo(() => {
    const config = getCurrencyConfig(merchantCurrency as any);
    return config?.decimals === 0 ? 1 : 0.01;
  }, [merchantCurrency]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [menus, setMenus] = useState<MenuLite[]>([]);
  const [categories, setCategories] = useState<CategoryLite[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const [menuQuery, setMenuQuery] = useState("");
  const [categoryQuery, setCategoryQuery] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    audience: "CUSTOMER" as "CUSTOMER" | "POS" | "BOTH",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT",
    discountValue: 10,
    maxDiscountAmount: "",
    minOrderAmount: "",
    totalDiscountCap: "",

    maxUsesTotal: "",
    maxUsesPerCustomer: "",
    maxUsesPerOrder: "1",

    allowedOrderTypes: [] as Array<"DINE_IN" | "TAKEAWAY" | "DELIVERY">,
    daysOfWeek: [] as number[],
    startTime: "",
    endTime: "",

    validFrom: "",
    validUntil: "",

    includeAllItems: true,
    scopedMenuIds: [] as string[],
    scopedCategoryIds: [] as string[],

    reportCategory: "",

    isActive: true,
    requiresCustomerLogin: false,
  });

  const [reportCategorySelect, setReportCategorySelect] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    const current = form.reportCategory.trim();
    if (!current) {
      setReportCategorySelect('');
      return;
    }
    if (reportCategoryOptions.includes(current)) {
      setReportCategorySelect(current);
      return;
    }
    setReportCategorySelect('__NEW__');
  }, [isOpen, form.reportCategory, reportCategoryOptions]);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);

    if (mode === "edit" && initial) {
      setForm({
        name: initial.name ?? "",
        description: typeof initial.description === "string" ? initial.description : "",
        audience: initial.audience,
        discountType: initial.discountType,
        discountValue: typeof initial.discountValue === "number" ? initial.discountValue : 0,
        maxDiscountAmount: initial.maxDiscountAmount == null ? "" : String(initial.maxDiscountAmount),
        minOrderAmount: initial.minOrderAmount == null ? "" : String(initial.minOrderAmount),
        totalDiscountCap: initial.totalDiscountCap == null ? "" : String(initial.totalDiscountCap),

        maxUsesTotal: initial.maxUsesTotal == null ? "" : String(initial.maxUsesTotal),
        maxUsesPerCustomer: initial.maxUsesPerCustomer == null ? "" : String(initial.maxUsesPerCustomer),
        maxUsesPerOrder: "1",

        allowedOrderTypes: Array.isArray(initial.allowedOrderTypes) ? initial.allowedOrderTypes : [],
        daysOfWeek: Array.isArray(initial.daysOfWeek) ? initial.daysOfWeek : [],
        startTime: initial.startTime ?? "",
        endTime: initial.endTime ?? "",

        validFrom: utcIsoToZonedDateTimeLocal(initial.validFrom, merchantTimezone),
        validUntil: utcIsoToZonedDateTimeLocal(initial.validUntil, merchantTimezone),

        includeAllItems: initial.includeAllItems !== false,
        scopedMenuIds: Array.isArray(initial.menuScopes)
          ? initial.menuScopes
              .map((s) => s.menu?.id)
              .filter((id): id is string => typeof id === "string")
          : [],
        scopedCategoryIds: Array.isArray(initial.categoryScopes)
          ? initial.categoryScopes
              .map((s) => s.category?.id)
              .filter((id): id is string => typeof id === "string")
          : [],

        reportCategory: typeof initial.reportCategory === "string" ? initial.reportCategory : "",

        isActive: Boolean(initial.isActive),
        requiresCustomerLogin: false,
      });
    }

    if (mode === "create") {
      setForm({
        name: "",
        description: "",
        audience: "CUSTOMER",
        discountType: "PERCENTAGE",
        discountValue: 10,
        maxDiscountAmount: "",
        minOrderAmount: "",
        totalDiscountCap: "",

        maxUsesTotal: "",
        maxUsesPerCustomer: "",
        maxUsesPerOrder: "1",

        allowedOrderTypes: [],
        daysOfWeek: [],
        startTime: "",
        endTime: "",

        validFrom: "",
        validUntil: "",

        includeAllItems: true,
        scopedMenuIds: [],
        scopedCategoryIds: [],

        reportCategory: "",

        isActive: true,
        requiresCustomerLogin: false,
      });
    }
  }, [isOpen, mode, initial]);

  useEffect(() => {
    if (!isOpen) return;

    const load = async () => {
      try {
        setItemsLoading(true);
        const token = localStorage.getItem("accessToken");
        if (!token) return;

        const [menusRes, categoriesRes] = await Promise.all([
          fetch("/api/merchant/menu", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/merchant/categories", { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        const menusJson = (await menusRes.json()) as ApiResponse<any[]>;
        const categoriesJson = (await categoriesRes.json()) as ApiResponse<any[]>;

        const menuListRaw = menusRes.ok && menusJson.success && Array.isArray(menusJson.data) ? menusJson.data : [];
        const categoryListRaw =
          categoriesRes.ok && categoriesJson.success && Array.isArray(categoriesJson.data) ? categoriesJson.data : [];

        setMenus(
          menuListRaw
            .map((m) => ({ id: String(m.id), name: String(m.name ?? "") }))
            .filter((m) => m.id && m.name)
        );
        setCategories(
          categoryListRaw
            .map((c) => ({ id: String(c.id), name: String(c.name ?? "") }))
            .filter((c) => c.id && c.name)
        );
      } catch {
        // ignore
      } finally {
        setItemsLoading(false);
      }
    };

    load();
  }, [isOpen]);

  const filteredMenus = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    if (!q) return menus;
    return menus.filter((m) => m.name.toLowerCase().includes(q));
  }, [menus, menuQuery]);

  const filteredCategories = useMemo(() => {
    const q = categoryQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, categoryQuery]);

  const toggleOrderType = (value: "DINE_IN" | "TAKEAWAY" | "DELIVERY") => {
    setForm((p) => ({
      ...p,
      allowedOrderTypes: p.allowedOrderTypes.includes(value)
        ? p.allowedOrderTypes.filter((x) => x !== value)
        : [...p.allowedOrderTypes, value],
    }));
  };

  const toggleDay = (day: number) => {
    setForm((p) => ({
      ...p,
      daysOfWeek: p.daysOfWeek.includes(day) ? p.daysOfWeek.filter((d) => d !== day) : [...p.daysOfWeek, day],
    }));
  };

  const toggleMenuId = (id: string) => {
    setForm((p) => ({
      ...p,
      scopedMenuIds: p.scopedMenuIds.includes(id) ? p.scopedMenuIds.filter((x) => x !== id) : [...p.scopedMenuIds, id],
    }));
  };

  const toggleCategoryId = (id: string) => {
    setForm((p) => ({
      ...p,
      scopedCategoryIds: p.scopedCategoryIds.includes(id)
        ? p.scopedCategoryIds.filter((x) => x !== id)
        : [...p.scopedCategoryIds, id],
    }));
  };

  const setAllDays = () => {
    setForm((p) => ({ ...p, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] }));
  };

  const setAllOrderTypes = () => {
    setForm((p) => ({ ...p, allowedOrderTypes: ["DINE_IN", "TAKEAWAY", "DELIVERY"] }));
  };

  const clearSchedule = () => {
    setForm((p) => ({
      ...p,
      validFrom: "",
      validUntil: "",
      daysOfWeek: [],
      startTime: "",
      endTime: "",
      allowedOrderTypes: [],
    }));
  };

  const setValidityPreset = (preset: "1D" | "1W" | "1M") => {
    const now = new Date();
    const until = new Date(now);
    if (preset === "1D") {
      until.setUTCDate(until.getUTCDate() + 1);
    } else if (preset === "1W") {
      until.setUTCDate(until.getUTCDate() + 7);
    } else {
      until.setUTCMonth(until.getUTCMonth() + 1);
    }

    setForm((p) => ({
      ...p,
      validFrom: utcIsoToZonedDateTimeLocal(now.toISOString(), merchantTimezone),
      validUntil: utcIsoToZonedDateTimeLocal(until.toISOString(), merchantTimezone),
    }));
  };

  const submit = async () => {
    try {
      setSaving(true);
      setError(null);

      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError(t("admin.login.error.sessionExpired"));
        return;
      }

      const body = {
        name: form.name,
        description: form.description.trim().length ? form.description : null,
        audience: form.audience,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        maxDiscountAmount: parseOptionalNumber(form.maxDiscountAmount),
        minOrderAmount: parseOptionalNumber(form.minOrderAmount),
        totalDiscountCap: parseOptionalNumber(form.totalDiscountCap),

        maxUsesTotal: parseOptionalInt(form.maxUsesTotal),
        maxUsesPerCustomer: parseOptionalInt(form.maxUsesPerCustomer),
        maxUsesPerOrder: 1,

        allowedOrderTypes: form.allowedOrderTypes,
        daysOfWeek: form.daysOfWeek,
        startTime: form.startTime.trim().length ? form.startTime : null,
        endTime: form.endTime.trim().length ? form.endTime : null,

        validFrom: zonedDateTimeLocalToUtcIso(form.validFrom, merchantTimezone),
        validUntil: zonedDateTimeLocalToUtcIso(form.validUntil, merchantTimezone),

        includeAllItems: Boolean(form.includeAllItems),
        scopedMenuIds: form.includeAllItems ? [] : form.scopedMenuIds,
        scopedCategoryIds: form.includeAllItems ? [] : form.scopedCategoryIds,

        reportCategory: form.reportCategory.trim().length ? form.reportCategory.trim() : null,

        isActive: Boolean(form.isActive),
        requiresCustomerLogin: false,
      };

      const url =
        mode === "create"
          ? "/api/merchant/order-vouchers/templates"
          : `/api/merchant/order-vouchers/templates/${initial?.id}`;

      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const json = (await res.json()) as ApiResponse<TemplateDetail>;
      if (!res.ok || !json.success || !json.data) {
        throw new Error(json.message || t("common.failed"));
      }

      onSaved(json.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.failed"));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const dayLabels: Array<{ day: number; label: string }> = [
    { day: 0, label: t("admin.orderVouchers.days.sun") },
    { day: 1, label: t("admin.orderVouchers.days.mon") },
    { day: 2, label: t("admin.orderVouchers.days.tue") },
    { day: 3, label: t("admin.orderVouchers.days.wed") },
    { day: 4, label: t("admin.orderVouchers.days.thu") },
    { day: 5, label: t("admin.orderVouchers.days.fri") },
    { day: 6, label: t("admin.orderVouchers.days.sat") },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" onMouseDown={onBackdropMouseDown}>
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FaTag className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-white">
                  {mode === "create" ? t("admin.orderVouchers.createTemplate") : t("common.edit")}
                </h3>
              </div>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.subtitle")}</p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label={t("common.close")}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-6">
          <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.sections.basic")}</h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.name")}</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder={t("admin.orderVouchers.examplePlaceholder")}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.description")}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="min-h-24 w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder={t("admin.orderVouchers.optionalPlaceholder")}
                />
              </div>

              <div className="sm:col-span-2">
                <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("admin.orderVouchers.fields.audience")}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(
                    [
                      { key: "CUSTOMER" as const, icon: FaUser, label: t("admin.orderVouchers.audience.customer"), desc: t("admin.orderVouchers.audienceDesc.customer") },
                      { key: "POS" as const, icon: FaCashRegister, label: t("admin.orderVouchers.audience.pos"), desc: t("admin.orderVouchers.audienceDesc.pos") },
                      { key: "BOTH" as const, icon: FaLayerGroup, label: t("admin.orderVouchers.audience.both"), desc: t("admin.orderVouchers.audienceDesc.both") },
                    ]
                  ).map((opt) => {
                    const selected = form.audience === opt.key;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => setForm((p) => ({ ...p, audience: opt.key }))}
                        className={
                          "text-left rounded-xl border px-4 py-3 transition-colors " +
                          (selected
                            ? "border-brand-300 bg-brand-50 text-gray-900 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-white"
                            : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800")
                        }
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={"h-4 w-4 " + (selected ? "text-brand-600 dark:text-brand-300" : "text-gray-500 dark:text-gray-400")} />
                          <div className="text-sm font-semibold">{opt.label}</div>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.hints.oneVoucherPerOrder")}</p>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <StatusToggle
                  isActive={form.isActive}
                  onToggle={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                  size="sm"
                  activeLabel={t("common.active")}
                  inactiveLabel={t("common.inactive")}
                />
                <span>{t("admin.orderVouchers.fields.isActive")}</span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.sections.discount")}</h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.discountType")}</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as any }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                >
                  <option value="PERCENTAGE">{t("admin.orderVouchers.discountType.percentage")}</option>
                  <option value="FIXED_AMOUNT">{t("admin.orderVouchers.discountType.fixedAmount")}</option>
                </select>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FaCoins className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {t("admin.orderVouchers.fields.value")}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                    {form.discountType === "PERCENTAGE" ? "%" : currencySymbol}
                  </span>
                  <input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) => setForm((p) => ({ ...p, discountValue: Number(e.target.value) }))}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-12 pr-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    min={0}
                    step={form.discountType === "PERCENTAGE" ? 1 : currencyStep}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FaCoins className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {t("admin.orderVouchers.fields.maxDiscount")}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">{currencySymbol}</span>
                  <input
                    type="number"
                    value={form.maxDiscountAmount}
                    onChange={(e) => setForm((p) => ({ ...p, maxDiscountAmount: e.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-12 pr-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    min={0}
                    step={currencyStep}
                    placeholder={t("admin.orderVouchers.optionalPlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FaShoppingCart className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {t("admin.orderVouchers.fields.minOrder")}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">{currencySymbol}</span>
                  <input
                    type="number"
                    value={form.minOrderAmount}
                    onChange={(e) => setForm((p) => ({ ...p, minOrderAmount: e.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-12 pr-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    min={0}
                    step={currencyStep}
                    placeholder={t("admin.orderVouchers.optionalPlaceholder")}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FaCoins className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  {t("admin.orderVouchers.fields.totalDiscountCap")}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">{currencySymbol}</span>
                  <input
                    type="number"
                    value={form.totalDiscountCap}
                    onChange={(e) => setForm((p) => ({ ...p, totalDiscountCap: e.target.value }))}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-12 pr-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    min={0}
                    step={currencyStep}
                    placeholder={t("admin.orderVouchers.optionalPlaceholder")}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.sections.limits")}</h4>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.maxUsesTotal")}</label>
                <input
                  value={form.maxUsesTotal}
                  onChange={(e) => setForm((p) => ({ ...p, maxUsesTotal: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder={t("admin.orderVouchers.optionalPlaceholder")}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.maxUsesPerCustomer")}</label>
                <input
                  value={form.maxUsesPerCustomer}
                  onChange={(e) => setForm((p) => ({ ...p, maxUsesPerCustomer: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder={t("admin.orderVouchers.optionalPlaceholder")}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <FaLayerGroup className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              {t("admin.orderVouchers.sections.stacking")}
            </h4>

            <p className="text-xs text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.hints.noVoucherStacking")}</p>
          </section>

          <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <FaCalendarAlt className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              {t("admin.orderVouchers.sections.schedule")}
            </h4>

            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                <FaTasks className="h-3.5 w-3.5" />
                {t("admin.orderVouchers.presets.title")}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={setAllDays}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {t("admin.orderVouchers.presets.allDays")}
                </button>
                <button
                  type="button"
                  onClick={setAllOrderTypes}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {t("admin.orderVouchers.presets.allOrderTypes")}
                </button>
                <button
                  type="button"
                  onClick={() => setValidityPreset("1D")}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {t("admin.orderVouchers.presets.valid1Day")}
                </button>
                <button
                  type="button"
                  onClick={() => setValidityPreset("1W")}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {t("admin.orderVouchers.presets.valid1Week")}
                </button>
                <button
                  type="button"
                  onClick={() => setValidityPreset("1M")}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {t("admin.orderVouchers.presets.valid1Month")}
                </button>
                <button
                  type="button"
                  onClick={clearSchedule}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  {t("admin.orderVouchers.presets.clearSchedule")}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t("admin.orderVouchers.hints.timezone", { timezone: merchantTimezone })}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.validFrom")}</label>
                <input
                  type="datetime-local"
                  value={form.validFrom}
                  onChange={(e) => setForm((p) => ({ ...p, validFrom: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.validUntil")}</label>
                <input
                  type="datetime-local"
                  value={form.validUntil}
                  onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.allowedOrderTypes")}</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {(
                    [
                      { key: "DINE_IN" as const, label: t("admin.orderVouchers.orderTypes.dineIn") },
                      { key: "TAKEAWAY" as const, label: t("admin.orderVouchers.orderTypes.takeaway") },
                      { key: "DELIVERY" as const, label: t("admin.orderVouchers.orderTypes.delivery") },
                    ]
                  ).map((opt) => {
                    const checked = form.allowedOrderTypes.includes(opt.key);
                    return (
                      <label
                        key={opt.key}
                        className={
                          "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors " +
                          (checked
                            ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800")
                        }
                      >
                        <span className="mr-3 flex-1">{opt.label}</span>
                        <input type="checkbox" checked={checked} onChange={() => toggleOrderType(opt.key)} className="h-4 w-4" />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.daysOfWeek")}</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {dayLabels.map((d) => {
                    const checked = form.daysOfWeek.includes(d.day);
                    return (
                      <label
                        key={d.day}
                        className={
                          "flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors " +
                          (checked
                            ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-white"
                            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800")
                        }
                      >
                        <span className="mr-3 flex-1">{d.label}</span>
                        <input type="checkbox" checked={checked} onChange={() => toggleDay(d.day)} className="h-4 w-4" />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.startTime")}</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.endTime")}</label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.sections.scope")}</h4>

            <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
              <StatusToggle
                isActive={form.includeAllItems}
                onToggle={() => setForm((p) => ({ ...p, includeAllItems: !p.includeAllItems }))}
                size="sm"
                activeLabel={t("common.on")}
                inactiveLabel={t("common.off")}
              />
              <span>{t("admin.orderVouchers.fields.includeAllItems")}</span>
            </div>

            {!form.includeAllItems && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.scopedMenus")}</div>
                  <input
                    value={menuQuery}
                    onChange={(e) => setMenuQuery(e.target.value)}
                    className="mb-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    placeholder={t("admin.orderVouchers.searchMenus")}
                  />
                  {itemsLoading ? (
                    <div className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                  ) : (
                    <div className="max-h-56 overflow-auto">
                      {filteredMenus.map((m) => (
                        <label key={m.id} className="flex items-center gap-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={form.scopedMenuIds.includes(m.id)}
                            onChange={() => toggleMenuId(m.id)}
                            className="h-4 w-4"
                          />
                          <span className="truncate">{m.name}</span>
                        </label>
                      ))}
                      {filteredMenus.length === 0 && (
                        <div className="py-3 text-sm text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.noMenus")}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.scopedCategories")}</div>
                  <input
                    value={categoryQuery}
                    onChange={(e) => setCategoryQuery(e.target.value)}
                    className="mb-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    placeholder={t("admin.orderVouchers.searchCategories")}
                  />
                  {itemsLoading ? (
                    <div className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                  ) : (
                    <div className="max-h-56 overflow-auto">
                      {filteredCategories.map((c) => (
                        <label key={c.id} className="flex items-center gap-3 py-1 text-sm text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={form.scopedCategoryIds.includes(c.id)}
                            onChange={() => toggleCategoryId(c.id)}
                            className="h-4 w-4"
                          />
                          <span className="truncate">{c.name}</span>
                        </label>
                      ))}
                      {filteredCategories.length === 0 && (
                        <div className="py-3 text-sm text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.noCategories")}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
            <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.sections.reporting")}</h4>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("admin.orderVouchers.fields.reportCategory")}</label>

              {reportCategoryOptions.length > 0 ? (
                <div className="space-y-2">
                  <select
                    value={reportCategorySelect}
                    onChange={(e) => {
                      const value = e.target.value;
                      setReportCategorySelect(value);
                      if (value === '') {
                        setForm((p) => ({ ...p, reportCategory: '' }));
                        return;
                      }
                      if (value === '__NEW__') {
                        // Keep any existing custom value; otherwise start empty.
                        setForm((p) => ({
                          ...p,
                          reportCategory: reportCategoryOptions.includes(p.reportCategory.trim()) ? '' : p.reportCategory,
                        }));
                        return;
                      }
                      setForm((p) => ({ ...p, reportCategory: value }));
                    }}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">{t('admin.orderVouchers.reporting.selectCategory') || t('admin.orderVouchers.optionalPlaceholder')}</option>
                    {reportCategoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__NEW__">{t('admin.orderVouchers.reporting.createNew') || 'Create new category…'}</option>
                  </select>

                  {reportCategorySelect === '__NEW__' ? (
                    <input
                      value={form.reportCategory}
                      onChange={(e) => setForm((p) => ({ ...p, reportCategory: e.target.value }))}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      placeholder={t('admin.orderVouchers.reporting.newPlaceholder') || t('admin.orderVouchers.optionalPlaceholder')}
                    />
                  ) : null}
                </div>
              ) : (
                <input
                  value={form.reportCategory}
                  onChange={(e) => setForm((p) => ({ ...p, reportCategory: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  placeholder={t("admin.orderVouchers.optionalPlaceholder")}
                />
              )}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">{t("admin.orderVouchers.summary.title")}</h4>
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.summary.subtitle")}</p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.summary.usedBy")}</div>
                <div className="mt-1 font-medium">
                  {form.audience === "CUSTOMER"
                    ? t("admin.orderVouchers.audience.customer")
                    : form.audience === "POS"
                      ? t("admin.orderVouchers.audience.pos")
                      : t("admin.orderVouchers.audience.both")}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.summary.discount")}</div>
                <div className="mt-1 font-medium">
                  {form.discountType === "PERCENTAGE"
                    ? `${Number(form.discountValue) || 0}%` +
                      (parseOptionalNumber(form.maxDiscountAmount) != null
                        ? ` (${t("admin.orderVouchers.summary.maxDiscount", {
                            amount: `${currencySymbol}${parseOptionalNumber(form.maxDiscountAmount)}`,
                          })})`
                        : "")
                    : `${currencySymbol}${Number(form.discountValue) || 0}`}
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.summary.orderRules")}</div>
                <div className="mt-1 space-y-1">
                  <div>
                    {t("admin.orderVouchers.summary.minOrder")}: {parseOptionalNumber(form.minOrderAmount) != null ? `${currencySymbol}${parseOptionalNumber(form.minOrderAmount)}` : t("admin.orderVouchers.summary.any")}
                  </div>
                  <div>
                    {t("admin.orderVouchers.summary.itemScope")}: {form.includeAllItems ? t("admin.orderVouchers.summary.allItems") : t("admin.orderVouchers.summary.scopedItems", { menus: form.scopedMenuIds.length, categories: form.scopedCategoryIds.length })}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t("admin.orderVouchers.summary.when")}</div>
                <div className="mt-1 space-y-1">
                  <div>
                    {t("admin.orderVouchers.summary.validity")}: {form.validFrom || form.validUntil ? `${form.validFrom || "-"} → ${form.validUntil || "-"}` : t("admin.orderVouchers.validity.always")}
                  </div>
                  <div>
                    {t("admin.orderVouchers.summary.days")}: {form.daysOfWeek.length > 0 ? form.daysOfWeek.length : t("admin.orderVouchers.summary.allDays")}
                  </div>
                  <div>
                    {t("admin.orderVouchers.summary.orderTypes")}: {form.allowedOrderTypes.length > 0 ? form.allowedOrderTypes.join(", ") : t("admin.orderVouchers.summary.allOrderTypes")}
                  </div>
                  <div>
                    {t("admin.orderVouchers.summary.timeWindow")}: {form.startTime && form.endTime ? `${form.startTime}–${form.endTime}` : t("admin.orderVouchers.summary.any")}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              {t("admin.orderVouchers.summary.combinability")}: {t("admin.orderVouchers.summary.singleVoucherPerOrder")} • {t("admin.orderVouchers.summary.cannotCombineManual")}
            </div>
          </section>
            </div>
          </div>

          <div className="shrink-0 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:hover:bg-gray-800"
                onClick={onClose}
                disabled={saving}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                onClick={submit}
                disabled={saving || !form.name.trim()}
              >
                {mode === "create" ? t("admin.orderVouchers.createTemplate") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
