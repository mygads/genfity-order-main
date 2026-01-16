'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useModalImplicitClose } from '@/hooks/useModalImplicitClose';
import {
  STAFF_PERMISSIONS,
  PERMISSION_GROUPS,
  DEFAULT_STAFF_PERMISSIONS,
  PERMISSION_TEMPLATES
} from '@/lib/constants/permissions';
import { CloseIcon } from '@/icons';
import { TranslationKeys } from '@/lib/i18n';

interface StaffPermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (permissions: string[]) => void;
  staffName: string;
  currentPermissions: string[];
  isOwner: boolean;
  isLoading?: boolean;
}

/**
 * Staff Permissions Modal
 * Allows owner to manage individual staff permissions
 */
export default function StaffPermissionsModal({
  isOpen,
  onClose,
  onSave,
  staffName,
  currentPermissions,
  isOwner,
  isLoading = false,
}: StaffPermissionsModalProps) {
  const { t } = useTranslation();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [initialPermissions, setInitialPermissions] = useState<string[]>([]);

  const normalizePermissions = (perms: string[]) => {
    return Array.from(new Set(perms)).sort();
  };

  const arePermissionsEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  };

  // Initialize permissions when modal opens
  useEffect(() => {
    if (isOpen) {
      const normalized = normalizePermissions(currentPermissions);
      setPermissions(normalized);
      setInitialPermissions(normalized);
    }
  }, [isOpen, currentPermissions]);

  const allPermissions = Object.values(STAFF_PERMISSIONS);
  const allSelected = permissions.length === allPermissions.length;
  const isDirty = !arePermissionsEqual(normalizePermissions(permissions), initialPermissions);

  const disableImplicitClose = isDirty || isLoading;
  const { onBackdropMouseDown } = useModalImplicitClose({
    isOpen,
    onClose,
    disableImplicitClose,
  });

  if (!isOpen) return null;

  /**
   * Toggle a single permission
   */
  const togglePermission = (permission: string) => {
    setPermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  /**
   * Toggle all permissions in a group
   */
  const toggleGroup = (groupPermissions: readonly { key: string; nameKey: string; descKey: string }[]) => {
    const groupKeys = groupPermissions.map(p => p.key);
    const allSelected = groupKeys.every(key => permissions.includes(key));

    if (allSelected) {
      // Remove all from this group
      setPermissions(prev => prev.filter(p => !groupKeys.includes(p)));
    } else {
      // Add all from this group
      setPermissions(prev => [...new Set([...prev, ...groupKeys])]);
    }
  };

  /**
   * Select/deselect all permissions
   */
  const toggleAll = () => {
    const allPermissions = Object.values(STAFF_PERMISSIONS);
    if (permissions.length === allPermissions.length) {
      setPermissions([]);
    } else {
      setPermissions([...allPermissions]);
    }
  };

  /**
   * Reset to default permissions
   */
  const resetToDefault = () => {
    setPermissions([...DEFAULT_STAFF_PERMISSIONS]);
  };

  /**
   * Apply a permission template
   */
  const applyTemplate = (templateKey: keyof typeof PERMISSION_TEMPLATES) => {
    const template = PERMISSION_TEMPLATES[templateKey];
    setPermissions([...template.permissions]);
  };

  /**
   * Check if current permissions match a template
   */
  const isTemplateActive = (templateKey: keyof typeof PERMISSION_TEMPLATES): boolean => {
    const template = PERMISSION_TEMPLATES[templateKey];
    if (permissions.length !== template.permissions.length) return false;
    return template.permissions.every(p => permissions.includes(p));
  };

  /**
   * Handle save
   */
  const handleSave = () => {
    onSave(permissions);
  };

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onMouseDown={onBackdropMouseDown}
    >
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('admin.staff.permissionsTitle')}
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {staffName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[calc(100vh-250px)] overflow-y-auto px-6 py-4">
          {/* Owner notice */}
          {isOwner && (
            <div className="mb-4 rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-800">
                  <svg className="h-4 w-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.243 3.03a1 1 0 01.727 1.213L9.53 6h2.94l.56-2.243a1 1 0 111.94.486L14.53 6H17a1 1 0 110 2h-2.97l-1 4H15a1 1 0 110 2h-2.47l-.56 2.242a1 1 0 11-1.94-.485L10.47 14H7.53l-.56 2.242a1 1 0 11-1.94-.485L5.47 14H3a1 1 0 110-2h2.97l1-4H5a1 1 0 110-2h2.47l.56-2.243a1 1 0 011.213-.727zM9.03 8l-1 4h2.94l1-4H9.03z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                    {t('admin.staff.owner')}
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-300">
                    {t('admin.staff.allPermissions')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Permission Templates */}
          <div className="mb-4">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('admin.permissions.templates.title')}
            </p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(PERMISSION_TEMPLATES).map(([key, template]) => {
                const isActive = isTemplateActive(key as keyof typeof PERMISSION_TEMPLATES);
                return (
                  <button
                    key={key}
                    onClick={() => applyTemplate(key as keyof typeof PERMISSION_TEMPLATES)}
                    disabled={isOwner}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isOwner
                        ? 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                        : isActive
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {key === 'CASHIER' && (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      )}
                      {key === 'KITCHEN_STAFF' && (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      )}
                      {key === 'MANAGER' && (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      )}
                      {t(template.nameKey as TranslationKeys)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={toggleAll}
              disabled={isOwner}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isOwner
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                  : 'bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-900/30 dark:text-brand-400'
                }`}
            >
              {allSelected ? t('admin.staff.deselectAll') : t('admin.staff.selectAll')}
            </button>
            <button
              onClick={resetToDefault}
              disabled={isOwner}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${isOwner
                  ? 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                }`}
            >
              Reset to Default
            </button>
          </div>

          {/* Permission description */}
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            {t('admin.staff.permissionsDescription')}
          </p>

          {/* Permission groups */}
          <div className="space-y-6">
            {Object.entries(PERMISSION_GROUPS).map(([groupKey, group]) => {
              const groupPermissions = group.permissions;
              const groupKeys = groupPermissions.map(p => p.key);
              const groupAllSelected = groupKeys.every(key => permissions.includes(key));
              const groupSomeSelected = groupKeys.some(key => permissions.includes(key)) && !groupAllSelected;

              return (
                <div key={groupKey} className="rounded-lg border border-gray-200 dark:border-gray-700">
                  {/* Group header */}
                  <div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupAllSelected}
                        ref={(input) => {
                          if (input) {
                            input.indeterminate = groupSomeSelected;
                          }
                        }}
                        onChange={() => toggleGroup(groupPermissions)}
                        disabled={isOwner}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {t(group.titleKey as TranslationKeys)}
                      </span>
                    </label>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {groupKeys.filter(key => permissions.includes(key)).length} / {groupKeys.length}
                    </span>
                  </div>

                  {/* Group permissions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4">
                    {groupPermissions.map((perm) => (
                      <label
                        key={perm.key}
                        className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${permissions.includes(perm.key)
                            ? 'border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-brand-900/20'
                            : 'border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'
                          } ${isOwner ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={permissions.includes(perm.key)}
                          onChange={() => togglePermission(perm.key)}
                          disabled={isOwner}
                          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed"
                        />
                        <div>
                          <span className={`block text-sm font-medium ${permissions.includes(perm.key)
                              ? 'text-brand-700 dark:text-brand-400'
                              : 'text-gray-700 dark:text-gray-300'
                            }`}>
                            {t(perm.nameKey as TranslationKeys)}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t(perm.descKey as TranslationKeys)}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {permissions.length} / {allPermissions.length} {t('admin.staff.permissions').toLowerCase()}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isOwner || isLoading}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${isOwner || isLoading
                  ? 'cursor-not-allowed bg-gray-400'
                  : 'bg-brand-500 hover:bg-brand-600'
                }`}
            >
              {isLoading ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
