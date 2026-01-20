"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getAdminToken } from "@/lib/utils/adminAuth";
import { getAdminUser } from "@/lib/utils/adminAuth";
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
    FaChevronDown,
    FaChevronUp,
    FaTicketAlt,
    FaCalendarAlt
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
    previousPeriodEnd?: string | null;
    newPeriodEnd?: string | null;
    metadata?: Record<string, unknown> | null;
    triggeredBy: string;
    createdAt: string;
}

interface PaginationInfo {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

interface PaymentRequestItem {
    id: string;
    type: string;
    status: string;
    currency: string;
    amount: number;
    expiresAt: string | null;
    createdAt?: string;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
    'CREATED': <FaCheckCircle className="w-4 h-4" />,
    'TRIAL_EXPIRED': <FaClock className="w-4 h-4" />,
    'AUTO_SWITCHED': <FaExchangeAlt className="w-4 h-4" />,
    'SUSPENDED': <FaPause className="w-4 h-4" />,
    'REACTIVATED': <FaPlay className="w-4 h-4" />,
    'PAYMENT_SUBMITTED': <FaCreditCard className="w-4 h-4" />,
    'PAYMENT_CANCELLED': <FaBan className="w-4 h-4" />,
    'PAYMENT_RECEIVED': <FaCreditCard className="w-4 h-4" />,
    'PAYMENT_REJECTED': <FaBan className="w-4 h-4" />,
    'BALANCE_TOPUP': <FaExchangeAlt className="w-4 h-4" />,
    'PERIOD_EXTENDED': <FaClock className="w-4 h-4" />,
    'MANUAL_ADJUSTMENT': <FaExchangeAlt className="w-4 h-4" />,
    'VOUCHER_REDEEMED': <FaTicketAlt className="w-4 h-4" />,
};

const EVENT_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
    'CREATED': { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-500' },
    'TRIAL_EXPIRED': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' },
    'AUTO_SWITCHED': { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-500' },
    'SUSPENDED': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
    'REACTIVATED': { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', icon: 'text-green-500' },
    'PAYMENT_SUBMITTED': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', icon: 'text-yellow-500' },
    'PAYMENT_CANCELLED': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
    'PAYMENT_RECEIVED': { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-500' },
    'PAYMENT_REJECTED': { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
    'BALANCE_TOPUP': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', icon: 'text-indigo-500' },
    'PERIOD_EXTENDED': { bg: 'bg-sky-50 dark:bg-sky-900/20', text: 'text-sky-700 dark:text-sky-300', icon: 'text-sky-500' },
    'MANUAL_ADJUSTMENT': { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-700 dark:text-purple-300', icon: 'text-purple-500' },
    'VOUCHER_REDEEMED': { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-700 dark:text-pink-300', icon: 'text-pink-500' },
};

export default function SubscriptionHistoryPage() {
    const { t, locale } = useTranslation();
    const [events, setEvents] = useState<HistoryEvent[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo | null>(null);
    const [currency, setCurrency] = useState<string>('IDR');
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingRequest, setPendingRequest] = useState<PaymentRequestItem | null>(null);
    const [pendingRequestLoading, setPendingRequestLoading] = useState(false);
    const [pendingRequestError, setPendingRequestError] = useState<string | null>(null);
    const [isOwner, setIsOwner] = useState<boolean>(true);
    const [flowFilter, setFlowFilter] = useState<'ALL' | 'PAYMENT' | 'VOUCHER' | 'ADMIN'>('ALL');
    const [expandedFlows, setExpandedFlows] = useState<Record<string, boolean>>({});

    const getPaymentRequestStatusLabel = (status: string) => {
        const key = `subscription.paymentRequest.status.${status}`;
        const value = t(key);
        return value === key ? status : value;
    };

    const getPaymentRequestTypeLabel = (type: string) => {
        const key = `subscription.paymentRequest.type.${type}`;
        const value = t(key);
        return value === key ? type : value;
    };

    const getPaymentRequestStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200';
            case 'CONFIRMED':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
            case 'VERIFIED':
                return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200';
            case 'REJECTED':
                return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
            case 'EXPIRED':
            case 'CANCELLED':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    };

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
        const user = getAdminUser();
        const merchantRole = typeof window !== 'undefined' ? localStorage.getItem('merchantRole') : null;
        setIsOwner(user?.role === 'MERCHANT_OWNER' || merchantRole === 'OWNER');
        fetchHistory();
    }, [fetchHistory]);

    const fetchPendingRequest = useCallback(async () => {
        setPendingRequestLoading(true);
        try {
            const token = getAdminToken();
            const res = await fetch(`/api/merchant/payment-request/active`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            if (data?.success) {
                const active = data.data && (data.data.status === 'PENDING' || data.data.status === 'CONFIRMED') ? data.data : null;
                setPendingRequest(active);
                setPendingRequestError(null);
            } else {
                setPendingRequest(null);
                setPendingRequestError(data?.message || data?.error || 'Failed to load payment requests');
            }
        } catch {
            setPendingRequest(null);
            setPendingRequestError('Network error');
        } finally {
            setPendingRequestLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPendingRequest();
    }, [fetchPendingRequest]);

    const cancelPendingRequest = async () => {
        if (!pendingRequest) return;
        if (!isOwner) return;

        setPendingRequestLoading(true);
        try {
            const token = getAdminToken();
            const res = await fetch(`/api/merchant/payment-request/${pendingRequest.id}/cancel`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json().catch(() => null);
            if (!res.ok || !data?.success) {
                setPendingRequestError(data?.message || `HTTP ${res.status}`);
                return;
            }
            setPendingRequest(null);
            setPendingRequestError(null);
            fetchHistory();
        } catch {
            setPendingRequestError('Network error');
        } finally {
            setPendingRequestLoading(false);
        }
    };

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
            'PAYMENT_CANCELLED': { en: 'Payment Cancelled', id: 'Pembayaran Dibatalkan' },
            'PAYMENT_RECEIVED': { en: 'Payment Received', id: 'Pembayaran Diterima' },
            'PAYMENT_REJECTED': { en: 'Payment Rejected', id: 'Pembayaran Ditolak' },
            'BALANCE_TOPUP': { en: 'Balance Adjustment', id: 'Penyesuaian Saldo' },
            'PERIOD_EXTENDED': { en: 'Subscription Period Updated', id: 'Periode Langganan Diubah' },
            'MANUAL_ADJUSTMENT': { en: 'Manual Adjustment', id: 'Penyesuaian Manual' },
            'VOUCHER_REDEEMED': { en: 'Voucher Redeemed', id: 'Voucher Ditukar' },
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

    const getMetadata = (metadata?: Record<string, unknown> | null) => {
        if (metadata && typeof metadata === 'object') {
            return metadata as Record<string, unknown>;
        }
        return {} as Record<string, unknown>;
    };

    const parseNumber = (value: unknown) => {
        if (typeof value === 'number' && Number.isFinite(value)) return value;
        if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
        return null;
    };

    // Helper to generate a day-based key for grouping legacy payment events
    const getDayKey = (dateStr: string) => {
        const date = new Date(dateStr);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    };

    const resolveFlowKey = (event: HistoryEvent) => {
        const metadata = getMetadata(event.metadata);

        // Priority 1: Use explicit flowId if present (should be payment-{requestId})
        if (typeof metadata.flowId === 'string' && metadata.flowId.startsWith('payment-')) {
            return metadata.flowId;
        }

        // Priority 2: For payment events, group by requestId
        if (typeof metadata.requestId === 'string' && metadata.requestId.trim() !== '') {
            return `payment-${metadata.requestId}`;
        }

        // Priority 3: For voucher events
        if (typeof metadata.voucherCode === 'string') return `voucher-${metadata.voucherCode}`;

        // Priority 4: For legacy payment events without requestId, group by amount+type+date
        // This helps group PAYMENT_SUBMITTED with its corresponding PAYMENT_RECEIVED/CANCELLED/REJECTED
        const isPaymentEvent = ['PAYMENT_SUBMITTED', 'PAYMENT_CANCELLED', 'PAYMENT_RECEIVED', 'PAYMENT_REJECTED'].includes(event.eventType);
        if (isPaymentEvent) {
            const paymentType = typeof metadata.paymentType === 'string' ? metadata.paymentType : 'UNKNOWN';
            const amount = parseNumber(metadata.amount ?? metadata.fee) ?? 0;
            const currencyMeta = typeof metadata.currency === 'string' ? metadata.currency : 'IDR';
            // Use day-based grouping for legacy events (same day will group together)
            const dayKey = getDayKey(event.createdAt);
            return `payment-legacy-${paymentType}-${amount}-${currencyMeta}-${dayKey}`;
        }

        // Priority 5: Use explicit flowId for non-payment events
        if (typeof metadata.flowId === 'string') return metadata.flowId;

        return `event-${event.id}`;
    };

    const resolveFlowType = (event: HistoryEvent) => {
        const metadata = getMetadata(event.metadata);
        if (typeof metadata.flowType === 'string') return metadata.flowType;
        if (['PAYMENT_SUBMITTED', 'PAYMENT_CANCELLED', 'PAYMENT_RECEIVED', 'PAYMENT_REJECTED'].includes(event.eventType)) {
            return 'PAYMENT_VERIFICATION';
        }
        if (event.eventType === 'BALANCE_TOPUP') return 'BALANCE_ADJUSTMENT';
        if (event.eventType === 'PERIOD_EXTENDED') return 'SUBSCRIPTION_ADJUSTMENT';
        if (event.eventType === 'VOUCHER_REDEEMED') return 'VOUCHER_REDEMPTION';
        return 'SUBSCRIPTION_EVENT';
    };

    const getFlowTitle = (flowType: string) => {
        const labels: Record<string, { en: string; id: string }> = {
            'PAYMENT_VERIFICATION': { en: 'Payment Verification Flow', id: 'Alur Verifikasi Pembayaran' },
            'BALANCE_ADJUSTMENT': { en: 'Balance Adjustment', id: 'Penyesuaian Saldo' },
            'SUBSCRIPTION_ADJUSTMENT': { en: 'Subscription Period Adjustment', id: 'Penyesuaian Periode Langganan' },
            'VOUCHER_REDEMPTION': { en: 'Voucher Redemption', id: 'Penukaran Voucher' },
            'SUBSCRIPTION_EVENT': { en: 'Subscription Event', id: 'Peristiwa Langganan' },
        };
        return labels[flowType]?.[locale] || flowType;
    };

    const getFlowIcon = (flowType: string) => {
        if (flowType === 'PAYMENT_VERIFICATION') return <FaCreditCard className="w-4 h-4" />;
        if (flowType === 'VOUCHER_REDEMPTION') return <FaTicketAlt className="w-4 h-4" />;
        if (flowType === 'SUBSCRIPTION_ADJUSTMENT') return <FaCalendarAlt className="w-4 h-4" />;
        if (flowType === 'BALANCE_ADJUSTMENT') return <FaExchangeAlt className="w-4 h-4" />;
        return null;
    };

    const getTriggeredLabel = (triggeredBy: string) => {
        if (triggeredBy === 'SYSTEM') return locale === 'id' ? 'Otomatis' : 'Automatic';
        if (triggeredBy === 'ADMIN') return locale === 'id' ? 'Admin' : 'Admin';
        if (triggeredBy === 'MERCHANT') return locale === 'id' ? 'Merchant' : 'Merchant';
        return locale === 'id' ? 'Manual' : 'Manual';
    };

    const resolvePeriodRange = (event: HistoryEvent) => {
        const metadata = getMetadata(event.metadata);
        const daysDelta = parseNumber(metadata.daysDelta);
        const metadataFrom = typeof metadata.periodFrom === 'string' ? new Date(metadata.periodFrom) : null;
        const metadataTo = typeof metadata.periodTo === 'string' ? new Date(metadata.periodTo) : null;
        const previousPeriod = metadataFrom ?? (event.previousPeriodEnd ? new Date(event.previousPeriodEnd) : null);
        const newPeriod = metadataTo ?? (event.newPeriodEnd ? new Date(event.newPeriodEnd) : null);

        if (!previousPeriod && newPeriod && typeof daysDelta === 'number' && Number.isFinite(daysDelta)) {
            const derivedPrevious = new Date(newPeriod);
            derivedPrevious.setDate(derivedPrevious.getDate() - daysDelta);
            return { from: derivedPrevious, to: newPeriod };
        }

        return {
            from: previousPeriod,
            to: newPeriod,
        };
    };

    const resolveFlowSummary = (groupEvents: HistoryEvent[]) => {
        const entries = groupEvents.map((event) => ({ event, metadata: getMetadata(event.metadata) }));

        const latestEvent = groupEvents[groupEvents.length - 1];
        const amountEntry = [...entries].reverse().find(({ metadata }) => parseNumber(metadata.amount ?? metadata.fee) !== null);
        const daysEntry = [...entries].reverse().find(({ metadata }) => parseNumber(metadata.daysDelta) !== null);
        const paymentEntry = entries.find(({ metadata }) => typeof metadata.paymentType === 'string');
        const voucherEntry = entries.find(({ metadata }) => typeof metadata.voucherCode === 'string');
        const periodEntry = [...entries].reverse().find(({ metadata, event }) => (
            typeof metadata.periodFrom === 'string' ||
            typeof metadata.periodTo === 'string' ||
            event.previousPeriodEnd ||
            event.newPeriodEnd ||
            parseNumber(metadata.daysDelta) !== null
        ));

        const paymentType = paymentEntry && typeof paymentEntry.metadata.paymentType === 'string' ? paymentEntry.metadata.paymentType : null;
        const isMonthlyPaymentFlow = paymentType === 'MONTHLY_SUBSCRIPTION';
        const isDepositTopupFlow = paymentType === 'DEPOSIT_TOPUP';

        // Find balance entry - show for deposit topup, voucher redemption, and balance adjustments
        // Don't show for monthly subscription payments
        const balanceEntry = isMonthlyPaymentFlow
            ? null
            : [...groupEvents].reverse().find((event) => event.previousBalance !== null && event.newBalance !== null) || null;

        const amount = amountEntry ? parseNumber(amountEntry.metadata.amount ?? amountEntry.metadata.fee) : null;
        const metaCurrency = amountEntry && typeof amountEntry.metadata.currency === 'string' ? amountEntry.metadata.currency : currency;
        const daysDelta = daysEntry ? parseNumber(daysEntry.metadata.daysDelta) : null;
        const voucherCode = voucherEntry && typeof voucherEntry.metadata.voucherCode === 'string' ? voucherEntry.metadata.voucherCode : null;

        const periodRange = periodEntry ? resolvePeriodRange(periodEntry.event) : { from: null, to: null };
        const periodFrom = periodRange.from ? formatDate(periodRange.from.toISOString()) : null;
        const periodTo = periodRange.to ? formatDate(periodRange.to.toISOString()) : null;

        // Calculate balance change for display
        const balanceFrom = balanceEntry?.previousBalance ?? null;
        const balanceTo = balanceEntry?.newBalance ?? null;

        return {
            latestEvent,
            amount,
            metaCurrency,
            daysDelta,
            paymentType,
            voucherCode,
            periodFrom,
            periodTo,
            balanceEntry,
            balanceFrom,
            balanceTo,
            isMonthlyPaymentFlow,
        };
    };

    const groupedEvents = useMemo(() => {
        const grouped = new Map<string, { id: string; flowType: string; events: HistoryEvent[]; latestAt: string }>();
        const sortedEvents = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        for (const event of sortedEvents) {
            const groupKey = resolveFlowKey(event);
            const flowType = resolveFlowType(event);
            const existing = grouped.get(groupKey);

            if (existing) {
                existing.events.push(event);
                if (new Date(event.createdAt).getTime() > new Date(existing.latestAt).getTime()) {
                    existing.latestAt = event.createdAt;
                }
            } else {
                grouped.set(groupKey, {
                    id: groupKey,
                    flowType,
                    events: [event],
                    latestAt: event.createdAt,
                });
            }
        }

        return Array.from(grouped.values()).sort(
            (a, b) => new Date(b.latestAt).getTime() - new Date(a.latestAt).getTime()
        );
    }, [events]);

    const filteredGroups = useMemo(() => {
        if (flowFilter === 'ALL') return groupedEvents;
        return groupedEvents.filter((group) => {
            if (flowFilter === 'PAYMENT') return group.flowType === 'PAYMENT_VERIFICATION';
            if (flowFilter === 'VOUCHER') return group.flowType === 'VOUCHER_REDEMPTION';
            if (flowFilter === 'ADMIN') {
                return ['BALANCE_ADJUSTMENT', 'SUBSCRIPTION_ADJUSTMENT'].includes(group.flowType);
            }
            return true;
        });
    }, [groupedEvents, flowFilter]);

    const flowFilterOptions = [
        { key: 'ALL', label: locale === 'id' ? 'Semua' : 'All' },
        { key: 'PAYMENT', label: locale === 'id' ? 'Pembayaran' : 'Payment' },
        { key: 'VOUCHER', label: locale === 'id' ? 'Voucher' : 'Voucher' },
        { key: 'ADMIN', label: locale === 'id' ? 'Penyesuaian Admin' : 'Admin Adjustment' },
    ] as const;

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

            {(pendingRequestLoading || pendingRequest || pendingRequestError) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                            <div className="text-sm font-semibold">
                                {t('subscription.topup.pendingRequestTitle')}
                            </div>

                            {pendingRequestLoading ? (
                                <div className="mt-1 text-sm opacity-90">{locale === 'id' ? 'Memuat…' : 'Loading…'}</div>
                            ) : pendingRequest ? (
                                <div className="mt-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getPaymentRequestStatusBadge(pendingRequest.status)}`}
                                        >
                                            {getPaymentRequestStatusLabel(pendingRequest.status)}
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-gray-900/20 dark:text-amber-200">
                                            {getPaymentRequestTypeLabel(pendingRequest.type)}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid gap-2 text-sm">
                                        <div className="flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 dark:bg-gray-900/20">
                                            <span className="text-amber-900/80 dark:text-amber-200/80">{t('subscription.topup.pendingRequestAmount')}</span>
                                            <span className="font-semibold text-amber-900 dark:text-amber-200">
                                                {formatCurrency(pendingRequest.amount, pendingRequest.currency, locale)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-1 text-sm opacity-90">
                                    {locale === 'id' ? 'Tidak ada permintaan pembayaran yang pending.' : 'No pending payment requests.'}
                                </div>
                            )}

                            {pendingRequestError && (
                                <div className="mt-2 text-sm text-red-700 dark:text-red-200">{pendingRequestError}</div>
                            )}
                        </div>

                        {pendingRequest && (
                            <button
                                type="button"
                                onClick={cancelPendingRequest}
                                disabled={!isOwner || pendingRequestLoading}
                                className="shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                            >
                                {t('subscription.topup.cancelPreviousSubmission')}
                            </button>
                        )}
                    </div>

                    {!isOwner && pendingRequest && (
                        <div className="mt-2 text-xs opacity-90">
                            {locale === 'id' ? 'Hanya pemilik merchant yang dapat membatalkan.' : 'Only the merchant owner can cancel.'}
                        </div>
                    )}
                </div>
            )}

            {/* Timeline */}
            {filteredGroups.length === 0 ? (
                <div className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-8 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <FaHistory className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">
                        {locale === 'id' ? 'Belum ada riwayat langganan' : 'No subscription history yet'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                            <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                {locale === 'id' ? 'Filter' : 'Filters'}
                            </span>
                            {flowFilterOptions.map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => setFlowFilter(option.key)}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${flowFilter === option.key
                                        ? 'bg-brand-500 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {filteredGroups.map((group) => {
                        const groupEvents = group.events;
                        const summary = resolveFlowSummary(groupEvents);
                        const paymentType = summary.paymentType;
                        const voucherCode = summary.voucherCode;
                        const amount = summary.amount;
                        const daysDelta = summary.daysDelta;
                        const metaCurrency = summary.metaCurrency;
                        const latestEvent = summary.latestEvent;
                        const flowTitle = getFlowTitle(group.flowType);
                        const flowIcon = getFlowIcon(group.flowType);
                        const isExpanded = expandedFlows[group.id] ?? false;
                        const statusColors = EVENT_COLORS[latestEvent?.eventType] || EVENT_COLORS['MANUAL_ADJUSTMENT'];
                        const periodFrom = summary.periodFrom;
                        const periodTo = summary.periodTo;
                        const isMonthlyPaymentFlow = summary.isMonthlyPaymentFlow;
                        const balanceFrom = summary.balanceFrom;
                        const balanceTo = summary.balanceTo;
                        const shouldShowBalance = balanceFrom !== null && balanceTo !== null && !isMonthlyPaymentFlow;

                        return (
                            <div key={group.id} className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {flowIcon && (
                                            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                                {flowIcon}
                                            </span>
                                        )}
                                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {flowTitle}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {locale === 'id' ? `${groupEvents.length} langkah` : `${groupEvents.length} step${groupEvents.length > 1 ? 's' : ''}`}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                        <span>{formatRelativeTime(group.latestAt)}</span>
                                        <button
                                            type="button"
                                            onClick={() => setExpandedFlows((prev) => ({ ...prev, [group.id]: !isExpanded }))}
                                            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                        >
                                            {isExpanded ? (locale === 'id' ? 'Sembunyikan' : 'Hide') : (locale === 'id' ? 'Detail' : 'Details')}
                                            {isExpanded ? <FaChevronUp className="w-3 h-3" /> : <FaChevronDown className="w-3 h-3" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${statusColors.bg} ${statusColors.text}`}>
                                            {EVENT_ICONS[latestEvent?.eventType] || <FaExchangeAlt className="w-3 h-3" />}
                                            <span>{locale === 'id' ? 'Terakhir' : 'Latest'}: {getEventLabel(latestEvent?.eventType || '')}</span>
                                        </span>
                                        {paymentType && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                                <FaCreditCard className="w-3 h-3" />
                                                {getPaymentRequestTypeLabel(paymentType)}
                                            </span>
                                        )}
                                        {typeof amount === 'number' && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                                <FaCreditCard className="w-3 h-3" />
                                                {formatCurrency(amount, metaCurrency, locale)}
                                            </span>
                                        )}
                                        {typeof daysDelta === 'number' && daysDelta !== 0 && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                                <FaClock className="w-3 h-3" />
                                                {daysDelta > 0 ? '+' : ''}{daysDelta} {t('subscription.topup.days')}
                                            </span>
                                        )}
                                        {(periodFrom || periodTo) && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                                <FaCalendarAlt className="w-3 h-3" />
                                                {periodFrom && periodTo ? (
                                                    <span>{periodFrom} → {periodTo}</span>
                                                ) : (
                                                    <span>{periodFrom || periodTo}</span>
                                                )}
                                            </span>
                                        )}
                                        {voucherCode && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                                <FaTicketAlt className="w-3 h-3" />
                                                {voucherCode}
                                            </span>
                                        )}
                                        {shouldShowBalance && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                                <FaExchangeAlt className="w-3 h-3" />
                                                {locale === 'id' ? 'Saldo' : 'Balance'}: {formatBalance(balanceFrom)} → {formatBalance(balanceTo)}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="mt-4 space-y-3">
                                    {groupEvents.map((event) => {
                                        const colors = EVENT_COLORS[event.eventType] || EVENT_COLORS['MANUAL_ADJUSTMENT'];
                                        const periodRange = resolvePeriodRange(event);
                                        const periodFrom = periodRange.from ? formatDate(periodRange.from.toISOString()) : null;
                                        const periodTo = periodRange.to ? formatDate(periodRange.to.toISOString()) : null;

                                        return (
                                            <div key={event.id} className="flex gap-3">
                                                <div className={`mt-0.5 w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center shrink-0`}>
                                                    <span className={colors.icon}>
                                                        {EVENT_ICONS[event.eventType] || <FaExchangeAlt className="w-4 h-4" />}
                                                    </span>
                                                </div>

                                                <div className="flex-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 p-3">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                                                    {getEventLabel(event.eventType)}
                                                                </span>
                                                                <span className="text-xs text-gray-400">
                                                                    {getTriggeredLabel(event.triggeredBy)}
                                                                </span>
                                                            </div>

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

                                                            {event.reason && (
                                                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                                                    {event.reason}
                                                                </p>
                                                            )}

                                                            {(event.previousBalance !== null || event.newBalance !== null) && !isMonthlyPaymentFlow && (
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

                                                            {(periodFrom || periodTo) && (
                                                                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                                    {locale === 'id' ? 'Periode: ' : 'Period: '}
                                                                    {periodFrom && periodTo ? (
                                                                        <span>{periodFrom} → <span className="font-medium">{periodTo}</span></span>
                                                                    ) : (
                                                                        <span className="font-medium">{periodFrom || periodTo}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                                )}
                            </div>
                        );
                    })}

                    {pagination?.hasMore && (
                        <div className="mt-2 text-center">
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
