"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import AddonItemFormModal from "@/components/addon-items/AddonItemFormModal";
import AddonItemsTable from "@/components/addon-items/AddonItemsTable";
import AddonItemsFilters from "@/components/addon-items/AddonItemsFilters";
import { AddonItemsPageSkeleton } from "@/components/common/SkeletonLoaders";

interface AddonCategory {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number | null;
}

interface AddonItem {
  id: string;
  addonCategoryId: string;
  name: string;
  description: string | null;
  price: string | number;
  inputType: "SELECT" | "QTY";
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
  lastStockResetAt: string | null;
  createdAt: string;
  addonCategory?: AddonCategory;
}

interface AddonItemFormData {
  addonCategoryId: string;
  name: string;
  description: string;
  price: string;
  inputType: "SELECT" | "QTY";
  trackStock: boolean;
  stockQty: string;
  dailyStockTemplate: string;
  autoResetStock: boolean;
}

interface Merchant {
  currency: string;
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
  const [merchant, setMerchant] = useState<Merchant>({ currency: "AUD" });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<AddonItemFormData>({
    addonCategoryId: "",
    name: "",
    description: "",
    price: "0",
    inputType: "SELECT",
    trackStock: false,
    stockQty: "",
    dailyStockTemplate: "",
    autoResetStock: false,
  });

  // Pagination & Filter states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterInputType, setFilterInputType] = useState<string>("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const [itemsResponse, categoriesResponse, merchantResponse] = await Promise.all([
        fetch("/api/merchant/addon-items", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/merchant/addon-categories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/merchant/profile", {
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

      if (merchantResponse.ok) {
        const merchantData = await merchantResponse.json();
        if (merchantData.success && merchantData.data) {
          setMerchant({ currency: merchantData.data.currency || "AUD" });
        }
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
        // Reset stock fields if unchecking trackStock
        ...(name === "trackStock" && !checked ? { stockQty: "", dailyStockTemplate: "", autoResetStock: false } : {}),
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
        price: parseFloat(formData.price) || 0,
        inputType: formData.inputType,
        trackStock: formData.trackStock,
        stockQty: formData.trackStock && formData.stockQty ? parseInt(formData.stockQty) : undefined,
        dailyStockTemplate: formData.trackStock && formData.dailyStockTemplate ? parseInt(formData.dailyStockTemplate) : undefined,
        autoResetStock: formData.trackStock ? formData.autoResetStock : false,
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
      resetForm();
      
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      addonCategoryId: "", 
      name: "", 
      description: "", 
      price: "0", 
      inputType: "SELECT",
      trackStock: false, 
      stockQty: "",
      dailyStockTemplate: "",
      autoResetStock: false,
    });
  };

  const handleEdit = (item: AddonItem) => {
    setEditingId(item.id);
    setFormData({
      addonCategoryId: item.addonCategoryId,
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      inputType: item.inputType || "SELECT",
      trackStock: item.trackStock,
      stockQty: item.stockQty !== null ? item.stockQty.toString() : "",
      dailyStockTemplate: item.dailyStockTemplate !== null ? item.dailyStockTemplate.toString() : "",
      autoResetStock: item.autoResetStock,
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(`/api/merchant/addon-items/${id}/toggle-active`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to toggle status");
      }

      setSuccess(`Addon item ${!currentStatus ? 'activated' : 'deactivated'} successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
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
    resetForm();
    setError(null);
    setSuccess(null);
  };

  // Refs to track previous filter values for page reset
  const prevFiltersRef = useRef({ searchQuery, filterCategory, filterStatus, filterInputType });

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

    // Input type filter
    if (filterInputType !== "all") {
      filtered = filtered.filter(item => item.inputType === filterInputType);
    }

    setFilteredItems(filtered);

    // Only reset page when filters actually change, not when items data updates
    const prev = prevFiltersRef.current;
    const filtersChanged = 
      prev.searchQuery !== searchQuery ||
      prev.filterCategory !== filterCategory ||
      prev.filterStatus !== filterStatus ||
      prev.filterInputType !== filterInputType;

    if (filtersChanged) {
      setCurrentPage(1);
      prevFiltersRef.current = { searchQuery, filterCategory, filterStatus, filterInputType };
    }
  }, [items, searchQuery, filterCategory, filterStatus, filterInputType]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (loading) {
    return <AddonItemsPageSkeleton />;
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

        {/* Form Modal Component */}
        <AddonItemFormModal
          show={showForm}
          editingId={editingId}
          formData={formData}
          categories={categories}
          submitting={submitting}
          onSubmit={handleSubmit}
          onChange={handleChange}
          onCancel={handleCancel}
        />

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Addon Items</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage addon items with SELECT (single choice) or QTY (quantity input) types
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary-500 px-6 text-sm font-medium text-white hover:bg-primary-600 focus:outline-none focus:ring-3 focus:ring-primary-500/20"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          {/* Filters Component */}
          <AddonItemsFilters
            searchQuery={searchQuery}
            filterCategory={filterCategory}
            filterInputType={filterInputType}
            filterStatus={filterStatus}
            categories={categories}
            onSearchChange={setSearchQuery}
            onCategoryChange={setFilterCategory}
            onInputTypeChange={setFilterInputType}
            onStatusChange={setFilterStatus}
          />
          
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {items.length === 0 ? "No addon items found" : "No items match your filters"}
              </p>
              {items.length === 0 && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-primary-500 px-6 text-sm font-medium text-white hover:bg-primary-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create First Addon Item
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Table Component */}
              <AddonItemsTable
                items={currentItems}
                categories={categories}
                currency={merchant.currency}
                onEdit={handleEdit}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
              />

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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
