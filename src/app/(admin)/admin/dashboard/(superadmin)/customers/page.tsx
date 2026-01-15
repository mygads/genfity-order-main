/**
 * Customers Management Page (Super Admin Only)
 * Route: /admin/dashboard/customers
 * Access: SUPER_ADMIN only
 * 
 * Features:
 * - Customer listing with search and filters
 * - Customer detail modal with order history
 * - Export to CSV
 * - Bulk activate/deactivate
 * - Advanced filters (date range, total spent, order count)
 */

'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import PageBreadcrumb from '@/components/common/PageBreadCrumb';
import ToastContainer from '@/components/ui/ToastContainer';
import { useToast } from '@/hooks/useToast';
import { getAdminToken } from '@/lib/utils/adminAuth';
import { useSWRWithAuth } from '@/hooks/useSWRWithAuth';
import { UsersPageSkeleton } from '@/components/common/SkeletonLoaders';
import CustomerDetailModal from '@/components/modals/CustomerDetailModal';
import { FaDownload, FaFilter, FaTimes, FaCheckSquare, FaSquare } from 'react-icons/fa';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrderAt?: string | null;
  _count?: {
    orders: number;
  };
}

interface CustomerDetail extends Customer {
  orders?: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    merchant?: { name: string };
  }>;
}

interface CustomersApiResponse {
  success: boolean;
  data: Customer[];
}

export default function CustomersPage() {
  const { toasts, success: showSuccessToast, error: showErrorToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Advanced filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [minSpent, setMinSpent] = useState('');
  const [maxSpent, setMaxSpent] = useState('');
  const [minOrders, setMinOrders] = useState('');
  const [maxOrders, setMaxOrders] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Customer detail modal
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetail | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Refs to track previous filter values for page reset
  const prevFiltersRef = useRef({ searchQuery, statusFilter, dateFrom, dateTo, minSpent, maxSpent, minOrders, maxOrders });

  // SWR hook for data fetching with caching
  const {
    data: customersResponse,
    error: customersError,
    isLoading,
    mutate: mutateCustomers
  } = useSWRWithAuth<CustomersApiResponse>('/api/admin/customers', {
    refreshInterval: 30000,
  });

  // Extract customers from SWR response
  const customers = customersResponse?.success ? customersResponse.data : [];

  // Function to refetch data
  const fetchCustomers = useCallback(async () => {
    await mutateCustomers();
  }, [mutateCustomers]);

  // Reset to page 1 when filters change
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const filtersChanged =
      prev.searchQuery !== searchQuery ||
      prev.statusFilter !== statusFilter ||
      prev.dateFrom !== dateFrom ||
      prev.dateTo !== dateTo ||
      prev.minSpent !== minSpent ||
      prev.maxSpent !== maxSpent ||
      prev.minOrders !== minOrders ||
      prev.maxOrders !== maxOrders;

    if (filtersChanged) {
      setCurrentPage(1);
      prevFiltersRef.current = { searchQuery, statusFilter, dateFrom, dateTo, minSpent, maxSpent, minOrders, maxOrders };
    }
  }, [searchQuery, statusFilter, dateFrom, dateTo, minSpent, maxSpent, minOrders, maxOrders]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // View customer details
  const handleViewCustomer = async (customerId: string) => {
    setIsLoadingDetail(true);
    setIsModalOpen(true);

    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setSelectedCustomer(data.data);
      } else {
        showErrorToast('Error', data.message || 'Failed to load customer details');
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
      showErrorToast('Error', 'Failed to load customer details');
      setIsModalOpen(false);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Toggle customer active status
  const handleToggleActive = async (customerId: string, currentStatus: boolean) => {
    try {
      const token = getAdminToken();
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showSuccessToast('Success', `Customer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        fetchCustomers();
      } else {
        showErrorToast('Error', data.message || 'Failed to update customer status');
      }
    } catch (error) {
      console.error('Error toggling customer status:', error);
      showErrorToast('Error', 'An error occurred while updating customer status');
    }
  };

  // Bulk toggle active status
  const handleBulkToggle = async (activate: boolean) => {
    if (selectedIds.size === 0) return;

    setIsBulkProcessing(true);
    const token = getAdminToken();
    let successCount = 0;
    let failCount = 0;

    for (const customerId of selectedIds) {
      try {
        const response = await fetch(`/api/admin/customers/${customerId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ isActive: activate }),
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsBulkProcessing(false);
    setSelectedIds(new Set());
    fetchCustomers();

    if (successCount > 0) {
      showSuccessToast('Success', `${successCount} customer(s) ${activate ? 'activated' : 'deactivated'} successfully`);
    }
    if (failCount > 0) {
      showErrorToast('Error', `Failed to update ${failCount} customer(s)`);
    }
  };

  // Filter customers based on search and filters
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone?.includes(searchQuery) ?? false);

    const matchesStatus = !statusFilter ||
      (statusFilter === 'active' && customer.isActive) ||
      (statusFilter === 'inactive' && !customer.isActive);

    // Date filter
    const customerDate = new Date(customer.createdAt);
    const matchesDateFrom = !dateFrom || customerDate >= new Date(dateFrom);
    const matchesDateTo = !dateTo || customerDate <= new Date(dateTo + 'T23:59:59');

    // Total spent filter
    const spent = customer.totalSpent || 0;
    const matchesMinSpent = !minSpent || spent >= parseFloat(minSpent);
    const matchesMaxSpent = !maxSpent || spent <= parseFloat(maxSpent);

    // Orders filter
    const orders = customer._count?.orders || customer.totalOrders || 0;
    const matchesMinOrders = !minOrders || orders >= parseInt(minOrders);
    const matchesMaxOrders = !maxOrders || orders <= parseInt(maxOrders);

    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo &&
      matchesMinSpent && matchesMaxSpent && matchesMinOrders && matchesMaxOrders;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);

  // Export to CSV
  const handleExport = useCallback(() => {
    const headers = ['Name', 'Email', 'Phone', 'Status', 'Total Orders', 'Total Spent', 'Registered'];
    const rows = filteredCustomers.map(c => [
      c.name,
      c.email,
      c.phone || '',
      c.isActive ? 'Active' : 'Inactive',
      (c._count?.orders || c.totalOrders || 0).toString(),
      (c.totalSpent || 0).toString(),
      formatDate(c.createdAt),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    showSuccessToast('Success', `Exported ${filteredCustomers.length} customers to CSV`);
  }, [filteredCustomers, showSuccessToast]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setDateFrom('');
    setDateTo('');
    setMinSpent('');
    setMaxSpent('');
    setMinOrders('');
    setMaxOrders('');
  };

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  // Toggle all selection
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedCustomers.map(c => c.id)));
    }
  };

  const hasActiveFilters = dateFrom || dateTo || minSpent || maxSpent || minOrders || maxOrders;

  // Show skeleton loader during initial load
  if (isLoading) {
    return <UsersPageSkeleton />;
  }

  // Show error state if fetch failed
  if (customersError) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Error Loading Customers</h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {customersError?.message || 'Failed to load customers'}
          </p>
          <button
            onClick={() => fetchCustomers()}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div data-tutorial="customers-page">
      <PageBreadcrumb pageTitle="Customers Management" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6" data-tutorial="customers-container">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            All Customers
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            View and manage registered customer accounts
          </p>
        </div>

        {/* Actions Bar */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md" data-tutorial="customers-search">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3" data-tutorial="customers-actions">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`h-10 rounded-lg border px-4 text-sm font-medium flex items-center gap-2 transition-colors ${showAdvancedFilters || hasActiveFilters
                  ? 'border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/3 dark:text-gray-300 dark:hover:bg-white/5'
                  }`}
              >
                <FaFilter className="h-3 w-3" />
                Filters
                {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-brand-500" />}
              </button>

              <button
                onClick={handleExport}
                className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/3 dark:text-gray-300 dark:hover:bg-white/5 flex items-center gap-2"
              >
                <FaDownload className="h-3 w-3" />
                Export CSV
              </button>

              <button
                onClick={fetchCustomers}
                className="h-10 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-white/3 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Refresh
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50" data-tutorial="customers-filters">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Date Range */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Registered From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Registered To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                {/* Total Spent Range */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Min Total Spent
                  </label>
                  <input
                    type="number"
                    value={minSpent}
                    onChange={(e) => setMinSpent(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Max Total Spent
                  </label>
                  <input
                    type="number"
                    value={maxSpent}
                    onChange={(e) => setMaxSpent(e.target.value)}
                    placeholder="∞"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                {/* Orders Range */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Min Orders
                  </label>
                  <input
                    type="number"
                    value={minOrders}
                    onChange={(e) => setMinOrders(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Max Orders
                  </label>
                  <input
                    type="number"
                    value={maxOrders}
                    onChange={(e) => setMaxOrders(e.target.value)}
                    placeholder="∞"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 flex items-center gap-1"
                  >
                    <FaTimes className="h-3 w-3" />
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-4 rounded-lg bg-brand-50 px-4 py-3 dark:bg-brand-900/20">
              <span className="text-sm font-medium text-brand-700 dark:text-brand-300">
                {selectedIds.size} customer(s) selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkToggle(true)}
                  disabled={isBulkProcessing}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Activate All
                </button>
                <button
                  onClick={() => handleBulkToggle(false)}
                  disabled={isBulkProcessing}
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Deactivate All
                </button>
                <button
                  onClick={() => setSelectedIds(new Set())}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* Results Count */}
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {filteredCustomers.length} of {customers.length} customers
          </div>
        </div>

        {/* Customers Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/5" data-tutorial="customers-table">
          <div className="overflow-x-auto">
            <table className="min-w-225 w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left dark:border-white/5 dark:bg-white/2">
                  <th className="px-3 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    <button
                      onClick={toggleSelectAll}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {selectedIds.size === paginatedCustomers.length && paginatedCustomers.length > 0 ? (
                        <FaCheckSquare className="h-4 w-4 text-brand-500" />
                      ) : (
                        <FaSquare className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Photo
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Email
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Orders
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Total Spent
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                    Registered
                  </th>
                  <th className="px-4 py-3 text-end text-xs font-medium text-gray-500 dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-8 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {searchQuery || statusFilter || hasActiveFilters
                          ? 'No customers match the current filters'
                          : 'No customers yet'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map((customer) => (
                    <tr key={customer.id} className={selectedIds.has(customer.id) ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}>
                      <td className="px-3 py-4">
                        <button
                          onClick={() => toggleSelection(customer.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          {selectedIds.has(customer.id) ? (
                            <FaCheckSquare className="h-4 w-4 text-brand-500" />
                          ) : (
                            <FaSquare className="h-4 w-4" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-4">
                        <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-gray-200 dark:border-gray-700">
                          <div className="flex h-full w-full items-center justify-center bg-green-100 text-sm font-semibold text-green-600 dark:bg-green-900/20 dark:text-green-400">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-gray-800 dark:text-white/90">{customer.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">ID: {customer.id}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{customer.email}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{customer.phone || '-'}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          {customer._count?.orders || customer.totalOrders || 0}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">
                        {(customer.totalSpent || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleActive(customer.id, customer.isActive)}
                          className={`inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${customer.isActive
                            ? 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/30 dark:text-success-400 dark:hover:bg-success-900/50'
                            : 'bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/30 dark:text-error-400 dark:hover:bg-error-900/50'
                            }`}
                          title={`Click to ${customer.isActive ? 'deactivate' : 'activate'}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${customer.isActive ? 'bg-success-600' : 'bg-error-600'}`} />
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{formatDate(customer.createdAt)}</td>
                      <td className="px-4 py-4 text-end">
                        <button
                          onClick={() => handleViewCustomer(customer.id)}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
                        >
                          View
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
        {totalPages > 0 && (
          <div className="mt-5 flex flex-col gap-4 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredCustomers.length)} of {filteredCustomers.length} results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-9 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/5"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const showPage = page === 1 ||
                  page === totalPages ||
                  Math.abs(page - currentPage) <= 1;

                if (!showPage) {
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2 text-gray-500">...</span>;
                  }
                  return null;
                }

                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`h-9 rounded-lg px-3 text-sm font-medium ${currentPage === page
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
        )}
      </div>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedCustomer(null);
        }}
        isLoading={isLoadingDetail}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
