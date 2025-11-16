/**
 * Create User Modal Component
 * For Super Admin to create users with any role
 * 
 * Features:
 * - Create users with role: SUPER_ADMIN, MERCHANT_OWNER, MERCHANT_STAFF, CUSTOMER
 * - Optional merchant assignment for MERCHANT_OWNER and MERCHANT_STAFF
 * - Direct password setting (no email notification)
 * - Validates 1 owner per merchant rule
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

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const { success: showSuccessToast, error: showErrorToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loadingMerchants, setLoadingMerchants] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'MERCHANT_STAFF' as 'SUPER_ADMIN' | 'MERCHANT_OWNER' | 'MERCHANT_STAFF' | 'CUSTOMER',
    merchantId: '',
  });

  // Fetch merchants when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchMerchants();
    }
  }, [isOpen]);

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
    setIsLoading(true);

    try {
      // Validation
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
      if (!formData.password || formData.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Validate merchant assignment for MERCHANT_OWNER and MERCHANT_STAFF
      if ((formData.role === 'MERCHANT_OWNER' || formData.role === 'MERCHANT_STAFF') && !formData.merchantId) {
        throw new Error('Merchant must be selected for this role');
      }

      // Phone is optional - no validation needed

      // Call API
      const token = getAdminToken();
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          ...(formData.phone.trim() && { phone: formData.phone.trim() }),
          password: formData.password,
          role: formData.role,
          ...(formData.merchantId && { merchantId: formData.merchantId }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create user');
      }

      showSuccessToast('Success', 'User created successfully');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'MERCHANT_STAFF',
        merchantId: '',
      });

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

  if (!isOpen) return null;

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
            Create New User
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add a new user account with specific role and merchant
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
              <option value="CUSTOMER">Customer</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.role === 'SUPER_ADMIN' && 'Full system access'}
              {formData.role === 'MERCHANT_OWNER' && 'Full access to one merchant'}
              {formData.role === 'MERCHANT_STAFF' && 'Limited access to one merchant'}
              {formData.role === 'CUSTOMER' && 'Customer ordering access'}
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
                  const isDisabled = formData.role === 'MERCHANT_OWNER' && hasOwner;
                  
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

          {/* Password */}
          <div>
            <Label htmlFor="password">
              Password <span className="text-error-500">*</span>
            </Label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
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
              Password will be active immediately, no email confirmation required
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
              {isLoading ? 'Saving...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
