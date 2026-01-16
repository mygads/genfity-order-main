'use client';

import React from 'react';
import { CloseIcon } from '@/icons';
import { useModalImplicitClose } from '@/hooks/useModalImplicitClose';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { PERMISSION_GROUPS, STAFF_PERMISSIONS } from '@/lib/constants/permissions';
import { getPermissionDescriptionFromT, getPermissionLabelFromT } from '@/lib/utils/permissionDisplay';

export interface StaffViewItem {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
  permissions?: string[];
  invitationStatus?: 'WAITING' | 'ACCEPTED' | null;
  invitedAt?: string | null;
  acceptedAt?: string | null;
}

interface StaffViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffViewItem | null;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function StaffViewModal({ isOpen, onClose, staff }: StaffViewModalProps) {
  const { t } = useTranslation();

  const { onBackdropMouseDown } = useModalImplicitClose({
    isOpen,
    onClose,
    disableImplicitClose: false,
  });

  if (!isOpen || !staff) return null;

  const isOwner = staff.role === 'MERCHANT_OWNER';
  const permissions = staff.permissions || [];
  const hasDriverAccess = permissions.includes(STAFF_PERMISSIONS.DRIVER_DASHBOARD);

  const permissionSet = new Set(permissions);
  const groupedKeys = new Set<string>();

  const groupedPermissionItems = Object.values(PERMISSION_GROUPS)
    .map((group) => {
      const items = group.permissions
        .filter((p) => permissionSet.has(p.key))
        .map((p) => {
          groupedKeys.add(p.key);
          return {
            key: p.key,
            label: getPermissionLabelFromT(t, p.key),
            description: getPermissionDescriptionFromT(t, p.key),
          };
        });

      if (items.length === 0) return null;
      return {
        title: t(group.titleKey),
        items,
      };
    })
    .filter(Boolean) as Array<{ title: string; items: Array<{ key: string; label: string; description: string }> }>;

  const otherKeys = permissions
    .filter((key) => !groupedKeys.has(key))
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((key) => ({
      key,
      label: getPermissionLabelFromT(t, key),
      description: getPermissionDescriptionFromT(t, key),
    }));

  const totalPermissionCount = permissions.length;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onMouseDown={onBackdropMouseDown}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-view-title"
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-gray-900"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 id="staff-view-title" className="text-lg font-semibold text-gray-900 dark:text-white">View Staff</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {staff.name} • {staff.email}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-220px)] overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Role</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {isOwner ? t('admin.staff.owner') : t('admin.staff.staffRole')}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Status</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {staff.isActive ? 'Active' : 'Inactive'}
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Phone</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{staff.phone || '—'}</p>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Joined</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">{formatDate(staff.joinedAt)}</p>
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Invitation</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {isOwner ? '—' : staff.invitationStatus === 'WAITING' ? 'Waiting' : 'Accepted'}
              </p>
              {!isOwner && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Invited: {formatDate(staff.invitedAt)} • Accepted: {formatDate(staff.acceptedAt)}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Driver Portal</p>
              <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                {isOwner ? '—' : hasDriverAccess ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Permissions</h3>
              {!isOwner && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{totalPermissionCount} total</p>
              )}
            </div>

            {isOwner ? (
              <div className="mt-3 rounded-lg bg-purple-50 p-4 text-sm text-purple-800 dark:bg-purple-900/20 dark:text-purple-200">
                Owner has full access.
              </div>
            ) : totalPermissionCount === 0 ? (
              <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
                No permissions assigned.
              </div>
            ) : (
              <div className="mt-3 space-y-4">
                {groupedPermissionItems.map((group) => (
                  <div key={group.title}>
                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{group.title}</p>
                    <div className="mt-2 space-y-2">
                      {group.items.map((p) => (
                        <div
                          key={p.key}
                          className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 dark:border-gray-800"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{p.label}</p>
                            {p.description ? (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{p.description}</p>
                            ) : null}
                          </div>
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Enabled
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {otherKeys.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Other</p>
                    <div className="mt-2 space-y-2">
                      {otherKeys.map((p) => (
                        <div
                          key={p.key}
                          className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 dark:border-gray-800"
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{p.label}</p>
                            {p.description ? (
                              <p className="text-xs text-gray-500 dark:text-gray-400">{p.description}</p>
                            ) : null}
                          </div>
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                            Enabled
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
