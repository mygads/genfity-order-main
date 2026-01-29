import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { TranslationKeys } from '@/lib/i18n';
import { tOr } from '@/lib/i18n/useTranslation';
import SettingsCard from '@/components/merchants/merchant-edit/ui/SettingsCard';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import ConfirmDialog from '@/components/modals/ConfirmDialog';
import { Modal } from '@/components/ui/modal';
import {
  COUNTRIES,
  CURRENCIES,
  getCurrencyForCountry,
  getDefaultTimezoneForCountry,
  getTimezonesForCountry,
} from '@/lib/constants/location';
import { getAdminAuth } from '@/lib/utils/adminAuth';

export interface BranchesTabProps {
  t: (key: TranslationKeys | string, params?: Record<string, string | number>) => string;
  showSuccess: (title: string, message: string, duration?: number) => void;
  showError: (title: string, message: string, duration?: number) => void;
}

type BranchMerchant = {
  id: string;
  code: string;
  name: string;
  branchType?: 'MAIN' | 'BRANCH';
  parentMerchantId?: string | null;
  parentMerchantName?: string | null;
  isActive?: boolean;
  currency?: string | null;
  timezone?: string | null;
  country?: string | null;
  address?: string | null;
  branches?: BranchMerchant[];
};

type BranchGroup = {
  main: BranchMerchant;
  branches: BranchMerchant[];
};

type BranchFormState = {
  name: string;
  code: string;
  address: string;
  phoneNumber: string;
  email: string;
  country: string;
  currency: string;
  timezone: string;
  isOpen: boolean;
};

type BranchFormErrors = Partial<Record<keyof BranchFormState | 'parentMerchantId', string>>;

type CreateMode = 'MAIN' | 'BRANCH';

const DEFAULT_FORM_STATE: BranchFormState = {
  name: '',
  code: '',
  address: '',
  phoneNumber: '',
  email: '',
  country: 'Australia',
  currency: 'AUD',
  timezone: 'Australia/Sydney',
  isOpen: true,
};

export default function BranchesTab({ t, showSuccess, showError }: BranchesTabProps) {
  const [groups, setGroups] = useState<BranchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [setMainLoading, setSetMainLoading] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<CreateMode>('BRANCH');
  const [parentMerchantId, setParentMerchantId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BranchFormState>(DEFAULT_FORM_STATE);
  const [formErrors, setFormErrors] = useState<BranchFormErrors>({});
  const [pendingMainBranch, setPendingMainBranch] = useState<BranchMerchant | null>(null);
  const [copyFromMerchantId, setCopyFromMerchantId] = useState<string>('');
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertMerchant, setConvertMerchant] = useState<BranchMerchant | null>(null);
  const [convertTargetMainId, setConvertTargetMainId] = useState<string>('');
  const [converting, setConverting] = useState(false);

  const mainMerchants = useMemo(() => groups.map((group) => group.main), [groups]);

  const allOwnedMerchants = useMemo(() => {
    const list: BranchMerchant[] = [];
    for (const group of groups) {
      list.push(group.main);
      for (const branch of group.branches) list.push(branch);
    }
    return list;
  }, [groups]);

  const merchantLookup = useMemo(() => {
    return new Map(allOwnedMerchants.map((merchant) => [merchant.id, merchant]));
  }, [allOwnedMerchants]);
  const mainMerchantLookup = useMemo(() => {
    return new Map(mainMerchants.map((merchant) => [merchant.id, merchant]));
  }, [mainMerchants]);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showError(
          tOr(t, 'admin.merchantEdit.branches.errorTitle', 'Error'),
          tOr(t, 'admin.merchantEdit.branches.loadFailed', 'Failed to load branches.')
        );
        return;
      }

      const response = await fetch('/api/merchant/branches', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to load branches');
      }

      const fetchedGroups = (result?.data?.groups || []) as BranchGroup[];
      setGroups(fetchedGroups);

      setCreateMode((prev) => {
        if (fetchedGroups.length === 0) return 'MAIN';
        return prev;
      });

      const currentMerchantId = getAdminAuth({ skipRedirect: true })?.user?.merchantId
        || (typeof window !== 'undefined' ? localStorage.getItem('merchantId') : null);

      const matchingGroup = currentMerchantId
        ? fetchedGroups.find((group) => {
            const ids = [group.main.id, ...group.branches.map((branch) => branch.id)];
            return ids.includes(currentMerchantId);
          })
        : undefined;

      const nextParentId = matchingGroup?.main?.id || fetchedGroups[0]?.main?.id || null;
      setParentMerchantId(nextParentId || null);
      if (nextParentId) {
        const parent = fetchedGroups.find((group) => group.main.id === nextParentId)?.main;
        if (parent) {
          setFormData((prev) => ({
            ...prev,
            country: parent.country || prev.country,
            currency: parent.currency || prev.currency,
            timezone: parent.timezone || prev.timezone,
          }));
        }
      }
    } catch (error) {
      showError(
        tOr(t, 'admin.merchantEdit.branches.errorTitle', 'Error'),
        error instanceof Error
          ? error.message
          : tOr(t, 'admin.merchantEdit.branches.loadFailed', 'Failed to load branches.')
      );
    } finally {
      setLoading(false);
    }
  }, [showError, t]);

  useEffect(() => {
    void fetchBranches();
  }, [fetchBranches]);

  const handleParentChange = (value: string) => {
    setParentMerchantId(value);
    const parent = mainMerchantLookup.get(value);
    if (parent) {
      setFormData((prev) => ({
        ...prev,
        country: parent.country || prev.country,
        currency: parent.currency || prev.currency,
        timezone: parent.timezone || prev.timezone,
      }));
    }
    if (formErrors.parentMerchantId) {
      setFormErrors((prev) => ({ ...prev, parentMerchantId: undefined }));
    }
  };

  const handleCountryChange = (value: string) => {
    const nextCurrency = getCurrencyForCountry(value);
    const nextTimezone = getDefaultTimezoneForCountry(value);
    setFormData((prev) => ({
      ...prev,
      country: value,
      currency: nextCurrency,
      timezone: nextTimezone,
    }));
  };

  const handleCopyFromChange = (value: string) => {
    setCopyFromMerchantId(value);

    if (!value) return;
    const source = merchantLookup.get(value);
    if (!source) return;

    setFormData((prev) => ({
      ...prev,
      country: source.country || prev.country,
      currency: source.currency || prev.currency,
      timezone: source.timezone || prev.timezone,
      isOpen: prev.isOpen,
    }));
  };

  const handleInputChange = (field: keyof BranchFormState, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = () => {
    const errors: BranchFormErrors = {};
    if (createMode === 'BRANCH' && !parentMerchantId) {
      errors.parentMerchantId = tOr(t, 'admin.merchantEdit.branches.validationParent', 'Main merchant is required.');
    }
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = createMode === 'MAIN'
        ? tOr(t, 'admin.merchantEdit.branches.validationMainName', 'Merchant name must be at least 2 characters.')
        : tOr(t, 'admin.merchantEdit.branches.validationName', 'Branch name must be at least 2 characters.');
    }

    const code = formData.code.trim();
    if (code.length < 4 || code.length > 8) {
      errors.code = tOr(
        t,
        'admin.merchantEdit.branches.validationCodeLength',
        'Branch code must be 4-8 characters.'
      );
    } else if (!/^[A-Z0-9]+$/.test(code.toUpperCase())) {
      errors.code = tOr(
        t,
        'admin.merchantEdit.branches.validationCodeFormat',
        'Branch code must use A-Z and 0-9 only.'
      );
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateMainMerchant = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showError(
          tOr(t, 'admin.merchantEdit.branches.errorTitle', 'Error'),
          tOr(t, 'admin.merchantEdit.branches.createMainFailed', 'Failed to create main merchant.')
        );
        return;
      }

      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        address: formData.address.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        email: formData.email.trim() || undefined,
        country: formData.country,
        currency: formData.currency,
        timezone: formData.timezone,
        isOpen: formData.isOpen,
        copyFromMerchantId: copyFromMerchantId || undefined,
      };

      const response = await fetch('/api/merchant/main', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to create main merchant');
      }

      showSuccess(
        tOr(t, 'admin.merchantEdit.branches.successTitle', 'Success'),
        tOr(t, 'admin.merchantEdit.branches.createMainSuccess', 'Main merchant created successfully.')
      );

      setCopyFromMerchantId('');
      setFormData((prev) => ({
        ...prev,
        name: '',
        code: '',
        address: '',
        phoneNumber: '',
        email: '',
      }));

      await fetchBranches();
    } catch (error) {
      showError(
        tOr(t, 'admin.merchantEdit.branches.errorTitle', 'Error'),
        error instanceof Error
          ? error.message
          : tOr(t, 'admin.merchantEdit.branches.createMainFailed', 'Failed to create main merchant.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const openConvertToBranchModal = (merchant: BranchMerchant) => {
    setConvertMerchant(merchant);
    setConvertTargetMainId('');
    setConvertModalOpen(true);
  };

  const openMoveToAnotherMainModal = (merchant: BranchMerchant) => {
    setConvertMerchant(merchant);
    setConvertTargetMainId('');
    setConvertModalOpen(true);
  };

  const closeConvertToBranchModal = () => {
    if (converting) return;
    setConvertModalOpen(false);
    setConvertMerchant(null);
    setConvertTargetMainId('');
  };

  const handleConvertToBranch = async () => {
    if (!convertMerchant || !convertTargetMainId) return;

    setConverting(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showError(
          tOr(t, 'admin.merchantEdit.branches.errorTitle', 'Error'),
          tOr(t, 'admin.merchantEdit.branches.convertFailed', 'Failed to convert merchant.')
        );
        return;
      }

      const response = await fetch('/api/merchant/branches/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          merchantId: convertMerchant.id,
          targetMainMerchantId: convertTargetMainId,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to convert merchant');
      }

      showSuccess(
        tOr(t, 'admin.merchantEdit.branches.successTitle', 'Success'),
        tOr(t, 'admin.merchantEdit.branches.convertSuccess', 'Merchant updated successfully.')
      );

      closeConvertToBranchModal();
      await fetchBranches();
    } catch (error) {
      showError(
        tOr(t, 'admin.merchantEdit.branches.errorTitle', 'Error'),
        error instanceof Error
          ? error.message
          : tOr(t, 'admin.merchantEdit.branches.convertFailed', 'Failed to convert merchant.')
      );
    } finally {
      setConverting(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showError(
          tOr(t, 'admin.merchantEdit.branches.errorTitle', 'Error'),
          tOr(t, 'admin.merchantEdit.branches.createFailed', 'Failed to create branch.')
        );
        return;
      }

      const payload = {
        parentMerchantId,
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        address: formData.address.trim() || undefined,
        phoneNumber: formData.phoneNumber.trim() || undefined,
        email: formData.email.trim() || undefined,
        country: formData.country,
        currency: formData.currency,
        timezone: formData.timezone,
        isOpen: formData.isOpen,
      };

      const response = await fetch('/api/merchant/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to create branch');
      }

      showSuccess(
        tOr(t, 'admin.merchantEdit.branches.successTitle', 'Success'),
        tOr(t, 'admin.merchantEdit.branches.createSuccess', 'Branch created successfully.')
      );
      setFormData((prev) => ({
        ...prev,
        name: '',
        code: '',
        address: '',
        phoneNumber: '',
        email: '',
      }));
      await fetchBranches();
    } catch (error) {
      showError(
        tOr(t, 'admin.merchantEdit.branches.errorTitle', 'Error'),
        error instanceof Error
          ? error.message
          : tOr(t, 'admin.merchantEdit.branches.createFailed', 'Failed to create branch.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetMain = async (merchantId: string) => {
    setSetMainLoading(merchantId);
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        showError(
          tOr(t, 'admin.merchantEdit.branches.errorTitle', 'Error'),
          tOr(t, 'admin.merchantEdit.branches.setMainFailed', 'Failed to set main branch.')
        );
        return;
      }

      const response = await fetch('/api/merchant/branches/set-main', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ merchantId }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || 'Failed to set main branch');
      }

      showSuccess(
        tOr(t, 'admin.merchantEdit.branches.successTitle', 'Success'),
        tOr(t, 'admin.merchantEdit.branches.setMainSuccess', 'Main branch updated.')
      );
      await fetchBranches();
    } catch (error) {
      showError(
        tOr(t, 'admin.merchantEdit.branches.errorTitle', 'Error'),
        error instanceof Error
          ? error.message
          : tOr(t, 'admin.merchantEdit.branches.setMainFailed', 'Failed to set main branch.')
      );
    } finally {
      setSetMainLoading(null);
    }
  };

  const handleConfirmSetMain = async () => {
    if (!pendingMainBranch) return;
    await handleSetMain(pendingMainBranch.id);
    setPendingMainBranch(null);
  };

  const availableTimezones = getTimezonesForCountry(formData.country);

  return (
    <div
      className="space-y-6"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
    >
      <SettingsCard
        title={tOr(t, 'admin.merchantEdit.branches.title', 'Branch management')}
        description={tOr(
          t,
          'admin.merchantEdit.branches.desc',
          'Create new outlets and choose which branch is the main store.'
        )}
      >
        <div className="space-y-5">
          <SettingsCard
            title={tOr(t, 'admin.merchantEdit.branches.listTitle', 'Branch overview')}
            description={tOr(t, 'admin.merchantEdit.branches.listDesc', 'Manage your groups and switch a branch to be the main store.')}
            className="bg-gray-50/60 dark:bg-gray-950/40"
          >
            {loading ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {tOr(t, 'common.loading', 'Loading...')}
              </div>
            ) : groups.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {tOr(t, 'admin.merchantEdit.branches.emptyTitle', 'No branches yet')}
                </p>
                <p className="mt-1">
                  {tOr(t, 'admin.merchantEdit.branches.emptyDesc', 'Create your first outlet to expand your business.')}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {groups.map((group) => (
                  <div key={group.main.id} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {group.main.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">/{group.main.code}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/30 dark:text-brand-200">
                          {tOr(t, 'admin.merchantEdit.branches.mainBadge', 'Main')}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={group.branches.length > 0}
                          onClick={() => openConvertToBranchModal(group.main)}
                        >
                          {tOr(t, 'admin.merchantEdit.branches.convertToBranchButton', 'Convert to branch')}
                        </Button>
                      </div>
                    </div>

                    {group.branches.length > 0 ? (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {tOr(
                          t,
                          'admin.merchantEdit.branches.convertMainDisabledHint',
                          'Convert to branch is disabled while this main merchant still has branches.'
                        )}
                      </p>
                    ) : null}

                    {group.branches.length > 0 ? (
                      <div className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
                        {group.branches.map((branch) => (
                          <div key={branch.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{branch.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">/{branch.code}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                                {tOr(t, 'admin.merchantEdit.branches.branchBadge', 'Branch')}
                              </span>
                              {mainMerchants.length > 1 ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openMoveToAnotherMainModal(branch)}
                                >
                                  {tOr(t, 'admin.merchantEdit.branches.moveToAnotherMainButton', 'Move to another main')}
                                </Button>
                              ) : null}
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                isLoading={setMainLoading === branch.id}
                                onClick={() => setPendingMainBranch(branch)}
                              >
                                {tOr(t, 'admin.merchantEdit.branches.setMainButton', 'Set as main')}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                        {tOr(t, 'admin.merchantEdit.branches.noBranchInGroup', 'No branches in this group yet.')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SettingsCard>

          <SettingsCard
            title={createMode === 'MAIN'
              ? tOr(t, 'admin.merchantEdit.branches.createMainTitle', 'Create new main merchant')
              : tOr(t, 'admin.merchantEdit.branches.createTitle', 'Create new branch')}
            description={createMode === 'MAIN'
              ? tOr(t, 'admin.merchantEdit.branches.createMainDesc', 'Create a new merchant group as a main store.')
              : tOr(t, 'admin.merchantEdit.branches.createDesc', 'Add a new outlet under a main merchant.')}
            className="bg-gray-50/60 dark:bg-gray-950/40"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={createMode === 'BRANCH' ? 'primary' : 'outline'}
                onClick={() => {
                  setCreateMode('BRANCH');
                  setFormErrors({});
                }}
              >
                {tOr(t, 'admin.merchantEdit.branches.modeBranch', 'Create branch')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={createMode === 'MAIN' ? 'primary' : 'outline'}
                onClick={() => {
                  setCreateMode('MAIN');
                  setFormErrors({});
                }}
              >
                {tOr(t, 'admin.merchantEdit.branches.modeMain', 'Create main')}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {createMode === 'MAIN' ? (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {tOr(t, 'admin.merchantEdit.branches.copyFromLabel', 'Copy settings from (optional)')}
                  </label>
                  <select
                    value={copyFromMerchantId}
                    onChange={(event) => handleCopyFromChange(event.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">
                      {tOr(t, 'admin.merchantEdit.branches.copyFromNone', 'Do not copy')}
                    </option>
                    {allOwnedMerchants.map((merchant) => (
                      <option key={merchant.id} value={merchant.id}>
                        {merchant.name} /{merchant.code}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {tOr(
                      t,
                      'admin.merchantEdit.branches.copyFromHint',
                      'Copies store settings like taxes, service charges, and feature toggles. Does not copy logo/banner assets.'
                    )}
                  </p>
                </div>
              ) : null}

              {createMode === 'BRANCH' ? (
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {tOr(t, 'admin.merchantEdit.branches.parentLabel', 'Main merchant')}
                  </label>
                  <select
                    value={parentMerchantId ?? ''}
                    onChange={(event) => handleParentChange(event.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="" disabled>
                      {tOr(t, 'admin.merchantEdit.branches.parentPlaceholder', 'Select main merchant')}
                    </option>
                    {mainMerchants.map((merchant) => (
                      <option key={merchant.id} value={merchant.id}>
                        {merchant.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.parentMerchantId ? (
                    <p className="mt-1 text-xs text-red-500">{formErrors.parentMerchantId}</p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {createMode === 'MAIN'
                    ? tOr(t, 'admin.merchantEdit.branches.mainNameLabel', 'Merchant name')
                    : tOr(t, 'admin.merchantEdit.branches.branchNameLabel', 'Branch name')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(event) => handleInputChange('name', event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  placeholder={createMode === 'MAIN'
                    ? tOr(t, 'admin.merchantEdit.branches.mainNamePlaceholder', 'My new store')
                    : tOr(t, 'admin.merchantEdit.branches.branchNamePlaceholder', 'Downtown outlet')}
                />
                {formErrors.name ? <p className="mt-1 text-xs text-red-500">{formErrors.name}</p> : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {createMode === 'MAIN'
                    ? tOr(t, 'admin.merchantEdit.branches.mainCodeLabel', 'Merchant code')
                    : tOr(t, 'admin.merchantEdit.branches.branchCodeLabel', 'Branch code')}
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(event) => {
                    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
                    handleInputChange('code', value);
                  }}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  placeholder="BRCH"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {tOr(t, 'admin.merchantEdit.branches.branchCodeHint', '4-8 characters, A-Z and 0-9.')}
                </p>
                {formErrors.code ? <p className="mt-1 text-xs text-red-500">{formErrors.code}</p> : null}
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tOr(t, 'admin.merchantEdit.branches.addressLabel', 'Address')}
                </label>
                <textarea
                  value={formData.address}
                  onChange={(event) => handleInputChange('address', event.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  placeholder={tOr(t, 'admin.merchantEdit.branches.addressPlaceholder', 'Street address, city')}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tOr(t, 'admin.merchantEdit.branches.phoneLabel', 'Phone')}
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(event) => handleInputChange('phoneNumber', event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tOr(t, 'admin.merchantEdit.branches.emailLabel', 'Email')}
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => handleInputChange('email', event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tOr(t, 'admin.merchantEdit.branches.countryLabel', 'Country')}
                </label>
                <select
                  value={formData.country}
                  onChange={(event) => handleCountryChange(event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.value} value={country.value}>
                      {country.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tOr(t, 'admin.merchantEdit.branches.currencyLabel', 'Currency')}
                </label>
                <select
                  value={formData.currency}
                  onChange={(event) => handleInputChange('currency', event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.value} value={currency.value}>
                      {currency.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tOr(t, 'admin.merchantEdit.branches.timezoneLabel', 'Timezone')}
                </label>
                <select
                  value={formData.timezone}
                  onChange={(event) => handleInputChange('timezone', event.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                >
                  {availableTimezones.map((timezone) => (
                    <option key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                    {tOr(t, 'admin.merchantEdit.branches.isOpenLabel', 'Open for orders')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tOr(t, 'admin.merchantEdit.branches.isOpenHint', 'You can still close the store later.')}
                  </p>
                </div>
                <Switch
                  checked={formData.isOpen}
                  onCheckedChange={(checked) => handleInputChange('isOpen', checked)}
                  aria-label={tOr(t, 'admin.merchantEdit.branches.isOpenLabel', 'Open for orders')}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <Button
                type="button"
                variant="primary"
                isLoading={submitting}
                onClick={createMode === 'MAIN' ? handleCreateMainMerchant : handleCreateBranch}
              >
                {submitting
                  ? tOr(t, 'admin.merchantEdit.branches.creatingButton', 'Creating...')
                  : (createMode === 'MAIN'
                      ? tOr(t, 'admin.merchantEdit.branches.createMainButton', 'Create main merchant')
                      : tOr(t, 'admin.merchantEdit.branches.createButton', 'Create branch'))}
              </Button>
            </div>
          </SettingsCard>
        </div>
      </SettingsCard>

      <ConfirmDialog
        isOpen={Boolean(pendingMainBranch)}
        title={tOr(
          t,
          'admin.merchantEdit.branches.setMainConfirmTitle',
          'Set as main branch?'
        )}
        message={pendingMainBranch
          ? tOr(
              t,
              'admin.merchantEdit.branches.setMainConfirmMessage',
              `Make ${pendingMainBranch.name} the main branch? This will move the current main to a branch.`,
              { name: pendingMainBranch.name }
            )
          : ''}
        confirmText={tOr(t, 'admin.merchantEdit.branches.setMainConfirmCta', 'Set as main')}
        cancelText={tOr(t, 'common.cancel', 'Cancel')}
        variant="warning"
        onConfirm={handleConfirmSetMain}
        onCancel={() => setPendingMainBranch(null)}
      />

      <Modal
        isOpen={convertModalOpen}
        onClose={closeConvertToBranchModal}
        className="max-w-2xl p-6"
        disableImplicitClose={converting}
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {convertMerchant?.branchType === 'BRANCH'
                ? tOr(t, 'admin.merchantEdit.branches.moveModalTitle', 'Move to another main')
                : tOr(t, 'admin.merchantEdit.branches.convertModalTitle', 'Convert to branch')}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {convertMerchant
                ? (convertMerchant.branchType === 'BRANCH'
                    ? tOr(
                        t,
                        'admin.merchantEdit.branches.moveModalDesc',
                        'Move {name} to another main merchant group.',
                        { name: convertMerchant.name }
                      )
                    : tOr(
                        t,
                        'admin.merchantEdit.branches.convertModalDesc',
                        'Move {name} under another main merchant.',
                        { name: convertMerchant.name }
                      ))
                : tOr(t, 'admin.merchantEdit.branches.convertModalDescFallback', 'Move this merchant under another main merchant.')}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {tOr(t, 'admin.merchantEdit.branches.convertTargetLabel', 'Target main merchant')}
            </label>
            <select
              value={convertTargetMainId}
              onChange={(event) => setConvertTargetMainId(event.target.value)}
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
            >
              <option value="" disabled>
                {tOr(t, 'admin.merchantEdit.branches.convertTargetPlaceholder', 'Select a main merchant')}
              </option>
              {mainMerchants
                .filter((m) => m.id !== convertMerchant?.id)
                .filter((m) => (convertMerchant?.parentMerchantId ? m.id !== convertMerchant.parentMerchantId : true))
                .map((merchant) => (
                  <option key={merchant.id} value={merchant.id}>
                    {merchant.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={closeConvertToBranchModal}
              disabled={converting}
            >
              {tOr(t, 'common.cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={converting}
              disabled={!convertMerchant || !convertTargetMainId}
              onClick={handleConvertToBranch}
            >
              {tOr(t, 'admin.merchantEdit.branches.convertConfirmButton', 'Convert')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
