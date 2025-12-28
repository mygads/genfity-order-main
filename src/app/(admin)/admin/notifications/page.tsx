"use client";

import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import Link from "next/link";

interface Notification {
    id: string;
    category: string;
    title: string;
    message: string;
    isRead: boolean;
    actionUrl: string | null;
    createdAt: string;
}

interface NotificationsResponse {
    success: boolean;
    data: {
        notifications: Notification[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

const categoryConfig: Record<string, { icon: string; color: string; label: string }> = {
    SYSTEM: { icon: "🔔", color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", label: "System" },
    SUBSCRIPTION: { icon: "💳", color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", label: "Subscription" },
    ORDER: { icon: "🛒", color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400", label: "Order" },
    STOCK: { icon: "📦", color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Stock" },
    STAFF: { icon: "👤", color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400", label: "Staff" },
    PAYMENT: { icon: "💰", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", label: "Payment" },
};

const categories = ["ALL", "SYSTEM", "SUBSCRIPTION", "ORDER", "STOCK", "STAFF", "PAYMENT"];

function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days < 7) return `${days} days ago`;

    return date.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
}

export default function NotificationsPage() {
    const { t } = useTranslation();
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<string>("ALL");
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);

    const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(filter !== "ALL" ? { category: filter } : {}),
        ...(showUnreadOnly ? { isRead: "false" } : {}),
    });

    const { data, isLoading, mutate } = useSWRStatic<NotificationsResponse>(
        `/api/notifications?${queryParams.toString()}`
    );

    const notifications = data?.data?.notifications || [];
    const totalPages = data?.data?.totalPages || 1;
    const total = data?.data?.total || 0;

    const handleMarkAsRead = async (id: string) => {
        try {
            const token = localStorage.getItem('accessToken');
            await fetch(`/api/notifications/${id}/read`, {
                method: "POST",
                headers: { 'Authorization': `Bearer ${token}` },
            });
            mutate();
        } catch (error) {
            console.error("Failed to mark as read:", error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            await fetch("/api/notifications/mark-all-read", {
                method: "POST",
                headers: { 'Authorization': `Bearer ${token}` },
            });
            mutate();
        } catch (error) {
            console.error("Failed to mark all as read:", error);
        }
    };

    return (
        <div>
            <PageBreadcrumb pageTitle={t("notifications.title") || "Notifications"} />

            {/* Filters */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => { setFilter(cat); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === cat
                                ? "bg-orange-500 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                }`}
                        >
                            {cat === "ALL" ? "All" : categoryConfig[cat]?.label || cat}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <input
                            type="checkbox"
                            checked={showUnreadOnly}
                            onChange={(e) => { setShowUnreadOnly(e.target.checked); setPage(1); }}
                            className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        Unread only
                    </label>
                    <button
                        onClick={handleMarkAllAsRead}
                        className="text-sm text-orange-500 hover:text-orange-600 dark:text-orange-400"
                    >
                        {t("notifications.markAllRead") || "Mark all as read"}
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                {total} {total === 1 ? "notification" : "notifications"}
            </div>

            {/* Notifications List */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="animate-pulse rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex gap-4">
                                <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700" />
                                <div className="flex-1">
                                    <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700 mb-2" />
                                    <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : notifications.length === 0 ? (
                <div className="text-center py-16 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                    <span className="block text-5xl mb-4">🔔</span>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {t("notifications.empty") || "No notifications"}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                        {showUnreadOnly ? "All caught up! No unread notifications." : "You don't have any notifications yet."}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => {
                        const config = categoryConfig[notification.category] || categoryConfig.SYSTEM;
                        return (
                            <div
                                key={notification.id}
                                className={`rounded-xl border p-4 transition-colors ${!notification.isRead
                                    ? "border-orange-200 bg-orange-50/50 dark:border-orange-800/50 dark:bg-orange-900/10"
                                    : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                                    }`}
                            >
                                <div className="flex gap-4">
                                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${config.color}`}>
                                        <span className="text-xl">{config.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-2">
                                                <h4 className={`font-semibold ${!notification.isRead ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                                                    {notification.title}
                                                </h4>
                                                {!notification.isRead && (
                                                    <span className="h-2 w-2 rounded-full bg-orange-500" />
                                                )}
                                            </div>
                                            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                                                {formatDateTime(notification.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.color}`}>
                                                {config.icon} {config.label}
                                            </span>
                                            {notification.actionUrl && (
                                                <Link
                                                    href={notification.actionUrl}
                                                    className="text-sm text-orange-500 hover:text-orange-600 dark:text-orange-400"
                                                >
                                                    View details →
                                                </Link>
                                            )}
                                            {!notification.isRead && (
                                                <button
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                                >
                                                    Mark as read
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
