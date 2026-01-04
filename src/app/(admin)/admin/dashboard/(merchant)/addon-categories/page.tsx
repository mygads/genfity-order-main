"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ViewAddonItemsModal from "@/components/addon-categories/ViewAddonItemsModal";
import MenuRelationshipModal from "@/components/addon-categories/MenuRelationshipModal";
import EmptyState from "@/components/ui/EmptyState";
import { exportAddonCategories } from "@/lib/utils/excelExport";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import { CategoriesPageSkeleton } from "@/components/common/SkeletonLoaders";
import { useMerchant } from "@/context/MerchantContext";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useToast } from "@/context/ToastContext";
import ArchiveModal from "@/components/common/ArchiveModal";

interface AddonCategory {
  id: string;
  name: string;
  description: string | null;
  minSelection: number;
  maxSelection: number | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    addonItems: number;
    menuAddonCategories: number;
  };
}

interface AddonItem {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  inputType: "SELECT" | "QTY";
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
}

interface AddonCategoryFormData {
  name: string;
  description: string;
  minSelection: number;
  maxSelection: number | string;
}

// Response types for SWR
interface AddonCategoriesApiResponse {
  success: boolean;
  data: AddonCategory[];
}

function AddonCategoriesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [filteredCategories, setFilteredCategories] = useState<AddonCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [viewItemsModal, setViewItemsModal] = useState<{
    show: boolean;
    categoryId: string | null;
    categoryName: string;
    items: AddonItem[];
  }>({ show: false, categoryId: null, categoryName: "", items: [] });

  const [viewRelationshipsModal, setViewRelationshipsModal] = useState<{
    show: boolean;
    categoryId: string | null;
    categoryName: string;
  }>({ show: false, categoryId: null, categoryName: "" });

  // Single delete confirmation modal with preview data
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    id: string;
    name: string;
    menuCount: number;
    menuList: string;
    addonItemsCount: number;
    loading: boolean;
  }>({ show: false, id: "", name: "", menuCount: 0, menuList: "", addonItemsCount: 0, loading: false });

  // Editing state - null means creating new, string ID means editing
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);

  const [formData, setFormData] = useState<AddonCategoryFormData>({
    name: "",
    description: "",
    minSelection: 0,
    maxSelection: "",
  });

  // Bulk selection states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Initialize pagination from URL search params
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  // Pagination & Filter states
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Update URL when page changes (for persistence)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (currentPage > 1) {
      params.set('page', currentPage.toString());
    } else {
      params.delete('page');
    }
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    window.history.replaceState(null, '', newUrl);
  }, [currentPage, searchParams]);

  // SWR hooks for data fetching with caching
  const {
    data: categoriesResponse,
    error: categoriesError,
    isLoading: categoriesLoading,
    mutate: mutateCategories
  } = useSWRStatic<AddonCategoriesApiResponse>('/api/merchant/addon-categories');

  // Use MerchantContext instead of fetching
  const { merchant: merchantData, isLoading: merchantLoading } = useMerchant();

  // Extract data from SWR responses with useMemo to prevent infinite loops
  const categories = useMemo(() => {
    return categoriesResponse?.success ? categoriesResponse.data : [];
  }, [categoriesResponse]);

  const merchant = merchantData
    ? { currency: merchantData.currency || "AUD" }
    : { currency: "AUD" };
  const loading = categoriesLoading || merchantLoading;

  // Function to refetch data (for backwards compatibility)
  const fetchCategories = useCallback(async () => {
    await mutateCategories();
  }, [mutateCategories]);

  // Refs to track previous filter values for page reset
  const prevFiltersRef = useRef({ searchQuery, filterStatus });

  // Filter and search logic - MUST be before any conditional returns
  useEffect(() => {
    let filtered = [...categories];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status filter
    if (filterStatus === "active") {
      filtered = filtered.filter(cat => cat.isActive);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter(cat => !cat.isActive);
    }

    setFilteredCategories(filtered);

    // Only reset page when filters actually change, not when categories data updates
    const prev = prevFiltersRef.current;
    const filtersChanged =
      prev.searchQuery !== searchQuery ||
      prev.filterStatus !== filterStatus;

    if (filtersChanged) {
      setCurrentPage(1);
      prevFiltersRef.current = { searchQuery, filterStatus };
    }
  }, [categories, searchQuery, filterStatus]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCategories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Show skeleton loader during initial load
  if (loading) {
    return <CategoriesPageSkeleton />;
  }

  // Show error state if fetch failed
  if (categoriesError) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            Error Loading Addon Categories
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {categoriesError?.message || 'Failed to load addon categories'}
          </p>
          <button
            onClick={() => fetchCategories()}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === "number") {
      setFormData(prev => ({
        ...prev,
        [name]: value === "" ? "" : parseInt(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const isEditing = !!editingCategoryId;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const url = isEditing
        ? `/api/merchant/addon-categories/${editingCategoryId}`
        : "/api/merchant/addon-categories";
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        minSelection: formData.minSelection,
        maxSelection: formData.maxSelection === "" ? null : Number(formData.maxSelection),
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'create'} addon category`);
      }

      showSuccess(`Addon category ${isEditing ? 'updated' : 'created'} successfully!`);
      setShowForm(false);
      setEditingCategoryId(null);
      setFormData({ name: "", description: "", minSelection: 0, maxSelection: "" });

      fetchCategories();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Open edit modal with category data
  const handleEdit = (category: AddonCategory) => {
    setEditingCategoryId(category.id);
    setFormData({
      name: category.name,
      description: category.description || "",
      minSelection: category.minSelection,
      maxSelection: category.maxSelection !== null ? category.maxSelection : "",
    });
    setShowForm(true);
  };

  const handleViewItems = async (category: AddonCategory) => {
    // Open modal immediately with empty items (will show skeleton)
    setViewItemsModal({
      show: true,
      categoryId: category.id,
      categoryName: category.name,
      items: [], // Empty initially, will load
    });

    // Fetch items in background
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/addon-categories/${category.id}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        // Update modal with fetched items
        setViewItemsModal({
          show: true,
          categoryId: category.id,
          categoryName: category.name,
          items: data.success && Array.isArray(data.data) ? data.data : [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
      showError('Failed to load items');
    }
  };

  const handleViewRelationships = (category: AddonCategory) => {
    setViewRelationshipsModal({
      show: true,
      categoryId: category.id,
      categoryName: category.name,
    });
  };

  const handleToggleActive = async (id: string, currentStatus: boolean, name: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/addon-categories/${id}/toggle-active`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to toggle status");
      }

      showSuccess(`Addon category "${name}" ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchCategories();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  // Bulk selection handlers
  const handleSelectAllCategories = (checked: boolean) => {
    if (checked) {
      const allIds = filteredCategories.map(cat => cat.id);
      setSelectedCategories(allIds);
    } else {
      setSelectedCategories([]);
    }
  };

  const handleSelectCategory = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedCategories(prev => [...prev, id]);
    } else {
      setSelectedCategories(prev => prev.filter(catId => catId !== id));
    }
  };

  const handleBulkDeleteCategories = async () => {
    if (selectedCategories.length === 0) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      // Check relationships for all selected categories
      const relationshipChecks = await Promise.all(
        selectedCategories.map(async (id) => {
          const response = await fetch(`/api/merchant/addon-categories/${id}/relationships`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            return { id, menuCount: data.data?.length || 0 };
          }
          return { id, menuCount: 0 };
        })
      );

      const categoriesWithMenus = relationshipChecks.filter(c => c.menuCount > 0);
      const totalMenusAffected = categoriesWithMenus.reduce((sum, c) => sum + c.menuCount, 0);

      if (categoriesWithMenus.length > 0) {
        const confirmMessage = `⚠️ WARNING: ${categoriesWithMenus.length} of ${selectedCategories.length} selected addon categories are currently in use.\n\nTotal menus affected: ${totalMenusAffected}\n\nDeleting these categories will break menu configurations. Are you sure you want to continue?`;

        if (!confirm(confirmMessage)) {
          setShowBulkDeleteConfirm(false);
          return;
        }
      }

      const response = await fetch("/api/merchant/addon-categories/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids: selectedCategories,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete addon categories");
      }

      showSuccess(`${selectedCategories.length} addon category(ies) deleted successfully`);
      setSelectedCategories([]);
      setShowBulkDeleteConfirm(false);
      fetchCategories();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
      setShowBulkDeleteConfirm(false);
    }
  };

  // Show delete confirmation modal with preview data
  const handleDelete = async (id: string, name: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      // Show loading state immediately
      setDeleteConfirm({ show: true, id, name, menuCount: 0, menuList: "", addonItemsCount: 0, loading: true });

      // Fetch delete preview
      const previewResponse = await fetch(`/api/merchant/addon-categories/${id}/delete-preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (previewResponse.ok) {
        const previewData = await previewResponse.json();
        const { affectedMenusCount, affectedMenus, addonItemsCount } = previewData.data;
        
        let menuList = "";
        if (affectedMenusCount > 0 && affectedMenus?.length > 0) {
          const menuNames = affectedMenus.slice(0, 3).map((m: { name: string }) => m.name).join(", ");
          const remainingCount = affectedMenusCount - 3;
          menuList = remainingCount > 0 ? `${menuNames}, and ${remainingCount} more` : menuNames;
        }

        setDeleteConfirm({ 
          show: true, 
          id, 
          name, 
          menuCount: affectedMenusCount, 
          menuList, 
          addonItemsCount: addonItemsCount || 0,
          loading: false 
        });
      } else {
        // Fallback - show without preview
        setDeleteConfirm({ show: true, id, name, menuCount: 0, menuList: "", addonItemsCount: 0, loading: false });
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
      setDeleteConfirm({ show: false, id: "", name: "", menuCount: 0, menuList: "", addonItemsCount: 0, loading: false });
    }
  };

  // Confirm and execute delete
  const confirmDeleteCategory = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ show: false, id: "", name: "", menuCount: 0, menuList: "", addonItemsCount: 0, loading: false });

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/addon-categories/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete addon category");
      }

      showSuccess("Addon category deleted successfully!");
      fetchCategories();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
    }
  };


  const handleCancel = () => {
    setShowForm(false);
    setEditingCategoryId(null);
    setFormData({ name: "", description: "", minSelection: 0, maxSelection: "" });
  };

  return (
    <div>
      <div className="space-y-6">
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {editingCategoryId ? t("admin.addonCategories.editCategory") : t("admin.addonCategories.createNew")}
                </h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("admin.addonCategories.categoryName")} <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Size, Toppings, Extras"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-300 focus:outline-none focus:ring-3 focus:ring-primary-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t("admin.addonCategories.description")}
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Describe this addon category"
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-300 focus:outline-none focus:ring-3 focus:ring-primary-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("admin.addonCategories.minSelection")} <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="minSelection"
                      value={formData.minSelection}
                      onChange={handleChange}
                      required
                      min="0"
                      placeholder="0"
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-300 focus:outline-none focus:ring-3 focus:ring-primary-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t("admin.addonCategories.maxSelection")}
                    </label>
                    <input
                      type="number"
                      name="maxSelection"
                      value={formData.maxSelection}
                      onChange={handleChange}
                      min="0"
                      placeholder={t("admin.addonCategories.leaveEmpty")}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-300 focus:outline-none focus:ring-3 focus:ring-primary-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {t("admin.addonCategories.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-11 rounded-lg bg-primary-500 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? t("admin.addonCategories.saving") : (editingCategoryId ? t("admin.addonCategories.updateCategory") : t("admin.addonCategories.createCategory"))}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Addon Items Modal */}
        {viewItemsModal.show && viewItemsModal.categoryId && (
          <ViewAddonItemsModal
            show={viewItemsModal.show}
            categoryId={viewItemsModal.categoryId}
            categoryName={viewItemsModal.categoryName}
            items={viewItemsModal.items}
            currency={merchant.currency}
            onClose={() => setViewItemsModal({ show: false, categoryId: null, categoryName: "", items: [] })}
            onRefresh={() => handleViewItems({
              id: viewItemsModal.categoryId!,
              name: viewItemsModal.categoryName,
              description: null,
              minSelection: 0,
              maxSelection: null,
              isActive: true,
              createdAt: new Date().toISOString()
            })}
          />
        )}

        {/* Menu Relationships Modal */}
        {viewRelationshipsModal.show && viewRelationshipsModal.categoryId && (
          <MenuRelationshipModal
            show={viewRelationshipsModal.show}
            categoryId={viewRelationshipsModal.categoryId}
            categoryName={viewRelationshipsModal.categoryName}
            onClose={() => setViewRelationshipsModal({ show: false, categoryId: null, categoryName: "" })}
          />
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Addon Categories</h3>
            <div className="flex items-center gap-3">
              {selectedCategories.length > 0 && (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedCategories.length} selected
                  </span>
                  <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-error-300 bg-error-50 px-4 text-sm font-medium text-error-700 hover:bg-error-100 dark:border-error-700 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete {selectedCategories.length}
                  </button>
                </>
              )}
              <button
                onClick={() => setShowArchiveModal(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                title={t("common.archiveDescription")}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
                {t("common.archive")}
              </button>
              <button
                onClick={() => {
                  try {
                    exportAddonCategories(categories);
                    showSuccess('Addon categories exported successfully!');
                  } catch (err) {
                    showError(err instanceof Error ? err.message : 'Export failed');
                  }
                }}
                disabled={categories.length === 0}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                title={t("admin.addonCategories.exportExcel")}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-500 px-6 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-3 focus:ring-primary-500/20"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Addon Category
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <input
                type="text"
                placeholder={t("admin.addonCategories.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-300 focus:outline-none focus:ring-3 focus:ring-primary-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-primary-300 focus:outline-none focus:ring-3 focus:ring-primary-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">{t("admin.addonCategories.allStatus")}</option>
                <option value="active">{t("common.active")}</option>
                <option value="inactive">{t("common.inactive")}</option>
              </select>
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <EmptyState
              type={categories.length === 0 ? "no-addon" : "no-results"}
              title={categories.length === 0 ? undefined : t("admin.addonCategories.noMatch")}
              description={categories.length === 0 ? undefined : t("admin.addonCategories.tryAdjusting")}
              action={categories.length === 0 ? {
                label: t("admin.addonCategories.createCategory"),
                onClick: () => setShowForm(true)
              } : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={selectedCategories.length === currentItems.length && currentItems.length > 0}
                        onChange={(e) => handleSelectAllCategories(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.addonCategories.table.name")}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.addonCategories.description")}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.addonCategories.table.selection")}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.addonCategories.table.items")}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.addonCategories.table.menus")}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.addonCategories.table.status")}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.addonCategories.table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {currentItems.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={(e) => handleSelectCategory(category.id, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{category.name}</td>
                      <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{category.description || '-'}</td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        Min: {category.minSelection} / Max: {category.maxSelection || '∞'}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                          {t("admin.addonCategories.itemsCount", { count: category._count?.addonItems || 0 })}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                          {t("admin.addonCategories.menusCount", { count: category._count?.menuAddonCategories || 0 })}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleActive(category.id, category.isActive, category.name)}
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium transition-colors ${category.isActive
                            ? 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30'
                            : 'bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30'
                            }`}>
                          {category.isActive ? t("admin.addonCategories.statusActive") : t("admin.addonCategories.statusInactive")}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewItems(category)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            title={t("admin.addonCategories.viewItems")}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleViewRelationships(category)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:border-purple-900/50 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30"
                            title={t("admin.addonCategories.viewMenus")}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(category)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            title={t("admin.addonCategories.edit")}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(category.id, category.name)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-error-200 bg-error-50 text-error-600 hover:bg-error-100 dark:border-error-900/50 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30"
                            title={t("admin.addonCategories.delete")}
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-5 dark:border-gray-800">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {t("admin.categories.showing")} {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredCategories.length)} {t("admin.categories.of")} {filteredCategories.length} {t("admin.categories.categories")}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium ${currentPage === page
                          ? 'border-primary-500 bg-primary-500 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-100 dark:bg-error-900/20">
                  <svg className="h-6 w-6 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Delete {selectedCategories.length} Addon Category{selectedCategories.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
                Are you sure you want to delete {selectedCategories.length} addon category{selectedCategories.length > 1 ? 's' : ''}?
                This will also delete all addon items in {selectedCategories.length > 1 ? 'these categories' : 'this category'}.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkDeleteCategories}
                  className="flex-1 h-11 rounded-lg bg-error-600 text-sm font-medium text-white hover:bg-error-700"
                >
                  Delete {selectedCategories.length} Category{selectedCategories.length > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Single Delete Confirmation Modal */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-100 dark:bg-error-900/20">
                  <svg className="h-6 w-6 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Delete Addon Category
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              {deleteConfirm.loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
                </div>
              ) : (
                <>
                  {(deleteConfirm.menuCount > 0 || deleteConfirm.addonItemsCount > 0) ? (
                    <div className="mb-6">
                      <div className="mb-3 rounded-lg border border-warning-200 bg-warning-50 p-3 dark:border-warning-900/50 dark:bg-warning-900/20">
                        <div className="flex items-center gap-2 text-sm font-medium text-warning-700 dark:text-warning-400">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Warning: This will affect the following
                        </div>
                        <ul className="mt-2 space-y-1 text-xs text-warning-600 dark:text-warning-500">
                          {deleteConfirm.menuCount > 0 && (
                            <li>• Removes from {deleteConfirm.menuCount} menu{deleteConfirm.menuCount > 1 ? 's' : ''}: {deleteConfirm.menuList}</li>
                          )}
                          {deleteConfirm.addonItemsCount > 0 && (
                            <li>• Deletes {deleteConfirm.addonItemsCount} addon item{deleteConfirm.addonItemsCount > 1 ? 's' : ''} in this category</li>
                          )}
                        </ul>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Are you sure you want to delete &ldquo;<span className="font-medium">{deleteConfirm.name}</span>&rdquo;?
                      </p>
                    </div>
                  ) : (
                    <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
                      Are you sure you want to delete &ldquo;<span className="font-medium">{deleteConfirm.name}</span>&rdquo;?
                      This addon category is not assigned to any menus and has no items.
                    </p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => setDeleteConfirm({ show: false, id: "", name: "", menuCount: 0, menuList: "", addonItemsCount: 0, loading: false })}
                      className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmDeleteCategory}
                      className="flex-1 h-11 rounded-lg bg-error-600 text-sm font-medium text-white hover:bg-error-700"
                    >
                      Delete Category
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Archive Modal */}
      <ArchiveModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onRestoreSuccess={() => {
          fetchCategories();
          showSuccess('Item restored successfully!');
        }}
      />
    </div>
  );
}

// Export with Suspense wrapper for useSearchParams
export default function AddonCategoriesPage() {
  return (
    <Suspense fallback={<CategoriesPageSkeleton />}>
      <AddonCategoriesPageContent />
    </Suspense>
  );
}
