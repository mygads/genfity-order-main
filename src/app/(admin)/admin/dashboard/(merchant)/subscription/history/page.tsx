"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getAdminToken } from "@/lib/utils/adminAuth";
import { formatCurrency } from "@/lib/utils/format";
import { 
    FaHistory, 
    FaArrowLeft, 
    FaExchangeAlt, 
    FaPause, 
    FaPlay, 
    FaCreditCard, 
    FaBan,
    FaClock,
    FaCheckCircle,
    FaChevronDown
} from "react-icons/fa";

interface HistoryEvent {
    id: string;
    eventType: string;
    previousType: string | null;
    previousStatus: string | null;
    newType: string | null;
    newStatus: string | null;
    previousBalance: number | null;
    newBalance: number | null;
    reason: string | null;
    triggeredBy: string;
    createdAt: string;
}

interface PaginationInfo {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
    'CREATED': <FaCheckCircle className="w-4 h-4" />,
    'TRIAL_EXPIRED': <FaClock className="w-4 h-4" />,
    'AUTO_SWITCHED': <FaExchangeAlt className="w-4 h-4" />,
    'SUSPENDED': <FaPause className="w-4 h-4" />,
    'REACTIVATED': <FaPlay className="w-4 h-4" />,
    'PAYMENT_SUBMITTED': <FaCreditCard className="w-4 h-4" />,
    'PAYMENT_RECEIVED': <FaCreditCard className="w-4 h-4" />,
    'PAYMENT_REJECTED': <FaBan className="w-4 h-4" />,
    'ORDER_FEE_DEDUCTED': <FaCreditCard className="w-4 h-4" />,
    'MANUAL_ADJUSTMENT': <FaExchangeAlt className="w-4 h-4" />,
};

const EVENT_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
    'CREATED': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-500' },
    'TRIAL_EXPIRED': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' },
    'AUTO_SWITCHED': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' },
    'SUSPENDED': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
    'REACTIVATED': { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', icon: 'text-green-500' },
    'PAYMENT_SUBMITTED': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', icon: 'text-yellow-500' },
    'PAYMENT_RECEIVED': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500' },
    'PAYMENT_REJECTED': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
    'ORDER_FEE_DEDUCTED': { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', icon: 'text-gray-500' },
    'MANUAL_ADJUSTMENT': { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', icon: 'text-purple-500' },
};

export default function SubscriptionHistoryPage() {
    const { t, locale } = useTranslation();
    const [events, setEvents] = useState<HistoryEvent[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [currency, setCurrency] = useState<string>('IDR');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = useCallback(async (offset: number = 0) => {
        const isInitial = offset === 0;
        if (isInitial) setLoading(true);
        else setLoadingMore(true);
        
        try {
            const token = getAdminToken();
            const res = await fetch(`/api/merchant/subscription/history?limit=20&offset=${offset}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            
            if (data.success) {
                if (isInitial) {
                    setEvents(data.data.history);
                } else {
                    setEvents(prev => [...prev, ...data.data.history]);
                }
                setPagination(data.data.pagination);
                if (data.data.currency) setCurrency(data.data.currency);
                setError(null);
            } else {
                setError(data.error || 'Failed to load history');
            }
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const loadMore = () => {
        if (pagination?.hasMore && !loadingMore) {
            fetchHistory(pagination.offset + pagination.limit);
        }
    };

    const getEventLabel = (eventType: string): string => {
        const labels: Record<string, { en: string; id: string }> = {
            'CREATED': { en: 'Subscription Created', id: 'Langganan Dibuat' },
            'TRIAL_EXPIRED': { en: 'Trial Expired', id: 'Trial Berakhir' },
            'AUTO_SWITCHED': { en: 'Plan Changed', id: 'Paket Diubah' },
            'SUSPENDED': { en: 'Account Suspended', id: 'Akun Ditangguhkan' },
            'REACTIVATED': { en: 'Account Reactivated', id: 'Akun Diaktifkan Kembali' },
            'PAYMENT_SUBMITTED': { en: 'Payment Submitted', id: 'Pembayaran Diajukan' },
            'PAYMENT_RECEIVED': { en: 'Payment Received', id: 'Pembayaran Diterima' },
            'PAYMENT_REJECTED': { en: 'Payment Rejected', id: 'Pembayaran Ditolak' },
            'ORDER_FEE_DEDUCTED': { en: 'Order Fee Charged', id: 'Biaya Pesanan Dibebankan' },
            'MANUAL_ADJUSTMENT': { en: 'Manual Adjustment', id: 'Penyesuaian Manual' },
        };
        return labels[eventType]?.[locale] || eventType;
    };

    const formatDate = (dateStr: string) => {
        const dateLocale = locale === 'id' ? 'id-ID' : 'en-AU';
        return new Date(dateStr).toLocaleDateString(dateLocale, {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatRelativeTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 7) return formatDate(dateStr);
        if (days > 0) return locale === 'id' ? `${days} hari lalu` : `${days}d ago`;
        if (hours > 0) return locale === 'id' ? `${hours} jam lalu` : `${hours}h ago`;
        if (minutes > 0) return locale === 'id' ? `${minutes} menit lalu` : `${minutes}m ago`;
        return locale === 'id' ? 'Baru saja' : 'Just now';
    };

    const getTypeLabel = (type: string | null): string => {
        if (!type) return '-';
        const labels: Record<string, { en: string; id: string }> = {
            'TRIAL': { en: 'Trial', id: 'Trial' },
            'DEPOSIT': { en: 'Deposit', id: 'Deposit' },
            'MONTHLY': { en: 'Monthly', id: 'Bulanan' },
        };
        return labels[type]?.[locale] || type;
    };

    const formatBalance = (amount: number | null) => {
        if (amount === null || amount === undefined) return '-';
        return formatCurrency(amount, currency, locale);
    };

    if (loading) {
        return (
            <div className="space-y-4">
                <PageBreadcrumb pageTitle={locale === 'id' ? 'Riwayat Langganan' : 'Subscription History'} />
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-4">
                <PageBreadcrumb pageTitle={locale === 'id' ? 'Riwayat Langganan' : 'Subscription History'} />
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6 text-center">
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                    <button 
                        onClick={() => fetchHistory()}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                        {locale === 'id' ? 'Coba Lagi' : 'Try Again'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <PageBreadcrumb pageTitle={locale === 'id' ? 'Riwayat Langganan' : 'Subscription History'} />

            {/* Header */}
            <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/admin/dashboard/subscription"
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <FaArrowLeft className="w-4 h-4 text-gray-500" />
                        </Link>
                        <div>
                            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                                {locale === 'id' ? 'Riwayat Langganan' : 'Subscription History'}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {locale === 'id' 
                                    ? 'Timeline semua perubahan langganan Anda'
                                    : 'Timeline of all your subscription changes'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <FaHistory className="w-4 h-4" />
                        <span>{pagination?.total || 0} {locale === 'id' ? 'event' : 'events'}</span>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            {events.length === 0 ? (
                <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <FaHistory className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                        {locale === 'id' ? 'Belum ada riwayat langganan' : 'No subscription history yet'}
                    </p>
                </div>
            ) : (
                <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                    
                    <div className="space-y-4">
                        {events.map((event, index) => {
                            const colors = EVENT_COLORS[event.eventType] || EVENT_COLORS['MANUAL_ADJUSTMENT'];
                            return (
                                <div key={event.id} className="relative flex gap-4">
                                    {/* Timeline Dot */}
                                    <div className={`relative z-10 w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center shrink-0`}>
                                        <span className={colors.icon}>
                                            {EVENT_ICONS[event.eventType] || <FaExchangeAlt className="w-4 h-4" />}
                                        </span>
                                    </div>

                                    {/* Event Card */}
                                    <div className="flex-1 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 pb-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                                        {getEventLabel(event.eventType)}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {event.triggeredBy === 'SYSTEM' 
                                                            ? (locale === 'id' ? 'Otomatis' : 'Automatic')
                                                            : event.triggeredBy === 'ADMIN'
                                                                ? (locale === 'id' ? 'Admin' : 'Admin')
                                                                : (locale === 'id' ? 'Manual' : 'Manual')}
                                                    </span>
                                                </div>
                                                
                                                {/* Change Details */}
                                                {(event.previousType || event.newType) && (
                                                    <div className="mt-2 flex items-center gap-2 text-sm">
                                                        {event.previousType && (
                                                            <span className="text-gray-500">{getTypeLabel(event.previousType)}</span>
                                                        )}
                                                        {event.previousType && event.newType && (
                                                            <span className="text-gray-400">→</span>
                                                        )}
                                                        {event.newType && (
                                                            <span className="font-medium text-gray-900 dark:text-white">{getTypeLabel(event.newType)}</span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Reason */}
                                                {event.reason && (
                                                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                        {event.reason}
                                                    </p>
                                                )}

                                                {/* Balance Change */}
                                                {(event.previousBalance !== null || event.newBalance !== null) && (
                                                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                       {locale === 'id' ? 'Saldo: ' : 'Balance: '} 
                                                       {event.previousBalance !== null && (
                                                           <span>{formatBalance(event.previousBalance)}</span>
                                                        )}
                                                        {event.previousBalance !== null && event.newBalance !== null && (
                                                            <span> → </span>
                                                        )}
                                                        {event.newBalance !== null && (
                                                           <span className="font-medium">{formatBalance(event.newBalance)}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Time */}
                                            <div className="text-right shrink-0">
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {formatRelativeTime(event.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Load More */}
                    {pagination?.hasMore && (
                        <div className="mt-6 text-center">
                            <button
                                onClick={loadMore}
                                disabled={loadingMore}
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            >
                                {loadingMore ? (
                                    <span className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
                                ) : (
                                    <FaChevronDown className="w-4 h-4" />
                                )}
                                {locale === 'id' ? 'Muat Lebih Banyak' : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
