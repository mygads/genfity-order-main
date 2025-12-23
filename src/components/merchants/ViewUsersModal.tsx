/**
 * View Users Modal Component
 * Shows all users (owner and staff) linked to a merchant
 * Allows unbinding users from the merchant
 */

'use client';

import { useState, useEffect } from 'react';
import { getAdminToken } from '@/lib/utils/adminAuth';
import { useToast } from '@/hooks/useToast';
import ConfirmDialog from '@/components/modals/ConfirmDialog';

interface MerchantUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
}

interface ViewUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  merchantId: string;
  merchantName: string;
}

export default function ViewUsersModal({
  isOpen,
  onClose,
  onSuccess,
  merchantId,
  merchantName,
}: ViewUsersModalProps) {
  const { success: showSuccess, error: showError } = useToast();
  const [users, setUsers] = useState<MerchantUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unbindingUserId, setUnbindingUserId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({ isOpen: false, userId: '', userName: '' });

  /**
   * Fetch users linked to this merchant
   */
  const fetchMerchantUsers = async () => {
    setIsLoading(true);
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/users?merchantId=${merchantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUsers(Array.isArray(data.data) ? data.data : []);
      } else {
        showError('Error', data.message || 'Failed to load users');
      }
    } catch {
      showError('Error', 'An error occurred while loading users');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMerchantUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, merchantId]);

  /**
   * Show confirm dialog for unbinding
   */
  const showUnbindConfirm = (userId: string, userName: string) => {
    setConfirmDialog({ isOpen: true, userId, userName });
  };

  /**
   * Handle unbinding user from merchant
   */
  const handleUnbind = async () => {
    const { userId, userName } = confirmDialog;
    setConfirmDialog({ isOpen: false, userId: '', userName: '' });
    setUnbindingUserId(userId);
    
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/merchants/${merchantId}/unbind-user`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showSuccess('Success', `${userName} unbound successfully`);
        fetchMerchantUsers(); // Refresh list
        onSuccess(); // Refresh parent
      } else {
        showError('Error', data.message || 'Failed to unbind user');
      }
    } catch {
      showError('Error', 'An error occurred while unbinding user');
    } finally {
      setUnbindingUserId(null);
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
      <div className="relative z-10 w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Merchant Users
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Users linked to: <span className="font-medium">{merchantName}</span>
          </p>
        </div>

        {/* Users List */}
        <div className="max-h-[500px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                Loading users...
              </div>
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No users linked to this merchant
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-gray-800 dark:text-white/90">
                        {user.name}
                      </h4>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.role === 'MERCHANT_OWNER'
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400'
                      }`}>
                        {user.role === 'MERCHANT_OWNER' ? 'Owner' : 'Staff'}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        user.isActive
                          ? 'bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400'
                          : 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-success-600' : 'bg-error-600'}`} />
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {user.email}
                    </p>
                    {user.phone && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">
                        {user.phone}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => showUnbindConfirm(user.id, user.name)}
                    disabled={unbindingUserId === user.id}
                    className="ml-4 flex items-center gap-2 rounded-lg bg-error-500 px-4 py-2 text-sm font-medium text-white hover:bg-error-600 focus:outline-none focus:ring-3 focus:ring-error-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {unbindingUserId === user.id ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                        Unbinding...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                        Unbind
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-3 focus:ring-gray-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/[0.05]"
          >
            Close
          </button>
        </div>

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title="Unbind User"
          message={`Are you sure you want to unbind ${confirmDialog.userName} from this merchant? The user's role will be changed to CUSTOMER.`}
          confirmText="Unbind"
          variant="danger"
          onConfirm={handleUnbind}
          onCancel={() => setConfirmDialog({ isOpen: false, userId: '', userName: '' })}
        />
      </div>
    </div>
  );
}
