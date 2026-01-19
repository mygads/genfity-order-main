'use client';

import React, { useMemo, useState } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import { useSWRStatic } from '@/hooks/useSWRWithAuth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils/format';
import { getCurrencyConfig } from '@/lib/constants/location';
import ConfirmDialog from '@/components/modals/ConfirmDialog';

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
  currency: string;
  timezone: string | null;
  balance: {
    amount: number;
    lastTopupAt: string | null;
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
  const { data, error, isLoading, mutate } = useSWRStatic<ApiResponse<GroupData>>(
    '/api/merchant/balance/group'
  );

  const [fromMerchantId, setFromMerchantId] = useState('');
  const [toMerchantId, setToMerchantId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

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

  const formatBalance = (value: number, currency: string) =>
    formatCurrency(value, currency, locale === 'id' ? 'id' : 'en');

  const getSubscriptionLabel = (type: GroupMerchant['subscription']['type']) =>
    t(`admin.groupBilling.subscription.${type}`);

  const getStatusLabel = (status: GroupMerchant['subscription']['status']) =>
    t(`admin.groupBilling.status.${status}`);

  const getBranchTypeLabel = (type: GroupMerchant['branchType']) =>
    t(`admin.groupBilling.type.${type}`);

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
      const response = await fetch('/api/merchant/balance/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromMerchantId,
          toMerchantId,
          amount: amountNumber,
          note: note.trim() || undefined,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        setTransferError(result?.message || t('admin.groupBilling.transfer.errorMessage'));
        return;
      }

      setTransferSuccess(t('admin.groupBilling.transfer.successMessage'));
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

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('admin.groupBilling.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('admin.groupBilling.subtitle')}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
          {error.message}
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
            const totalBalance = groupMerchants.reduce((sum, merchant) => sum + (merchant.balance?.amount ?? 0), 0);
            const groupCurrency = group.main.currency || 'IDR';

            return (
              <div key={group.main.id} className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {group.main.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">/{group.main.code}</p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('admin.groupBilling.groupsSubtitle')}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-4 py-2 text-right text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    <p className="text-xs uppercase text-gray-400">{t('admin.groupBilling.table.balance')}</p>
                    <p className="text-base font-semibold">
                      {formatBalance(totalBalance, groupCurrency)}
                    </p>
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
                        <th className="px-3 py-2 text-right">{t('admin.groupBilling.table.balance')}</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700 dark:text-gray-200">
                      {groupMerchants.map((merchant) => (
                        <tr key={merchant.id} className="border-t border-gray-100 dark:border-gray-800">
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-900 dark:text-white">{merchant.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">/{merchant.code}</div>
                          </td>
                          <td className="px-3 py-2">{getBranchTypeLabel(merchant.branchType)}</td>
                          <td className="px-3 py-2">{getSubscriptionLabel(merchant.subscription.type)}</td>
                          <td className="px-3 py-2">{getStatusLabel(merchant.subscription.status)}</td>
                          <td className="px-3 py-2 text-right">
                            {merchant.subscription.daysRemaining ?? '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-medium">
                            {formatBalance(merchant.balance?.amount ?? 0, merchant.currency)}
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

      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('admin.groupBilling.transfer.title')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
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
              {allMerchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
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
              {allMerchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
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
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-950 dark:text-white"
              placeholder={formatBalance(0, transferCurrency)}
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

        {transferError && (
          <div className="mt-4 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700 dark:border-error-800 dark:bg-error-900/20 dark:text-error-400">
            {transferError}
          </div>
        )}

        {transferSuccess && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400">
            {transferSuccess}
          </div>
        )}

        <div className="mt-5 flex items-center justify-end">
          <button
            type="button"
            onClick={handleSubmitTransfer}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? t('admin.groupBilling.transfer.submitting')
              : t('admin.groupBilling.transfer.submit')}
          </button>
        </div>
      </div>

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
    </div>
  );
}
