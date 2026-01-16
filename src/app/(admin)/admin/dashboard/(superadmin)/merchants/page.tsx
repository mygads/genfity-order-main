"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "@/components/ui/ToastContainer";
import ConfirmDialog from "@/components/modals/ConfirmDialog";
import AddOwnerModal from "@/components/merchants/AddOwnerModal";
import ViewUsersModal from "@/components/merchants/ViewUsersModal";
import SubscriptionStatusBadge from "@/components/subscription/SubscriptionStatusBadge";
import Image from "next/image";
import { useSWRWithAuth } from "@/hooks/useSWRWithAuth";
import { MerchantsPageSkeleton } from "@/components/common/SkeletonLoaders";
import { TableActionButton } from "@/components/common/TableActionButton";
import { StatusToggle } from "@/components/common/StatusToggle";
import { FaEdit, FaEye, FaTrash, FaUserPlus, FaUsers } from "react-icons/fa";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface Merchant {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  logoUrl?: string;
  isActive: boolean;
  isOpen: boolean;
  currency: string;
  timezone: string;
  description?: string;
  latitude?: string | null;
  longitude?: string | null;
  mapUrl?: string | null;
  createdAt: string;
  openingHours?: Array<{
    dayOfWeek: number;
    openTime: string | null;
    closeTime: string | null;
    isClosed: boolean;
  }>;
  merchantUsers?: Array<{
    role: string;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }>;
  subscriptionStatus?: {
    type: 'TRIAL' | 'DEPOSIT' | 'MONTHLY';
    status: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  } | null;
}

interface MerchantsApiResponse {
  success: boolean;
  data: {
    merchants: Merchant[];
  } | Merchant[];
}

export default function MerchantsPage() {
  const router = useRouter();
  const { toasts, success: showSuccess, error: showError } = useToast();
  const { t } = useTranslation();

  // Note: setActiveOnly reserved for future API filter toggle
  const [activeOnly, _setActiveOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<'all' | 'TRIAL' | 'DEPOSIT' | 'MONTHLY'>('all');

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    merchantId: "",
    merchantName: "",
  });

  // Add owner modal state
  const [addOwnerModal, setAddOwnerModal] = useState<{
    isOpen: boolean;
    merchantId: string;
    merchantName: string;
    currentOwner?: { name: string; email: string } | null;
  }>({
    isOpen: false,
    merchantId: "",
    merchantName: "",
    currentOwner: null,
  });

  // View users modal state
  const [viewUsersModal, setViewUsersModal] = useState({
    isOpen: false,
    merchantId: "",
    merchantName: "",
  });

  // Build API URL based on filter
  const apiUrl = activeOnly
    ? "/api/admin/merchants?activeOnly=true"
    : "/api/admin/merchants";

  // SWR hook for data fetching with caching
  const {
    data: merchantsResponse,
    error: merchantsError,
    isLoading,
    mutate: mutateMerchants
  } = useSWRWithAuth<MerchantsApiResponse>(apiUrl, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  // Extract merchants from SWR response
  const allMerchants = (() => {
    if (!merchantsResponse?.success) return [];
    const data = merchantsResponse.data;
    if (Array.isArray(data)) return data;
    if (data && 'merchants' in data && Array.isArray(data.merchants)) return data.merchants;
    return [];
  })();

  // Filter merchants based on search and filters
  const merchants = allMerchants.filter(merchant => {
    // Search filter
    const matchesSearch = !searchQuery || 
      merchant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      merchant.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      merchant.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      merchant.city?.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && merchant.isActive) ||
      (statusFilter === 'inactive' && !merchant.isActive);

    // Subscription filter
    const matchesSubscription = subscriptionFilter === 'all' ||
      merchant.subscriptionStatus?.type === subscriptionFilter;

    return matchesSearch && matchesStatus && matchesSubscription;
  });

  const loading = isLoading;

  // Function to refetch data (for backwards compatibility)
  const fetchMerchants = useCallback(async () => {
    await mutateMerchants();
  }, [mutateMerchants]);

  // Show skeleton loader during initial load
  if (loading) {
    return <MerchantsPageSkeleton />;
  }

  // Show error state if fetch failed
  if (merchantsError) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Error Loading Merchants
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {merchantsError?.message || 'Failed to load merchants'}
          </p>
          <button
            onClick={() => fetchMerchants()}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  /**
   * Get store status based on isOpen field
   */
  const getStoreStatus = (merchant: Merchant): { text: string; isOpen: boolean } => {
    if (!merchant.isActive) {
      return { text: t('common.inactive'), isOpen: false };
    }

    return {
      text: merchant.isOpen ? 'Store Open' : 'Store Closed',
      isOpen: merchant.isOpen
    };
  };

  // Toggle merchant status (active/inactive)
  // Toggle merchant active/inactive status
  const handleToggleStatus = async (merchantId: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/admin/merchants/${merchantId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to toggle merchant status");
      }

      showSuccess("Success", `Merchant ${!currentStatus ? 'activated' : 'deactivated'} successfully`);

      // Refresh merchants list
      fetchMerchants();
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  // Show delete confirmation dialog
  const handleDelete = (merchantId: string, merchantName: string) => {
    setDeleteDialog({
      isOpen: true,
      merchantId,
      merchantName,
    });
  };

  // Confirm delete merchant
  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/admin/merchants/${deleteDialog.merchantId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete merchant");
      }

      // Close dialog and refresh list
      setDeleteDialog({ isOpen: false, merchantId: "", merchantName: "" });
      fetchMerchants();
      showSuccess("Success", "Merchant deleted successfully");
    } catch (err) {
      showError("Error", err instanceof Error ? err.message : "Failed to delete merchant");
      setDeleteDialog({ isOpen: false, merchantId: "", merchantName: "" });
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeleteDialog({ isOpen: false, merchantId: "", merchantName: "" });
  };

  return (
    <div className="w-full min-w-0">
      <ToastContainer toasts={toasts} />
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Merchant"
        message={`Are you sure you want to delete "${deleteDialog.merchantName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
      <PageBreadcrumb pageTitle="Merchants Management" />

      <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            All Merchants
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage restaurant merchants and their settings
          </p>
        </div>
        {/* Actions Bar */}
        <div className="mb-6 space-y-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-900/30">
          {/* Search and Create Button Row */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-lg">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search by name, code, email, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
              />
            </div>
            <button
              onClick={() => router.push("/admin/dashboard/merchants/create")}
              className="h-11 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20 whitespace-nowrap"
            >
              + Create Merchant
            </button>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Filters:</span>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">All Status</option>
              <option value="active">{t('common.active')}</option>
              <option value="inactive">{t('common.inactive')}</option>
            </select>

            {/* Subscription Filter */}
            <select
              value={subscriptionFilter}
              onChange={(e) => setSubscriptionFilter(e.target.value as 'all' | 'TRIAL' | 'DEPOSIT' | 'MONTHLY')}
              className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
            >
              <option value="all">All Subscriptions</option>
              <option value="TRIAL">Trial</option>
              <option value="DEPOSIT">Deposit</option>
              <option value="MONTHLY">Monthly</option>
            </select>

            <button
              onClick={fetchMerchants}
              className="h-9 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Refresh
            </button>

            {/* Clear Filters */}
            {(searchQuery || statusFilter !== 'all' || subscriptionFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSubscriptionFilter('all');
                }}
                className="h-9 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-gray-800 dark:bg-white/3 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Clear Filters
              </button>
            )}

            {/* Results Count */}
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {merchants.length} of {allMerchants.length} merchants
            </span>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-10 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
            <p className="mt-2 text-sm text-body-color">Loading merchants...</p>
          </div>
        )}

        {/* Merchants Table */}
        {!loading && !merchantsError && (
          <div className="relative rounded-xl border border-gray-200 dark:border-white/5" style={{ contain: 'inline-size' }}>
            <div className="overflow-x-auto">
              <table className="w-full whitespace-nowrap" style={{ minWidth: '1200px' }}>
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-left dark:border-white/5 dark:bg-white/2">
                    <th className="w-15 min-w-15 px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                      Logo
                    </th>
                    <th className="w-25 min-w-25 px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                      Code
                    </th>
                    <th className="w-40 min-w-40 px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                      Merchant Name
                    </th>
                    <th className="w-50 min-w-50 px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                      Email
                    </th>
                    <th className="w-32.5 min-w-32.5 px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                      Phone
                    </th>
                    <th className="w-25 min-w-25 px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                      Country
                    </th>
                    <th className="w-20 min-w-20 px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                      Currency
                    </th>
                    <th className="w-25 min-w-25 px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                      Subscription
                    </th>
                    <th className="w-25 min-w-25 px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                      Store Status
                    </th>
                    <th className="w-25 min-w-25 px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                      Active Status
                    </th>
                    <th className="w-30 min-w-30 px-4 py-3 text-start text-xs font-medium text-gray-500 dark:text-gray-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {merchants.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-10 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">No merchants found</p>
                        <button
                          onClick={() => router.push("/admin/dashboard/merchants/create")}
                          className="mt-4 text-sm text-brand-500 hover:text-brand-600 hover:underline dark:text-brand-400"
                        >
                          Create your first merchant
                        </button>
                      </td>
                    </tr>
                  ) : (
                    merchants.map((merchant) => {
                      const storeStatus = getStoreStatus(merchant);

                      return (
                        <tr key={merchant.id}>
                          <td className="w-15 min-w-15 px-4 py-4">
                            {/* Merchant Logo */}
                            <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                              {merchant.logoUrl ? (
                                <Image
                                  src={merchant.logoUrl}
                                  alt={merchant.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-brand-100 text-sm font-bold text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                                  {merchant.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="w-25 min-w-25 px-4 py-4">
                            <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                              {merchant.code}
                            </span>
                          </td>
                          <td className="w-40 min-w-40 px-4 py-4">
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate" title={merchant.name}>
                              {merchant.name}
                            </p>
                          </td>
                          <td className="w-50 min-w-50 px-4 py-4 text-sm text-gray-600 dark:text-gray-400">
                            <span className="truncate block" title={merchant.email}>{merchant.email}</span>
                          </td>
                          <td className="w-32.5 min-w-32.5 px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{merchant.phone}</td>
                          <td className="w-25 min-w-25 px-4 py-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {merchant.country || 'Australia'}
                            </span>
                          </td>
                          <td className="w-20 min-w-20 px-4 py-4">
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                              {merchant.currency || 'AUD'}
                            </span>
                          </td>
                          <td className="w-25 min-w-25 px-4 py-4">
                            {merchant.subscriptionStatus ? (
                              <SubscriptionStatusBadge
                                type={merchant.subscriptionStatus.type}
                                status={merchant.subscriptionStatus.status}
                              />
                            ) : (
                              <span className="text-xs text-gray-400">No subscription</span>
                            )}
                          </td>
                          <td className="w-25 min-w-25 px-4 py-4">
                            {/* Store Open/Closed Status */}
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${storeStatus.isOpen
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                              }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${storeStatus.isOpen ? 'bg-green-600' : 'bg-gray-600'}`} />
                              {storeStatus.text}
                            </span>
                          </td>
                          <td className="w-25 min-w-25 px-4 py-4">
                            <StatusToggle
                              isActive={merchant.isActive}
                              onToggle={() => handleToggleStatus(merchant.id, merchant.isActive)}
                              activeLabel={t('common.active')}
                              inactiveLabel={t('common.inactive')}
                              activateTitle="Activate"
                              deactivateTitle="Deactivate"
                              size="sm"
                            />
                          </td>
                          <td className="w-30 min-w-30 px-4 py-4">
                            <div className="flex items-center gap-2">
                              <TableActionButton
                                icon={FaEye}
                                onClick={() => router.push(`/admin/dashboard/merchants/${merchant.id}`)}
                                aria-label="View merchant details"
                                title="View Details"
                              />
                              <TableActionButton
                                icon={FaEdit}
                                onClick={() => router.push(`/admin/dashboard/merchants/${merchant.id}/edit`)}
                                aria-label="Edit merchant"
                                title="Edit Merchant"
                              />
                              <TableActionButton
                                icon={FaTrash}
                                tone="danger"
                                onClick={() => handleDelete(merchant.id, merchant.name)}
                                aria-label="Delete merchant"
                                title="Delete"
                              />
                              <TableActionButton
                                icon={FaUserPlus}
                                onClick={() => {
                                  const owner = merchant.merchantUsers?.find(mu => mu.role === 'OWNER');
                                  setAddOwnerModal({
                                    isOpen: true,
                                    merchantId: merchant.id,
                                    merchantName: merchant.name,
                                    currentOwner: owner ? {
                                      name: owner.user.name,
                                      email: owner.user.email,
                                    } : null,
                                  });
                                }}
                                aria-label="Add merchant owner"
                                title="Add Owner"
                              />
                              <TableActionButton
                                icon={FaUsers}
                                onClick={() => setViewUsersModal({
                                  isOpen: true,
                                  merchantId: merchant.id,
                                  merchantName: merchant.name,
                                })}
                                aria-label="View merchant users"
                                title="View Users"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary */}
        {!loading && !merchantsError && merchants.length > 0 && (
          <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {merchants.length} merchant{merchants.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* Add Owner Modal */}
      <AddOwnerModal
        isOpen={addOwnerModal.isOpen}
        onClose={() => setAddOwnerModal({ isOpen: false, merchantId: "", merchantName: "", currentOwner: null })}
        onSuccess={() => {
          fetchMerchants();
        }}
        merchantId={addOwnerModal.merchantId}
        merchantName={addOwnerModal.merchantName}
        currentOwner={addOwnerModal.currentOwner}
      />

      {/* View Users Modal */}
      <ViewUsersModal
        isOpen={viewUsersModal.isOpen}
        onClose={() => setViewUsersModal({ isOpen: false, merchantId: "", merchantName: "" })}
        onSuccess={() => {
          fetchMerchants();
        }}
        merchantId={viewUsersModal.merchantId}
        merchantName={viewUsersModal.merchantName}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Merchant"
        message={`Are you sure you want to delete "${deleteDialog.merchantName}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, merchantId: "", merchantName: "" })}
      />

      <ToastContainer toasts={toasts} />
    </div>
  );
}
