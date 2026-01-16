'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { FaTimes, FaSave, FaLock } from 'react-icons/fa';
import { useModalImplicitClose } from '@/hooks/useModalImplicitClose';

interface EditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (values: { name: string; phone?: string; newPassword?: string }) => void;
  isLoading?: boolean;
  staff: {
    name: string;
    email: string;
    phone?: string;
    invitationStatus?: 'WAITING' | 'ACCEPTED' | null;
  };
}

export default function EditStaffModal({
  isOpen,
  onClose,
  onSave,
  isLoading = false,
  staff,
}: EditStaffModalProps) {
  const initial = useMemo(
    () => ({
      name: staff.name || '',
      phone: staff.phone || '',
      newPassword: '',
    }),
    [staff.name, staff.phone]
  );

  const [name, setName] = useState(initial.name);
  const [phone, setPhone] = useState(initial.phone);
  const [newPassword, setNewPassword] = useState(initial.newPassword);

  const isDirty =
    name !== initial.name ||
    phone !== initial.phone ||
    (newPassword || '').trim().length > 0;

  const disableImplicitClose = isLoading || isDirty;
  const { onBackdropMouseDown } = useModalImplicitClose({
    isOpen,
    onClose,
    disableImplicitClose,
  });

  useEffect(() => {
    if (!isOpen) return;

    setName(initial.name);
    setPhone(initial.phone);
    setNewPassword('');
  }, [isOpen, initial.name, initial.phone]);

  if (!isOpen) return null;

  const disabledByInvite = staff.invitationStatus === 'WAITING';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-staff-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 id="edit-staff-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Edit Staff
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{staff.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <FaTimes className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5">
          {disabledByInvite && (
            <div className="mb-4 rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-200">
              Staff invitation must be accepted before editing.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading || disabledByInvite}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-800/60"
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading || disabledByInvite}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-800/60"
                placeholder="Phone number"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave empty to clear.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password (optional)
              </label>
              <div className="relative">
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading || disabledByInvite}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:disabled:bg-gray-800/60"
                  placeholder="••••••••"
                />
                <FaLock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Minimum 8 characters.</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLoading || disabledByInvite || !name.trim()}
              onClick={() =>
                onSave({
                  name: name.trim(),
                  phone: phone.trim() || undefined,
                  newPassword: newPassword.trim() || undefined,
                })
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-500 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaSave className="h-4 w-4" />
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
