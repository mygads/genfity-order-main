/**
 * Add Owner Modal Component
 * Allows Super Admin to assign a merchant owner to a merchant
 */

'use client';

import { useState, useEffect } from 'react';
import { getAdminToken } from '@/lib/utils/adminAuth';

interface AddOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  merchantId: string;
  merchantName: string;
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  role: string;
  merchantName?: string;
}

export default function AddOwnerModal({
  isOpen,
  onClose,
  onSuccess,
  merchantId,
  merchantName,
}: AddOwnerModalProps) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState('');

  /**
   * Fetch available users (only MERCHANT_STAFF and MERCHANT_OWNER not bound to merchants)
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
        // Filter: Only show MERCHANT_STAFF and MERCHANT_OWNER who are NOT bound to merchants
        // Exclude CUSTOMER and SUPER_ADMIN
        const available = Array.isArray(data.data) 
          ? data.data.filter((user: AvailableUser) => 
              (user.role === 'MERCHANT_STAFF' || user.role === 'MERCHANT_OWNER') &&
              !user.merchantName // Not bound to any merchant
            )
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

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableUsers();
      setSelectedUserId('');
      setError('');
    }
  }, [isOpen]);

  /**
   * Handle form submission
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
      const response = await fetch(`/api/admin/merchants/${merchantId}/assign-owner`, {
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
      } else {
        setError(data.message || 'Failed to assign owner');
      }
    } catch (err) {
      console.error('Error assigning owner:', err);
      setError('An error occurred while assigning owner');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Add Owner to Merchant
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Assign an owner to: <span className="font-medium">{merchantName}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* User Selection */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Select User
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
                  <option value="">-- Select User --</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email}) - {user.role === 'MERCHANT_OWNER' ? 'Owner' : 'Staff'}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Only MERCHANT_OWNER and MERCHANT_STAFF not bound to merchants are shown
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
              className="h-11 flex-1 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-3 focus:ring-gray-500/10 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05]"
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
                'Assign Owner'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
