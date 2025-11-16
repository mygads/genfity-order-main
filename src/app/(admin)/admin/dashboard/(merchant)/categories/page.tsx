"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Image from "next/image";
import CategoryDnDList from "@/components/ui/CategoryDnDList";
import EmptyState from "@/components/ui/EmptyState";
import { HelpTooltip } from "@/components/ui/Tooltip";
import { exportCategories } from "@/lib/utils/excelExport";

interface Category {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  _count?: {
    menus: number;
    menuItems: number;
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
  displayOrder: number;
  sortOrder: number;
}

export default function MerchantCategoriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [availableMenus, setAvailableMenus] = useState<MenuItem[]>([]);
  const [categoryMenus, setCategoryMenus] = useState<MenuItem[]>([]);
  const [sortBy, setSortBy] = useState<string>("manual");
  const [useDragDrop, setUseDragDrop] = useState<boolean>(false);
  const [hasUnsavedOrder, setHasUnsavedOrder] = useState<boolean>(false);
  const [pendingReorder, setPendingReorder] = useState<Category[] | null>(null);
  
  // Bulk selection states
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    description: "",
    displayOrder: 1,
    sortOrder: 0,
  });

  // Pagination & Filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/merchant/categories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = await response.json();
      
      // Handle response format: { success: true, data: [...] }
      if (data.success && Array.isArray(data.data)) {
        setCategories(data.data);
      } else {
        setCategories([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setError(null);
    setSuccess(null);

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

      setSuccess(`Category ${editingId ? 'updated' : 'created'} successfully!`);
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", description: "", displayOrder: 1 });
      
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || "",
      displayOrder: category.displayOrder,
      sortOrder: category.sortOrder,
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
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

      setSuccess(`Category "${name}" ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      setTimeout(() => setSuccess(null), 3000);
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

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

      setSuccess("Category deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", description: "", displayOrder: 1, sortOrder: 0 });
    setError(null);
    setSuccess(null);
  };

  const handleReorder = async (reorderedCategories: Category[]) => {
    // Store pending changes instead of immediately saving
    setPendingReorder(reorderedCategories);
    setHasUnsavedOrder(true);
    // Update display immediately for UX
    setCategories(reorderedCategories);
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

      setSuccess("Categories reordered successfully!");
      setTimeout(() => setSuccess(null), 3000);
      setHasUnsavedOrder(false);
      setPendingReorder(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
      fetchCategories();
    }
  };

  const handleCancelOrder = () => {
    // Reset to original order
    fetchCategories();
    setHasUnsavedOrder(false);
    setPendingReorder(null);
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

      setSuccess(`${selectedCategories.length} category(ies) deleted successfully`);
      setTimeout(() => setSuccess(null), 3000);
      setSelectedCategories([]);
      setShowBulkDeleteConfirm(false);
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
      setShowBulkDeleteConfirm(false);
    }
  };

  const handleInlineUpdate = async (id: string, field: 'name' | 'description', value: string) => {
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

      setSuccess(`Category ${field} updated successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
      throw err;
    }
  };

  const handleManageMenus = async (category: Category) => {
    setSelectedCategory(category);
    setError(null);
    
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
      setError(err instanceof Error ? err.message : "Failed to load menus");
    }
  };

  const handleAddMenuToCategory = async (menuId: string) => {
    if (!selectedCategory) return;

    // Find the menu to add
    const menuToAdd = availableMenus.find(m => m.id === menuId);
    if (!menuToAdd) return;

    // Optimistic update - immediately update UI
    setCategoryMenus(prev => [...prev, menuToAdd]);
    setSuccess("Menu added to category!");
    setTimeout(() => setSuccess(null), 3000);

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
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleRemoveMenuFromCategory = async (menuId: string) => {
    if (!selectedCategory) return;

    // Store removed menu for potential rollback
    const removedMenu = categoryMenus.find(m => m.id === menuId);
    
    // Optimistic update - immediately update UI
    setCategoryMenus(prev => prev.filter(m => m.id !== menuId));
    setSuccess("Menu removed from category!");
    setTimeout(() => setSuccess(null), 3000);

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
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  // Filter and search logic
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
    setCurrentPage(1); // Reset to first page when filters change
  }, [categories, searchQuery, filterStatus, sortBy]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCategories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Menu Categories" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Menu Categories" />

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

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {editingId ? "Edit Category" : "Create New Category"}
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
                  Category Name <span className="text-error-500">*</span>
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

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Display Order (Customer Page) <span className="text-error-500">*</span>
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleChange}
                  required
                  min="0"
                  placeholder="0"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Lower numbers appear first in customer menu (0 = first)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 h-11 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Categories List</h3>
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
              {hasUnsavedOrder && (
                <>
                  <button
                    onClick={handleCancelOrder}
                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-3 focus:ring-gray-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveOrder}
                    className="inline-flex h-11 items-center gap-2 rounded-lg bg-success-600 px-4 text-sm font-medium text-white hover:bg-success-700 focus:outline-none focus:ring-3 focus:ring-success-500/20"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Order
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  try {
                    exportCategories(categories);
                    setSuccess('Categories exported successfully!');
                    setTimeout(() => setSuccess(null), 3000);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Export failed');
                    setTimeout(() => setError(null), 5000);
                  }
                }}
                disabled={categories.length === 0}
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                title="Export to Excel"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Category
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={useDragDrop}
                  onChange={(e) => setUseDragDrop(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                Drag & Drop
              </label>
              <HelpTooltip content="Enable drag and drop to reorder categories manually" />
            </div>
            <div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {!useDragDrop && (
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="manual">Manual Order</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="menu-count">Menu Count (Most)</option>
                </select>
              </div>
            )}
          </div>
          
          {filteredCategories.length === 0 ? (
            <EmptyState
              type={categories.length === 0 ? "no-category" : "no-results"}
              title={categories.length === 0 ? undefined : "No categories match your filters"}
              description={categories.length === 0 ? undefined : "Try adjusting your filters"}
              actionLabel={categories.length === 0 ? "Create First Category" : undefined}
              onAction={categories.length === 0 ? () => setShowForm(true) : undefined}
            />
          ) : useDragDrop ? (
            <CategoryDnDList
              categories={filteredCategories}
              onReorder={handleReorder}
              onEdit={handleEdit}
              onDelete={(id, name) => handleDelete(id, name)}
              onToggleActive={(id, isActive, name) => handleToggleActive(id, isActive, name)}
              onManageMenus={handleManageMenus}
              onInlineUpdate={handleInlineUpdate}
              selectedIds={selectedCategories}
              onSelectAll={handleSelectAllCategories}
              onSelect={handleSelectCategory}
              bulkSelectionMode={true}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Description</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Display Order</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Menus</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Actions</th>
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
                          {category.sortOrder}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                          {category._count?.menuItems || 0} items
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleActive(category.id, category.isActive, category.name)}
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            category.isActive 
                              ? 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30' 
                              : 'bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30'
                          }`}>
                          {category.isActive ? '● Active' : '○ Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleManageMenus(category)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/30"
                            title="Manage Menus"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleEdit(category)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(category.id, category.name)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-error-200 bg-error-50 text-error-600 hover:bg-error-100 dark:border-error-900/50 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30"
                            title="Delete"
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
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCategories.length)} of {filteredCategories.length} categories
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
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium ${
                          currentPage === page
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

        {/* Manage Menus Modal */}
        {selectedCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[80vh] overflow-y-auto">
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
                  <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Available Menus ({availableMenus.filter(m => !categoryMenus.find(cm => cm.id === m.id)).length})
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    {availableMenus
                      .filter(menu => !categoryMenus.find(cm => cm.id === menu.id))
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
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                              {menu.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatPrice(menu.price)}
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
                  </div>
                </div>

                {/* Category Menus */}
                <div>
                  <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Menus in Category ({categoryMenus.length})
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                    {categoryMenus.map((menu) => (
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
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                            {menu.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatPrice(menu.price)}
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
        )}
      </div>
    </div>
  );
}

function formatPrice(price: number | string): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return 'AUD 0';
  return `AUD ${numPrice.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
