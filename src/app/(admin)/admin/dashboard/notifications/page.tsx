"use client";

import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import Link from "next/link";
import IconToggle from "@/components/ui/IconToggle";
import { useToast } from "@/context/ToastContext";
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

type MerchantTransactionToggleKey = 'newOrder' | 'stockOut' | 'lowStock' | 'payment' | 'subscription';

interface NotificationSettingsResponse {
    success: boolean;
    data: {
        settings: {
            accountTransactions: boolean;
            merchant: Record<MerchantTransactionToggleKey, boolean>;
        };
        availability: {
            merchant: Record<MerchantTransactionToggleKey, boolean>;
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
                {/* Notification Settings */}
                <div className="border-b border-gray-200 dark:border-gray-800 p-4 sm:p-6">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {t('notifications.settings.title') || 'Notification Settings'}
                        </h2>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            {t('notifications.settings.subtitle') || 'Control which notifications you receive.'}
                        </p>
                    </div>

                    {isSettingsLoading ? (
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 animate-pulse">
                            <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
                            <div className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800" />
                        </div>
                    ) : settingsData?.data ? (
                        <div className="mt-4 grid gap-4">
                            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                                <IconToggle
                                    checked={settingsData.data.settings.accountTransactions}
                                    onChange={onToggleAccountTransactions}
                                    disabled={savingKey === 'accountTransactions'}
                                    label={t('notifications.settings.account.title') || 'Account transaction notifications'}
                                    description={t('notifications.settings.account.desc') || 'Profile and security updates for your account.'}
                                />
                            </div>

                            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
                                <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {t('notifications.settings.merchant.title') || 'Merchant transaction notifications'}
                                </div>
                                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                    {t('notifications.settings.merchant.desc') || 'Order, stock, payment, and subscription updates for your store.'}
                                </div>

                                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {settingsData.data.availability.merchant.newOrder ? (
                                        <IconToggle
                                            checked={settingsData.data.settings.merchant.newOrder}
                                            onChange={(v) => onToggleMerchantKey('newOrder', v)}
                                            disabled={savingKey === 'merchant:newOrder'}
                                            size="sm"
                                            label={t('notifications.settings.merchant.newOrder') || 'New orders'}
                                            description={t('notifications.settings.merchant.newOrderDesc') || 'Get notified when a new order arrives.'}
                                        />
                                    ) : null}

                                    {settingsData.data.availability.merchant.stockOut ? (
                                        <IconToggle
                                            checked={settingsData.data.settings.merchant.stockOut}
                                            onChange={(v) => onToggleMerchantKey('stockOut', v)}
                                            disabled={savingKey === 'merchant:stockOut'}
                                            size="sm"
                                            label={t('notifications.settings.merchant.stockOut') || 'Out of stock'}
                                            description={t('notifications.settings.merchant.stockOutDesc') || 'Items that become out of stock.'}
                                        />
                                    ) : null}

                                    {settingsData.data.availability.merchant.lowStock ? (
                                        <IconToggle
                                            checked={settingsData.data.settings.merchant.lowStock}
                                            onChange={(v) => onToggleMerchantKey('lowStock', v)}
                                            disabled={savingKey === 'merchant:lowStock'}
                                            size="sm"
                                            label={t('notifications.settings.merchant.lowStock') || 'Low stock'}
                                            description={t('notifications.settings.merchant.lowStockDesc') || 'Items that are running low.'}
                                        />
                                    ) : null}

                                    {settingsData.data.availability.merchant.payment ? (
                                        <IconToggle
                                            checked={settingsData.data.settings.merchant.payment}
                                            onChange={(v) => onToggleMerchantKey('payment', v)}
                                            disabled={savingKey === 'merchant:payment'}
                                            size="sm"
                                            label={t('notifications.settings.merchant.payment') || 'Payments'}
                                            description={t('notifications.settings.merchant.paymentDesc') || 'Payment status updates.'}
                                        />
                                    ) : null}

                                    {settingsData.data.availability.merchant.subscription ? (
                                        <IconToggle
                                            checked={settingsData.data.settings.merchant.subscription}
                                            onChange={(v) => onToggleMerchantKey('subscription', v)}
                                            disabled={savingKey === 'merchant:subscription'}
                                            size="sm"
                                            label={t('notifications.settings.merchant.subscription') || 'Subscription'}
                                            description={t('notifications.settings.merchant.subscriptionDesc') || 'Trial and subscription reminders.'}
                                        />
                                    ) : null}

                                    {!Object.values(settingsData.data.availability.merchant).some(Boolean) ? (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('notifications.settings.merchant.none') || 'No merchant notification toggles available for your role.'}
                                        </div>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                            {t('notifications.settings.loadFailed') || 'Failed to load notification settings.'}
                        </div>
                    )}
                </div>

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
                                            ? "bg-orange-500 text-white"
                                            : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                                    }`}
                                >
                                    {cat === "ALL" ? (t('notifications.category.all') || 'All') : categoryLabels[cat] || cat}
                                </button>
                            ))}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={showUnreadOnly}
                                    onChange={(e) => { setShowUnreadOnly(e.target.checked); setPage(1); }}
                                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                                />
                                {t('notifications.unreadOnly') || 'Unread only'}
                            </label>
                            <button
                                onClick={handleMarkAllAsRead}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
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
                                        ? "bg-orange-50/50 dark:bg-orange-900/5" 
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
                                            <FaCircle className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-orange-500" />
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
                                                    className="text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
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
