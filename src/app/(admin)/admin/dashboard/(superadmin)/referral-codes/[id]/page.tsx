"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSWRWithAuth } from "@/hooks/useSWRWithAuth";
import { formatDate } from "@/lib/utils/format";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface ReferralCodeDetail {
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
    stats: {
        totalUsages: number;
        uniqueMerchants: number;
        registrations: number;
        depositTopups: number;
        monthlySubscribes: number;
    };
}

interface MerchantUsage {
    id: string;
    code: string;
    name: string;
    referralCodeUsed: string | null;
    subscription: {
        type: string;
        status: string;
    } | null;
    usedAt: string;
}

interface CodeResponse {
    success: boolean;
    data: ReferralCodeDetail;
}

interface UsageResponse {
    success: boolean;
    data: {
        merchants: MerchantUsage[];
    };
}

export default function ReferralCodeDetailPage() {
    const { t } = useTranslation();
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [editData, setEditData] = useState<{
        description: string;
        discountType: "NONE" | "PERCENTAGE" | "FIXED_AMOUNT" | "BONUS_DAYS";
        discountValue: string;
        maxUsage: string;
        isActive: boolean;
    }>({
        description: "",
        discountType: "NONE",
        discountValue: "",
        maxUsage: "",
        isActive: true,
    });

    const { data, error, isLoading, mutate } = useSWRWithAuth<CodeResponse>(
        id ? `/api/admin/referral-codes/${id}` : null
    );

    const { data: usageData } = useSWRWithAuth<UsageResponse>(
        id ? `/api/admin/referral-codes/${id}/usage` : null
    );

    const code = data?.data;
    const merchants = usageData?.data?.merchants || [];

    const handleEdit = () => {
        if (code) {
            setEditData({
                description: code.description || "",
                discountType: code.discountType,
                discountValue: code.discountValue?.toString() || "",
                maxUsage: code.maxUsage?.toString() || "",
                isActive: code.isActive,
            });
            setIsEditing(true);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/admin/referral-codes/${id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    description: editData.description || undefined,
                    discountType: editData.discountType,
                    discountValue: editData.discountValue ? parseFloat(editData.discountValue) : undefined,
                    maxUsage: editData.maxUsage ? parseInt(editData.maxUsage, 10) : null,
                    isActive: editData.isActive,
                }),
            });

            if (response.ok) {
                setIsEditing(false);
                mutate();
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeactivate = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/admin/referral-codes/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
            });

            if (response.ok) {
                router.push("/admin/dashboard/referral-codes");
            }
        } finally {
            setShowDeactivateConfirm(false);
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

    // Note: _getUsageTypeBadge is kept for future use when we add usage type column
    const _getUsageTypeBadge = (type: string) => {
        switch (type) {
            case "REGISTRATION":
                return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600">{t("referral.usageType.registration")}</span>;
            case "DEPOSIT_TOPUP":
                return <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-600">{t("referral.usageType.depositTopup")}</span>;
            case "MONTHLY_SUBSCRIBE":
                return <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-600">{t("referral.usageType.monthlySubscribe")}</span>;
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
                    <div className="h-48 bg-gray-200 rounded mb-6"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (error || !code) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="text-center py-12 text-red-500">
                    Referral code not found
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/admin/dashboard/referral-codes"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 font-mono">{code.code}</h1>
                        <p className="text-gray-500">{code.description || "No description"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!isEditing ? (
                        <>
                            <button
                                onClick={handleEdit}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                {t("common.edit")}
                            </button>
                            {code.isActive && (
                                <button
                                    onClick={() => setShowDeactivateConfirm(true)}
                                    className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                >
                                    {t("referral.deactivate")}
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? t("common.saving") : t("common.save")}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Status Badge */}
            <div className="mb-6">
                {!code.isActive ? (
                    <span className="px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-600">{t("referral.inactive")}</span>
                ) : code.validUntil && new Date(code.validUntil) < new Date() ? (
                    <span className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-600">{t("referral.expired")}</span>
                ) : (
                    <span className="px-3 py-1 text-sm rounded-full bg-green-100 text-green-600">{t("referral.active")}</span>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{code.stats.totalUsages}</div>
                    <div className="text-sm text-gray-500">{t("referral.currentUsage")}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{code.stats.uniqueMerchants}</div>
                    <div className="text-sm text-gray-500">{t("referral.stats.totalMerchants")}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{code.stats.registrations}</div>
                    <div className="text-sm text-gray-500">{t("referral.usageType.registration")}</div>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                    <div className="text-2xl font-bold text-gray-900">{code.stats.depositTopups + code.stats.monthlySubscribes}</div>
                    <div className="text-sm text-gray-500">{t("referral.stats.subscribed")}</div>
                </div>
            </div>

            {/* Details Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Details</h2>

                {isEditing ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t("referral.description")}</label>
                            <input
                                type="text"
                                value={editData.description}
                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t("referral.discountType")}</label>
                                <select
                                    value={editData.discountType}
                                    onChange={(e) => setEditData({ ...editData, discountType: e.target.value as typeof editData.discountType })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                >
                                    <option value="NONE">{t("referral.discountType.none")}</option>
                                    <option value="PERCENTAGE">{t("referral.discountType.percentage")}</option>
                                    <option value="FIXED_AMOUNT">{t("referral.discountType.fixedAmount")}</option>
                                    <option value="BONUS_DAYS">{t("referral.discountType.bonusDays")}</option>
                                </select>
                            </div>
                            {editData.discountType !== "NONE" && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("referral.discountValue")}</label>
                                    <input
                                        type="number"
                                        value={editData.discountValue}
                                        onChange={(e) => setEditData({ ...editData, discountValue: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                    />
                                </div>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t("referral.maxUsage")}</label>
                            <input
                                type="number"
                                value={editData.maxUsage}
                                onChange={(e) => setEditData({ ...editData, maxUsage: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                                placeholder={t("referral.maxUsageHint")}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={editData.isActive}
                                onChange={(e) => setEditData({ ...editData, isActive: e.target.checked })}
                                className="rounded text-brand-500 focus:ring-brand-500"
                            />
                            <label htmlFor="isActive" className="text-sm">{t("referral.active")}</label>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-gray-500">{t("referral.discountType")}</div>
                            <div className="font-medium">{getDiscountTypeLabel(code.discountType)}</div>
                        </div>
                        {code.discountValue && (
                            <div>
                                <div className="text-sm text-gray-500">{t("referral.discountValue")}</div>
                                <div className="font-medium">
                                    {code.discountType === "PERCENTAGE" ? `${code.discountValue}%` : code.discountValue}
                                </div>
                            </div>
                        )}
                        <div>
                            <div className="text-sm text-gray-500">{t("referral.maxUsage")}</div>
                            <div className="font-medium">{code.maxUsage || t("referral.maxUsageUnlimited")}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">Created</div>
                            <div className="font-medium">{formatDate(code.createdAt)}</div>
                        </div>
                        {code.validFrom && (
                            <div>
                                <div className="text-sm text-gray-500">{t("referral.validFrom")}</div>
                                <div className="font-medium">{formatDate(code.validFrom)}</div>
                            </div>
                        )}
                        {code.validUntil && (
                            <div>
                                <div className="text-sm text-gray-500">{t("referral.validUntil")}</div>
                                <div className="font-medium">{formatDate(code.validUntil)}</div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Usage History */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">{t("referral.usageHistory")}</h2>

                {merchants.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        {t("referral.noUsageYet")}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {merchants.map((merchant) => (
                            <div
                                key={merchant.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                                <div>
                                    <div className="font-medium">{merchant.name}</div>
                                    <div className="text-sm text-gray-500">{merchant.code}</div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {merchant.subscription && (
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${merchant.subscription.status === "ACTIVE"
                                            ? "bg-green-100 text-green-600"
                                            : "bg-gray-100 text-gray-600"
                                            }`}>
                                            {merchant.subscription.type}
                                        </span>
                                    )}
                                    <div className="text-sm text-gray-500">
                                        {formatDate(merchant.usedAt)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Deactivate Confirm Modal */}
            {showDeactivateConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
                        <h2 className="text-lg font-bold mb-2">{t("referral.deactivate")}</h2>
                        <p className="text-gray-600 mb-6">{t("referral.deactivateConfirm")}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeactivateConfirm(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleDeactivate}
                                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                            >
                                {t("referral.deactivate")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
