"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface SpecialPrice {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    applicableDays: number[];
    isAllDay: boolean;
    startTime: string | null;
    endTime: string | null;
    isActive: boolean;
    menuBook: { id: string; name: string; _count: { items: number } };
    _count: { priceItems: number };
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function SpecialPricesPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [specialPrices, setSpecialPrices] = useState<SpecialPrice[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem("accessToken");
            if (!token) {
                router.push("/admin/login");
                return;
            }

            const response = await fetch("/api/merchant/special-prices", {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();
            if (data.success) {
                setSpecialPrices(data.data);
            } else {
                setError(data.message || "Failed to fetch special prices");
            }
        } catch (err) {
            console.error("Fetch error:", err);
            setError("Failed to fetch special prices");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDelete = async (id: string) => {
        try {
            setDeleting(true);
            const token = localStorage.getItem("accessToken");

            const response = await fetch(`/api/merchant/special-prices/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();
            if (data.success) {
                setSpecialPrices(prev => prev.filter(sp => sp.id !== id));
                setDeleteId(null);
            } else {
                setError(data.message || "Failed to delete");
            }
        } catch (err) {
            console.error("Delete error:", err);
            setError("Failed to delete");
        } finally {
            setDeleting(false);
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const token = localStorage.getItem("accessToken");

            const response = await fetch(`/api/merchant/special-prices/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ isActive: !currentStatus }),
            });

            const data = await response.json();
            if (data.success) {
                setSpecialPrices(prev => prev.map(sp =>
                    sp.id === id ? { ...sp, isActive: !currentStatus } : sp
                ));
            }
        } catch (err) {
            console.error("Toggle error:", err);
        }
    };

    const filteredPrices = specialPrices.filter(sp =>
        sp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sp.menuBook.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDateRange = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        return `${s.toLocaleDateString()} - ${e.toLocaleDateString()}`;
    };

    if (loading) {
        return (
            <div>
                <PageBreadcrumb pageTitle={t("admin.specialPrices.title")} />
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                    {/* Skeleton Header */}
                    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="h-7 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                            <div className="mt-2 h-4 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                        </div>
                        <div className="h-10 w-44 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                    {/* Skeleton Search */}
                    <div className="mb-6">
                        <div className="h-11 w-full max-w-md animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                    </div>
                    {/* Skeleton Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 text-left"><div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></th>
                                    <th className="px-4 py-3 text-left"><div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></th>
                                    <th className="px-4 py-3 text-left"><div className="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></th>
                                    <th className="px-4 py-3 text-left"><div className="h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></th>
                                    <th className="px-4 py-3 text-left"><div className="h-3 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></th>
                                    <th className="px-4 py-3 text-left"><div className="h-3 w-14 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></th>
                                    <th className="px-4 py-3 text-right"><div className="ml-auto h-3 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-4"><div className="h-5 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></td>
                                        <td className="px-4 py-4"><div className="h-6 w-24 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div></td>
                                        <td className="px-4 py-4"><div className="h-5 w-36 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></td>
                                        <td className="px-4 py-4"><div className="flex gap-1">{[1, 2, 3].map(j => <div key={j} className="h-5 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>)}</div></td>
                                        <td className="px-4 py-4"><div className="h-5 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div></td>
                                        <td className="px-4 py-4"><div className="h-6 w-16 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div></td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                                                <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <PageBreadcrumb pageTitle={t("admin.specialPrices.title")} />

            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                {/* Header */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t("admin.specialPrices.title")}</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t("admin.specialPrices.subtitle")}
                        </p>
                    </div>
                    <Link
                        href="/admin/dashboard/special-prices/create"
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600"
                    >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t("admin.specialPrices.create")}
                    </Link>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder={t("admin.specialPrices.searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 w-full max-w-md rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-primary-400 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                </div>

                {error && (
                    <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                        {error}
                        <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
                    </div>
                )}

                {/* Table */}
                {filteredPrices.length === 0 ? (
                    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-700 dark:bg-gray-900/50">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">{t("admin.specialPrices.noSpecialPrices")}</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("admin.specialPrices.noSpecialPricesDesc")}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{t("admin.specialPrices.name")}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{t("admin.specialPrices.menuBook")}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{t("admin.specialPrices.dateRange")}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{t("admin.specialPrices.days")}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{t("admin.specialPrices.time")}</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-500">{t("admin.specialPrices.status")}</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-500">{t("admin.specialPrices.actions")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredPrices.map((sp) => (
                                    <tr key={sp.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                        <td className="px-4 py-4">
                                            <p className="font-medium text-gray-900 dark:text-white">{sp.name}</p>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                                {sp.menuBook.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {formatDateRange(sp.startDate, sp.endDate)}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {sp.applicableDays.map(d => (
                                                    <span key={d} className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                                        {dayNames[d]}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                                            {sp.isAllDay ? t("admin.specialPrices.allDay") : `${sp.startTime} - ${sp.endTime}`}
                                        </td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => toggleStatus(sp.id, sp.isActive)}
                                                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${sp.isActive
                                                    ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                                                    }`}
                                            >
                                                {sp.isActive ? t("admin.specialPrices.active") : t("admin.specialPrices.inactive")}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/admin/dashboard/special-prices/${sp.id}/edit`}
                                                    className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 hover:text-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </Link>
                                                <button
                                                    onClick={() => setDeleteId(sp.id)}
                                                    className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                                >
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t("admin.specialPrices.deleteConfirm")}</h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {t("admin.specialPrices.deleteWarning")}
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                            >
                                {t("admin.specialPrices.cancel")}
                            </button>
                            <button
                                onClick={() => handleDelete(deleteId)}
                                disabled={deleting}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {deleting ? t("admin.specialPrices.deleting") : t("admin.specialPrices.delete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
