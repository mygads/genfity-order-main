'use client';

/**
 * Merchant Balance Management Page (Super Admin)
 * Search for a merchant and manage their balance/subscription
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  FaSearch,
  FaSync,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaPlus,
  FaMinus,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaStore,
} from 'react-icons/fa';

interface Merchant {
  id: string;
  code: string;
  name: string;
  email: string;
  currency: string;
  isActive: boolean;
  subscription: {
    id: string;
    type: string;
    status: string;
    trialEndsAt: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
  } | null;
  balance: {
    id: string;
    balance: number;
    lastTopupAt: string | null;
  } | null;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export default function MerchantBalancePage() {
  const router = useRouter();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Action modal states
  const [actionType, setActionType] = useState<'balance' | 'subscription' | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [adjustmentDescription, setAdjustmentDescription] = useState('');
  const [subscriptionDays, setSubscriptionDays] = useState('');
  const [subscriptionAction, setSubscriptionAction] = useState<'extend' | 'suspend' | 'activate'>('extend');
  const [suspendReason, setSuspendReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch merchants for search
  const fetchMerchants = useCallback(async () => {
    if (!search.trim()) {
      setMerchants([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(
        `/api/admin/merchants?search=${encodeURIComponent(search)}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch merchants');
      }

      setMerchants(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [search, router]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMerchants();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchMerchants]);

  // Fetch merchant transactions
  const fetchTransactions = useCallback(async (merchantId: string) => {
    setLoadingTransactions(true);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const response = await fetch(
        `/api/admin/transactions?merchantId=${merchantId}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setTransactions(data.data.transactions || []);
      }
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  }, []);

  // Select merchant
  const handleSelectMerchant = (merchant: Merchant) => {
    setSelectedMerchant(merchant);
    setSearch('');
    setMerchants([]);
    fetchTransactions(merchant.id);
  };

  // Clear selected merchant
  const handleClearSelection = () => {
    setSelectedMerchant(null);
    setTransactions([]);
    setSearch('');
  };

  // Submit balance adjustment
  const handleBalanceAdjustment = async () => {
    if (!selectedMerchant || !adjustmentAmount) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      const response = await fetch(
        `/api/admin/merchants/${selectedMerchant.id}/balance/adjust`,
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

      // Update local state
      setSelectedMerchant((prev) =>
        prev
          ? {
              ...prev,
              balance: {
                ...prev.balance,
                id: prev.balance?.id || '',
                balance: data.data.newBalance,
                lastTopupAt: new Date().toISOString(),
              },
            }
          : null
      );

      setSuccessMessage(`Balance adjusted successfully. New balance: ${formatCurrency(data.data.newBalance, selectedMerchant.currency)}`);
      setActionType(null);
      setAdjustmentAmount('');
      setAdjustmentDescription('');
      fetchTransactions(selectedMerchant.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit subscription change
  const handleSubscriptionChange = async () => {
    if (!selectedMerchant) return;

    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        router.push('/admin/login');
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: any = {};

      if (subscriptionAction === 'extend' && subscriptionDays) {
        body.extendDays = parseInt(subscriptionDays);
      } else if (subscriptionAction === 'suspend') {
        body.status = 'SUSPENDED';
        body.suspendReason = suspendReason || 'Suspended by admin';
      } else if (subscriptionAction === 'activate') {
        body.status = 'ACTIVE';
      }

      const response = await fetch(
        `/api/admin/merchants/${selectedMerchant.id}/subscription`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update subscription');
      }

      // Update local state
      if (data.data) {
        setSelectedMerchant((prev) =>
          prev
            ? {
                ...prev,
                subscription: {
                  ...prev.subscription,
                  id: data.data.id,
                  type: data.data.type,
                  status: data.data.status,
                  trialEndsAt: data.data.trialEndsAt,
                  currentPeriodStart: data.data.currentPeriodStart,
                  currentPeriodEnd: data.data.currentPeriodEnd,
                },
              }
            : null
        );
      }

      setSuccessMessage(`Subscription updated successfully`);
      setActionType(null);
      setSubscriptionDays('');
      setSuspendReason('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(dateString));
  };

  // Format date time
  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  // Get subscription status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  // Get subscription type label
  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      TRIAL: 'Trial',
      DEPOSIT: 'Deposit',
      MONTHLY: 'Monthly',
    };
    return labels[type] || type;
  };

  // Calculate days remaining
  const daysRemaining = useMemo(() => {
    if (!selectedMerchant?.subscription) return null;
    const endDate = selectedMerchant.subscription.type === 'TRIAL'
      ? selectedMerchant.subscription.trialEndsAt
      : selectedMerchant.subscription.currentPeriodEnd;
    
    if (!endDate) return null;
    
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [selectedMerchant]);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Merchant Balance & Subscription
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Search for a merchant and manage their balance or subscription
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <FaCheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm text-green-700 dark:text-green-400">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <FaExclamationTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Search Section */}
        {!selectedMerchant ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Search Merchant
            </label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, code, or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-10 pr-4 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              />
              {loading && (
                <FaSync className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
              )}
            </div>

            {/* Search Results */}
            {merchants.length > 0 && (
              <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600">
                {merchants.map((merchant) => (
                  <button
                    key={merchant.id}
                    onClick={() => handleSelectMerchant(merchant)}
                    className="flex w-full items-center gap-4 border-b border-gray-100 p-4 text-left transition-colors hover:bg-gray-50 last:border-b-0 dark:border-gray-700 dark:hover:bg-gray-700"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-600">
                      <FaStore className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {merchant.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {merchant.code} • {merchant.email}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          merchant.subscription
                            ? getStatusColor(merchant.subscription.status)
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {merchant.subscription
                          ? `${getTypeLabel(merchant.subscription.type)} - ${merchant.subscription.status}`
                          : 'No Subscription'}
                      </span>
                      {merchant.balance && (
                        <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(merchant.balance.balance, merchant.currency)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && search && merchants.length === 0 && (
              <div className="mt-6 text-center">
                <FaStore className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  No merchants found matching &quot;{search}&quot;
                </p>
              </div>
            )}

            {/* Initial State */}
            {!search && (
              <div className="mt-6 text-center">
                <FaSearch className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Start typing to search for a merchant
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Selected Merchant Card */}
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                    <FaStore className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedMerchant.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedMerchant.code} • {selectedMerchant.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClearSelection}
                  className="rounded-lg border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Balance & Subscription Cards */}
            <div className="mb-6 grid gap-6 md:grid-cols-2">
              {/* Balance Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900/30">
                      <FaMoneyBillWave className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Current Balance
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedMerchant.balance
                          ? formatCurrency(selectedMerchant.balance.balance, selectedMerchant.currency)
                          : formatCurrency(0, selectedMerchant.currency)}
                      </p>
                    </div>
                  </div>
                </div>
                {selectedMerchant.balance?.lastTopupAt && (
                  <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Last top-up: {formatDate(selectedMerchant.balance.lastTopupAt)}
                  </p>
                )}
                <button
                  onClick={() => setActionType('balance')}
                  className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Adjust Balance
                </button>
              </div>

              {/* Subscription Card */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                      <FaCalendarAlt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Subscription
                      </p>
                      {selectedMerchant.subscription ? (
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(selectedMerchant.subscription.status)}`}
                          >
                            {selectedMerchant.subscription.status}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {getTypeLabel(selectedMerchant.subscription.type)}
                          </span>
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">No subscription</p>
                      )}
                    </div>
                  </div>
                </div>
                {selectedMerchant.subscription && (
                  <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {selectedMerchant.subscription.type === 'TRIAL' && (
                      <p>
                        Trial ends: {formatDate(selectedMerchant.subscription.trialEndsAt)}
                      </p>
                    )}
                    {selectedMerchant.subscription.currentPeriodEnd && (
                      <p>
                        Period ends: {formatDate(selectedMerchant.subscription.currentPeriodEnd)}
                      </p>
                    )}
                    {daysRemaining !== null && (
                      <p
                        className={`font-medium ${
                          daysRemaining <= 0
                            ? 'text-red-600 dark:text-red-400'
                            : daysRemaining <= 7
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {daysRemaining <= 0
                          ? 'Expired'
                          : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}
                      </p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => setActionType('subscription')}
                  className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Manage Subscription
                </button>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Recent Transactions
              </h3>
              {loadingTransactions ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700"></div>
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  <FaMoneyBillWave className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {transactions.map((txn) => {
                    const isPositive = txn.amount > 0;
                    return (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between rounded-lg border border-gray-100 p-3 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          {isPositive ? (
                            <FaPlus className="h-5 w-5 text-green-500" />
                          ) : (
                            <FaMinus className="h-5 w-5 text-red-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {txn.type.replace('_', ' ')}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {txn.description || formatDateTime(txn.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-semibold ${
                              isPositive
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {isPositive ? '+' : ''}
                            {formatCurrency(txn.amount, selectedMerchant.currency)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Balance: {formatCurrency(txn.balanceAfter, selectedMerchant.currency)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Balance Adjustment Modal */}
        {actionType === 'balance' && selectedMerchant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Adjust Balance
                </h3>
                <button
                  onClick={() => setActionType(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Amount ({selectedMerchant.currency})
                  </label>
                  <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                    Use positive number to add, negative to deduct
                  </p>
                  <input
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    placeholder="e.g., 100000 or -50000"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description (optional)
                  </label>
                  <textarea
                    value={adjustmentDescription}
                    onChange={(e) => setAdjustmentDescription(e.target.value)}
                    placeholder="Reason for adjustment..."
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {adjustmentAmount && (
                  <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Current: {formatCurrency(selectedMerchant.balance?.balance || 0, selectedMerchant.currency)}
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      New Balance:{' '}
                      {formatCurrency(
                        (selectedMerchant.balance?.balance || 0) + parseFloat(adjustmentAmount || '0'),
                        selectedMerchant.currency
                      )}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setActionType(null)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBalanceAdjustment}
                    disabled={!adjustmentAmount || submitting}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? 'Processing...' : 'Confirm Adjustment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Subscription Management Modal */}
        {actionType === 'subscription' && selectedMerchant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Manage Subscription
                </h3>
                <button
                  onClick={() => setActionType(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Action Selection */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSubscriptionAction('extend')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      subscriptionAction === 'extend'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200'
                    }`}
                  >
                    Extend
                  </button>
                  {selectedMerchant.subscription?.status === 'ACTIVE' && (
                    <button
                      onClick={() => setSubscriptionAction('suspend')}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        subscriptionAction === 'suspend'
                          ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200'
                      }`}
                    >
                      Suspend
                    </button>
                  )}
                  {selectedMerchant.subscription?.status === 'SUSPENDED' && (
                    <button
                      onClick={() => setSubscriptionAction('activate')}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        subscriptionAction === 'activate'
                          ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200'
                      }`}
                    >
                      Activate
                    </button>
                  )}
                </div>

                {/* Extend Form */}
                {subscriptionAction === 'extend' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Days to Extend
                    </label>
                    <input
                      type="number"
                      value={subscriptionDays}
                      onChange={(e) => setSubscriptionDays(e.target.value)}
                      placeholder="e.g., 30"
                      min="1"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    <div className="mt-3 flex gap-2">
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
                )}

                {/* Suspend Form */}
                {subscriptionAction === 'suspend' && (
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Suspend Reason
                    </label>
                    <textarea
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="Reason for suspension..."
                      rows={2}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                    <div className="mt-2 rounded-lg bg-red-50 p-2 dark:bg-red-900/20">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Warning: Suspending will prevent the merchant from accepting orders.
                      </p>
                    </div>
                  </div>
                )}

                {/* Activate Info */}
                {subscriptionAction === 'activate' && (
                  <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                    <p className="text-sm text-green-700 dark:text-green-400">
                      This will reactivate the merchant&apos;s subscription and they will be able to accept orders again.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setActionType(null)}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubscriptionChange}
                    disabled={
                      submitting ||
                      (subscriptionAction === 'extend' && !subscriptionDays)
                    }
                    className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 ${
                      subscriptionAction === 'suspend'
                        ? 'bg-red-600 hover:bg-red-700'
                        : subscriptionAction === 'activate'
                          ? 'bg-green-600 hover:bg-green-700'
                          : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {submitting
                      ? 'Processing...'
                      : subscriptionAction === 'extend'
                        ? 'Extend Subscription'
                        : subscriptionAction === 'suspend'
                          ? 'Suspend Subscription'
                          : 'Activate Subscription'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
