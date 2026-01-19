/**
 * Edit User Modal Component
 * For Super Admin to edit existing users
 * 
 * Features:
 * - Edit user details (name, email, phone, role)
 * - Change merchant assignment
 * - Optional password change
 * - English language interface
 */

'use client';

import { useState, useEffect } from 'react';
import { EyeIcon, EyeCloseIcon } from '@/icons';
import Label from '@/components/form/Label';
import { useToast } from '@/hooks/useToast';
import { getAdminToken } from '@/lib/utils/adminAuth';

interface Merchant {
  id: string;
  name: string;
  code: string;
  ownerName?: string;
  ownerId?: string;
}

interface MerchantGroupItem {
  main?: {
    id: string;
    name?: string;
    code?: string;
    branchType?: string;
  };
  branches: Array<{
    id: string;
    name?: string;
    code?: string;
    branchType?: string;
    parentMerchantName?: string | null;
  }>;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  merchantId?: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  user: User | null;
}

export default function EditUserModal({ isOpen, onClose, onSuccess, user }: EditUserModalProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  const [userDetail, setUserDetail] = useState<{
    merchantGroups?: MerchantGroupItem[];
  } | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '', // Optional - only if changing password
    role: 'MERCHANT_STAFF' as 'SUPER_ADMIN' | 'MERCHANT_OWNER' | 'MERCHANT_STAFF',
    merchantId: '',
  });

  // Load user data when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        password: '',
        role: user.role as 'SUPER_ADMIN' | 'MERCHANT_OWNER' | 'MERCHANT_STAFF',
        merchantId: user.merchantId || '',
      });
      fetchMerchants();
      fetchUserDetail(user.id);
    }
  }, [isOpen, user]);

  const fetchUserDetail = async (userId: string) => {
    setLoadingDetails(true);
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUserDetail({
          merchantGroups: data.data?.user?.merchantGroups || [],
        });
      } else {
        setUserDetail(null);
      }
    } catch {
      setUserDetail(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  /**
   * Fetch all merchants for dropdown
   */
  const fetchMerchants = async () => {
    setLoadingMerchants(true);
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/merchants', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        // API returns {success: true, data: {merchants: [...]}}
        const merchantsData = Array.isArray(data.data?.merchants) 
          ? data.data.merchants 
          : [];
        setMerchants(merchantsData);
      } else {
        console.error('Failed to fetch merchants:', data.message);
        setMerchants([]);
      }
    } catch (error) {
      console.error('Error fetching merchants:', error);
    } finally {
      setLoadingMerchants(false);
    }
  };

  /**
   * Handle form input changes
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      // Validate required fields only
      if (!formData.name.trim()) {
        throw new Error('Name is required');
      }
      if (!formData.email.trim()) {
        throw new Error('Email is required');
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        throw new Error('Invalid email format');
      }
      
      // Validate password if provided (optional)
      if (formData.password && formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Validate merchant assignment for MERCHANT_OWNER and MERCHANT_STAFF
      if ((formData.role === 'MERCHANT_OWNER' || formData.role === 'MERCHANT_STAFF') && !formData.merchantId) {
        throw new Error('Merchant must be selected for this role');
      }

      // Phone is optional - no validation needed

      // Build request body with only changed fields
      const requestBody: {
        name: string;
        email: string;
        phone?: string | null;
        role: string;
        merchantId?: string;
        password?: string;
      } = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
      };

      // Add phone only if provided or explicitly cleared
      if (formData.phone.trim()) {
        requestBody.phone = formData.phone.trim();
      } else {
        requestBody.phone = null;
      }

      // Add merchantId if applicable
      if (formData.merchantId) {
        requestBody.merchantId = formData.merchantId;
      }

      // Only include password if it's being changed
      if (formData.password) {
        requestBody.password = formData.password;
      }

      // Call API
      const token = getAdminToken();
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user');
      }

      showSuccessToast('Success', 'User updated successfully');
      
      // Close modal and refresh list
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      showErrorToast('Error', error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'MERCHANT_STAFF',
        merchantId: '',
      });
      setShowPassword(false);
      onClose();
    }
  };

  if (!isOpen || !user) return null;

  // Check if role requires merchant selection
  const requiresMerchant = formData.role === 'MERCHANT_OWNER' || formData.role === 'MERCHANT_STAFF';

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900 mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Edit User
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Update user details and permissions
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">
              Full Name <span className="text-error-500">*</span>
            </Label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter full name"
              disabled={isLoading}
              className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">
              Email <span className="text-error-500">*</span>
            </Label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="user@example.com"
              disabled={isLoading}
              className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone">
              Phone Number <span className="text-xs text-gray-500">(Optional)</span>
            </Label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="08123456789"
              disabled={isLoading}
              className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Role */}
          <div>
            <Label htmlFor="role">
              Role <span className="text-error-500">*</span>
            </Label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              disabled={isLoading}
              className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="MERCHANT_STAFF">Merchant Staff</option>
              <option value="MERCHANT_OWNER">Merchant Owner</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.role === 'SUPER_ADMIN' && 'Full system access'}
              {formData.role === 'MERCHANT_OWNER' && 'Full access to one merchant'}
              {formData.role === 'MERCHANT_STAFF' && 'Limited access to one merchant'}
            </p>
          </div>

          {/* Merchant Selection (conditional) */}
          {requiresMerchant && (
            <div>
              <Label htmlFor="merchantId">
                Merchant <span className="text-error-500">*</span>
              </Label>
              <select
                id="merchantId"
                name="merchantId"
                value={formData.merchantId}
                onChange={handleChange}
                disabled={isLoading || loadingMerchants}
                className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Merchant</option>
                {Array.isArray(merchants) && merchants.map((merchant) => {
                  const hasOwner = merchant.ownerName && merchant.ownerId;
                  const isDisabled = formData.role === 'MERCHANT_OWNER' && hasOwner && merchant.ownerId !== user?.id;
                  
                  return (
                    <option 
                      key={merchant.id} 
                      value={merchant.id}
                      disabled={!!isDisabled}
                    >
                      {merchant.name} ({merchant.code})
                      {hasOwner ? ` - Owner: ${merchant.ownerName}` : ''}
                    </option>
                  );
                })}
              </select>
              {loadingMerchants && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Loading merchants...
                </p>
              )}
              {formData.role === 'MERCHANT_OWNER' && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Only merchants without owners are available. To change owner, go to /dashboard/merchants page.
                </p>
              )}
            </div>
          )}

          {/* Merchant Groups (read-only) */}
          {userDetail?.merchantGroups && userDetail.merchantGroups.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              <div className="mb-2 font-semibold text-gray-800 dark:text-white/90">
                Merchant Groups
              </div>
              {loadingDetails ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">Loading merchant groups...</div>
              ) : (
                <div className="space-y-3">
                  {userDetail.merchantGroups.map((group, index) => (
                    <div key={`${group.main?.id || 'group'}-${index}`}>
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Main Merchant</div>
                      <div className="mt-1 font-semibold text-gray-800 dark:text-white/90">
                        {group.main?.name || '-'} {group.main?.code ? `(${group.main.code})` : ''}
                      </div>
                      {group.branches.length > 0 ? (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-500 dark:text-gray-400">Branches</div>
                          <ul className="mt-1 space-y-1 text-xs">
                            {group.branches.map((branch) => (
                              <li key={branch.id} className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                                <span>
                                  {branch.name || '-'} {branch.code ? `(${branch.code})` : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">No branches</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Password (Optional) */}
          <div>
            <Label htmlFor="password">
              New Password (Optional)
            </Label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Leave blank to keep current password"
                disabled={isLoading}
                className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:border-gray-700 dark:focus:border-brand-800 disabled:opacity-50 disabled:cursor-not-allowed pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeIcon className="h-5 w-5 fill-gray-500 dark:fill-gray-400" />
                ) : (
                  <EyeCloseIcon className="h-5 w-5 fill-gray-500 dark:fill-gray-400" />
                )}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Minimum 8 characters if changing password
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 h-11 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 h-11 rounded-lg bg-brand-500 px-4 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
