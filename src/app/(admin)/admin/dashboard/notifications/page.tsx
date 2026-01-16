"use client";

import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import { StatusToggle } from "@/components/common/StatusToggle";
import Link from "next/link";
import { useToast } from "@/context/ToastContext";
import NotificationSettingsModal, {
    type MerchantTransactionToggleKey,
    type StaffActivityToggleKey,
} from "@/components/notifications/NotificationSettingsModal";
import { 
    FaBell, 
    FaCheckDouble,
    FaChevronLeft,
    FaChevronRight,
    FaCheck,
    FaCircle
} from "react-icons/fa";

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

const categories = ["ALL", "SYSTEM", "SUBSCRIPTION", "ORDER", "STOCK", "STAFF", "PAYMENT"];

interface NotificationSettingsResponse {
    success: boolean;
    data: {
        settings: {
            accountTransactions: boolean;
            merchant: Record<MerchantTransactionToggleKey, boolean>;
            staff: Record<StaffActivityToggleKey, boolean>;
        };
        availability: {
            merchant: Record<MerchantTransactionToggleKey, boolean>;
            staff: Record<StaffActivityToggleKey, boolean>;
        };
    };
}

function formatDateTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString("en-AU", {
        day: "numeric",
        month: "short",
        year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
}

export default function NotificationsPage() {
    const { t } = useTranslation();
    const { showSuccess, showError } = useToast();
    const [page, setPage] = useState(1);
    const [filter, setFilter] = useState<string>("ALL");
    const [showUnreadOnly, setShowUnreadOnly] = useState(false);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [settingsOpen, setSettingsOpen] = useState(false);

    const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(filter !== "ALL" ? { category: filter } : {}),
        ...(showUnreadOnly ? { isRead: "false" } : {}),
    });

    const { data, isLoading, mutate } = useSWRStatic<NotificationsResponse>(
        `/api/notifications?${queryParams.toString()}`
    );

    const { data: settingsData, isLoading: isSettingsLoading, mutate: mutateSettings } =
        useSWRStatic<NotificationSettingsResponse>("/api/notifications/settings");

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

    const updateSettings = async (patch: {
        accountTransactions?: boolean;
        merchant?: Partial<Record<MerchantTransactionToggleKey, boolean>>;
        staff?: Partial<Record<StaffActivityToggleKey, boolean>>;
    }) => {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('/api/notifications/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(patch),
        });

        const json = (await res.json().catch(() => null)) as
            | { success: true; data: unknown }
            | { success: false; message?: string }
            | null;

        if (!res.ok || !json?.success) {
            throw new Error((json as any)?.message || 'Failed to update settings');
        }
    };

    const onToggleAccountTransactions = async (nextValue: boolean) => {
        try {
            setSavingKey('accountTransactions');
            await mutateSettings(async (current) => {
                await updateSettings({ accountTransactions: nextValue });
                return current;
            }, { revalidate: true });
            showSuccess(t('notifications.settings.saved') || 'Saved');
        } catch (err) {
            console.error('Failed to update notification settings:', err);
            showError(t('notifications.settings.saveFailed') || 'Failed to save');
        } finally {
            setSavingKey(null);
        }
    };

    const onToggleMerchantKey = async (key: MerchantTransactionToggleKey, nextValue: boolean) => {
        try {
            setSavingKey(`merchant:${key}`);
            await mutateSettings(async (current) => {
                await updateSettings({ merchant: { [key]: nextValue } });
                return current;
            }, { revalidate: true });
            showSuccess(t('notifications.settings.saved') || 'Saved');
        } catch (err) {
            console.error('Failed to update notification settings:', err);
            showError(t('notifications.settings.saveFailed') || 'Failed to save');
        } finally {
            setSavingKey(null);
        }
    };

    const onToggleStaffKey = async (key: StaffActivityToggleKey, nextValue: boolean) => {
        try {
            setSavingKey(`staff:${key}`);
            await mutateSettings(async (current) => {
                await updateSettings({ staff: { [key]: nextValue } });
                return current;
            }, { revalidate: true });
            showSuccess(t('notifications.settings.saved') || 'Saved');
        } catch (err) {
            console.error('Failed to update notification settings:', err);
            showError(t('notifications.settings.saveFailed') || 'Failed to save');
        } finally {
            setSavingKey(null);
        }
    };

    const categoryLabels: Record<string, string> = {
        SYSTEM: t('notifications.category.system') || 'System',
        SUBSCRIPTION: t('notifications.category.subscription') || 'Subscription',
        ORDER: t('notifications.category.order') || 'Order',
        STOCK: t('notifications.category.stock') || 'Stock',
        STAFF: t('notifications.category.staff') || 'Staff',
        PAYMENT: t('notifications.category.payment') || 'Payment',
    };

    return (
        <div>
            <PageBreadcrumb pageTitle={t("notifications.title") || "Notifications"} />

            {/* Main Card */}
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
                {/* Top Bar */}
                <div className="border-b border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                                {t('notifications.title') || 'Notifications'}
                            </h2>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {t('notifications.subtitle') || 'Stay updated with system and merchant activity.'}
                            </p>
                        </div>
                        <button
                            onClick={() => setSettingsOpen(true)}
                            className="h-10 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600"
                        >
                            {t('notifications.settings.button') || 'Settings'}
                        </button>
                    </div>
                </div>

                <NotificationSettingsModal
                    open={settingsOpen}
                    onClose={() => setSettingsOpen(false)}
                    isLoading={isSettingsLoading}
                    savingKey={savingKey}
                    data={settingsData?.data}
                    onToggleAccountTransactions={onToggleAccountTransactions}
                    onToggleMerchantKey={onToggleMerchantKey}
                    onToggleStaffKey={onToggleStaffKey}
                />

                {/* Header with Filters */}
                <div className="border-b border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Category Tabs */}
                        <div className="flex flex-wrap items-center gap-2">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => { setFilter(cat); setPage(1); }}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        filter === cat
                                            ? "bg-brand-500 text-white"
                                            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    {cat === "ALL" ? (t('notifications.category.all') || 'All') : categoryLabels[cat] || cat}
                                </button>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <StatusToggle
                                    isActive={showUnreadOnly}
                                    onToggle={() => {
                                        const next = !showUnreadOnly;
                                        setShowUnreadOnly(next);
                                        setPage(1);
                                    }}
                                    size="sm"
                                    activeLabel={t('common.on')}
                                    inactiveLabel={t('common.off')}
                                />
                                <span>{t('notifications.unreadOnly') || 'Unread only'}</span>
                            </div>
                            <button
                                onClick={handleMarkAllAsRead}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                            >
                                <FaCheckDouble className="w-3.5 h-3.5" />
                                {t('notifications.markAllRead') || 'Mark all as read'}
                            </button>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                        {total} {total === 1 ? "notification" : "notifications"}
                    </div>
                </div>

                {/* Notifications List */}
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {isLoading ? (
                        // Loading Skeleton
                        [...Array(5)].map((_, i) => (
                            <div key={i} className="p-4 sm:p-6 animate-pulse">
                                <div className="flex gap-4">
                                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-700" />
                                        <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : notifications.length === 0 ? (
                        // Empty State
                        <div className="py-16 text-center">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                                <FaBell className="w-7 h-7 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                {t("notifications.empty") || "No notifications"}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {showUnreadOnly 
                                    ? "All caught up! No unread notifications." 
                                    : "You don't have any notifications yet."}
                            </p>
                        </div>
                    ) : (
                        // Notification Items
                        notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 sm:p-6 transition-colors ${
                                    !notification.isRead 
                                        ? "bg-brand-50/50 dark:bg-brand-900/5" 
                                        : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                }`}
                            >
                                <div className="flex gap-4">
                                    {/* Icon */}
                                    <div className="relative shrink-0">
                                        <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                            <FaBell className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        </div>
                                        {!notification.isRead && (
                                            <FaCircle className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-brand-500" />
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h4 className={`text-sm font-semibold ${
                                                !notification.isRead 
                                                    ? "text-gray-900 dark:text-white" 
                                                    : "text-gray-700 dark:text-gray-300"
                                            }`}>
                                                {notification.title}
                                            </h4>
                                            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                                                {formatDateTime(notification.createdAt)}
                                            </span>
                                        </div>
                                        
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                            {notification.message}
                                        </p>
                                        
                                        <div className="flex items-center gap-3">
                                            <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                                {categoryLabels[notification.category] || notification.category}
                                            </span>
                                            
                                            {notification.actionUrl && (
                                                <Link
                                                    href={notification.actionUrl}
                                                    className="text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                                                >
                                                    {(t('notifications.viewDetails') || 'View details')} →
                                                </Link>
                                            )}
                                            
                                            {!notification.isRead && (
                                                <button
                                                    onClick={() => handleMarkAsRead(notification.id)}
                                                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                                >
                                                    <FaCheck className="w-3 h-3" />
                                                    {t('notifications.markAsRead') || 'Mark as read'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="border-t border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <FaChevronLeft className="w-3 h-3" />
                                Previous
                            </button>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                                <FaChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
