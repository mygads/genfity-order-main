"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

interface AddonCategory {
  id: string;
  name: string;
}

interface AddonItem {
  id: string;
  addonCategoryId: string;
  name: string;
  description: string | null;
  price: string | number;
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
  createdAt: string;
  addonCategory?: AddonCategory;
}

interface AddonItemFormData {
  addonCategoryId: string;
  name: string;
  description: string;
  price: string;
  trackStock: boolean;
  stockQty: string;
}

export default function AddonItemsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [items, setItems] = useState<AddonItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<AddonItem[]>([]);
  const [categories, setCategories] = useState<AddonCategory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<AddonItemFormData>({
    addonCategoryId: "",
    name: "",
    description: "",
    price: "",
    trackStock: false,
    stockQty: "",
  });

  // Pagination & Filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const [itemsResponse, categoriesResponse] = await Promise.all([
        fetch("/api/merchant/addon-items", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/merchant/addon-categories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!itemsResponse.ok || !categoriesResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const itemsData = await itemsResponse.json();
      const categoriesData = await categoriesResponse.json();

      if (itemsData.success && Array.isArray(itemsData.data)) {
        setItems(itemsData.data);
      } else {
        setItems([]);
      }

      if (categoriesData.success && Array.isArray(categoriesData.data)) {
        setCategories(categoriesData.data);
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
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked,
        // Reset stock qty if unchecking trackStock
        ...(name === "trackStock" && !checked ? { stockQty: "" } : {}),
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
        ? `/api/merchant/addon-items/${editingId}`
        : "/api/merchant/addon-items";
      
      const method = editingId ? "PUT" : "POST";

      const payload = {
        addonCategoryId: formData.addonCategoryId,
        name: formData.name,
        description: formData.description || undefined,
        price: parseFloat(formData.price),
        trackStock: formData.trackStock,
        stockQty: formData.trackStock && formData.stockQty ? parseInt(formData.stockQty) : undefined,
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
        throw new Error(data.message || `Failed to ${editingId ? 'update' : 'create'} addon item`);
      }

      setSuccess(`Addon item ${editingId ? 'updated' : 'created'} successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      setShowForm(false);
      setEditingId(null);
      setFormData({ 
        addonCategoryId: "", 
        name: "", 
        description: "", 
        price: "", 
        trackStock: false, 
        stockQty: "" 
      });
      
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: AddonItem) => {
    setEditingId(item.id);
    setFormData({
      addonCategoryId: item.addonCategoryId,
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      trackStock: item.trackStock,
      stockQty: item.stockQty !== null ? item.stockQty.toString() : "",
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
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

      const response = await fetch(`/api/merchant/addon-items/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete addon item");
      }

      setSuccess("Addon item deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ 
      addonCategoryId: "", 
      name: "", 
      description: "", 
      price: "", 
      trackStock: false, 
      stockQty: "" 
    });
    setError(null);
    setSuccess(null);
  };

  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return 'AUD 0';
    return `AUD ${numPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCategoryName = (item: AddonItem): string => {
    if (item.addonCategory?.name) return item.addonCategory.name;
    const category = categories.find(c => c.id === item.addonCategoryId);
    return category?.name || 'Unknown';
  };

  // Filter and search logic
  useEffect(() => {
    let filtered = [...items];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter(item => item.addonCategoryId === filterCategory);
    }

    // Status filter
    if (filterStatus === "active") {
      filtered = filtered.filter(item => item.isActive);
    } else if (filterStatus === "inactive") {
      filtered = filtered.filter(item => !item.isActive);
    }

    setFilteredItems(filtered);
    setCurrentPage(1);
  }, [items, searchQuery, filterCategory, filterStatus]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Addon Items" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading addon items...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle="Addon Items" />

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
            <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  {editingId ? "Edit Addon Item" : "Create New Addon Item"}
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
                    Addon Category <span className="text-error-500">*</span>
                  </label>
                  <select
                    name="addonCategoryId"
                    value={formData.addonCategoryId}
                    onChange={handleChange}
                    required
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Item Name <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Extra Cheese, Large Size"
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
                    rows={2}
                    placeholder="Describe this addon item"
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Price (AUD) <span className="text-error-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                </div>

                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="trackStock"
                      name="trackStock"
                      checked={formData.trackStock}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <label htmlFor="trackStock" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Track Stock Inventory
                    </label>
                  </div>

                  {formData.trackStock && (
                    <div className="mt-3">
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Stock Quantity
                      </label>
                      <input
                        type="number"
                        name="stockQty"
                        value={formData.stockQty}
                        onChange={handleChange}
                        min="0"
                        placeholder="0"
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                      />
                    </div>
                  )}
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
                    {submitting ? "Saving..." : editingId ? "Update Item" : "Create Item"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Addon Items</h3>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-3 focus:ring-brand-500/20"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          {/* Search and Filters */}
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <input
                type="text"
                placeholder="Search addon items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>
            <div>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
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
          
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {items.length === 0 ? "No addon items found" : "No items match your filters"}
              </p>
              {items.length === 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create First Addon Item
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Category</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Price</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Stock</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {currentItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</p>
                          {item.description && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                          {getCategoryName(item)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm font-semibold text-gray-800 dark:text-white/90">
                        {formatPrice(item.price)}
                      </td>
                      <td className="px-4 py-4">
                        {item.trackStock ? (
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            (item.stockQty || 0) > 10
                              ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                              : (item.stockQty || 0) > 0
                              ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400'
                              : 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-400'
                          }`}>
                            {item.stockQty || 0} pcs
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            No tracking
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          item.isActive 
                            ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400' 
                            : 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-400'
                        }`}>
                          {item.isActive ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name)}
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
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredItems.length)} of {filteredItems.length} items
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
