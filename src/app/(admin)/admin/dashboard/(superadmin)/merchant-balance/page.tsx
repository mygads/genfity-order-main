"use client";

/**
 * Merchant Balance Management Page (Super Admin)
 * Shows all merchants with their balance and subscription info
 * Allows adding balance or extending subscription
 */

import React, { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import SubscriptionStatusBadge from "@/components/subscription/SubscriptionStatusBadge";
import { useSWRWithAuth } from "@/hooks/useSWRWithAuth";
import { MerchantsPageSkeleton } from "@/components/common/SkeletonLoaders";
import { FaMoneyBillWave, FaCalendarPlus, FaTimes, FaSortUp, FaSortDown, FaSort } from "react-icons/fa";

interface Merchant {
  id: string;
  code: string;
  name: string;
  email: string;
  currency: string;
  isActive: boolean;
  subscriptionStatus?: {
    type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY';
    status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  } | null;
}

interface MerchantWithBalance extends Merchant {
  balance?: number;
  lastTopupAt?: string | null;
  subscriptionEndsAt?: string | null;
}

interface MerchantsApiResponse {
  success: boolean;
  data: {
    merchants: MerchantWithBalance[];
  } | MerchantWithBalance[];
}

type SortField = 'name' | 'code' | 'balance' | 'daysRemaining' | 'status';
type SortDirection = 'asc' | 'desc';

export default function MerchantBalancePage() {
  const router = useRouter();
  const { toasts, success: showSuccess, error: showError } = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'TRIAL' | 'DEPOSIT' | 'MONTHLY'>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modal states
  const [balanceModal, setBalanceModal] = useState<{
    isOpen: boolean;
    merchant: MerchantWithBalance | null;
  }>({ isOpen: false, merchant: null });

  const [subscriptionModal, setSubscriptionModal] = useState<{
    isOpen: boolean;
    merchant: MerchantWithBalance | null;
  }>({ isOpen: false, merchant: null });

  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [subscriptionDays, setSubscriptionDays] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch merchants
  const {
    data: merchantsResponse,
    error: merchantsError,
    isLoading,
    mutate: mutateMerchants
  } = useSWRWithAuth<MerchantsApiResponse>("/api/admin/merchants", {
    refreshInterval: 30000,
  });

  // Extract merchants from SWR response
  const allMerchants = useMemo(() => {
    if (!merchantsResponse?.success) return [];
    const data = merchantsResponse.data;
    if (Array.isArray(data)) return data;
    if (data && 'merchants' in data && Array.isArray(data.merchants)) return data.merchants;
    return [];
  }, [merchantsResponse]);

  // Calculate days remaining from subscription end date
  const calculateDaysRemaining = useCallback((subscriptionEndsAt: string | null | undefined): number | null => {
    if (!subscriptionEndsAt) return null;
    const endDate = new Date(subscriptionEndsAt);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  // Filter and sort merchants
  const merchants = useMemo(() => {
    const filtered = allMerchants.filter(merchant => {
      // Search filter
      const matchesSearch = !searchQuery || 
        merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        merchant.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        merchant.email?.toLowerCase().includes(searchQuery.toLowerCase());

      // Subscription filter
      const matchesSubscription = subscriptionFilter === 'all' ||
        merchant.subscriptionStatus?.type === subscriptionFilter;

      return matchesSearch && matchesSubscription;
    });

    // Sort merchants
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'balance':
          comparison = (a.balance || 0) - (b.balance || 0);
          break;
        case 'daysRemaining':
          const daysA = calculateDaysRemaining(a.subscriptionEndsAt);
          const daysB = calculateDaysRemaining(b.subscriptionEndsAt);
          // Put null values at the end
          if (daysA === null && daysB === null) comparison = 0;
          else if (daysA === null) comparison = 1;
          else if (daysB === null) comparison = -1;
          else comparison = daysA - daysB;
          break;
        case 'status':
          const statusA = a.isActive ? 1 : 0;
          const statusB = b.isActive ? 1 : 0;
          comparison = statusA - statusB;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [allMerchants, searchQuery, subscriptionFilter, sortField, sortDirection, calculateDaysRemaining]);

  // Handle sort column click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Render sort icon
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <FaSort className="ml-1 h-3 w-3 text-gray-400" />;
    }
    return sortDirection === 'asc' 
      ? <FaSortUp className="ml-1 h-3 w-3 text-brand-500" />
      : <FaSortDown className="ml-1 h-3 w-3 text-brand-500" />;
  };

  // Format currency
  const formatCurrency = (amount: number | undefined, currency: string) => {
    if (amount === undefined || amount === null) return '-';
    if (currency === 'AUD') {
      return `A$${amount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`;
    }
    return `Rp ${amount.toLocaleString('id-ID')}`;
  };

  // Fetch function for refresh
  const fetchMerchants = useCallback(async () => {
    await mutateMerchants();
  }, [mutateMerchants]);

  // Handle balance adjustment
  const handleBalanceAdjustment = async () => {
    if (!balanceModal.merchant || !adjustmentAmount) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(
        `/api/admin/merchants/${balanceModal.merchant.id}/balance/adjust`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            amount: parseFloat(adjustmentAmount),
            description: adjustmentDescription || 'Manual balance adjustment by admin',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to adjust balance');
      }

      showSuccess('Success', `Balance adjusted successfully`);
      setBalanceModal({ isOpen: false, merchant: null });
      setAdjustmentAmount('');
      setAdjustmentDescription('');
      fetchMerchants();
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle subscription extension
  const handleSubscriptionExtend = async () => {
    if (!subscriptionModal.merchant || !subscriptionDays) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(
        `/api/admin/merchants/${subscriptionModal.merchant.id}/subscription`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            extendDays: parseInt(subscriptionDays),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to extend subscription');
      }

      showSuccess('Success', `Subscription extended by ${subscriptionDays} days`);
      setSubscriptionModal({ isOpen: false, merchant: null });
      setSubscriptionDays('');
      fetchMerchants();
    } catch (err) {
      showError('Error', err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Show skeleton loader during initial load
  if (isLoading) {
    return <MerchantsPageSkeleton />;
  }

  // Show error state if fetch failed
  if (merchantsError) {
    return (
      <div className="flex min-h-100 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Error Loading Data
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {merchantsError?.message || 'Failed to load merchants'}
          </p>
          <button
            onClick={() => fetchMerchants()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <PageBreadcrumb pageTitle="Merchant Balance & Subscription" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            All Merchants - Balance & Subscription
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View and manage merchant balances and subscriptions
          </p>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/30">
          {/* Search Row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, code, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Filters:</span>

            {/* Subscription Filter */}
            <select
              value={subscriptionFilter}
              onChange={(e) => setSubscriptionFilter(e.target.value as 'all' | 'TRIAL' | 'DEPOSIT' | 'MONTHLY')}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">All Subscriptions</option>
              <option value="TRIAL">Trial</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="MONTHLY">Monthly</option>
            </select>

            <button
              onClick={fetchMerchants}
              className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Refresh
            </button>

            {/* Clear Filters */}
            {(searchQuery || subscriptionFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSubscriptionFilter('all');
                }}
                className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-gray-800 dark:bg-white/[0.03] dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Clear Filters
              </button>
            )}

            {/* Results Count */}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {merchants.length} of {allMerchants.length} merchants
            </span>
          </div>
        </div>

        {/* Merchants Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.05]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left dark:border-white/[0.05] dark:bg-white/[0.02]">
                  <th 
                    className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('code')}
                  >
                    <span className="inline-flex items-center">
                      Code
                      {renderSortIcon('code')}
                    </span>
                  </th>
                  <th 
                    className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('name')}
                  >
                    <span className="inline-flex items-center">
                      Merchant Name
                      {renderSortIcon('name')}
                    </span>
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Currency
                  </th>
                  <th 
                    className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('balance')}
                  >
                    <span className="inline-flex items-center">
                      Balance
                      {renderSortIcon('balance')}
                    </span>
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Subscription
                  </th>
                  <th 
                    className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('daysRemaining')}
                  >
                    <span className="inline-flex items-center">
                      Days Left
                      {renderSortIcon('daysRemaining')}
                    </span>
                  </th>
                  <th 
                    className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('status')}
                  >
                    <span className="inline-flex items-center">
                      Status
                      {renderSortIcon('status')}
                    </span>
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {merchants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No merchants found</p>
                    </td>
                  </tr>
                ) : (
                  merchants.map((merchant) => {
                    const daysRemaining = calculateDaysRemaining(merchant.subscriptionEndsAt);
                    return (
                    <tr key={merchant.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                      <td className="px-5 py-4">
                        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                          {merchant.code}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                            {merchant.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {merchant.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {merchant.currency || 'AUD'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(merchant.balance, merchant.currency || 'AUD')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {merchant.subscriptionStatus ? (
                          <SubscriptionStatusBadge
                            type={merchant.subscriptionStatus.type}
                            status={merchant.subscriptionStatus.status}
                          />
                        ) : (
                          <span className="text-xs text-gray-400">No subscription</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {daysRemaining !== null ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            daysRemaining <= 0
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : daysRemaining <= 7
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              : daysRemaining <= 14
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          }`}>
                            {daysRemaining <= 0 ? 'Expired' : `${daysRemaining} days`}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                          merchant.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${merchant.isActive ? 'bg-green-600' : 'bg-gray-600'}`} />
                          {merchant.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setBalanceModal({ isOpen: true, merchant })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                            title="Add Balance"
                          >
                            <FaMoneyBillWave className="h-3.5 w-3.5" />
                            Add Balance
                          </button>
                          <button
                            onClick={() => setSubscriptionModal({ isOpen: true, merchant })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                            title="Extend Subscription"
                          >
                            <FaCalendarPlus className="h-3.5 w-3.5" />
                            Extend
                          </button>
                        </div>
                      </td>
                    </tr>
                  );})
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {merchants.length > 0 && (
          <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {merchants.length} merchant{merchants.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* Balance Adjustment Modal */}
      {balanceModal.isOpen && balanceModal.merchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Add Balance - {balanceModal.merchant.name}
              </h3>
              <button
                onClick={() => setBalanceModal({ isOpen: false, merchant: null })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Amount ({balanceModal.merchant.currency || 'AUD'})
                </label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="Enter amount (positive to add, negative to deduct)"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <div className="mt-2 flex gap-2">
                  {[50000, 100000, 200000, 500000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setAdjustmentAmount(amount.toString())}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:border-green-300 hover:bg-green-50 hover:text-green-600 dark:border-gray-600 dark:text-gray-300"
                    >
                      +{balanceModal.merchant?.currency === 'AUD' ? `$${amount/1000}` : `${(amount/1000).toFixed(0)}k`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <input
                  type="text"
                  value={adjustmentDescription}
                  onChange={(e) => setAdjustmentDescription(e.target.value)}
                  placeholder="e.g., Manual top up by admin"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setBalanceModal({ isOpen: false, merchant: null });
                    setAdjustmentAmount('');
                    setAdjustmentDescription('');
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBalanceAdjustment}
                  disabled={submitting || !adjustmentAmount}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Add Balance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription Extension Modal */}
      {subscriptionModal.isOpen && subscriptionModal.merchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Extend Subscription - {subscriptionModal.merchant.name}
              </h3>
              <button
                onClick={() => setSubscriptionModal({ isOpen: false, merchant: null })}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Days to Extend
                </label>
                <input
                  type="number"
                  value={subscriptionDays}
                  onChange={(e) => setSubscriptionDays(e.target.value)}
                  placeholder="Enter number of days"
                  min="1"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <div className="mt-2 flex gap-2">
                  {[7, 14, 30, 60, 90].map((days) => (
                    <button
                      key={days}
                      onClick={() => setSubscriptionDays(days.toString())}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-600 dark:text-gray-300"
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setSubscriptionModal({ isOpen: false, merchant: null });
                    setSubscriptionDays('');
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubscriptionExtend}
                  disabled={submitting || !subscriptionDays}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Extend Subscription'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
