"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Image from "next/image";
import EmptyState from "@/components/ui/EmptyState";
import { exportCategories } from "@/lib/utils/excelExport";
import { useSWRStatic } from "@/hooks/useSWRWithAuth";
import { CategoriesPageSkeleton } from "@/components/common/SkeletonLoaders";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useMerchant } from "@/context/MerchantContext";
import { useToast } from "@/context/ToastContext";
import ArchiveModal from "@/components/common/ArchiveModal";
import { useContextualHint, CONTEXTUAL_HINTS, useClickHereHint, CLICK_HINTS } from "@/lib/tutorial";
import { TableActionButton } from "@/components/common/TableActionButton";
import { FaCogs, FaEdit, FaTrash } from "react-icons/fa";

interface Category {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  sortOrder: number;
  isActive: boolean;
  _count?: {
    menuItems?: number;
    menus?: number;
  };
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  imageUrl?: string | null;
}

interface CategoryFormData {
  name: string;
  description: string;
}

// Response type for SWR
interface CategoriesApiResponse {
  success: boolean;
  data: Category[];
}

export default function MerchantCategoriesPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { formatCurrency } = useMerchant();
  const { showSuccess, showError } = useToast();
  const { showHint } = useContextualHint();
  const { showClickHint } = useClickHereHint();
  const [submitting, setSubmitting] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [availableMenus, setAvailableMenus] = useState<MenuItem[]>([]);
  const [categoryMenus, setCategoryMenus] = useState<MenuItem[]>([]);
  const [sortBy, setSortBy] = useState<string>("manual");
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState<boolean>(false);
  const [pendingReorder, setPendingReorder] = useState<Category[] | null>(null);
  const [loadingMenus, setLoadingMenus] = useState<boolean>(false);

  // Menu search states for Manage Menus modal
  const [availableMenuSearch, setAvailableMenuSearch] = useState<string>("");
  const [categoryMenuSearch, setCategoryMenuSearch] = useState<string>("");

  // Tab state: "list" or "display"
  const [activeTab, setActiveTab] = useState<"list" | "display">("list");

  // Bulk selection states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Single delete confirmation with preview data
  const [deleteConfirm, setDeleteConfirm] = useState<{ 
    show: boolean; 
    id: string; 
    name: string; 
    menuItemsCount: number;
    menuList: string;
    loading: boolean;
  }>({ show: false, id: "", name: "", menuItemsCount: 0, menuList: "", loading: false });

  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    description: "",
  });

  // Pagination & Filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // SWR hook for data fetching with caching
  const {
    data: categoriesResponse,
    error: categoriesError,
    isLoading,
    mutate: mutateCategories
  } = useSWRStatic<CategoriesApiResponse>('/api/merchant/categories');

  // Stabilize categories with useMemo to prevent infinite loop
  const categories = useMemo(() => {
    return categoriesResponse?.success ? categoriesResponse.data : [];
  }, [categoriesResponse]);

  const loading = isLoading;

  // Function to refetch data (for backwards compatibility)
  const fetchCategories = useCallback(async () => {
    await mutateCategories();
  }, [mutateCategories]);

  // Refs to track previous values for optimization
  const prevFiltersRef = useRef({ searchQuery, filterStatus, sortBy });
  const prevCategoriesLengthRef = useRef(0);

  // Filter and search logic - stable with proper dependencies
  useEffect(() => {
    // Skip if categories haven't changed and filters haven't changed
    const filtersChanged =
      prevFiltersRef.current.searchQuery !== searchQuery ||
      prevFiltersRef.current.filterStatus !== filterStatus ||
      prevFiltersRef.current.sortBy !== sortBy;

    const _categoriesChanged = prevCategoriesLengthRef.current !== categories.length;

    // Update refs
    prevCategoriesLengthRef.current = categories.length;

    let filtered = [...categories];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(cat =>
        cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (cat.description && cat.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status filter
    if (filterStatus !== "all") {
      filtered = filtered.filter(cat =>
        filterStatus === "active" ? cat.isActive : !cat.isActive
      );
    }

    // Sorting
    switch (sortBy) {
      case "manual":
        filtered.sort((a, b) => a.displayOrder - b.displayOrder);
        break;
      case "name-asc":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "menu-count":
        filtered.sort((a, b) => (b._count?.menuItems || 0) - (a._count?.menuItems || 0));
        break;
      default:
        break;
    }

    setFilteredCategories(filtered);

    // Only reset page when filters actually change, not when categories data updates
    if (filtersChanged) {
      setCurrentPage(1);
      prevFiltersRef.current = { searchQuery, filterStatus, sortBy };
    }
  }, [categories, searchQuery, filterStatus, sortBy]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCategories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Show contextual hint when categories are empty
  useEffect(() => {
    if (!loading && categories.length === 0) {
      showHint(CONTEXTUAL_HINTS.emptyCategories);
      // Show click hint pointing to Add Category button
      setTimeout(() => {
        showClickHint(CLICK_HINTS.addCategoryButton);
      }, 1000);
    }
  }, [loading, categories.length, showHint, showClickHint]);

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
            Error Loading Categories
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {categoriesError?.message || 'Failed to load categories'}
          </p>
          <button
            onClick={() => fetchCategories()}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
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
        [name]: parseInt(value) || 0
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

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const url = editingId
        ? `/api/merchant/categories/${editingId}`
        : "/api/merchant/categories";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${editingId ? 'update' : 'create'} category`);
      }

      showSuccess(`Category ${editingId ? 'updated' : 'created'} successfully!`);
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", description: "" });

      fetchCategories();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || "",
    });
    setShowForm(true);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean, name: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/categories/${id}/toggle-active`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to toggle category status");
      }

      showSuccess(`Category "${name}" ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      fetchCategories();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
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
      setDeleteConfirm({ show: true, id, name, menuItemsCount: 0, menuList: "", loading: true });

      // Fetch delete preview
      const previewResponse = await fetch(`/api/merchant/categories/${id}/delete-preview`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (previewResponse.ok) {
        const previewData = await previewResponse.json();
        const { menuItemsCount, menuNames } = previewData.data;
        
        let menuList = "";
        if (menuItemsCount > 0 && menuNames?.length > 0) {
          const displayNames = menuNames.slice(0, 3).join(", ");
          const remainingCount = menuItemsCount - 3;
          menuList = remainingCount > 0 ? `${displayNames}, and ${remainingCount} more` : displayNames;
        }

        setDeleteConfirm({ 
          show: true, 
          id, 
          name, 
          menuItemsCount, 
          menuList, 
          loading: false 
        });
      } else {
        // Fallback - show without preview
        setDeleteConfirm({ show: true, id, name, menuItemsCount: 0, menuList: "", loading: false });
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
      setDeleteConfirm({ show: false, id: "", name: "", menuItemsCount: 0, menuList: "", loading: false });
    }
  };

  // Confirm and execute delete
  const confirmDelete = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ show: false, id: "", name: "", menuItemsCount: 0, menuList: "", loading: false });

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/categories/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete category");
      }

      showSuccess("Category deleted successfully!");
      fetchCategories();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", description: "" });
  };

  const handleReorder = async (reorderedCategories: Category[]) => {
    // Store pending changes instead of immediately saving
    setPendingReorder(reorderedCategories);
    setHasUnsavedOrder(true);
    // Update display immediately for UX
    setFilteredCategories(reorderedCategories);
  };

  const handleSaveOrder = async () => {
    if (!pendingReorder) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/merchant/categories/reorder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categories: pendingReorder.map((cat, idx) => ({
            id: cat.id,
            sortOrder: idx,
          })),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to reorder categories");
      }

      showSuccess("Categories reordered successfully!");
      setHasUnsavedOrder(false);
      setPendingReorder(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
      fetchCategories();
    }
  };

  const handleCancelOrder = () => {
    // Reset to original order
    fetchCategories();
    setHasUnsavedOrder(false);
    setPendingReorder(null);
  };

  // Bulk selection handlers (prefixed with _ as they may be used in future features)
  const _handleSelectAllCategories = (checked: boolean) => {
    if (checked) {
      const allIds = filteredCategories.map(cat => cat.id);
      setSelectedCategories(allIds);
    } else {
      setSelectedCategories([]);
    }
  };

  const _handleSelectCategory = (id: string, checked: boolean) => {
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

      const response = await fetch("/api/merchant/categories/bulk-delete", {
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
        throw new Error(data.message || "Failed to delete categories");
      }

      showSuccess(`${selectedCategories.length} category(ies) deleted successfully`);
      setSelectedCategories([]);
      setShowBulkDeleteConfirm(false);
      fetchCategories();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
      setShowBulkDeleteConfirm(false);
    }
  };

  const _handleInlineUpdate = async (id: string, field: 'name' | 'description', value: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          [field]: value || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Failed to update ${field}`);
      }

      showSuccess(`Category ${field} updated successfully!`);
      fetchCategories();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
      throw err;
    }
  };

  const handleManageMenus = async (category: Category) => {
    setSelectedCategory(category);
    setLoadingMenus(true);
    setAvailableMenus([]);
    setCategoryMenus([]);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      // Fetch all menus and category menus
      const [allMenusRes, categoryMenusRes] = await Promise.all([
        fetch("/api/merchant/menu", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/merchant/categories/${category.id}/menus`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (allMenusRes.ok) {
        const data = await allMenusRes.json();
        setAvailableMenus(data.success && data.data ? data.data : []);
      }

      if (categoryMenusRes.ok) {
        const data = await categoryMenusRes.json();
        setCategoryMenus(data.success && data.data ? data.data : []);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to load menus");
    } finally {
      setLoadingMenus(false);
    }
  };

  const handleAddMenuToCategory = async (menuId: string) => {
    if (!selectedCategory) return;

    // Find the menu to add
    const menuToAdd = availableMenus.find(m => m.id === menuId);
    if (!menuToAdd) return;

    // Optimistic update - immediately update UI
    setCategoryMenus(prev => [...prev, menuToAdd]);
    showSuccess("Menu added to category!");

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/categories/${selectedCategory.id}/menus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ menuId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to add menu");
      }

      // Refresh categories in background to update count
      fetchCategories();
    } catch (err) {
      // Revert optimistic update on error
      setCategoryMenus(prev => prev.filter(m => m.id !== menuId));
      showError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleRemoveMenuFromCategory = async (menuId: string) => {
    if (!selectedCategory) return;

    // Store removed menu for potential rollback
    const removedMenu = categoryMenus.find(m => m.id === menuId);

    // Optimistic update - immediately update UI
    setCategoryMenus(prev => prev.filter(m => m.id !== menuId));
    showSuccess("Menu removed from category!");

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/categories/${selectedCategory.id}/menus/${menuId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to remove menu");
      }

      // Refresh categories in background to update count
      fetchCategories();
    } catch (err) {
      // Revert optimistic update on error
      if (removedMenu) {
        setCategoryMenus(prev => [...prev, removedMenu]);
      }
      showError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div data-tutorial="categories-page">
      <div className="space-y-6">
        {showForm && isMounted
          ? createPortal(
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) handleCancel();
                }}
              >
                <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900" data-tutorial="category-form-modal">
                  <div onMouseDown={(e) => e.stopPropagation()}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                      {editingId ? t("admin.categories.editCategory") : t("admin.categories.createNew")}
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

                  <form onSubmit={handleSubmit} className="space-y-4" data-tutorial="category-form">
                    <div data-tutorial="category-name-field">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("admin.categories.categoryName")} <span className="text-error-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                      />
                    </div>

                    <div data-tutorial="category-description-field">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("admin.categories.description")}
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={handleCancel}
                        className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        {t("admin.categories.cancel")}
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        data-tutorial="category-save-btn"
                        className="flex-1 h-11 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {submitting ? t("admin.categories.saving") : editingId ? t("admin.categories.updateCategory") : t("admin.categories.createCategory")}
                      </button>
                    </div>
                  </form>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          {/* Tab Navigation */}
          <div className="mb-5 border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex gap-6">
              <button
                onClick={() => setActiveTab("list")}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === "list"
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
              >
                {t("admin.categories.categoryList")}
              </button>
              <button
                onClick={() => setActiveTab("display")}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${activeTab === "display"
                  ? "border-brand-500 text-brand-600 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
              >
                {t("admin.categories.categoryDisplay")}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "list" ? (
            <>
              {/* Category List Tab */}
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{t("admin.categories.listTitle")}</h3>
                <div className="flex items-center gap-3">
                  {selectedCategories.length > 0 && (
                    <>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {t("admin.categories.selected", { count: selectedCategories.length })}
                      </span>
                      <button
                        onClick={() => setShowBulkDeleteConfirm(true)}
                        className="inline-flex h-11 items-center gap-2 rounded-lg border border-error-300 bg-error-50 px-4 text-sm font-medium text-error-700 hover:bg-error-100 dark:border-error-700 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {t("common.delete")} {selectedCategories.length}
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
                        exportCategories(categories);
                        showSuccess('Categories exported successfully!');
                      } catch (err) {
                        showError(err instanceof Error ? err.message : 'Export failed');
                      }
                    }}
                    disabled={categories.length === 0}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    title={t("admin.categories.exportExcel")}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t("common.export")}
                  </button>
                  <button
                    data-tutorial="add-category-btn"
                    onClick={() => setShowForm(true)}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t("admin.categories.addCategory")}
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div data-tutorial="category-filters" className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div data-tutorial="category-search">
                  <input
                    type="text"
                    placeholder={t("admin.categories.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                </div>
                <div>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="all">{t("admin.categories.allStatus")}</option>
                    <option value="active">{t("common.active")}</option>
                    <option value="inactive">{t("common.inactive")}</option>
                  </select>
                </div>
                <div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="manual">{t("admin.categories.sortManual")}</option>
                    <option value="name-asc">{t("admin.categories.sortNameAsc")}</option>
                    <option value="name-desc">{t("admin.categories.sortNameDesc")}</option>
                    <option value="menu-count">{t("admin.categories.sortMenuCount")}</option>
                  </select>
                </div>
              </div>

              {filteredCategories.length === 0 ? (
                <div data-tutorial="category-empty-state">
                  <EmptyState
                    type={categories.length === 0 ? "no-category" : "no-results"}
                    title={categories.length === 0 ? undefined : t("admin.categories.noMatch")}
                    description={categories.length === 0 ? undefined : t("admin.categories.tryAdjusting")}
                    action={categories.length === 0 ? { label: t("admin.categories.createFirst"), onClick: () => setShowForm(true) } : undefined}
                  />
                </div>
              ) : (
                <div data-tutorial="category-list" className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.categories.name")}</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.categories.description")}</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.categories.display")}</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.categories.items")}</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.categories.status")}</th>
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.categories.actions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {currentItems.map((category) => (
                        <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                          <td className="px-4 py-4 text-sm font-medium text-gray-800 dark:text-white/90">{category.name}</td>
                          <td className="px-4 py-4 text-sm text-gray-600 dark:text-gray-400">{category.description || '-'}</td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300">
                              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                              </svg>
                              {category.sortOrder + 1}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                            {t("admin.categories.menusCount", { count: category._count?.menuItems || 0 })}
                          </td>
                          <td className="px-4 py-4">
                            <button
                              onClick={() => handleToggleActive(category.id, category.isActive, category.name)}
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium transition-colors ${category.isActive
                                ? 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30'
                                : 'bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30'
                                }`}>
                              {category.isActive ? t("admin.categories.statusActive") : t("admin.categories.statusInactive")}
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <TableActionButton
                                icon={FaCogs}
                                onClick={() => handleManageMenus(category)}
                                title={t("admin.categories.manageMenus")}
                                aria-label={t("admin.categories.manageMenus")}
                              />
                              <TableActionButton
                                icon={FaEdit}
                                onClick={() => handleEdit(category)}
                                data-tutorial="category-edit-btn"
                                title={t("admin.categories.edit")}
                                aria-label={t("admin.categories.edit")}
                              />
                              <TableActionButton
                                icon={FaTrash}
                                tone="danger"
                                onClick={() => handleDelete(category.id, category.name)}
                                title={t("admin.categories.delete")}
                                aria-label={t("admin.categories.delete")}
                              />
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
                              ? 'border-brand-500 bg-brand-500 text-white'
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
            </>
          ) : (
            <>
              {/* Category Display Tab - Drag and Drop Reordering */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{t("admin.categories.displayOrder")}</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {t("admin.categories.displayOrderDesc")}
                  </p>
                </div>
                {hasUnsavedOrder && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCancelOrder}
                      className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-3 focus:ring-gray-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      {t("admin.categories.cancel")}
                    </button>
                    <button
                      onClick={handleSaveOrder}
                      className="inline-flex h-11 items-center gap-2 rounded-lg bg-success-600 px-4 text-sm font-medium text-white hover:bg-success-700 focus:outline-none focus:ring-3 focus:ring-success-500/20"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {t("admin.categories.saveOrder")}
                    </button>
                  </div>
                )}
              </div>

              {categories.length === 0 ? (
                <EmptyState
                  type="no-category"
                  action={{ label: t("admin.categories.createFirst"), onClick: () => { setActiveTab("list"); setShowForm(true); } }}
                />
              ) : (
                <div className="space-y-2">
                  <div className="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span>{t("admin.categories.dragDropHint")}</span>
                  </div>
                  {(pendingReorder || categories).sort((a, b) => a.sortOrder - b.sortOrder).map((category, index) => (
                    <div
                      key={category.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", index.toString());
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.add("border-brand-300", "border-dashed");
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove("border-brand-300", "border-dashed");
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove("border-brand-300", "border-dashed");
                        const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
                        const toIndex = index;
                        if (fromIndex !== toIndex) {
                          const sortedCategories = (pendingReorder || categories).sort((a, b) => a.sortOrder - b.sortOrder);
                          const reordered = [...sortedCategories];
                          const [removed] = reordered.splice(fromIndex, 1);
                          reordered.splice(toIndex, 0, removed);
                          const updated = reordered.map((cat, idx) => ({
                            ...cat,
                            sortOrder: idx,
                            displayOrder: idx + 1,
                          }));
                          handleReorder(updated);
                        }
                      }}
                      className="group flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 cursor-grab active:cursor-grabbing"
                    >
                      {/* Drag Handle */}
                      <div className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                      </div>

                      {/* Order Number */}
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                        {index + 1}
                      </div>

                      {/* Category Name */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-800 dark:text-white/90">
                          {category.name}
                        </h4>
                        {category.description && (
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                            {category.description}
                          </p>
                        )}
                      </div>

                      {/* Menu Count */}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {category._count?.menuItems || 0} menus
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </>
          )}
        </div>


        {/* Manage Menus Modal */}
        {selectedCategory && isMounted
          ? createPortal(
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) setSelectedCategory(null);
                }}
              >
                <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[80vh] overflow-y-auto">
                  <div onMouseDown={(e) => e.stopPropagation()}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                      Manage Menus: {selectedCategory.name}
                    </h3>
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Available Menus */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Available Menus {!loadingMenus && `(${availableMenus.filter(m => !categoryMenus.find(cm => cm.id === m.id)).length})`}
                  </h4>
                  <input
                    type="text"
                    placeholder="Search available menus..."
                    value={availableMenuSearch}
                    onChange={(e) => setAvailableMenuSearch(e.target.value)}
                    className="mb-3 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                  <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    {loadingMenus ? (
                      // Skeleton Rows
                      Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 animate-pulse">
                          <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-gray-200 dark:bg-gray-700" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
                        </div>
                      ))
                    ) : (
                      <>
                        {availableMenus
                          .filter(menu => !categoryMenus.find(cm => cm.id === menu.id))
                          .filter(menu => availableMenuSearch === "" || menu.name.toLowerCase().includes(availableMenuSearch.toLowerCase()))
                          .map((menu) => (

                            <div
                              key={menu.id}
                              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                            >
                              {menu.imageUrl ? (
                                <Image
                                  src={menu.imageUrl}
                                  alt={menu.name}
                                  width={48}
                                  height={48}
                                  className="rounded-lg object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                                    {menu.name}
                                  </p>
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${menu.isActive
                                    ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                    {menu.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatCurrency(typeof menu.price === 'string' ? parseFloat(menu.price) : menu.price)}
                                </p>
                              </div>
                              <button
                                onClick={() => handleAddMenuToCategory(menu.id)}
                                className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white hover:bg-brand-600"
                                title="Add to category"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        {availableMenus.filter(m => !categoryMenus.find(cm => cm.id === m.id)).length === 0 && (
                          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            All menus are already in this category
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Category Menus */}
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Menus in Category {!loadingMenus && `(${categoryMenus.length})`}
                  </h4>
                  <input
                    type="text"
                    placeholder="Search menus in category..."
                    value={categoryMenuSearch}
                    onChange={(e) => setCategoryMenuSearch(e.target.value)}
                    className="mb-3 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                  <div className="space-y-2 max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    {loadingMenus ? (
                      // Skeleton Rows
                      Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 animate-pulse">
                          <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-gray-200 dark:bg-gray-700" />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                            <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-700" />
                          </div>
                          <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
                        </div>
                      ))
                    ) : (
                      <>
                        {categoryMenus
                          .filter(menu => categoryMenuSearch === "" || menu.name.toLowerCase().includes(categoryMenuSearch.toLowerCase()))
                          .map((menu) => (

                            <div
                              key={menu.id}
                              className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                            >
                              {menu.imageUrl ? (
                                <Image
                                  src={menu.imageUrl}
                                  alt={menu.name}
                                  width={48}
                                  height={48}
                                  className="rounded-lg object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                                    {menu.name}
                                  </p>
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${menu.isActive
                                    ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                    {menu.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatCurrency(typeof menu.price === 'string' ? parseFloat(menu.price) : menu.price)}
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemoveMenuFromCategory(menu.id)}
                                className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-error-50 text-error-600 hover:bg-error-100 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30"
                                title="Remove from category"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        {categoryMenus.length === 0 && (
                          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            No menus in this category yet
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="h-11 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600"
                >
                  Done
                </button>
              </div>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null}

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteConfirm && isMounted
          ? createPortal(
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) setShowBulkDeleteConfirm(false);
                }}
              >
                <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900">
                  <div onMouseDown={(e) => e.stopPropagation()}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-100 dark:bg-error-900/20">
                  <svg className="h-6 w-6 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Delete {selectedCategories.length} Category{selectedCategories.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
                Are you sure you want to delete {selectedCategories.length} category{selectedCategories.length > 1 ? 's' : ''}?
                This will permanently remove {selectedCategories.length > 1 ? 'them' : 'it'} from your menu.
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
              </div>,
              document.body
            )
          : null}

        {/* Single Delete Confirmation Modal with Preview */}
        {deleteConfirm.show && isMounted
          ? createPortal(
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) setDeleteConfirm({ show: false, id: '', name: '', menuItemsCount: 0, menuList: '', loading: false });
                }}
              >
                <div
                  className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-100 dark:bg-error-900/20">
                      <svg className="h-6 w-6 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Category</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone.</p>
                    </div>
                  </div>

              {deleteConfirm.loading ? (
                <div className="mb-6 flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500"></div>
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading preview...</span>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                    Are you sure you want to delete &ldquo;<span className="font-medium">{deleteConfirm.name}</span>&rdquo;?
                    This will permanently remove it from your menu.
                  </p>

                  {deleteConfirm.menuItemsCount > 0 && (
                    <div className="mb-4 rounded-lg bg-warning-50 p-3 dark:bg-warning-900/20">
                      <div className="flex items-start gap-2">
                        <svg className="h-5 w-5 shrink-0 text-warning-600 dark:text-warning-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-warning-800 dark:text-warning-200">
                            This category has {deleteConfirm.menuItemsCount} menu item{deleteConfirm.menuItemsCount > 1 ? 's' : ''}
                          </p>
                          {deleteConfirm.menuList && (
                            <p className="mt-1 text-xs text-warning-700 dark:text-warning-300">
                              {deleteConfirm.menuList}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
                            These menu items will be removed from this category.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm({ show: false, id: "", name: "", menuItemsCount: 0, menuList: "", loading: false })}
                  className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleteConfirm.loading}
                  className="flex-1 h-11 rounded-lg bg-error-600 text-sm font-medium text-white hover:bg-error-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete Category
                </button>
              </div>
                </div>
              </div>,
              document.body
            )
          : null}
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
