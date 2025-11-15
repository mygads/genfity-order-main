/**
 * Users Management Page (Super Admin Only)
 * Route: /admin/dashboard/users
 * Access: SUPER_ADMIN only
 */

'use client';

import { useState, useEffect } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';

import EditUserModal from './EditUserModal';
import ToastContainer from '@/components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { getAdminToken } from '@/lib/utils/adminAuth';
import CreateUserModal from './CreateUserModal';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  merchantId?: string;
  merchantName?: string;
  createdAt: string;
}

export default function UsersPage() {
  const { toasts, success: showSuccessToast, error: showErrorToast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('admin'); // Default: admin roles only
  const [statusFilter, setStatusFilter] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /**
   * Fetch all users from API
   */
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const token = getAdminToken();
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      const data = await response.json();

      if (response.ok && data.success) {
        setUsers(data.data);
      } else {
        showErrorToast('Gagal', data.message || 'Gagal memuat data users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      showErrorToast('Error', 'Terjadi kesalahan saat memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

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

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            All Users
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage all users, roles, and permissions across the system
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
              <option value="admin">Admin Roles Only (Default)</option>
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="MERCHANT_OWNER">Merchant Owner</option>
              <option value="MERCHANT_STAFF">Merchant Staff</option>
              <option value="CUSTOMER">Customer</option>
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
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/[0.05]">
          <div className="max-w-full overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left dark:border-white/[0.05] dark:bg-white/[0.02]">
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
              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center">
                      <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
                        <span className="text-sm">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center">
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
              className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05]"
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
                      : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05]'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.05]"
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
