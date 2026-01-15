/**
 * Add User to Merchant Modal Component
 * Allows Super Admin to assign owner or staff to a merchant
 * - Owner: Only MERCHANT_OWNER role, not bound to any merchant
 * - Staff: Only MERCHANT_STAFF role, not bound to any merchant
 */

'use client';

import { useState, useEffect } from 'react';
import { getAdminToken } from '@/lib/utils/adminAuth';
import { useModalImplicitClose } from '@/hooks/useModalImplicitClose';

interface AddOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  merchantId: string;
  merchantName: string;
  currentOwner?: { name: string; email: string } | null; // Current owner info
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  merchantName?: string;
}

type UserType = 'owner' | 'staff';

export default function AddOwnerModal({
  isOpen,
  onClose,
  onSuccess,
  merchantId,
  merchantName,
  currentOwner,
}: AddOwnerModalProps) {
  const [activeTab, setActiveTab] = useState<UserType>('owner');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');
  const [_showOwnerWarning, _setShowOwnerWarning] = useState(false);

  /**
   * Fetch available users based on active tab
   * - Owner tab: Only MERCHANT_OWNER role, not bound to any merchant
   * - Staff tab: Only MERCHANT_STAFF role, not bound to any merchant
   */
  const fetchAvailableUsers = async () => {
    setIsFetching(true);
    setError('');
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Filter based on active tab
        const available = Array.isArray(data.data)
          ? data.data.filter((user: AvailableUser) => {
            if (activeTab === 'owner') {
              // Owner: Only MERCHANT_OWNER, not bound to any merchant
              return user.role === 'MERCHANT_OWNER' && !user.merchantName;
            } else {
              // Staff: Only MERCHANT_STAFF, not bound to any merchant
              return user.role === 'MERCHANT_STAFF' && !user.merchantName;
            }
          })
          : [];
        setAvailableUsers(available);
      } else {
        setError(data.message || 'Failed to load available users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('An error occurred while loading users');
    } finally {
      setIsFetching(false);
    }
  };

  // Fetch users when modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
      setSelectedUserId('');
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeTab]);

  // Show owner warning when selecting owner and there's a current owner
  useEffect(() => {
    if (activeTab === 'owner' && currentOwner && selectedUserId) {
      _setShowOwnerWarning(true);
    } else {
      _setShowOwnerWarning(false);
    }
  }, [activeTab, currentOwner, selectedUserId]);

  /**
   * Handle form submission
   * - Owner: PUT /api/admin/merchants/:id/assign-owner
   * - Staff: PUT /api/admin/merchants/:id/assign-staff
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = getAdminToken();
      const endpoint = activeTab === 'owner'
        ? `/api/admin/merchants/${merchantId}/assign-owner`
        : `/api/admin/merchants/${merchantId}/assign-staff`;

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: selectedUserId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        onSuccess();
        onClose();
        // Reset state
        setSelectedUserId('');
        _setShowOwnerWarning(false);
      } else {
        setError(data.message || `Failed to assign ${activeTab}`);
      }
    } catch (err) {
      console.error(`Error assigning ${activeTab}:`, err);
      setError(`An error occurred while assigning ${activeTab}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isDirty = selectedUserId.trim().length > 0;
  const disableImplicitClose = isLoading || isFetching || isDirty;
  const { onBackdropMouseDown } = useModalImplicitClose({
    isOpen,
    onClose,
    disableImplicitClose,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onMouseDown={onBackdropMouseDown}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Add User to Merchant
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Assign user to: <span className="font-medium">{merchantName}</span>
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-2 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={() => {
              setActiveTab('owner');
              setSelectedUserId('');
              setError('');
            }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'owner'
                ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-800 dark:text-brand-400'
                : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
          >
            Owner
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('staff');
              setSelectedUserId('');
              setError('');
            }}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'staff'
                ? 'bg-white text-brand-600 shadow-sm dark:bg-gray-800 dark:text-brand-400'
                : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
          >
            Staff
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Current Owner Warning */}
            {currentOwner && activeTab === 'owner' && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 dark:bg-amber-900/20 dark:border-amber-800">
                <div className="flex gap-2">
                  <svg className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Current Owner
                    </p>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                      {currentOwner.name} ({currentOwner.email}) is currently the owner.
                      {selectedUserId && ' Assigning a new owner will replace the current one.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* User Selection */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select {activeTab === 'owner' ? 'Owner' : 'Staff'}
              </label>
              {isFetching ? (
                <div className="flex h-11 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                    Loading...
                  </div>
                </div>
              ) : (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  required
                >
                  <option value="">-- Select {activeTab === 'owner' ? 'Owner' : 'Staff'} --</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {activeTab === 'owner'
                  ? 'Only MERCHANT_OWNER users not bound to any merchant are shown'
                  : 'Only MERCHANT_STAFF users not bound to any merchant are shown'
                }
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-error-50 p-3 dark:bg-error-900/20">
                <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-3 focus:ring-gray-500/10 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedUserId}
              className="h-11 flex-1 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Assigning...
                </span>
              ) : (
                `Assign ${activeTab === 'owner' ? 'Owner' : 'Staff'}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
