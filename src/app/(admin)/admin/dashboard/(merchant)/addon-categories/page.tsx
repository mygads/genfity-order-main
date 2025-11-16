"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ViewAddonItemsModal from "@/components/addon-categories/ViewAddonItemsModal";
import EmptyState from "@/components/ui/EmptyState";
import { exportAddonCategories } from "@/lib/utils/excelExport";

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

interface AddonCategoryFormData {
  name: string;
  description: string;
  minSelection: number;
  maxSelection: number | string;
}

export default function AddonCategoriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [categories, setCategories] = useState<AddonCategory[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<AddonCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [merchant, setMerchant] = useState<{ currency: string }>({ currency: "AUD" });
  const [viewItemsModal, setViewItemsModal] = useState<{
    show: boolean;
    categoryId: string | null;
    categoryName: string;
    items: any[];
  }>({ show: false, categoryId: null, categoryName: "", items: [] });
  
  const [formData, setFormData] = useState<AddonCategoryFormData>({
    name: "",
    description: "",
    minSelection: 0,
    maxSelection: "",
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

      const [categoriesResponse, merchantResponse] = await Promise.all([
        fetch("/api/merchant/addon-categories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/merchant/profile", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!categoriesResponse.ok) {
        throw new Error("Failed to fetch addon categories");
      }

      const data = await categoriesResponse.json();

      if (merchantResponse.ok) {
        const merchantData = await merchantResponse.json();
        if (merchantData.success && merchantData.data) {
          setMerchant({ currency: merchantData.data.currency || "AUD" });
        }
      }
      
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
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const url = "/api/merchant/addon-categories";
      const method = "POST";

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
        throw new Error(data.message || 'Failed to create addon category');
      }

      setSuccess('Addon category created successfully!');
      setTimeout(() => setSuccess(null), 3000);
      setShowForm(false);
      setFormData({ name: "", description: "", minSelection: 0, maxSelection: "" });
      
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNavigateToEdit = (categoryId: string) => {
    router.push(`/admin/dashboard/addon-categories/${categoryId}/edit`);
  };

  const handleViewItems = async (category: AddonCategory) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/addon-categories/${category.id}/items`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setViewItemsModal({
          show: true,
          categoryId: category.id,
          categoryName: category.name,
          items: data.success && Array.isArray(data.data) ? data.data : [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
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

      setSuccess(`Addon category "${name}" ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
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

      setSuccess("Addon category deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
      fetchCategories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setFormData({ name: "", description: "", minSelection: 0, maxSelection: "" });
    setError(null);
    setSuccess(null);
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
    if (filterStatus === "active") {
      filtered = filtered.filter(cat => cat.isActive);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter(cat => !cat.isActive);
    }

    setFilteredCategories(filtered);
    setCurrentPage(1);
  }, [categories, searchQuery, filterStatus]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCategories.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Addon Categories" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading addon categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Addon Categories" />

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
                  Create New Addon Category
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
                    placeholder="e.g., Size, Toppings, Extras"
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
                    placeholder="Describe this addon category"
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Min Selection <span className="text-error-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="minSelection"
                      value={formData.minSelection}
                      onChange={handleChange}
                      required
                      min="0"
                      placeholder="0"
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Minimum required selections
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Max Selection
                    </label>
                    <input
                      type="number"
                      name="maxSelection"
                      value={formData.maxSelection}
                      onChange={handleChange}
                      min="0"
                      placeholder="Unlimited"
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Leave empty for unlimited
                    </p>
                  </div>
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
                    {submitting ? "Saving..." : "Create Category"}
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

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Addon Categories</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  try {
                    exportAddonCategories(categories);
                    setSuccess('Addon categories exported successfully!');
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
                Add Addon Category
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <input
                type="text"
                placeholder="Search addon categories..."
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
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          
          {filteredCategories.length === 0 ? (
            <EmptyState
              type={categories.length === 0 ? "no-addon" : "no-results"}
              title={categories.length === 0 ? undefined : "No addon categories match your filters"}
              description={categories.length === 0 ? undefined : "Try adjusting your search or filters"}
              onAction={categories.length === 0 ? () => setShowForm(true) : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Description</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Selection</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Items</th>
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
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        Min: {category.minSelection} / Max: {category.maxSelection || '∞'}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                          {category._count?.addonItems || 0} items
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                          {category._count?.menuAddonCategories || 0} menus
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
                            onClick={() => handleViewItems(category)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            title="View Items"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleNavigateToEdit(category.id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            title="Edit Category & Manage Items"
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
      </div>
    </div>
  );
}
