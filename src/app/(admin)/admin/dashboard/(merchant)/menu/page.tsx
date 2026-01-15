"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
// Removed QuickFilterPills - replaced with dropdown selects for minimalist design
import EmptyState from "@/components/ui/EmptyState";
import DuplicateMenuButton from "@/components/menu/DuplicateMenuButton";
import { exportMenuItems } from "@/lib/utils/excelExport";
import InlineEditField from "@/components/ui/InlineEditField";
import ManageMenuAddonCategoriesModal from "@/components/menu/ManageMenuAddonCategoriesModal";
import ManageMenuCategoriesModal from "@/components/menu/ManageMenuCategoriesModal";
import { useSWRWithAuth, useSWRStatic } from "@/hooks/useSWRWithAuth";
import { MenuPageSkeleton } from "@/components/common/SkeletonLoaders";
import { useMerchant } from "@/context/MerchantContext";
import CreateOptionModal from "@/components/common/CreateOptionModal";
import ArchiveModal from "@/components/common/ArchiveModal";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils/format";
import { useContextualHint, CONTEXTUAL_HINTS, useClickHereHint, CLICK_HINTS } from "@/lib/tutorial";
import { TableActionButton } from "@/components/common/TableActionButton";
import { FaEllipsisV } from "react-icons/fa";

interface MenuAddonCategory {
  addonCategoryId: string;
  isRequired: boolean;
  displayOrder: number;
  addonCategory: {
    id: string;
    name: string;
    description: string | null;
    minSelection: number;
    maxSelection: number | null;
    isActive: boolean;
    addonItems: Array<{
      id: string;
      name: string;
      description: string | null;
      price: string | number;
      inputType: string;
      isActive: boolean;
      trackStock: boolean;
      stockQty: number | null;
      displayOrder: number;
    }>;
  };
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  imageUrl: string | null;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  categories?: Array<{
    id: string;
    menuId: string;
    categoryId: string;
    category: {
      id: string;
      name: string;
    };
  }>;
  addonCategories?: MenuAddonCategory[];
  isActive: boolean;
  // Note: Promo is now managed via SpecialPrice table, not menu fields
  trackStock: boolean;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
  isSpicy: boolean;
  isBestSeller: boolean;
  isSignature: boolean;
  isRecommended: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
}



// Response types for SWR
interface MenuApiResponse {
  success: boolean;
  data: MenuItem[];
}

interface CategoriesApiResponse {
  success: boolean;
  data: Category[];
}

function MerchantMenuPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { showHint } = useContextualHint();
  const { showClickHint } = useClickHereHint();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Create option modal state
  const [showCreateOptionModal, setShowCreateOptionModal] = useState(false);

  // Note: Promo feature moved to Special Prices page
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [selectedMenuForAddons, setSelectedMenuForAddons] = useState<MenuItem | null>(null);
  const [showManageAddonsModal, setShowManageAddonsModal] = useState(false);
  const [selectedMenuForCategories, setSelectedMenuForCategories] = useState<MenuItem | null>(null);
  const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);

  // Bulk selection states
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);

  // Single delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    id: string;
    name: string;
    loading: boolean;
  }>({ show: false, id: "", name: "", loading: false });

  // Initialize pagination from URL search params
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  
  // Pagination & Filter states
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<string[]>([]);
  // Note: Promo filter removed - promo is now managed via Special Prices page

  // Dropdown open states for multi-select filters
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState(false);

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
    data: menuResponse,
    error: menuError,
    isLoading: menuLoading,
    mutate: mutateMenu
  } = useSWRWithAuth<MenuApiResponse>('/api/merchant/menu', {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  const {
    data: categoriesResponse,
    error: categoriesError,
    isLoading: categoriesLoading
  } = useSWRStatic<CategoriesApiResponse>('/api/merchant/categories');

  // Use MerchantContext instead of fetching
  const { merchant: merchantData, isLoading: merchantLoading } = useMerchant();

  // Extract data from SWR responses
  // Extract data from SWR responses
  const menuItems = useMemo(() => menuResponse?.success ? menuResponse.data : [], [menuResponse]);
  const categories = categoriesResponse?.success ? categoriesResponse.data : [];
  const merchant = merchantData;

  // Combined loading state
  const loading = menuLoading || categoriesLoading || merchantLoading;

  // Function to refetch data (for backwards compatibility)
  const fetchData = useCallback(async () => {
    await mutateMenu();
  }, [mutateMenu]);

  // Refs to track previous filter values for page reset
  const prevFiltersRef = useRef({ searchQuery, filterCategory, filterStatus, filterStock });

  // Use useMemo for filtered items to avoid infinite loop
  const filteredMenuItems = useMemo(() => {
    let filtered = [...menuItems];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter(item => {
        if (item.categories && item.categories.length > 0) {
          return item.categories.some(c => c.categoryId === filterCategory);
        }
        return item.categoryId === filterCategory;
      });
    }

    // Status filter - don't filter by default, only when explicitly selected
    if (filterStatus === "active") {
      filtered = filtered.filter(item => item.isActive);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter(item => !item.isActive);
    }
    // if "all", don't filter - show everything

    // Stock filters
    if (filterStock.length > 0) {
      filtered = filtered.filter(item => {
        if (!item.trackStock) return filterStock.includes('no-track');
        const stockQty = item.stockQty || 0;
        if (filterStock.includes('in-stock') && stockQty > 0) return true;
        if (filterStock.includes('low-stock') && stockQty > 0 && stockQty <= 10) return true;
        if (filterStock.includes('out-of-stock') && stockQty === 0) return true;
        return false;
      });
    }

    // Note: Promo filtering removed - promo is now managed via Special Prices page

    return filtered;
  }, [menuItems, searchQuery, filterCategory, filterStatus, filterStock]);

  // Reset page when filters change
  useEffect(() => {
    const prev = prevFiltersRef.current;
    const filtersChanged =
      prev.searchQuery !== searchQuery ||
      prev.filterCategory !== filterCategory ||
      prev.filterStatus !== filterStatus ||
      JSON.stringify(prev.filterStock) !== JSON.stringify(filterStock);

    if (filtersChanged) {
      setCurrentPage(1);
      prevFiltersRef.current = { searchQuery, filterCategory, filterStatus, filterStock };
    }
  }, [searchQuery, filterCategory, filterStatus, filterStock]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.dropdown-container')) {
        setIsStockDropdownOpen(false);
      }
    };

    if (isStockDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isStockDropdownOpen]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredMenuItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredMenuItems.length / itemsPerPage);

  // Show contextual hint when menu is empty
  useEffect(() => {
    if (!loading && menuItems.length === 0) {
      showHint(CONTEXTUAL_HINTS.emptyMenu);
      // Show click hint pointing to Add Menu button
      setTimeout(() => {
        showClickHint(CLICK_HINTS.addMenuButton);
      }, 1000);
    }
  }, [loading, menuItems.length, showHint, showClickHint]);

  // Show skeleton loader during initial load
  if (loading) {
    return <MenuPageSkeleton />;
  }

  // Show error state if any fetch failed
  if (menuError || categoriesError) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border-2 border-red-200 bg-white p-8 text-center shadow-sm dark:border-red-800 dark:bg-gray-900">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
            {t("admin.menu.errorLoading")}
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            {menuError?.message || categoriesError?.message || 'Failed to load data'}
          </p>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            {t("common.retry")}
          </button>
        </div>
      </div>
    );
  }

  const handleDelete = (id: string, name: string) => {
    // Show delete confirmation modal
    setDeleteConfirm({ show: true, id, name, loading: false });
  };

  // Confirm and execute delete
  const confirmDelete = async () => {
    const { id } = deleteConfirm;
    setDeleteConfirm({ show: false, id: "", name: "", loading: false });

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/menu/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete menu item");
      }

      setSuccess("Menu item deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean, name: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/menu/${id}/toggle-active`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to toggle menu status");
      }

      setSuccess(`Menu "${name}" ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleInlineUpdate = async (id: string, field: 'name' | 'price' | 'description', value: string | number) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      // Convert value to appropriate type
      let updateData: Record<string, string | number>;
      if (field === 'price') {
        updateData = { price: parseFloat(String(value)) };
      } else {
        updateData = { [field]: String(value) };
      }

      const response = await fetch(`/api/merchant/menu/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || `Failed to update ${field}`);
      }

      setSuccess(`Menu ${field} updated successfully`);
      setTimeout(() => setSuccess(null), 3000);

      // Use SWR optimistic update
      await mutateMenu(
        (current) => {
          if (!current) return current;
          return {
            ...current,
            data: current.data.map((item: MenuItem) =>
              item.id === id ? { ...item, [field]: value } : item
            ),
          };
        },
        false // Don't revalidate immediately
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
      // Revert on error
      fetchData();
    }
  };

  // Bulk selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = currentItems.map(item => item.id);
      setSelectedItems(allIds);
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, id]);
    } else {
      setSelectedItems(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleBulkActivate = async () => {
    if (selectedItems.length === 0) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/merchant/menu/bulk-update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids: selectedItems,
          isActive: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to activate menu items");
      }

      setSuccess(`${selectedItems.length} menu item(s) activated successfully`);
      setTimeout(() => setSuccess(null), 3000);
      setSelectedItems([]);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedItems.length === 0) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/merchant/menu/bulk-update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids: selectedItems,
          isActive: false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to deactivate menu items");
      }

      setSuccess(`${selectedItems.length} menu item(s) deactivated successfully`);
      setTimeout(() => setSuccess(null), 3000);
      setSelectedItems([]);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/merchant/menu/bulk-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ids: selectedItems,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete menu items");
      }

      setSuccess(`${selectedItems.length} menu item(s) deleted successfully`);
      setTimeout(() => setSuccess(null), 3000);
      setSelectedItems([]);
      setShowBulkDeleteConfirm(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
      setShowBulkDeleteConfirm(false);
    }
  };

  const formatPrice = (price: string | number, currency?: string): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === 0) return t("admin.menu.free");

    const curr = currency || merchant?.currency || 'AUD';
    return formatCurrencyUtil(numPrice, curr);
  };

  const getCategoryNames = (item: MenuItem): string => {
    // First check many-to-many categories
    if (item.categories && item.categories.length > 0) {
      const categoryNames = item.categories.map(c => c.category.name);
      if (categoryNames.length > 2) {
        return categoryNames.slice(0, 2).join(', ') + ', ...';
      }
      return categoryNames.join(', ');
    }
    // Fallback to single category for backward compatibility
    if (item.category?.name) return item.category.name;
    const category = categories.find(c => c.id === item.categoryId);
    return category?.name || t("admin.menu.uncategorized");
  };

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div data-tutorial="menu-page">
      <div className="space-y-6">
        {error && (
          <div className="rounded-lg bg-error-50 p-4 dark:bg-error-900/20">
            <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-success-50 p-4 dark:bg-success-900/20">
            <p className="text-sm text-success-600 dark:text-success-400">{success}</p>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6" data-tutorial="menu-list">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{t("admin.menu.listTitle")}</h3>
            <div className="flex items-center gap-3">
              {selectedItems.length > 0 && (
                <>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {t("admin.menu.selected", { count: selectedItems.length })}
                  </span>
                  <button
                    onClick={handleBulkActivate}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-success-300 bg-success-50 px-4 text-sm font-medium text-success-700 hover:bg-success-100 dark:border-success-700 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t("admin.menu.activate")}
                  </button>
                  <button
                    onClick={handleBulkDeactivate}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-warning-300 bg-warning-50 px-4 text-sm font-medium text-warning-700 hover:bg-warning-100 dark:border-warning-700 dark:bg-warning-900/20 dark:text-warning-400 dark:hover:bg-warning-900/30"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t("admin.menu.deactivate")}
                  </button>
                  <button
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-error-300 bg-error-50 px-4 text-sm font-medium text-error-700 hover:bg-error-100 dark:border-error-700 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t("common.delete")}
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
                    exportMenuItems(menuItems, merchant?.currency || 'AUD');
                    setSuccess('Menu items exported successfully!');
                    setTimeout(() => setSuccess(null), 3000);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Export failed');
                    setTimeout(() => setError(null), 5000);
                  }
                }}
                disabled={menuItems.length === 0}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Export to Excel"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t("common.export")}
              </button>
              <button
                onClick={() => setShowCreateOptionModal(true)}
                data-tutorial="add-menu-btn"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("admin.menu.addItem")}
              </button>
            </div>
          </div>

          {/* Search and Filters - Inline Layout */}
          <div className="mb-5" data-tutorial="menu-filters">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar - Takes remaining space */}
              <div className="relative flex-1 min-w-[200px]" data-tutorial="menu-search">
                <svg className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={t("admin.menu.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-11 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Filters - On the right */}

              {/* Category Filter */}
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="all">{t("admin.menu.allCategories")}</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-10 rounded-lg border border-gray-200 bg-white px-3 pr-8 text-sm text-gray-700 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              >
                <option value="all">{t("admin.menu.allStatus")}</option>
                <option value="active">✓ {t("common.active")}</option>
                <option value="inactive">✕ {t("common.inactive")}</option>
              </select>

              {/* Stock Filter - Multi-select via checkboxes in dropdown */}
              <div className="dropdown-container relative">
                <button
                  type="button"
                  onClick={() => setIsStockDropdownOpen(!isStockDropdownOpen)}
                  className="flex h-10 min-w-[140px] items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <span>
                    {filterStock.length === 0
                      ? t("admin.menu.stockFilter")
                      : filterStock.length === 1
                        ? filterStock[0] === 'in-stock'
                          ? t("admin.menu.inStock")
                          : filterStock[0] === 'low-stock'
                            ? t("admin.menu.lowStock")
                            : t("admin.menu.outOfStock")
                        : t("admin.menu.selected", { count: filterStock.length })
                    }
                  </span>
                  <svg className={`h-4 w-4 transition-transform ${isStockDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isStockDropdownOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-2 shadow-lg dark:border-gray-700 dark:bg-gray-800">
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={filterStock.includes('in-stock')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterStock([...filterStock, 'in-stock']);
                          } else {
                            setFilterStock(filterStock.filter(s => s !== 'in-stock'));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{t("admin.menu.inStock")}</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={filterStock.includes('low-stock')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterStock([...filterStock, 'low-stock']);
                          } else {
                            setFilterStock(filterStock.filter(s => s !== 'low-stock'));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                      />
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{t("admin.menu.lowStock")}</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <input
                        type="checkbox"
                        checked={filterStock.includes('out-of-stock')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterStock([...filterStock, 'out-of-stock']);
                          } else {
                            setFilterStock(filterStock.filter(s => s !== 'out-of-stock'));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{t("admin.menu.outOfStock")}</span>
                    </label>
                    {filterStock.length > 0 && (
                      <>
                        <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
                        <button
                          onClick={() => setFilterStock([])}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 dark:text-red-400 dark:hover:bg-gray-700"
                        >
                          {t("admin.menu.clearFilters")}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Note: Promo filter removed - promo is now managed via Special Prices page */}

              {/* Clear All Filters Button */}
              {(searchQuery || filterCategory !== 'all' || filterStatus !== 'all' || filterStock.length > 0) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterCategory('all');
                    setFilterStatus('all');
                    setFilterStock([]);
                  }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t("common.clearAll")}
                </button>
              )}
            </div>
          </div>

          {filteredMenuItems.length === 0 ? (
            <EmptyState
              type={menuItems.length === 0 ? "no-menu" : "no-results"}
              title={menuItems.length === 0 ? undefined : t("admin.menu.noMatch")}
              description={menuItems.length === 0 ? undefined : t("admin.menu.tryAdjusting")}
              action={menuItems.length === 0 ? {
                label: "Create Menu Item",
                onClick: () => router.push('/admin/dashboard/menu/create')
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
                        checked={selectedItems.length === currentItems.length && currentItems.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.menu.table.image")}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.menu.table.name")}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.menu.table.category")}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.menu.table.attributes")}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.menu.table.price")}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.menu.table.status")}</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">{t("admin.menu.table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {currentItems.map((item, index) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30" data-tutorial={index === 0 ? "menu-card" : undefined}>
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.name}
                            width={64}
                            height={64}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800">
                            <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-[200px] space-y-1">
                          <div className="truncate">
                            <InlineEditField
                              value={item.name}
                              onSave={(newValue) => handleInlineUpdate(item.id, 'name', newValue)}
                              className="text-sm font-semibold text-gray-800 dark:text-white/90"
                              displayClassName="block truncate max-w-[180px]"
                            />
                          </div>
                          <div className="truncate">
                            <InlineEditField
                              value={item.description || ''}
                              onSave={(newValue) => handleInlineUpdate(item.id, 'description', newValue)}
                              placeholder="Add description..."
                              className="text-xs text-gray-500 dark:text-gray-400"
                              displayClassName="block truncate max-w-[180px]"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-[150px]" title={getCategoryNames(item)}>
                          <span className="inline-flex truncate text-xs text-gray-700 dark:text-gray-300">
                            {getCategoryNames(item)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {item.isSpicy && (
                            <div
                              className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-brand-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800"
                              title={t("admin.menu.badges.spicy")}
                            >
                              <Image
                                src="/images/menu-badges/spicy.png"
                                alt={t("admin.menu.badges.spicy")}
                                fill
                                className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                              />
                            </div>
                          )}
                          {item.isBestSeller && (
                            <div
                              className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-amber-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800"
                              title={t("admin.menu.badges.bestSeller")}
                            >
                              <Image
                                src="/images/menu-badges/best-seller.png"
                                alt={t("admin.menu.badges.bestSeller")}
                                fill
                                className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                              />
                            </div>
                          )}
                          {item.isSignature && (
                            <div
                              className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-purple-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800"
                              title={t("admin.menu.badges.signature")}
                            >
                              <Image
                                src="/images/menu-badges/signature.png"
                                alt={t("admin.menu.badges.signature")}
                                fill
                                className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                              />
                            </div>
                          )}
                          {item.isRecommended && (
                            <div
                              className="group relative h-6 w-6 cursor-pointer overflow-hidden rounded-full border border-gray-400/50 bg-white transition-all duration-300 hover:ring-2 hover:ring-green-300 hover:ring-offset-1 dark:border-gray-500/50 dark:bg-gray-800"
                              title={t("admin.menu.badges.recommended")}
                            >
                              <Image
                                src="/images/menu-badges/recommended.png"
                                alt={t("admin.menu.badges.recommended")}
                                fill
                                className="object-cover transition-opacity duration-300 group-hover:opacity-80"
                              />
                            </div>
                          )}
                          {!item.isSpicy && !item.isBestSeller && !item.isSignature && !item.isRecommended && (
                            <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <span className={`text-sm font-semibold ${formatPrice(item.price) === t("admin.menu.free")
                            ? 'text-success-600 dark:text-success-400'
                            : 'text-gray-800 dark:text-white/90'
                            }`}>
                            {formatPrice(item.price)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleActive(item.id, item.isActive, item.name)}
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium transition-colors ${item.isActive
                            ? 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30'
                            : 'bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30'
                            }`}>
                          {item.isActive ? t("admin.menu.statusActive") : t("admin.menu.statusInactive")}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative">
                          <TableActionButton
                            icon={FaEllipsisV}
                            onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                            title="Actions"
                            aria-label="Actions"
                          />

                          {openDropdownId === item.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenDropdownId(null)}
                              />
                              <div className="absolute right-0 z-20 mt-2 w-48 origin-top-right rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
                                <div className="py-1">
                                  <Link
                                    href={`/admin/dashboard/menu/${item.id}`}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
                                    onClick={() => setOpenDropdownId(null)}
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                    {t("admin.menu.viewDetail")}
                                  </Link>
                                  {/* Note: Setup Promo button removed - promo is now managed via Special Prices page */}
                                  <button
                                    onClick={() => {
                                      setSelectedMenuForAddons(item);
                                      setShowManageAddonsModal(true);
                                      setOpenDropdownId(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    {t("admin.menu.manageAddons")}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedMenuForCategories(item);
                                      setShowManageCategoriesModal(true);
                                      setOpenDropdownId(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                    </svg>
                                    {t("admin.menu.manageCategories")}
                                  </button>
                                  <Link
                                    href={`/admin/dashboard/menu/edit/${item.id}${currentPage > 1 ? `?returnPage=${currentPage}` : ''}`}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                                    onClick={() => setOpenDropdownId(null)}
                                    data-tutorial="menu-edit-btn"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    {t("admin.menu.editMenu")}
                                  </Link>
                                  <DuplicateMenuButton
                                    menuId={item.id}
                                    menuName={item.name}
                                    variant="dropdown-item"
                                    onSuccess={() => {
                                      fetchData();
                                      setOpenDropdownId(null);
                                      setSuccess('Menu duplicated successfully!');
                                      setTimeout(() => setSuccess(null), 3000);
                                    }}
                                    onError={(error) => {
                                      setOpenDropdownId(null);
                                      setError(error);
                                      setTimeout(() => setError(null), 5000);
                                    }}
                                  />
                                  <div className="border-t border-gray-200 dark:border-gray-700" />
                                  <button
                                    onClick={() => {
                                      handleDelete(item.id, item.name);
                                      setOpenDropdownId(null);
                                    }}
                                    className="flex w-full items-center gap-3 px-4 py-2 text-sm text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-900/20"
                                  >
                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    {t("common.delete")}
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
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
                    {t("admin.menu.showing")} {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredMenuItems.length)} {t("admin.menu.of")} {filteredMenuItems.length} {t("admin.menu.items")}
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
        </div>
      </div>

      {/* Note: Promo Modal removed - promo is now managed via Special Prices page */}

      {/* Manage Addons Modal */}
      {showManageAddonsModal && selectedMenuForAddons && (
        <ManageMenuAddonCategoriesModal
          show={showManageAddonsModal}
          menuId={selectedMenuForAddons.id}
          menuName={selectedMenuForAddons.name}
          currentAddonCategories={selectedMenuForAddons.addonCategories || []}
          onClose={() => {
            setShowManageAddonsModal(false);
            setSelectedMenuForAddons(null);
          }}
          onSuccess={() => {
            setShowManageAddonsModal(false);
            setSelectedMenuForAddons(null);
            fetchData();
          }}
        />
      )}

      {/* Manage Categories Modal */}
      {showManageCategoriesModal && selectedMenuForCategories && (
        <ManageMenuCategoriesModal
          show={showManageCategoriesModal}
          menuId={selectedMenuForCategories.id}
          menuName={selectedMenuForCategories.name}
          currentCategories={selectedMenuForCategories.categories || []}
          onClose={() => {
            setShowManageCategoriesModal(false);
            setSelectedMenuForCategories(null);
          }}
          onSuccess={() => {
            setShowManageCategoriesModal(false);
            setSelectedMenuForCategories(null);
            fetchData();
          }}
        />
      )}

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
                  Delete {selectedItems.length} Item{selectedItems.length > 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
              Are you sure you want to delete {selectedItems.length} menu item{selectedItems.length > 1 ? 's' : ''}?
              This will permanently remove {selectedItems.length > 1 ? 'them' : 'it'} from your menu.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex-1 h-11 rounded-lg bg-error-600 text-sm font-medium text-white hover:bg-error-700"
              >
                Delete {selectedItems.length} Item{selectedItems.length > 1 ? 's' : ''}
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
                  Delete Menu Item
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
              Are you sure you want to delete &ldquo;<span className="font-medium">{deleteConfirm.name}</span>&rdquo;?
              This will permanently remove it from your menu.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, id: "", name: "", loading: false })}
                className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 h-11 rounded-lg bg-error-600 text-sm font-medium text-white hover:bg-error-700"
              >
                Delete Menu Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Option Modal */}
      <CreateOptionModal
        isOpen={showCreateOptionModal}
        onClose={() => setShowCreateOptionModal(false)}
        title="Add Menu Item"
        description="Choose how you want to add menu items"
        singleCreateLabel="Create Single Item"
        bulkUploadLabel="Bulk Upload from Excel"
        onSingleCreate={() => router.push('/admin/dashboard/menu/create')}
        onBulkUpload={() => router.push('/admin/dashboard/menu/bulk-upload')}
      />

      {/* Archive Modal */}
      <ArchiveModal
        isOpen={showArchiveModal}
        onClose={() => setShowArchiveModal(false)}
        onRestoreSuccess={() => {
          fetchData();
          setSuccess('Item restored successfully!');
          setTimeout(() => setSuccess(null), 3000);
        }}
      />
    </div>
  );
}

// Wrapper component with Suspense for useSearchParams
export default function MerchantMenuPage() {
  return (
    <Suspense fallback={<MenuPageSkeleton />}>
      <MerchantMenuPageContent />
    </Suspense>
  );
}

