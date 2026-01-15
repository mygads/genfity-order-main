import React from 'react';
import { FaKey, FaEye, FaEyeSlash, FaCheckCircle } from 'react-icons/fa';
import Button from '@/components/ui/Button';
import SettingsCard from '@/components/merchants/merchant-edit/ui/SettingsCard';

export interface PinTabProps {
  hasExistingPin: boolean;
  deletePin: string;
  setDeletePin: (value: string) => void;
  confirmPin: string;
  setConfirmPin: (value: string) => void;
  showPin: boolean;
  setShowPin: (value: boolean) => void;
  savingPin: boolean;
  onSavePin: () => void | Promise<void>;
  onRemovePin: () => void;
}

export default function PinTab({
  hasExistingPin,
  deletePin,
  setDeletePin,
  confirmPin,
  setConfirmPin,
  showPin,
  setShowPin,
  savingPin,
  onSavePin,
  onRemovePin,
}: PinTabProps) {
  return (
    <div className="space-y-6">
      <SettingsCard
        title="Delete PIN protection"
        description="Require a 4-digit PIN before staff can delete/void orders in POS."
        rightSlot={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-900/20">
            <FaKey className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          </div>
        }
      >
        {hasExistingPin ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
            <div className="flex items-center gap-2">
              <FaCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-400">PIN is enabled</span>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {hasExistingPin ? 'New PIN' : 'Set PIN'} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                value={deletePin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setDeletePin(val);
                }}
                maxLength={4}
                data-tutorial="pin-new"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 pr-12 text-lg tracking-widest text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPin ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Numbers only, exactly 4 digits.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm PIN <span className="text-red-500">*</span>
            </label>
            <input
              type={showPin ? 'text' : 'password'}
              value={confirmPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                setConfirmPin(val);
              }}
              maxLength={4}
              data-tutorial="pin-confirm"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-lg tracking-widest text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>
        </div>

        {deletePin.length === 4 && confirmPin.length === 4 && deletePin !== confirmPin ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
            PIN and confirmation do not match.
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="primary"
            isLoading={savingPin}
            disabled={deletePin.length !== 4 || confirmPin.length !== 4}
            isFullWidth
            onClick={onSavePin}
          >
            {hasExistingPin ? 'Update PIN' : 'Set PIN'}
          </Button>

          {hasExistingPin ? (
            <Button type="button" variant="danger" disabled={savingPin} isFullWidth onClick={onRemovePin}>
              Remove PIN
            </Button>
          ) : null}
        </div>
      </SettingsCard>
    </div>
  );
}
