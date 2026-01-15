/**
 * Users Management Page (Super Admin Only)
 * Route: /admin/dashboard/users
 * Access: SUPER_ADMIN only
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import Image from 'next/image';

import EditUserModal from './EditUserModal';
import ToastContainer from '@/components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { getAdminToken } from '@/lib/utils/adminAuth';
import CreateUserModal from './CreateUserModal';
import { useSWRWithAuth } from '@/hooks/useSWRWithAuth';
import { UsersPageSkeleton } from '@/components/common/SkeletonLoaders';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  profilePictureUrl?: string;
  merchantId?: string;
  merchantName?: string;
  createdAt: string;
}

interface UsersApiResponse {
  success: boolean;
  data: User[];
}

export default function UsersPage() {
  const { toasts, success: showSuccessToast, error: showErrorToast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('admin'); // Default: admin roles only
  const [statusFilter, setStatusFilter] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Refs to track previous filter values for page reset (MUST be before early returns)
  const prevFiltersRef = useRef({ searchQuery, roleFilter, statusFilter });

  // SWR hook for data fetching with caching
  const { 
    data: usersResponse, 
    error: usersError, 
    isLoading,
    mutate: mutateUsers 
  } = useSWRWithAuth<UsersApiResponse>('/api/admin/users', {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  // Extract users from SWR response
  const users = usersResponse?.success ? usersResponse.data : [];

  // Function to refetch data (for backwards compatibility)
  const fetchUsers = useCallback(async () => {
    await mutateUsers();
  }, [mutateUsers]);

  // Reset to page 1 when filters change (MUST be before early returns)
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const filtersChanged = 
      prev.searchQuery !== searchQuery ||
      prev.roleFilter !== roleFilter ||
      prev.statusFilter !== statusFilter;

    if (filtersChanged) {
      setCurrentPage(1);
      prevFiltersRef.current = { searchQuery, roleFilter, statusFilter };
    }
  }, [searchQuery, roleFilter, statusFilter]);

  // Show skeleton loader during initial load
  if (isLoading) {
    return <UsersPageSkeleton />;
  }

  // Show error state if fetch failed
  if (usersError) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Error Loading Users
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {usersError?.message || 'Failed to load users'}
          </p>
          <button
            onClick={() => fetchUsers()}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /**
   * Handle successful user creation
   */
  const handleCreateSuccess = () => {
    fetchUsers(); // Refresh list
  };

  /**
   * Handle edit user
   */
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  /**
   * Handle toggle user active status
   */
  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showSuccessToast('Success', `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        fetchUsers(); // Refresh list
      } else {
        showErrorToast('Error', data.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      showErrorToast('Error', 'An error occurred while updating user status');
    }
  };

  /**
   * Filter users based on search and filters
   */
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Role filter logic
    let matchesRole = true;
    if (roleFilter === 'admin') {
      // Default: Show only admin roles (exclude CUSTOMER)
      matchesRole = ['SUPER_ADMIN', 'MERCHANT_OWNER', 'MERCHANT_STAFF'].includes(user.role);
    } else if (roleFilter) {
      // Specific role selected
      matchesRole = user.role === roleFilter;
    }
    
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  }).sort((a, b) => {
    // Define role priority: SUPER_ADMIN > MERCHANT_OWNER > MERCHANT_STAFF > CUSTOMER
    const rolePriority: Record<string, number> = {
      'SUPER_ADMIN': 1,
      'MERCHANT_OWNER': 2,
      'MERCHANT_STAFF': 3,
      'CUSTOMER': 4,
    };
    
    const priorityA = rolePriority[a.role] || 99;
    const priorityB = rolePriority[b.role] || 99;
    
    // Sort by role priority first
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // If same role, sort by name alphabetically
    return a.name.localeCompare(b.name);
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  /**
   * Format role for display
   */
  const formatRole = (role: string) => {
    const roleMap: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'MERCHANT_OWNER': 'Merchant Owner',
      'MERCHANT_STAFF': 'Merchant Staff',
      'CUSTOMER': 'Customer',
    };
    return roleMap[role] || role;
  };

  /**
   * Get role badge color
   */
  const getRoleBadgeClass = (role: string) => {
    const colorMap: Record<string, string> = {
      'SUPER_ADMIN': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      'MERCHANT_OWNER': 'bg-blue-light-100 text-blue-light-700 dark:bg-blue-light-900/30 dark:text-blue-light-400',
      'MERCHANT_STAFF': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
      'CUSTOMER': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    };
    return colorMap[role] || 'bg-gray-100 text-gray-700';
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  return (
    <div>
      <PageBreadcrumb pageTitle="User Management" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Admin Users
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage Super Admins, Merchant Owners, and Staff accounts
          </p>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-64 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
            <select 
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="admin">All Admin Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="MERCHANT_OWNER">Merchant Owner</option>
              <option value="MERCHANT_STAFF">Merchant Staff</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="h-11 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
          >
            + Add New User
          </button>
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/5">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left dark:border-white/5 dark:bg-white/2">
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Photo
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    User
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Email
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Role
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Merchant
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-5 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Registered
                  </th>
                  <th className="px-5 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                        <span className="text-sm">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {searchQuery || roleFilter || statusFilter 
                          ? 'No users match the current filters' 
                          : 'No users yet'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-4">
                        <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-gray-200 dark:border-gray-700">
                          {user.profilePictureUrl ? (
                            <Image
                              src={user.profilePictureUrl}
                              alt={user.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-brand-100 text-sm font-semibold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-gray-800 dark:text-white/90">{user.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">ID: {user.id}</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClass(user.role)}`}>
                          {formatRole(user.role)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
                        {user.merchantName || '-'}
                      </td>
                      <td className="px-5 py-4">
                        {/* Toggle Active/Inactive */}
                        <button
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                            user.isActive 
                              ? 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/30 dark:text-success-400 dark:hover:bg-success-900/50'
                              : 'bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/30 dark:text-error-400 dark:hover:bg-error-900/50'
                          }`}
                          title={`Click to ${user.isActive ? 'deactivate' : 'activate'}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${user.isActive ? 'bg-success-600' : 'bg-error-600'}`} />
                          {user.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-4 text-end">
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-5 flex flex-col gap-4 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} results
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Show first page, last page, current page, and pages around current
              const showPage = page === 1 || 
                               page === totalPages || 
                               Math.abs(page - currentPage) <= 1;
              
              if (!showPage) {
                // Show ellipsis
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-2 text-gray-500">...</span>;
                }
                return null;
              }

              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-9 rounded-lg px-3 text-sm font-medium ${
                    currentPage === page
                      ? 'bg-brand-500 text-white'
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <CreateUserModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit User Modal */}
      <EditUserModal 
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingUser(null);
        }}
        onSuccess={handleCreateSuccess}
        user={editingUser}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
