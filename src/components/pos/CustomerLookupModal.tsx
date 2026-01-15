/**
 * Customer Lookup Modal
 * 
 * Provides a searchable list of recent customers for quick selection in POS.
 * Features:
 * - Recent customers from localStorage
 * - Search by name, phone, email
 * - Quick select to populate customer info
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FaTimes, FaSearch, FaUser, FaPhone, FaEnvelope, FaClock, FaShoppingBag } from 'react-icons/fa';
import { getAdminToken } from '@/lib/utils/adminAuth';
import { formatCurrency } from '@/lib/utils/format';

// Types
interface CustomerInfo {
    name?: string;
    phone?: string;
    email?: string;
}

interface RecentCustomer extends CustomerInfo {
    id?: string;
    lastUsedAt: string;
    orderCount?: number;
    totalSpent?: number;
}

interface DbCustomerResult {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    orderCount: number;
    totalSpent: number;
    lastOrderAt: string | null;
}

interface DbCustomerSearchResponse {
    success?: boolean;
    message?: string;
    data?: DbCustomerResult[];
    pagination?: {
        take: number;
        cursor: string | null;
        nextCursor: string | null;
        hasMore: boolean;
    };
}

interface CustomerLookupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (customer: CustomerInfo) => void;
    currency?: string;
}

// LocalStorage key
const RECENT_CUSTOMERS_KEY = 'pos_recent_customers';
const MAX_RECENT_CUSTOMERS = 20;

// Helper to get recent customers from localStorage
export const getRecentCustomers = (): RecentCustomer[] => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(RECENT_CUSTOMERS_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch {
        return [];
    }
};

// Helper to save a customer to recent list
export const saveRecentCustomer = (customer: CustomerInfo): void => {
    if (typeof window === 'undefined') return;
    if (!customer.name && !customer.phone && !customer.email) return;

    try {
        const existing = getRecentCustomers();

        // Check if customer exists (by phone or email)
        const existingIndex = existing.findIndex(
            c => (customer.phone && c.phone === customer.phone) ||
                (customer.email && c.email === customer.email)
        );

        const newCustomer: RecentCustomer = {
            ...customer,
            lastUsedAt: new Date().toISOString(),
            orderCount: existingIndex >= 0 ? (existing[existingIndex].orderCount || 0) + 1 : 1,
        };

        // Remove existing if found
        if (existingIndex >= 0) {
            existing.splice(existingIndex, 1);
        }

        // Add to front of list
        const updated = [newCustomer, ...existing].slice(0, MAX_RECENT_CUSTOMERS);
        localStorage.setItem(RECENT_CUSTOMERS_KEY, JSON.stringify(updated));
    } catch (error) {
        console.error('[CustomerLookup] Error saving recent customer:', error);
    }
};

// Component
export const CustomerLookupModal: React.FC<CustomerLookupModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    currency = 'AUD',
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [recentCustomers, setRecentCustomers] = useState<RecentCustomer[]>([]);
    const [dbResults, setDbResults] = useState<DbCustomerResult[]>([]);
    const [isDbSearching, setIsDbSearching] = useState(false);
    const [dbError, setDbError] = useState<string | null>(null);
    const [dbNextCursor, setDbNextCursor] = useState<string | null>(null);
    const [dbHasMore, setDbHasMore] = useState(false);

    // Load recent customers on open
    useEffect(() => {
        if (isOpen) {
            setRecentCustomers(getRecentCustomers());
            setSearchQuery('');
            setDbResults([]);
            setDbError(null);
            setIsDbSearching(false);
            setDbNextCursor(null);
            setDbHasMore(false);
        }
    }, [isOpen]);

    const receiptLocale = currency === 'IDR' ? 'id' : 'en';

    const formatLastOrderAt = useCallback(
        (dateStr: string | null): string => {
            if (!dateStr) return receiptLocale === 'id' ? 'Belum ada' : 'N/A';
            const date = new Date(dateStr);
            const intlLocale = receiptLocale === 'id' ? 'id-ID' : 'en-AU';
            return new Intl.DateTimeFormat(intlLocale, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            }).format(date);
        },
        [receiptLocale]
    );

    const fetchDbCustomers = useCallback(async (params: { query: string; cursor: string | null; append: boolean }) => {
        const token = getAdminToken();
        if (!token) {
            setDbError('Not authenticated');
            setDbResults([]);
            setDbHasMore(false);
            setDbNextCursor(null);
            setIsDbSearching(false);
            return;
        }

        setIsDbSearching(true);
        setDbError(null);

        try {
            const cursorQuery = params.cursor ? `&cursor=${encodeURIComponent(params.cursor)}` : '';
            const res = await fetch(
                `/api/merchant/customers/search?q=${encodeURIComponent(params.query)}&take=20${cursorQuery}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error('Invalid response');
            }

            const json = (await res.json()) as DbCustomerSearchResponse;
            if (!res.ok || !json.success) {
                throw new Error(json.message || 'Failed to search customers');
            }

            const newItems = Array.isArray(json.data) ? json.data : [];

            setDbResults((prev) => {
                if (!params.append) return newItems;
                const seen = new Set(prev.map((p) => p.id));
                const merged = [...prev];
                for (const item of newItems) {
                    if (!seen.has(item.id)) merged.push(item);
                }
                return merged;
            });

            const nextCursor = json.pagination?.nextCursor ?? null;
            const hasMore = json.pagination?.hasMore ?? false;
            setDbNextCursor(nextCursor);
            setDbHasMore(hasMore);
        } catch (err) {
            console.error('[CustomerLookup] DB search error:', err);
            setDbError('Failed to search customers');
            setDbResults([]);
            setDbHasMore(false);
            setDbNextCursor(null);
        } finally {
            setIsDbSearching(false);
        }
    }, []);

    // Search database customers for this merchant (includes online/self orders)
    useEffect(() => {
        if (!isOpen) return;

        const query = searchQuery.trim();
        if (!query) {
            setDbResults([]);
            setDbError(null);
            setIsDbSearching(false);
            setDbNextCursor(null);
            setDbHasMore(false);
            return;
        }

        const timeout = window.setTimeout(() => {
            setDbResults([]);
            setDbNextCursor(null);
            setDbHasMore(false);
            void fetchDbCustomers({ query, cursor: null, append: false });
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [fetchDbCustomers, isOpen, searchQuery]);

    const handleLoadMoreDb = useCallback(() => {
        const query = searchQuery.trim();
        if (!query || isDbSearching || !dbHasMore) return;
        void fetchDbCustomers({ query, cursor: dbNextCursor, append: true });
    }, [dbHasMore, dbNextCursor, fetchDbCustomers, isDbSearching, searchQuery]);

    // Filter customers by search query
    const filteredCustomers = useMemo(() => {
        if (!searchQuery.trim()) return recentCustomers;

        const query = searchQuery.toLowerCase();
        return recentCustomers.filter(
            c => c.name?.toLowerCase().includes(query) ||
                c.phone?.toLowerCase().includes(query) ||
                c.email?.toLowerCase().includes(query)
        );
    }, [recentCustomers, searchQuery]);

    // Handle customer selection
    const handleSelect = useCallback((customer: RecentCustomer) => {
        onSelect({
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
        });
        saveRecentCustomer({
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
        });
        onClose();
    }, [onSelect, onClose]);

    const handleSelectDb = useCallback((customer: DbCustomerResult) => {
        onSelect({
            name: customer.name,
            phone: customer.phone || undefined,
            email: customer.email,
        });
        saveRecentCustomer({
            name: customer.name,
            phone: customer.phone || undefined,
            email: customer.email,
        });
        onClose();
    }, [onSelect, onClose]);

    // Format relative time
    const formatRelativeTime = (dateStr: string): string => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const isDirty = searchQuery.trim().length > 0;

    useEffect(() => {
        if (!isOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (isDirty) return;
            onClose();
        };

        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose, isDirty]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onMouseDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (isDirty) return;
                    onClose();
                }}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md mx-4 max-h-[80vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                            <FaUser className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Customer Lookup
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Select or search recent customers
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
                    >
                        <FaTimes className="w-4 h-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, phone, or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full h-10 pl-10 pr-4 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500"
                        />
                    </div>
                </div>

                {/* Customer List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {searchQuery.trim() ? (
                        <>
                            <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center justify-between">
                                <span>Database Customers</span>
                                {isDbSearching && <span className="text-[11px]">Searching…</span>}
                            </div>

                            {dbError ? (
                                <div className="py-10 text-center">
                                    <p className="text-sm text-red-500">{dbError}</p>
                                </div>
                            ) : dbResults.length === 0 && !isDbSearching ? (
                                <div className="py-10 text-center">
                                    <FaUser className="mx-auto w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        No customers found
                                    </p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        Try a different search term
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {dbResults.map((customer) => (
                                        <button
                                            key={customer.id}
                                            onClick={() => handleSelectDb(customer)}
                                            className="w-full flex items-start gap-3 p-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                                        >
                                            <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                <FaUser className="w-4 h-4" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                                    {customer.name}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {customer.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <FaPhone className="w-3 h-3" />
                                                            {customer.phone}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1 max-w-[150px] truncate">
                                                        <FaEnvelope className="w-3 h-3" />
                                                        {customer.email}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <FaShoppingBag className="w-3 h-3" />
                                                        {customer.orderCount} orders
                                                    </span>
                                                    <span className="font-medium text-gray-600 dark:text-gray-300">
                                                        {formatCurrency(customer.totalSpent, currency, receiptLocale)}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <FaClock className="w-3 h-3" />
                                                        {formatLastOrderAt(customer.lastOrderAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {dbHasMore && !dbError && (
                                <div className="px-3 py-2">
                                    <button
                                        onClick={handleLoadMoreDb}
                                        disabled={isDbSearching}
                                        className="w-full h-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                                    >
                                        {isDbSearching ? 'Loading…' : 'Load more'}
                                    </button>
                                </div>
                            )}

                            <div className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                Recent (this device)
                            </div>

                            {filteredCustomers.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No recent customers</p>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    {filteredCustomers.map((customer, index) => (
                                        <button
                                            key={`${customer.phone || customer.email || index}`}
                                            onClick={() => handleSelect(customer)}
                                            className="w-full flex items-start gap-3 p-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                                        >
                                            <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                                <FaUser className="w-4 h-4" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-gray-900 dark:text-white truncate">
                                                    {customer.name || 'Guest'}
                                                </p>
                                                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                    {customer.phone && (
                                                        <span className="flex items-center gap-1">
                                                            <FaPhone className="w-3 h-3" />
                                                            {customer.phone}
                                                        </span>
                                                    )}
                                                    {customer.email && (
                                                        <span className="flex items-center gap-1 max-w-[150px] truncate">
                                                            <FaEnvelope className="w-3 h-3" />
                                                            {customer.email}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                                                    {customer.orderCount && (
                                                        <span className="flex items-center gap-1">
                                                            <FaShoppingBag className="w-3 h-3" />
                                                            {customer.orderCount} orders
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <FaClock className="w-3 h-3" />
                                                        {formatRelativeTime(customer.lastUsedAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="py-12 text-center">
                            <FaUser className="mx-auto w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {searchQuery ? 'No customers found' : 'No recent customers'}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                {searchQuery ? 'Try a different search term' : 'Start taking orders to build your customer list'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {filteredCustomers.map((customer, index) => (
                                <button
                                    key={`${customer.phone || customer.email || index}`}
                                    onClick={() => handleSelect(customer)}
                                    className="w-full flex items-start gap-3 p-3 rounded-lg text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                                >
                                    {/* Avatar */}
                                    <div className="w-10 h-10 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 group-hover:bg-brand-100 dark:group-hover:bg-brand-900/30 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                                        <FaUser className="w-4 h-4" />
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white truncate">
                                            {customer.name || 'Guest'}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {customer.phone && (
                                                <span className="flex items-center gap-1">
                                                    <FaPhone className="w-3 h-3" />
                                                    {customer.phone}
                                                </span>
                                            )}
                                            {customer.email && (
                                                <span className="flex items-center gap-1 max-w-[150px] truncate">
                                                    <FaEnvelope className="w-3 h-3" />
                                                    {customer.email}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                                            {customer.orderCount && (
                                                <span className="flex items-center gap-1">
                                                    <FaShoppingBag className="w-3 h-3" />
                                                    {customer.orderCount} orders
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <FaClock className="w-3 h-3" />
                                                {formatRelativeTime(customer.lastUsedAt)}
                                            </span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CustomerLookupModal;
