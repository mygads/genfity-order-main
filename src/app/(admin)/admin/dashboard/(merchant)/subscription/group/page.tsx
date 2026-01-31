'use client';

import React, { useMemo, useState } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { useSWRStatic } from '@/hooks/useSWRWithAuth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils/format';
import { getCurrencyConfig } from '@/lib/constants/location';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { useMerchant } from '@/context/MerchantContext';
import { Modal } from '@/components/ui/modal';
import { fetchMerchantApi } from '@/lib/utils/orderApiClient';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface GroupMerchant {
  id: string;
  code: string;
  name: string;
  branchType: 'MAIN' | 'BRANCH';
  parentMerchantId: string | null;
  isActive: boolean;
  country: string | null;
  currency: string;
  timezone: string | null;
  logoUrl: string | null;
  balance: {
    amount: number;
    lastTopupAt: string | null;
  };
  earnings: {
    paidOrders30d: number;
    revenue30d: number;
  };
  subscription: {
    type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY' | 'NONE';
    status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
    daysRemaining: number | null;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    suspendReason: string | null;
  };
}

interface GroupData {
  groups: Array<{
    main: GroupMerchant;
    branches: GroupMerchant[];
  }>;
}

export default function GroupBillingPage() {
  const { t, locale } = useTranslation();
  const { merchant } = useMerchant();
  const isMerchantInactive = merchant?.isActive === false;
  const { data, error, isLoading, mutate } = useSWRStatic<ApiResponse<GroupData>>(
    isMerchantInactive ? null : '/api/merchant/balance/group'
  );

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [fromMerchantId, setFromMerchantId] = useState('');
  const [toMerchantId, setToMerchantId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const [promoteTarget, setPromoteTarget] = useState<GroupMerchant | null>(null);
  const [promoteConfirmOpen, setPromoteConfirmOpen] = useState(false);
  const [promoteSubmittingId, setPromoteSubmittingId] = useState<string | null>(null);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const groups = data?.data?.groups || [];

  const allMerchants = useMemo(
    () => groups.flatMap((group) => [group.main, ...group.branches]),
    [groups]
  );

  const fromMerchant = allMerchants.find((merchant) => merchant.id === fromMerchantId);
  const toMerchant = allMerchants.find((merchant) => merchant.id === toMerchantId);
  const transferCurrency = fromMerchant?.currency || toMerchant?.currency || 'IDR';
  const { decimals } = getCurrencyConfig(transferCurrency);
  const amountNumber = Number(amount);
  const isCurrencyMismatch = Boolean(
    fromMerchant && toMerchant && fromMerchant.currency !== toMerchant.currency
  );
  const isCountryMismatch = Boolean(
    fromMerchant && toMerchant && fromMerchant.country && toMerchant.country && fromMerchant.country !== toMerchant.country
  );
  const isTransferBlocked = Boolean(
    isSubmitting
    || !fromMerchantId
    || !toMerchantId
    || fromMerchantId === toMerchantId
    || isCurrencyMismatch
    || isCountryMismatch
  );

  const formatBalance = (value: number, currency: string) =>
    formatCurrency(value, currency, locale === 'id' ? 'id' : 'en');

  const getSubscriptionLabel = (type: GroupMerchant['subscription']['type']) =>
    t(`admin.groupBilling.subscription.${type}`);

  const getStatusLabel = (status: GroupMerchant['subscription']['status']) =>
    t(`admin.groupBilling.status.${status}`);

  const getBranchTypeLabel = (type: GroupMerchant['branchType']) =>
    t(`admin.groupBilling.type.${type}`);

  const openTransferModal = (preset?: { fromMerchantId?: string; toMerchantId?: string }) => {
    setTransferError(null);
    setTransferSuccess(null);
    setAmount('');
    setNote('');
    setFromMerchantId(preset?.fromMerchantId ?? '');
    setToMerchantId(preset?.toMerchantId ?? '');
    setTransferModalOpen(true);
  };

  const openPromoteConfirm = (target: GroupMerchant) => {
    setPromoteError(null);
    setPromoteTarget(target);
    setPromoteConfirmOpen(true);
  };

  const handleConfirmPromote = async () => {
    if (!promoteTarget) return;

    setPromoteConfirmOpen(false);
    setPromoteSubmittingId(promoteTarget.id);
    setPromoteError(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetchMerchantApi('/api/merchant/branches/set-main', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ merchantId: promoteTarget.id }),
        token,
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        setPromoteError(result?.message || t('admin.groupBilling.actions.setMainError'));
        return;
      }

      await mutate();
    } catch (err) {
      setPromoteError(err instanceof Error ? err.message : t('admin.groupBilling.actions.setMainError'));
    } finally {
      setPromoteSubmittingId(null);
      setPromoteTarget(null);
    }
  };

  const handleSubmitTransfer = () => {
    setTransferError(null);
    setTransferSuccess(null);

    if (!fromMerchantId || !toMerchantId || fromMerchantId === toMerchantId) {
      setTransferError(t('admin.groupBilling.transfer.validation.selectDifferent'));
      return;
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      setTransferError(t('admin.groupBilling.transfer.validation.invalidAmount'));
      return;
    }

    if (isCurrencyMismatch) {
      setTransferError(t('admin.groupBilling.transfer.validation.currencyMismatch'));
      return;
    }

    if (isCountryMismatch) {
      setTransferError(t('admin.groupBilling.transfer.validation.countryMismatch'));
      return;
    }

    setConfirmOpen(true);
  };

  const handleConfirmTransfer = async () => {
    if (!fromMerchant || !toMerchant) return;

    setConfirmOpen(false);
    setIsSubmitting(true);
    setTransferError(null);
    setTransferSuccess(null);

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetchMerchantApi('/api/merchant/balance/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromMerchantId,
          toMerchantId,
          amount: amountNumber,
          note: note.trim() || undefined,
        }),
        token,
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        setTransferError(result?.message || t('admin.groupBilling.transfer.errorMessage'));
        return;
      }

      setTransferSuccess(t('admin.groupBilling.transfer.successMessage'));
      setTransferModalOpen(false);
      setAmount('');
      setNote('');
      await mutate();
    } catch (err) {
      setTransferError(
        err instanceof Error ? err.message : t('admin.groupBilling.transfer.errorMessage')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-40 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-64 rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle={t('admin.groupBilling.title')} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.groupBilling.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('admin.groupBilling.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => openTransferModal()}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-600"
        >
          {t('admin.groupBilling.transfer.title')}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
          {error.message}
        </div>
      )}

      {promoteError && (
        <div className="rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
          {promoteError}
        </div>
      )}

      {transferSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
          {transferSuccess}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          {t('admin.groupBilling.empty')}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const groupMerchants = [group.main, ...group.branches];
            const totalsByCurrency = new Map<string, { balance: number; revenue30d: number }>();
            for (const m of groupMerchants) {
              const currency = m.currency || 'IDR';
              const prev = totalsByCurrency.get(currency) || { balance: 0, revenue30d: 0 };
              prev.balance += m.balance?.amount ?? 0;
              prev.revenue30d += m.earnings?.revenue30d ?? 0;
              totalsByCurrency.set(currency, prev);
            }

            const currencies = Array.from(totalsByCurrency.keys()).sort();
            const isMultiCurrency = currencies.length > 1;
            const groupCurrency = group.main.currency || currencies[0] || 'IDR';
            const totalBalance = isMultiCurrency
              ? null
              : totalsByCurrency.get(groupCurrency)?.balance ?? 0;
            const totalRevenue30d = isMultiCurrency
              ? null
              : totalsByCurrency.get(groupCurrency)?.revenue30d ?? 0;
            const totalPaidOrders30d = groupMerchants.reduce(
              (sum, m) => sum + (m.earnings?.paidOrders30d ?? 0),
              0
            );

            return (
              <div key={group.main.id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
                      {group.main.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={group.main.logoUrl}
                          alt={group.main.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                          {group.main.name?.slice(0, 2)?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {group.main.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>/{group.main.code}</span>
                        {group.main.country ? (
                          <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
                            {group.main.country}
                          </span>
                        ) : null}
                        {currencies.map((currency) => (
                          <span
                            key={currency}
                            className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300"
                          >
                            {currency}
                          </span>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t('admin.groupBilling.groupsSubtitle')}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.groupBilling.stats.balanceTotal')}</p>
                      <div className="mt-0.5 space-y-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                        {isMultiCurrency
                          ? currencies.map((currency) => (
                              <div key={currency}>{formatBalance(totalsByCurrency.get(currency)?.balance ?? 0, currency)}</div>
                            ))
                          : <div>{formatBalance(totalBalance ?? 0, groupCurrency)}</div>}
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.groupBilling.stats.revenue30d')}</p>
                      <div className="mt-0.5 space-y-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                        {isMultiCurrency
                          ? currencies.map((currency) => (
                              <div key={currency}>{formatBalance(totalsByCurrency.get(currency)?.revenue30d ?? 0, currency)}</div>
                            ))
                          : <div>{formatBalance(totalRevenue30d ?? 0, groupCurrency)}</div>}
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.groupBilling.stats.orders30d')}</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                        {totalPaidOrders30d}
                      </p>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-800">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('admin.groupBilling.stats.branches')}</p>
                      <p className="mt-0.5 text-sm font-semibold text-gray-900 dark:text-white">
                        {groupMerchants.length}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-3 py-2 text-left">{t('admin.groupBilling.table.branch')}</th>
                        <th className="px-3 py-2 text-left">{t('admin.groupBilling.table.type')}</th>
                        <th className="px-3 py-2 text-left">{t('admin.groupBilling.table.subscription')}</th>
                        <th className="px-3 py-2 text-left">{t('admin.groupBilling.table.status')}</th>
                        <th className="px-3 py-2 text-right">{t('admin.groupBilling.table.daysRemaining')}</th>
                        <th className="px-3 py-2 text-right">{t('admin.groupBilling.table.revenue30d')}</th>
                        <th className="px-3 py-2 text-right">{t('admin.groupBilling.table.balance')}</th>
                        <th className="px-3 py-2 text-right">{t('admin.groupBilling.table.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700 dark:text-gray-200">
                      {groupMerchants.map((merchant) => (
                        <tr key={merchant.id} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800">
                                {merchant.logoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={merchant.logoUrl}
                                    alt={merchant.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300">
                                    {merchant.name?.slice(0, 2)?.toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">{merchant.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">/{merchant.code}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className={
                              merchant.branchType === 'MAIN'
                                ? 'inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                                : 'inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300'
                            }>
                              {getBranchTypeLabel(merchant.branchType)}
                            </span>
                          </td>
                          <td className="px-3 py-2">{getSubscriptionLabel(merchant.subscription.type)}</td>
                          <td className="px-3 py-2">{getStatusLabel(merchant.subscription.status)}</td>
                          <td className="px-3 py-2 text-right">
                            {merchant.subscription.daysRemaining ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {merchant.earnings?.paidOrders30d ?? 0} {t('admin.groupBilling.table.orders30dShort')}
                            </div>
                            <div className="font-medium">
                              {formatBalance(merchant.earnings?.revenue30d ?? 0, merchant.currency)}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {formatBalance(merchant.balance?.amount ?? 0, merchant.currency)}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openTransferModal({ fromMerchantId: merchant.id })}
                                className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                              >
                                {t('admin.groupBilling.transfer.submit')}
                              </button>

                              {merchant.branchType === 'BRANCH' ? (
                                <button
                                  type="button"
                                  onClick={() => openPromoteConfirm(merchant)}
                                  disabled={promoteSubmittingId === merchant.id}
                                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
                                >
                                  {promoteSubmittingId === merchant.id
                                    ? t('admin.groupBilling.actions.promoting')
                                    : t('admin.groupBilling.actions.setMain')}
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            );
          })}
        </div>
      )}

      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        className="max-w-[760px] m-4"
      >
        <div className="p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.groupBilling.transfer.title')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('admin.groupBilling.transfer.subtitle')}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.groupBilling.transfer.fromLabel')}
              </label>
              <select
                value={fromMerchantId}
                onChange={(event) => setFromMerchantId(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="">{t('admin.groupBilling.transfer.selectBranchPlaceholder')}</option>
                {allMerchants
                  .filter((m) => m.id !== toMerchantId)
                  .filter((m) => {
                    if (!toMerchant) return true;
                    if (toMerchant.currency && m.currency && m.currency !== toMerchant.currency) return false;
                    if (toMerchant.country && m.country && m.country !== toMerchant.country) return false;
                    return true;
                  })
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.groupBilling.transfer.toLabel')}
              </label>
              <select
                value={toMerchantId}
                onChange={(event) => setToMerchantId(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              >
                <option value="">{t('admin.groupBilling.transfer.selectBranchPlaceholder')}</option>
                {allMerchants
                  .filter((m) => m.id !== fromMerchantId)
                  .filter((m) => {
                    if (!fromMerchant) return true;
                    if (fromMerchant.currency && m.currency && m.currency !== fromMerchant.currency) return false;
                    if (fromMerchant.country && m.country && m.country !== fromMerchant.country) return false;
                    return true;
                  })
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.groupBilling.transfer.amountLabel')}
              </label>
              <input
                type="number"
                min="0"
                step={decimals === 0 ? '1' : '0.01'}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={!fromMerchantId || !toMerchantId}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-white dark:disabled:bg-gray-900"
                placeholder={!fromMerchantId || !toMerchantId ? '—' : formatBalance(0, transferCurrency)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('admin.groupBilling.transfer.noteLabel')}
              </label>
              <input
                type="text"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
                placeholder={t('admin.groupBilling.transfer.notePlaceholder')}
              />
            </div>
          </div>

          {isCurrencyMismatch && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              {t('admin.groupBilling.transfer.validation.currencyMismatch')}
            </div>
          )}

          {isCountryMismatch && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
              {t('admin.groupBilling.transfer.validation.countryMismatch')}
            </div>
          )}

          {transferError && (
            <div className="mt-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
              {transferError}
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setTransferModalOpen(false)}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmitTransfer}
              disabled={isTransferBlocked}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? t('admin.groupBilling.transfer.submitting')
                : t('admin.groupBilling.transfer.submit')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={t('admin.groupBilling.transfer.confirmTitle')}
        message={t('admin.groupBilling.transfer.confirmMessage', {
          amount: formatBalance(amountNumber || 0, transferCurrency),
          from: fromMerchant?.name || '',
          to: toMerchant?.name || '',
        })}
        confirmText={t('admin.groupBilling.transfer.submit')}
        cancelText={t('common.cancel')}
        variant="warning"
        onConfirm={handleConfirmTransfer}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmDialog
        isOpen={promoteConfirmOpen}
        title={t('admin.groupBilling.actions.confirmSetMainTitle')}
        message={t('admin.groupBilling.actions.confirmSetMainMessage', {
          branch: promoteTarget?.name || '',
        })}
        confirmText={t('admin.groupBilling.actions.setMain')}
        cancelText={t('common.cancel')}
        variant="warning"
        onConfirm={handleConfirmPromote}
        onCancel={() => setPromoteConfirmOpen(false)}
      />
    </div>
  );
}
