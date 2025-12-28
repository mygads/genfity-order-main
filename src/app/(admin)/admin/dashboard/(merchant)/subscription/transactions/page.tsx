"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useSWRWithAuth } from "@/hooks/useSWRWithAuth";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { FaDownload, FaSearch, FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa";

interface TransactionData {
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string | null;
    createdAt: string;
}

interface BalanceInfo {
    balance: number;
    currency: string;
    lastTopupAt: string | null;
    isLow: boolean;
    orderFee: number;
    estimatedOrders: number;
}

interface PaginationData {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

interface ApiResponse<T> {
    success: boolean;
    data: T;
}

type FilterType = 'all' | 'DEPOSIT' | 'ORDER_FEE' | 'SUBSCRIPTION' | 'ADJUSTMENT' | 'REFUND';

/**
 * Transaction History Page
 * 
 * Shows all subscription transactions with:
 * - Pagination
 * - Date range filtering
 * - Type filtering
 * - Search
 * - Export to CSV
 * 
 * Supports dual language (EN/ID)
 */
export default function TransactionsPage() {
    const { t, locale } = useTranslation();
    
    // Filter states
    const [filterType, setFilterType] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 20;

    // Build API URL with filters
    const buildApiUrl = useCallback(() => {
        const params = new URLSearchParams();
        params.set('limit', pageSize.toString());
        params.set('offset', ((currentPage - 1) * pageSize).toString());
        
        if (filterType !== 'all') {
            params.set('type', filterType);
        }
        if (startDate) {
            params.set('startDate', startDate);
        }
        if (endDate) {
            params.set('endDate', endDate);
        }
        if (searchQuery.trim()) {
            params.set('search', searchQuery.trim());
        }
        
        return `/api/merchant/balance/transactions?${params.toString()}`;
    }, [currentPage, filterType, startDate, endDate, searchQuery]);

    // Fetch balance info with real-time updates (10 second polling)
    const {
        data: balanceResponse,
    } = useSWRWithAuth<ApiResponse<BalanceInfo>>('/api/merchant/balance', {
        refreshInterval: 10000,
    });

    // Fetch transactions with filters and polling
    const {
        data: transactionsResponse,
        isLoading,
        error,
    } = useSWRWithAuth<ApiResponse<{ transactions: TransactionData[]; pagination: PaginationData }>>(
        buildApiUrl(),
        { refreshInterval: 30000 }
    );

    const balanceInfo = balanceResponse?.data;
    const currency = balanceInfo?.currency || 'IDR';
    const transactions = transactionsResponse?.data?.transactions || [];
    const pagination = transactionsResponse?.data?.pagination;
    const totalPages = pagination ? Math.ceil(pagination.total / pageSize) : 1;

    // Handle filter changes - reset to page 1
    const handleFilterChange = (newType: FilterType) => {
        setFilterType(newType);
        setCurrentPage(1);
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setCurrentPage(1);
    };

    const handleDateChange = (type: 'start' | 'end', value: string) => {
        if (type === 'start') {
            setStartDate(value);
        } else {
            setEndDate(value);
        }
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilterType('all');
        setSearchQuery('');
        setStartDate('');
        setEndDate('');
        setCurrentPage(1);
    };

    const hasActiveFilters = filterType !== 'all' || searchQuery || startDate || endDate;

    // Export handler
    const handleExport = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) return;

            const params = new URLSearchParams();
            if (filterType !== 'all') {
                params.set('type', filterType);
            }
            if (startDate) {
                params.set('startDate', startDate);
            }
            if (endDate) {
                params.set('endDate', endDate);
            }

            const response = await fetch(`/api/merchant/balance/transactions/export?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error('Export failed');
            }

            // Get filename from header or generate one
            const contentDisposition = response.headers.get('Content-Disposition');
            let filename = 'transactions.csv';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }

            // Download file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Export error:', err);
            alert(t('subscription.history.exportError') || 'Failed to export transactions');
        }
    };

    const formatCurrency = (amount: number) => {
        if (currency === 'AUD') {
            return `A$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;
        }
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const formatDateTime = (dateStr: string) => {
        const dateLocale = locale === 'id' ? 'id-ID' : 'en-AU';
        return new Date(dateStr).toLocaleString(dateLocale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTransactionTypeLabel = (type: string) => {
        switch (type) {
            case 'DEPOSIT': return t('subscription.transactions.type.deposit');
            case 'ORDER_FEE': return t('subscription.transactions.type.orderFee');
            case 'SUBSCRIPTION': return t('subscription.transactions.type.subscription');
            case 'REFUND': return t('subscription.transactions.type.refund');
            case 'ADJUSTMENT': return t('subscription.transactions.type.adjustment');
            default: return type;
        }
    };

    const getTransactionIcon = (amount: number) => {
        const isPositive = amount >= 0;
        const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
        const bgClass = isPositive 
            ? 'bg-green-100 dark:bg-green-900/30' 
            : 'bg-red-100 dark:bg-red-900/30';

        return (
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bgClass}`}>
                <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isPositive ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    )}
                </svg>
            </div>
        );
    };

    const filterTabs: { key: FilterType; label: string }[] = [
        { key: 'all', label: t('subscription.history.filter.all') },
        { key: 'DEPOSIT', label: t('subscription.history.filter.deposit') },
        { key: 'ORDER_FEE', label: t('subscription.history.filter.orderFee') },
        { key: 'SUBSCRIPTION', label: t('subscription.history.filter.subscription') },
    ];

    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6" />
                <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 p-6">
                    <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-6" />
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex min-h-100 items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                        {t('subscription.failedToLoad')}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                    >
                        {t('subscription.tryAgain')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <PageBreadcrumb pageTitle={t('subscription.history.pageTitle')} />

            {/* Header with Balance and Export */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-gray-500 dark:text-gray-400">
                        {t('subscription.history.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {balanceInfo && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {t('subscription.balance.title')}:
                            </span>
                            <span className="font-bold text-gray-900 dark:text-white">
                                {formatCurrency(balanceInfo.balance)}
                            </span>
                        </div>
                    )}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                    >
                        <FaDownload className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('subscription.history.export') || 'Export'}</span>
                    </button>
                </div>
            </div>

            {/* Main Card */}
            <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
                {/* Search and Date Filters */}
                <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                placeholder={t('subscription.history.searchPlaceholder') || 'Search transactions...'}
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                    focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>
                        
                        {/* Date Range */}
                        <div className="flex flex-col sm:flex-row gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => handleDateChange('start', e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                    focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                            <span className="self-center text-gray-500 hidden sm:block">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => handleDateChange('end', e.target.value)}
                                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                                    bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                    focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            />
                        </div>

                        {/* Clear Filters */}
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 
                                    text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <FaTimes className="w-3 h-3" />
                                {t('subscription.history.clearFilters') || 'Clear'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="border-b border-gray-200 dark:border-gray-700 px-4 pt-4">
                    <div className="flex gap-2 overflow-x-auto pb-4">
                        {filterTabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => handleFilterChange(tab.key)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                                    ${filterType === tab.key
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Pagination Info */}
                {pagination && pagination.total > 0 && (
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t('subscription.history.showing') || 'Showing'} {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} {t('subscription.history.of') || 'of'} {pagination.total} {t('subscription.history.transactions') || 'transactions'}
                        </p>
                    </div>
                )}

                {/* Transactions List */}
                <div className="p-4">
                    {transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                    />
                                </svg>
                            </div>
                            <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                                {hasActiveFilters 
                                    ? (t('subscription.history.noMatchingTransactions') || 'No matching transactions')
                                    : t('subscription.history.noTransactions')
                                }
                            </p>
                            <p className="text-gray-500 dark:text-gray-400">
                                {hasActiveFilters 
                                    ? (t('subscription.history.tryDifferentFilters') || 'Try adjusting your search or filters')
                                    : t('subscription.history.noTransactionsDesc')
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50
                                        hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        {getTransactionIcon(tx.amount)}
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {getTransactionTypeLabel(tx.type)}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {formatDateTime(tx.createdAt)}
                                            </p>
                                            {tx.description && (
                                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                    {tx.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-bold text-lg ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.amount >= 0 ? '+' : ''}{formatCurrency(tx.amount)}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {t('subscription.history.balanceAfter')}: {formatCurrency(tx.balanceAfter)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pagination Controls */}
                {pagination && totalPages > 1 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-4">
                        <div className="flex items-center justify-between">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                                    text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 
                                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <FaChevronLeft className="w-3 h-3" />
                                {t('subscription.history.previous') || 'Previous'}
                            </button>
                            
                            <div className="flex items-center gap-2">
                                <span className="text-gray-600 dark:text-gray-400">
                                    {t('subscription.history.page') || 'Page'} {currentPage} / {totalPages}
                                </span>
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage >= totalPages}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                                    text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 
                                    disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {t('subscription.history.next') || 'Next'}
                                <FaChevronRight className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Back Link */}
            <div className="mt-6">
                <Link
                    href="/admin/dashboard/subscription"
                    className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    {t('subscription.confirm.backToSubscription')}
                </Link>
            </div>
        </div>
    );
}
