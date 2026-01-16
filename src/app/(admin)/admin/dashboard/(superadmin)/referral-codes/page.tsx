"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSWRWithAuth } from "@/hooks/useSWRWithAuth";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { StatusToggle } from "@/components/common/StatusToggle";

interface ReferralCode {
    id: string;
    code: string;
    description: string | null;
    discountType: "NONE" | "PERCENTAGE" | "FIXED_AMOUNT" | "BONUS_DAYS";
    discountValue: number | null;
    maxUsage: number | null;
    currentUsage: number;
    isActive: boolean;
    validFrom: string | null;
    validUntil: string | null;
    createdAt: string;
    usageCount: number;
}

interface ApiResponse {
    success: boolean;
    data: {
        codes: ReferralCode[];
        pagination: {
            total: number;
            limit: number;
            offset: number;
            hasMore: boolean;
        };
    };
}

export default function ReferralCodesPage() {
    const { t } = useTranslation();
    const [showInactive, setShowInactive] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [newCode, setNewCode] = useState({
        code: "",
        description: "",
        discountType: "NONE" as const,
        discountValue: "",
        maxUsage: "",
    });

    const { data, error, isLoading, mutate } = useSWRWithAuth<ApiResponse>(
        `/api/admin/referral-codes?includeInactive=${showInactive}`
    );

    const handleCreateCode = async () => {
        if (!newCode.code) return;

        setIsCreating(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch("/api/admin/referral-codes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    code: newCode.code,
                    description: newCode.description || undefined,
                    discountType: newCode.discountType,
                    discountValue: newCode.discountValue ? parseFloat(newCode.discountValue) : undefined,
                    maxUsage: newCode.maxUsage ? parseInt(newCode.maxUsage, 10) : undefined,
                }),
            });

            if (response.ok) {
                setShowCreateModal(false);
                setNewCode({ code: "", description: "", discountType: "NONE", discountValue: "", maxUsage: "" });
                mutate();
            }
        } finally {
            setIsCreating(false);
        }
    };

    const getDiscountTypeLabel = (type: string) => {
        switch (type) {
            case "NONE": return t("referral.discountType.none");
            case "PERCENTAGE": return t("referral.discountType.percentage");
            case "FIXED_AMOUNT": return t("referral.discountType.fixedAmount");
            case "BONUS_DAYS": return t("referral.discountType.bonusDays");
            default: return type;
        }
    };

    const handleToggleActive = async (code: ReferralCode) => {
        setTogglingId(code.id);
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const response = await fetch(`/api/admin/referral-codes/${code.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    isActive: !code.isActive,
                }),
            });

            if (response.ok) {
                mutate();
            }
        } finally {
            setTogglingId(null);
        }
    };

    const getStatusCell = (code: ReferralCode) => {
        if (code.validUntil && new Date(code.validUntil) < new Date()) {
            return <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">{t("referral.expired")}</span>;
        }

        return (
            <StatusToggle
                isActive={code.isActive}
                onToggle={() => void handleToggleActive(code)}
                disabled={togglingId === code.id}
                size="sm"
                activeLabel={t("referral.active")}
                inactiveLabel={t("referral.inactive")}
            />
        );
    };

    if (isLoading) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 max-w-7xl mx-auto">
                <div className="text-center py-12 text-red-500">
                    Failed to load referral codes
                </div>
            </div>
        );
    }

    const codes = data?.data?.codes || [];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t("referral.title")}</h1>
                    <p className="text-gray-600">{t("referral.subtitle")}</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t("referral.createCode")}
                </button>
            </div>

            {/* Filters */}
            <div className="mb-6 flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                    <StatusToggle
                        isActive={showInactive}
                        onToggle={() => setShowInactive(!showInactive)}
                        size="sm"
                        activeLabel={t('common.on')}
                        inactiveLabel={t('common.off')}
                    />
                    <span>{t("referral.showInactiveCodes")}</span>
                </div>
            </div>

            {/* Table */}
            {codes.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm">
                    <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    <p className="text-gray-500 mb-2">{t("referral.noCodesYet")}</p>
                    <p className="text-gray-400 text-sm">{t("referral.createFirst")}</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t("referral.code")}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t("referral.discountType")}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t("referral.currentUsage")}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {t("referral.status")}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {codes.map((code) => (
                                <tr key={code.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-mono font-medium text-gray-900">{code.code}</div>
                                            {code.description && (
                                                <div className="text-sm text-gray-500">{code.description}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            {getDiscountTypeLabel(code.discountType)}
                                            {code.discountValue && (
                                                <span className="text-gray-500 ml-1">
                                                    ({code.discountType === "PERCENTAGE" ? `${code.discountValue}%` : code.discountValue})
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            {code.maxUsage
                                                ? t("referral.usedCount", { current: code.currentUsage.toString(), max: code.maxUsage.toString() })
                                                : t("referral.usedCountUnlimited", { current: code.currentUsage.toString() })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusCell(code)}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/admin/dashboard/referral-codes/${code.id}`}
                                            className="text-brand-500 hover:text-brand-600 dark:text-brand-400 text-sm font-medium"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">{t("referral.createCode")}</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("referral.code")} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newCode.code}
                                    onChange={(e) => setNewCode({ ...newCode, code: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    placeholder="e.g., LAUNCH2024"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("referral.description")}
                                </label>
                                <input
                                    type="text"
                                    value={newCode.description}
                                    onChange={(e) => setNewCode({ ...newCode, description: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    placeholder="e.g., Launch promo code"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("referral.discountType")}
                                </label>
                                <select
                                    value={newCode.discountType}
                                    onChange={(e) => setNewCode({ ...newCode, discountType: e.target.value as typeof newCode.discountType })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                >
                                    <option value="NONE">{t("referral.discountType.none")}</option>
                                    <option value="PERCENTAGE">{t("referral.discountType.percentage")}</option>
                                    <option value="FIXED_AMOUNT">{t("referral.discountType.fixedAmount")}</option>
                                    <option value="BONUS_DAYS">{t("referral.discountType.bonusDays")}</option>
                                </select>
                            </div>

                            {newCode.discountType !== "NONE" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        {t("referral.discountValue")}
                                    </label>
                                    <input
                                        type="number"
                                        value={newCode.discountValue}
                                        onChange={(e) => setNewCode({ ...newCode, discountValue: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                        placeholder={newCode.discountType === "PERCENTAGE" ? "e.g., 10" : "e.g., 50000"}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {t("referral.maxUsage")}
                                </label>
                                <input
                                    type="number"
                                    value={newCode.maxUsage}
                                    onChange={(e) => setNewCode({ ...newCode, maxUsage: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    placeholder={t("referral.maxUsageHint")}
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleCreateCode}
                                disabled={isCreating || !newCode.code}
                                className="flex-1 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
                            >
                                {isCreating ? t("common.saving") : t("common.create")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
