"use client";

import React, { useState } from "react";
import { useSWRWithAuth } from "@/hooks/useSWRWithAuth";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatCurrency } from "@/lib/utils/format";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { TableActionButton } from "@/components/common/TableActionButton";
import { StatusToggle } from "@/components/common/StatusToggle";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import AlertDialog from "@/components/modals/AlertDialog";
import { FaTicketAlt, FaPlus, FaWallet, FaCalendarPlus, FaSearch, FaFilter, FaTimes, FaEdit, FaTrash, FaEye, FaHistory } from "react-icons/fa";

interface Voucher {
    id: string;
    code: string;
    type: "BALANCE" | "SUBSCRIPTION_DAYS";
    description: string | null;
    value: number;
    currency: string | null;
    maxUsage: number | null;
    currentUsage: number;
    validFrom: string | null;
    validUntil: string | null;
    isActive: boolean;
    createdAt: string;
    _count: {
        redemptions: number;
    };
}

interface VoucherRedemption {
    id: string;
    voucherCode: string;
    voucherType: "BALANCE" | "SUBSCRIPTION_DAYS";
    valueApplied: number;
    currency: string;
    balanceBefore: number | null;
    balanceAfter: number | null;
    subscriptionEndBefore: string | null;
    subscriptionEndAfter: string | null;
    triggeredAutoSwitch: boolean;
    previousSubType: string | null;
    newSubType: string | null;
    redeemedAt: string;
    merchant: {
        id: string;
        code: string;
        name: string;
        currency: string;
    } | null;
    redeemedBy: {
        id: string;
        name: string;
        email: string;
    } | null;
}

interface VouchersApiResponse {
    success: boolean;
    data: {
        vouchers: Voucher[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    };
}

interface RedemptionsApiResponse {
    success: boolean;
    data: {
        redemptions: VoucherRedemption[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasMore: boolean;
        };
    };
}

export default function VouchersPage() {
    const { t, locale } = useTranslation();

    const [alertOpen, setAlertOpen] = useState(false);
    const [alertTitle, setAlertTitle] = useState<string>(t("common.failed"));
    const [alertMessage, setAlertMessage] = useState<string>("");
    const [alertVariant, setAlertVariant] = useState<"danger" | "warning" | "info">("danger");

    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [pendingDeleteVoucher, setPendingDeleteVoucher] = useState<Voucher | null>(null);

    const showAlert = (message: string, variant: "danger" | "warning" | "info" = "danger", title?: string) => {
        setAlertTitle(title || t("common.failed"));
        setAlertMessage(message);
        setAlertVariant(variant);
        setAlertOpen(true);
    };
    
    // Tab state
    const [activeTab, setActiveTab] = useState<"vouchers" | "redemptions">("vouchers");
    
    // Filter state
    const [showInactive, setShowInactive] = useState(false);
    const [typeFilter, setTypeFilter] = useState<string>("ALL");
    const [currencyFilter, setCurrencyFilter] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    
    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form state for create/edit
    const [formData, setFormData] = useState({
        code: "",
        type: "BALANCE" as "BALANCE" | "SUBSCRIPTION_DAYS",
        description: "",
        value: "",
        currency: "",
        maxUsage: "",
        validFrom: "",
        validUntil: "",
    });

    // Build query params
    const voucherParams = new URLSearchParams();
    voucherParams.set("showInactive", showInactive.toString());
    if (typeFilter !== "ALL") voucherParams.set("type", typeFilter);
    if (currencyFilter !== "ALL") voucherParams.set("currency", currencyFilter);
    if (searchQuery) voucherParams.set("search", searchQuery);

    // Fetch vouchers
    const { data: vouchersResponse, error: vouchersError, isLoading: vouchersLoading, mutate: mutateVouchers } =
        useSWRWithAuth<VouchersApiResponse>(`/api/superadmin/vouchers?${voucherParams.toString()}`);

    // Fetch redemptions
    const { data: redemptionsResponse, isLoading: redemptionsLoading } =
        useSWRWithAuth<RedemptionsApiResponse>("/api/superadmin/vouchers/redemptions?limit=50");

    const vouchers = vouchersResponse?.data?.vouchers || [];
    const redemptions = redemptionsResponse?.data?.redemptions || [];

    // Reset form
    const resetForm = () => {
        setFormData({
            code: "",
            type: "BALANCE",
            description: "",
            value: "",
            currency: "",
            maxUsage: "",
            validFrom: "",
            validUntil: "",
        });
    };

    // Handle create voucher
    const handleCreate = async () => {
        if (!formData.code || !formData.value) return;

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem("accessToken");
            const response = await fetch("/api/superadmin/vouchers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    code: formData.code,
                    type: formData.type,
                    description: formData.description || undefined,
                    value: parseFloat(formData.value),
                    currency: formData.currency || undefined,
                    maxUsage: formData.maxUsage ? parseInt(formData.maxUsage, 10) : undefined,
                    validFrom: formData.validFrom || undefined,
                    validUntil: formData.validUntil || undefined,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setShowCreateModal(false);
                resetForm();
                mutateVouchers();
            } else {
                showAlert(data.message || t("admin.voucher.error.createFailed"));
            }
        } catch (error) {
            console.error("Error creating voucher:", error);
            showAlert(t("admin.voucher.error.createFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle edit voucher
    const handleEdit = async () => {
        if (!selectedVoucher) return;

        setIsSubmitting(true);
        try {
            const token = localStorage.getItem("accessToken");
            const response = await fetch(`/api/superadmin/vouchers/${selectedVoucher.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    code: formData.code,
                    type: formData.type,
                    description: formData.description || undefined,
                    value: parseFloat(formData.value),
                    currency: formData.currency || null,
                    maxUsage: formData.maxUsage ? parseInt(formData.maxUsage, 10) : null,
                    validFrom: formData.validFrom || null,
                    validUntil: formData.validUntil || null,
                }),
            });

            const data = await response.json();
            if (data.success) {
                setShowEditModal(false);
                setSelectedVoucher(null);
                resetForm();
                mutateVouchers();
            } else {
                showAlert(data.message || t("admin.voucher.error.updateFailed"));
            }
        } catch (error) {
            console.error("Error updating voucher:", error);
            showAlert(t("admin.voucher.error.updateFailed"));
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle toggle active status
    const handleToggleActive = async (voucher: Voucher) => {
        try {
            const token = localStorage.getItem("accessToken");
            const response = await fetch(`/api/superadmin/vouchers/${voucher.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({ isActive: !voucher.isActive }),
            });

            const data = await response.json();
            if (data.success) {
                mutateVouchers();
            } else {
                showAlert(data.message || t("admin.voucher.error.updateFailed"));
            }
        } catch (error) {
            console.error("Error updating voucher:", error);
            showAlert(t("admin.voucher.error.updateFailed"));
        }
    };

    // Handle delete voucher
    const performDelete = async (voucher: Voucher) => {
        try {
            const token = localStorage.getItem("accessToken");
            const response = await fetch(`/api/superadmin/vouchers/${voucher.id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` },
            });

            const data = await response.json();
            if (data.success) {
                mutateVouchers();
            } else {
                showAlert(data.message || t("admin.voucher.error.deleteFailed"));
            }
        } catch (error) {
            console.error("Error deleting voucher:", error);
            showAlert(t("admin.voucher.error.deleteFailed"));
        }
    };

    const handleDelete = (voucher: Voucher) => {
        setPendingDeleteVoucher(voucher);
        setDeleteConfirmOpen(true);
    };

    const confirmDelete = async () => {
        if (!pendingDeleteVoucher) return;
        const voucher = pendingDeleteVoucher;
        setDeleteConfirmOpen(false);
        setPendingDeleteVoucher(null);
        await performDelete(voucher);
    };

    // Open edit modal
    const openEditModal = (voucher: Voucher) => {
        setSelectedVoucher(voucher);
        setFormData({
            code: voucher.code,
            type: voucher.type,
            description: voucher.description || "",
            value: voucher.value.toString(),
            currency: voucher.currency || "",
            maxUsage: voucher.maxUsage?.toString() || "",
            validFrom: voucher.validFrom ? voucher.validFrom.split("T")[0] : "",
            validUntil: voucher.validUntil ? voucher.validUntil.split("T")[0] : "",
        });
        setShowEditModal(true);
    };

    // Format date
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(locale === "id" ? "id-ID" : "en-AU", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    // Format datetime
    const formatDateTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleString(locale === "id" ? "id-ID" : "en-AU", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Get type badge
    const getTypeBadge = (type: string) => {
        if (type === "BALANCE") {
            return (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    <FaWallet className="w-3 h-3" />
                    {t("admin.voucher.type.balance")}
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <FaCalendarPlus className="w-3 h-3" />
                {t("admin.voucher.type.subscriptionDays")}
            </span>
        );
    };

    // Get status badge
    const getStatusBadge = (voucher: Voucher) => {
        if (!voucher.isActive) {
            return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">{t("admin.voucher.inactive")}</span>;
        }
        if (voucher.validUntil && new Date(voucher.validUntil) < new Date()) {
            return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">{t("admin.voucher.expired")}</span>;
        }
        if (voucher.maxUsage && voucher.currentUsage >= voucher.maxUsage) {
            return <span className="px-2 py-1 text-xs font-medium rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">{t("admin.voucher.fullyUsed")}</span>;
        }
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">{t("admin.voucher.active")}</span>;
    };

    // Get currency label
    const getCurrencyLabel = (currency: string | null) => {
        if (!currency) return t("admin.voucher.currencyUniversal");
        return currency;
    };

    // Loading state
    if (vouchersLoading && activeTab === "vouchers") {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (vouchersError) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <FaTimes className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="text-red-500 dark:text-red-400">{t("admin.voucher.error.loadFailed")}</p>
                    <button onClick={() => mutateVouchers()} className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors">
                        {t("common.retry")}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <PageBreadcrumb pageTitle={t("admin.nav.vouchers")} />

            <AlertDialog
                isOpen={alertOpen}
                title={alertTitle}
                message={alertMessage}
                variant={alertVariant}
                onClose={() => setAlertOpen(false)}
            />

            <ConfirmDialog
                isOpen={deleteConfirmOpen}
                title={t("admin.voucher.deleteTitle")}
                message={
                    pendingDeleteVoucher
                        ? t("admin.voucher.deleteConfirmWithCode", { code: pendingDeleteVoucher.code })
                        : t("admin.voucher.deleteConfirm")
                }
                confirmText={t("common.delete")}
                cancelText={t("common.cancel")}
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => {
                    setDeleteConfirmOpen(false);
                    setPendingDeleteVoucher(null);
                }}
            />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t("admin.voucher.title")}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {t("admin.voucher.subtitle")}
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setShowCreateModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
                >
                    <FaPlus className="w-4 h-4" />
                    {t("admin.voucher.create")}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab("vouchers")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "vouchers"
                            ? "border-brand-500 text-brand-600 dark:text-brand-400"
                            : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                >
                    <span className="flex items-center gap-2">
                        <FaTicketAlt className="w-4 h-4" />
                        {t("admin.voucher.tabs.vouchers")}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab("redemptions")}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === "redemptions"
                            ? "border-brand-500 text-brand-600 dark:text-brand-400"
                            : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    }`}
                >
                    <span className="flex items-center gap-2">
                        <FaHistory className="w-4 h-4" />
                        {t("admin.voucher.tabs.redemptions")}
                    </span>
                </button>
            </div>

            {/* Vouchers Tab */}
            {activeTab === "vouchers" && (
                <>
                    {/* Filters */}
                    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Search */}
                            <div className="relative flex-1">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t("admin.voucher.searchPlaceholder")}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>

                            {/* Type filter */}
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                                <option value="ALL">{t("admin.voucher.type.all")}</option>
                                <option value="BALANCE">{t("admin.voucher.type.balance")}</option>
                                <option value="SUBSCRIPTION_DAYS">{t("admin.voucher.type.subscriptionDays")}</option>
                            </select>

                            {/* Currency filter */}
                            <select
                                value={currencyFilter}
                                onChange={(e) => setCurrencyFilter(e.target.value)}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            >
                                <option value="ALL">{t("admin.voucher.currency.all")}</option>
                                <option value="IDR">IDR</option>
                                <option value="AUD">AUD</option>
                            </select>

                            {/* Show inactive toggle */}
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                <StatusToggle
                                    isActive={showInactive}
                                    onToggle={() => setShowInactive(!showInactive)}
                                    size="sm"
                                    activeLabel={t('common.on')}
                                    inactiveLabel={t('common.off')}
                                />
                                <span>{t('admin.voucher.showInactive')}</span>
                            </div>
                        </div>
                    </div>

                    {/* Vouchers Table */}
                    {vouchers.length === 0 ? (
                        <div className="text-center py-16 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <FaTicketAlt className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                {t("admin.voucher.noVouchers")}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-4">
                                {t("admin.voucher.noVouchersDesc")}
                            </p>
                            <button
                                onClick={() => {
                                    resetForm();
                                    setShowCreateModal(true);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
                            >
                                <FaPlus className="w-4 h-4" />
                                {t("admin.voucher.create")}
                            </button>
                        </div>
                    ) : (
                        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t("admin.voucher.code")}
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t("admin.voucher.type")}
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t("admin.voucher.value")}
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t("admin.voucher.currency")}
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t("admin.voucher.currentUsage")}
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t("admin.voucher.status")}
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                {t("admin.voucher.actions")}
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {vouchers.map((voucher) => (
                                            <tr key={voucher.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <div className="font-mono font-semibold text-gray-900 dark:text-white">{voucher.code}</div>
                                                        {voucher.description && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{voucher.description}</div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getTypeBadge(voucher.type)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900 dark:text-white">
                                                        {voucher.type === "BALANCE" 
                                                            ? formatCurrency(voucher.value, voucher.currency || "IDR", locale)
                                                            : `${voucher.value} ${t("admin.voucher.days")}`
                                                        }
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-sm ${voucher.currency ? "font-medium" : "text-gray-500"}`}>
                                                        {getCurrencyLabel(voucher.currency)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-900 dark:text-white">
                                                        {voucher.currentUsage} / {voucher.maxUsage || "∞"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {getStatusBadge(voucher)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <TableActionButton
                                                            icon={FaEdit}
                                                            onClick={() => openEditModal(voucher)}
                                                            aria-label={t("common.edit")}
                                                            title={t("common.edit")}
                                                        />
                                                        <StatusToggle
                                                            isActive={voucher.isActive}
                                                            onToggle={() => handleToggleActive(voucher)}
                                                            activeLabel={t('common.active')}
                                                            inactiveLabel={t('common.inactive')}
                                                            activateTitle={t("admin.voucher.action.activate")}
                                                            deactivateTitle={t("admin.voucher.action.deactivate")}
                                                            size="sm"
                                                        />
                                                        <TableActionButton
                                                            icon={FaTrash}
                                                            tone="danger"
                                                            onClick={() => handleDelete(voucher)}
                                                            aria-label={t("common.delete")}
                                                            title={t("common.delete")}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Redemptions Tab */}
            {activeTab === "redemptions" && (
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 overflow-hidden">
                    {redemptionsLoading ? (
                        <div className="p-8 text-center">
                            <div className="animate-pulse space-y-4">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                ))}
                            </div>
                        </div>
                    ) : redemptions.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                <FaHistory className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                                {t("admin.voucher.redemption.noRedemptions")}
                            </h3>
                            <p className="text-gray-500 dark:text-gray-400">
                                {t("admin.voucher.redemption.noRedemptionsDesc")}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t("admin.voucher.code")}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t("admin.voucher.redemption.merchant")}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t("admin.voucher.redemption.value")}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t("admin.voucher.redemption.autoSwitch")}
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            {t("admin.voucher.redemption.time")}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {redemptions.map((redemption) => (
                                        <tr key={redemption.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div>
                                                    <div className="font-mono font-semibold text-gray-900 dark:text-white">{redemption.voucherCode}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                        {getTypeBadge(redemption.voucherType)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {redemption.merchant ? (
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-white">{redemption.merchant.name}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">{redemption.merchant.code}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {redemption.voucherType === "BALANCE"
                                                        ? formatCurrency(redemption.valueApplied, redemption.currency, locale)
                                                        : `${redemption.valueApplied} ${t("admin.voucher.days")}`
                                                    }
                                                </div>
                                                {redemption.voucherType === "BALANCE" && redemption.balanceBefore !== null && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {formatCurrency(redemption.balanceBefore, redemption.currency, locale)} → {formatCurrency(redemption.balanceAfter || 0, redemption.currency, locale)}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {redemption.triggeredAutoSwitch ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                        {redemption.previousSubType} → {redemption.newSubType}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                {formatDateTime(redemption.redeemedAt)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {t("admin.voucher.modal.createTitle")}
                                </h2>
                                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Code */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t("admin.voucher.code")} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono"
                                    placeholder={t("admin.voucher.form.codePlaceholder")}
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t("admin.voucher.type")} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as "BALANCE" | "SUBSCRIPTION_DAYS" })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                >
                                    <option value="BALANCE">{t("admin.voucher.form.typeOption.balance")}</option>
                                    <option value="SUBSCRIPTION_DAYS">{t("admin.voucher.form.typeOption.subscriptionDays")}</option>
                                </select>
                            </div>

                            {/* Value */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {formData.type === "BALANCE" 
                                        ? t("admin.voucher.balanceAmount")
                                        : t("admin.voucher.numberOfDays")
                                    } <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    placeholder={formData.type === "BALANCE" ? "100000" : "30"}
                                    min="0"
                                    step={formData.type === "BALANCE" ? "0.01" : "1"}
                                />
                            </div>

                            {/* Currency (only for BALANCE type) */}
                            {formData.type === "BALANCE" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t("admin.voucher.currencyRestriction")}
                                    </label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    >
                                        <option value="">{t("admin.voucher.currencyUniversal")}</option>
                                        <option value="IDR">IDR (Rupiah)</option>
                                        <option value="AUD">AUD (Australian Dollar)</option>
                                    </select>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {t("admin.voucher.currencyRestrictionHint")}
                                    </p>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t("admin.voucher.description")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    placeholder={t("admin.voucher.descriptionPlaceholder")}
                                />
                            </div>

                            {/* Max Usage */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t("admin.voucher.maxUsage")}
                                </label>
                                <input
                                    type="number"
                                    value={formData.maxUsage}
                                    onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    placeholder={t("admin.voucher.form.maxUsagePlaceholder")}
                                    min="1"
                                />
                            </div>

                            {/* Valid Period */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t("admin.voucher.validFrom")}
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.validFrom}
                                        onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t("admin.voucher.validUntil")}
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.validUntil}
                                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={isSubmitting || !formData.code || !formData.value}
                                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 font-medium"
                            >
                                {isSubmitting ? t("common.saving") : t("common.create")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal (Same structure as Create Modal) */}
            {showEditModal && selectedVoucher && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                    {t("admin.voucher.edit")}
                                </h2>
                                <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                    <FaTimes className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Same form fields as create modal */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t("admin.voucher.code")} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t("admin.voucher.type")} <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value as "BALANCE" | "SUBSCRIPTION_DAYS" })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                >
                                    <option value="BALANCE">{t("admin.voucher.form.typeOption.balance")}</option>
                                    <option value="SUBSCRIPTION_DAYS">{t("admin.voucher.form.typeOption.subscriptionDays")}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {formData.type === "BALANCE" 
                                        ? t("admin.voucher.balanceAmount")
                                        : t("admin.voucher.numberOfDays")
                                    } <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    min="0"
                                    step={formData.type === "BALANCE" ? "0.01" : "1"}
                                />
                            </div>

                            {formData.type === "BALANCE" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t("admin.voucher.currencyRestriction")}
                                    </label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    >
                                        <option value="">{t("admin.voucher.currencyUniversal")}</option>
                                        <option value="IDR">IDR (Rupiah)</option>
                                        <option value="AUD">AUD (Australian Dollar)</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t("admin.voucher.description")}
                                </label>
                                <input
                                    type="text"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t("admin.voucher.maxUsage")}
                                </label>
                                <input
                                    type="number"
                                    value={formData.maxUsage}
                                    onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    min="1"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    {t("admin.voucher.alreadyUsed", { count: selectedVoucher.currentUsage })}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t("admin.voucher.validFrom")}
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.validFrom}
                                        onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {t("admin.voucher.validUntil")}
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.validUntil}
                                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex gap-3">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleEdit}
                                disabled={isSubmitting || !formData.code || !formData.value}
                                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 font-medium"
                            >
                                {isSubmitting ? t("common.saving") : t("common.save")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
