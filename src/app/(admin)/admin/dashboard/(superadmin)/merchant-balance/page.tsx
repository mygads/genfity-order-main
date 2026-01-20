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
import { StatusToggle } from "@/components/common/StatusToggle";
import { FaMoneyBillWave, FaCalendarPlus, FaTimes, FaSortUp, FaSortDown, FaSort } from "react-icons/fa";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatCurrency } from "@/lib/utils/format";

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
  const { t } = useTranslation();
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
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct'>('add');
  const [subscriptionDays, setSubscriptionDays] = useState('');
  const [subscriptionAction, setSubscriptionAction] = useState<'extend' | 'reduce'>('extend');
  const [subscriptionType, setSubscriptionType] = useState<'CURRENT' | 'TRIAL' | 'DEPOSIT' | 'MONTHLY'>('CURRENT');
  const [subscriptionStatus, setSubscriptionStatus] = useState<'CURRENT' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED'>('CURRENT');
  const [suspendReason, setSuspendReason] = useState('');
  const [monthlyPeriodMonths, setMonthlyPeriodMonths] = useState('');
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

  const formatBalance = (amount: number | undefined, currency: string) => {
    if (amount === undefined || amount === null) return '-';
    return formatCurrency(amount, currency);
  };

  // Fetch function for refresh
  const fetchMerchants = useCallback(async () => {
    await mutateMerchants();
  }, [mutateMerchants]);

  // Handle balance adjustment
  const handleBalanceAdjustment = async () => {
    if (!balanceModal.merchant || !adjustmentAmount) return;

    const parsedAmount = Number(adjustmentAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      showError(t("common.error"), t("admin.superadmin.merchantBalance.modal.amountInvalid"));
      return;
    }

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
            amount: balanceAction === 'deduct' ? -Math.abs(parsedAmount) : Math.abs(parsedAmount),
            description: adjustmentDescription || t("admin.superadmin.merchantBalance.modal.defaultDescription"),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to adjust balance');
      }

      showSuccess(t("common.success"), t("admin.superadmin.merchantBalance.modal.adjustSuccess"));
      setBalanceModal({ isOpen: false, merchant: null });
      setAdjustmentAmount('');
      setAdjustmentDescription('');
      setBalanceAction('add');
      fetchMerchants();
    } catch (err) {
      showError(t("common.error"), err instanceof Error ? err.message : t("admin.superadmin.merchantBalance.modal.adjustError"));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle subscription extension
  const handleSubscriptionExtend = async () => {
    if (!subscriptionModal.merchant) return;

    const hasDays = Boolean(subscriptionDays);
    const hasTypeChange = subscriptionType !== 'CURRENT';
    const hasStatusChange = subscriptionStatus !== 'CURRENT';

    if (!hasDays && !hasTypeChange && !hasStatusChange) {
      showError(t("common.error"), t("admin.superadmin.merchantBalance.modal.noSubscriptionChanges"));
      return;
    }

    const parsedDays = hasDays ? Number(subscriptionDays) : 0;
    if (hasDays && (!Number.isFinite(parsedDays) || parsedDays <= 0)) {
      showError(t("common.error"), t("admin.superadmin.merchantBalance.modal.daysInvalid"));
      return;
    }

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
            type: hasTypeChange ? subscriptionType : undefined,
            status: hasStatusChange && subscriptionType === 'CURRENT' ? subscriptionStatus : undefined,
            suspendReason: subscriptionStatus === 'SUSPENDED' ? suspendReason.trim() || undefined : undefined,
            monthlyPeriodMonths: subscriptionType === 'MONTHLY' && monthlyPeriodMonths
              ? parseInt(monthlyPeriodMonths)
              : undefined,
            adjustDays: hasDays
              ? (subscriptionAction === 'reduce' ? -Math.abs(parsedDays) : Math.abs(parsedDays))
              : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to extend subscription');
      }

      showSuccess(t("common.success"), t("admin.superadmin.merchantBalance.modal.subscriptionSuccess"));
      setSubscriptionModal({ isOpen: false, merchant: null });
      setSubscriptionDays('');
      setSubscriptionAction('extend');
      setSubscriptionType('CURRENT');
      setSubscriptionStatus('CURRENT');
      setSuspendReason('');
      setMonthlyPeriodMonths('');
      fetchMerchants();
    } catch (err) {
      showError(t("common.error"), err instanceof Error ? err.message : t("admin.superadmin.merchantBalance.modal.subscriptionError"));
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
            {t("admin.superadmin.merchantBalance.errorLoading")}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {merchantsError?.message || t("admin.superadmin.merchantBalance.errorMessage")}
          </p>
          <button
            onClick={() => fetchMerchants()}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            {t("admin.superadmin.merchantBalance.retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <ToastContainer toasts={toasts} />
      <PageBreadcrumb pageTitle={t("admin.superadmin.merchantBalance.title")} />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("admin.superadmin.merchantBalance.allMerchants")}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("admin.superadmin.merchantBalance.subtitle")}
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
                placeholder={t("admin.superadmin.merchantBalance.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">{t("admin.superadmin.merchantBalance.filters")}</span>

            {/* Subscription Filter */}
            <select
              value={subscriptionFilter}
              onChange={(e) => setSubscriptionFilter(e.target.value as 'all' | 'TRIAL' | 'DEPOSIT' | 'MONTHLY')}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">{t("admin.superadmin.merchantBalance.allSubscriptions")}</option>
              <option value="TRIAL">{t("admin.superadmin.merchants.subscriptionTrial")}</option>
              <option value="DEPOSIT">{t("admin.superadmin.merchants.subscriptionDeposit")}</option>
              <option value="MONTHLY">{t("admin.superadmin.merchants.subscriptionMonthly")}</option>
            </select>

            <button
              onClick={fetchMerchants}
              className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              {t("admin.superadmin.merchantBalance.refresh")}
            </button>

            {/* Clear Filters */}
            {(searchQuery || subscriptionFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSubscriptionFilter('all');
                }}
                className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-gray-800 dark:bg-white/3 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {t("admin.superadmin.merchantBalance.clearFilters")}
              </button>
            )}

            {/* Results Count */}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t("admin.superadmin.merchantBalance.ofMerchants", { count: merchants.length, total: allMerchants.length })}
            </span>
          </div>
        </div>

        {/* Merchants Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-250">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left dark:border-white/5 dark:bg-white/2">
                  <th 
                    className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('code')}
                  >
                    <span className="inline-flex items-center">
                      {t("admin.superadmin.merchantBalance.tableCode")}
                      {renderSortIcon('code')}
                    </span>
                  </th>
                  <th 
                    className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('name')}
                  >
                    <span className="inline-flex items-center">
                      {t("admin.superadmin.merchantBalance.tableName")}
                      {renderSortIcon('name')}
                    </span>
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("admin.superadmin.merchantBalance.tableCurrency")}
                  </th>
                  <th 
                    className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('balance')}
                  >
                    <span className="inline-flex items-center">
                      {t("admin.superadmin.merchantBalance.tableBalance")}
                      {renderSortIcon('balance')}
                    </span>
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("admin.superadmin.merchantBalance.tableSubscription")}
                  </th>
                  <th 
                    className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('daysRemaining')}
                  >
                    <span className="inline-flex items-center">
                      {t("admin.superadmin.merchantBalance.tableDaysLeft")}
                      {renderSortIcon('daysRemaining')}
                    </span>
                  </th>
                  <th 
                    className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300"
                    onClick={() => handleSort('status')}
                  >
                    <span className="inline-flex items-center">
                      {t("admin.superadmin.merchantBalance.tableStatus")}
                      {renderSortIcon('status')}
                    </span>
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t("admin.superadmin.merchantBalance.tableActions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {merchants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t("admin.superadmin.merchantBalance.noMerchants")}</p>
                    </td>
                  </tr>
                ) : (
                  merchants.map((merchant) => {
                    const daysRemaining = calculateDaysRemaining(merchant.subscriptionEndsAt);
                    return (
                    <tr key={merchant.id} className="hover:bg-gray-50 dark:hover:bg-white/2">
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
                          {formatBalance(merchant.balance, merchant.currency || 'AUD')}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {merchant.subscriptionStatus ? (
                          <SubscriptionStatusBadge
                            type={merchant.subscriptionStatus.type}
                            status={merchant.subscriptionStatus.status}
                          />
                        ) : (
                          <span className="text-xs text-gray-400">{t("admin.superadmin.merchantBalance.noSubscription")}</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {daysRemaining !== null ? (
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                            daysRemaining <= 0
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : daysRemaining <= 7
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                              : daysRemaining <= 14
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          }`}>
                            {daysRemaining <= 0 ? t("admin.superadmin.merchantBalance.expired") : t("admin.superadmin.merchantBalance.days", { count: daysRemaining })}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                          <StatusToggle
                            isActive={merchant.isActive}
                            onToggle={() => {}}
                            disabled
                            size="sm"
                            activeLabel={t("admin.superadmin.merchantBalance.active")}
                            inactiveLabel={t("admin.superadmin.merchantBalance.inactive")}
                          />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setBalanceModal({ isOpen: true, merchant });
                              setBalanceAction('add');
                              setAdjustmentAmount('');
                              setAdjustmentDescription('');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50"
                            title={t("admin.superadmin.merchantBalance.adjustBalance")}
                          >
                            <FaMoneyBillWave className="h-3.5 w-3.5" />
                            {t("admin.superadmin.merchantBalance.adjustBalance")}
                          </button>
                          <button
                            onClick={() => {
                              setSubscriptionModal({ isOpen: true, merchant });
                              setSubscriptionAction('extend');
                              setSubscriptionDays('');
                              setSubscriptionType('CURRENT');
                              setSubscriptionStatus('CURRENT');
                              setSuspendReason('');
                              setMonthlyPeriodMonths('');
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
                            title={t("admin.superadmin.merchantBalance.manageSubscription")}
                          >
                            <FaCalendarPlus className="h-3.5 w-3.5" />
                            {t("admin.superadmin.merchantBalance.manageSubscription")}
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
              {t("admin.superadmin.merchantBalance.showingMerchants", { count: merchants.length })}
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
                {t("admin.superadmin.merchantBalance.modal.adjustBalanceTitle")} - {balanceModal.merchant.name}
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
                  {t("admin.superadmin.merchantBalance.modal.action")}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBalanceAction('add')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      balanceAction === 'add'
                        ? 'border-green-500 bg-green-50 text-green-700 dark:border-green-500 dark:bg-green-900/30 dark:text-green-300'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t("admin.superadmin.merchantBalance.modal.actionAdd")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceAction('deduct')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      balanceAction === 'deduct'
                        ? 'border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-900/30 dark:text-red-300'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t("admin.superadmin.merchantBalance.modal.actionDeduct")}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("admin.superadmin.merchantBalance.modal.amount")} ({balanceModal.merchant.currency || 'AUD'})
                </label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder={t("admin.superadmin.merchantBalance.modal.amountPlaceholder")}
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {(balanceModal.merchant?.currency === 'AUD'
                    ? [5, 10, 25, 50, 100]
                    : [50000, 100000, 200000, 500000]
                  ).map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setAdjustmentAmount(amount.toString())}
                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:border-green-300 hover:bg-green-50 hover:text-green-600 dark:border-gray-600 dark:text-gray-300"
                    >
                      {balanceAction === 'deduct' ? '-' : '+'}{formatCurrency(amount, balanceModal.merchant?.currency || 'AUD')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("admin.superadmin.merchantBalance.modal.description")}
                </label>
                <input
                  type="text"
                  value={adjustmentDescription}
                  onChange={(e) => setAdjustmentDescription(e.target.value)}
                  placeholder={t("admin.superadmin.merchantBalance.modal.descriptionPlaceholder")}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setBalanceModal({ isOpen: false, merchant: null });
                    setAdjustmentAmount('');
                    setAdjustmentDescription('');
                    setBalanceAction('add');
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {t("admin.superadmin.merchantBalance.modal.cancel")}
                </button>
                <button
                  onClick={handleBalanceAdjustment}
                  disabled={submitting || !adjustmentAmount}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? t("admin.superadmin.merchantBalance.modal.processing")
                    : t("admin.superadmin.merchantBalance.modal.adjustBalanceBtn")}
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
                {t("admin.superadmin.merchantBalance.modal.manageTitle")} - {subscriptionModal.merchant.name}
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
                  {t("admin.superadmin.merchantBalance.modal.subscriptionType")}
                </label>
                <select
                  value={subscriptionType}
                  onChange={(e) => setSubscriptionType(e.target.value as typeof subscriptionType)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="CURRENT">{t("admin.superadmin.merchantBalance.modal.keepCurrent")}</option>
                  <option value="TRIAL">{t("admin.superadmin.merchantBalance.modal.typeTrial")}</option>
                  <option value="DEPOSIT">{t("admin.superadmin.merchantBalance.modal.typeDeposit")}</option>
                  <option value="MONTHLY">{t("admin.superadmin.merchantBalance.modal.typeMonthly")}</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("admin.superadmin.merchantBalance.modal.subscriptionStatus")}
                </label>
                <select
                  value={subscriptionStatus}
                  onChange={(e) => setSubscriptionStatus(e.target.value as typeof subscriptionStatus)}
                  disabled={subscriptionType !== 'CURRENT'}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-700/60"
                >
                  <option value="CURRENT">{t("admin.superadmin.merchantBalance.modal.keepCurrent")}</option>
                  <option value="ACTIVE">{t("admin.superadmin.merchantBalance.modal.statusActive")}</option>
                  <option value="SUSPENDED">{t("admin.superadmin.merchantBalance.modal.statusSuspended")}</option>
                  <option value="CANCELLED">{t("admin.superadmin.merchantBalance.modal.statusCancelled")}</option>
                </select>
                {subscriptionType !== 'CURRENT' && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {t("admin.superadmin.merchantBalance.modal.statusDisabledHint")}
                  </p>
                )}
              </div>

              {subscriptionStatus === 'SUSPENDED' && subscriptionType === 'CURRENT' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("admin.superadmin.merchantBalance.modal.suspendReason")}
                  </label>
                  <input
                    type="text"
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder={t("admin.superadmin.merchantBalance.modal.suspendReasonPlaceholder")}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              {subscriptionType === 'MONTHLY' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("admin.superadmin.merchantBalance.modal.monthlyPeriod")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={monthlyPeriodMonths}
                    onChange={(e) => setMonthlyPeriodMonths(e.target.value)}
                    placeholder={t("admin.superadmin.merchantBalance.modal.monthlyPeriodPlaceholder")}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("admin.superadmin.merchantBalance.modal.daysAdjust")}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSubscriptionAction('extend')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      subscriptionAction === 'extend'
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t("admin.superadmin.merchantBalance.modal.actionExtend")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubscriptionAction('reduce')}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      subscriptionAction === 'reduce'
                        ? 'border-red-500 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-900/30 dark:text-red-300'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {t("admin.superadmin.merchantBalance.modal.actionReduce")}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("admin.superadmin.merchantBalance.modal.daysToAdjust")}
                </label>
                <input
                  type="number"
                  value={subscriptionDays}
                  onChange={(e) => setSubscriptionDays(e.target.value)}
                  placeholder={t("admin.superadmin.merchantBalance.modal.daysPlaceholder")}
                  min="0"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
                <div className="mt-2 flex gap-2">
                  {[7, 14, 30, 60, 90].map((days) => (
                    <button
                      key={days}
                      onClick={() => setSubscriptionDays(days.toString())}
                      className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 dark:border-gray-600 dark:text-gray-300"
                    >
                      {subscriptionAction === 'reduce' ? '-' : '+'}{days}d
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setSubscriptionModal({ isOpen: false, merchant: null });
                    setSubscriptionDays('');
                    setSubscriptionAction('extend');
                    setSubscriptionType('CURRENT');
                    setSubscriptionStatus('CURRENT');
                    setSuspendReason('');
                    setMonthlyPeriodMonths('');
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  {t("admin.superadmin.merchantBalance.modal.cancel")}
                </button>
                <button
                  onClick={handleSubscriptionExtend}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting
                    ? t("admin.superadmin.merchantBalance.modal.processing")
                    : t("admin.superadmin.merchantBalance.modal.subscriptionBtn")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
