"use client";

import React, { useState, useEffect, lazy, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { FieldLabelWithTooltip } from "@/components/ui/Tooltip";

// Lazy load heavy modal components
const AddonItemFormModal = lazy(() => import("@/components/addon-items/AddonItemFormModal"));
const StockUpdateModal = lazy(() => import("@/components/addon-items/StockUpdateModal"));

// Loading component for modals
function ModalSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-3/4 rounded bg-gray-200 dark:bg-gray-800"></div>
          <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-800"></div>
          <div className="space-y-3">
            <div className="h-11 w-full rounded bg-gray-200 dark:bg-gray-800"></div>
            <div className="h-11 w-full rounded bg-gray-200 dark:bg-gray-800"></div>
            <div className="h-11 w-full rounded bg-gray-200 dark:bg-gray-800"></div>
          </div>
          <div className="flex gap-3 pt-4">
            <div className="h-11 flex-1 rounded bg-gray-200 dark:bg-gray-800"></div>
            <div className="h-11 flex-1 rounded bg-gray-200 dark:bg-gray-800"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AddonCategory {
  id: string;
  name: string;
  description: string | null;
  minSelection: number;
  maxSelection: number | null;
  isActive: boolean;
}

interface AddonItem {
  id: string;
  addonCategoryId: string;
  name: string;
  description: string | null;
  price: string | number;
  inputType: "SELECT" | "QTY";
  displayOrder: number;
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
  createdAt: string;
}

interface AddonItemFormData {
  addonCategoryId: string;
  name: string;
  description: string;
  price: string;
  inputType: "SELECT" | "QTY";
  trackStock: boolean;
  stockQty: string;
}

export default function EditAddonCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [category, setCategory] = useState<AddonCategory | null>(null);
  const [items, setItems] = useState<AddonItem[]>([]);
  const [merchant, setMerchant] = useState<{ currency: string }>({ currency: "AUD" });
  
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  const [categoryForm, setCategoryForm] = useState<{
    name: string;
    description: string;
    minSelection: number;
    maxSelection: number | string;
  }>({
    name: "",
    description: "",
    minSelection: 0,
    maxSelection: "",
  });

  const [itemFormData, setItemFormData] = useState<AddonItemFormData>({
    addonCategoryId: categoryId || "",
    name: "",
    description: "",
    price: "0",
    inputType: "SELECT",
    trackStock: false,
    stockQty: "",
  });

  const [stockModal, setStockModal] = useState<{
    show: boolean;
    itemId: string | null;
    itemName: string;
    currentStock: number;
    newStock: string;
  }>({ show: false, itemId: null, itemName: "", currentStock: 0, newStock: "" });

  // Drag and drop states
  const [draggedItem, setDraggedItem] = useState<AddonItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const [categoryRes, itemsRes, merchantRes] = await Promise.all([
        fetch(`/api/merchant/addon-categories/${categoryId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/merchant/addon-categories/${categoryId}/items`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/merchant/profile", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!categoryRes.ok) {
        throw new Error("Category not found");
      }

      const categoryData = await categoryRes.json();
      const itemsData = await itemsRes.json();

      if (categoryData.success) {
        setCategory(categoryData.data);
        setCategoryForm({
          name: categoryData.data.name,
          description: categoryData.data.description || "",
          minSelection: categoryData.data.minSelection,
          maxSelection: categoryData.data.maxSelection !== null ? categoryData.data.maxSelection : "",
        });
      }

      if (itemsData.success && Array.isArray(itemsData.data)) {
        setItems(itemsData.data);
      }

      if (merchantRes.ok) {
        const merchantData = await merchantRes.json();
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
    if (categoryId) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/addon-categories/${categoryId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: categoryForm.name,
          description: categoryForm.description || undefined,
          minSelection: categoryForm.minSelection,
          maxSelection: categoryForm.maxSelection === "" ? null : Number(categoryForm.maxSelection),
        }),
      });

      if (!response.ok) throw new Error("Failed to update category");

      setSuccess("Category updated successfully!");
      setTimeout(() => setSuccess(null), 3000);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleItemFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const url = editingItemId 
        ? `/api/merchant/addon-items/${editingItemId}`
        : "/api/merchant/addon-items";
      
      const payload = {
        addonCategoryId: categoryId,
        name: itemFormData.name,
        description: itemFormData.description || undefined,
        price: parseFloat(itemFormData.price) || 0,
        inputType: itemFormData.inputType,
        trackStock: itemFormData.trackStock,
        stockQty: itemFormData.trackStock && itemFormData.stockQty ? parseInt(itemFormData.stockQty) : undefined,
      };

      const response = await fetch(url, {
        method: editingItemId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save item");

      setSuccess(`Item ${editingItemId ? 'updated' : 'created'} successfully!`);
      setTimeout(() => setSuccess(null), 3000);
      setShowItemForm(false);
      setEditingItemId(null);
      resetItemForm();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setTimeout(() => setError(null), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  const resetItemForm = () => {
    setItemFormData({
      addonCategoryId: categoryId || "",
      name: "",
      description: "",
      price: "0",
      inputType: "SELECT",
      trackStock: false,
      stockQty: "",
    });
  };

  const handleEditItem = (item: AddonItem) => {
    setEditingItemId(item.id);
    setItemFormData({
      addonCategoryId: categoryId || "",
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      inputType: item.inputType || "SELECT",
      trackStock: item.trackStock,
      stockQty: item.stockQty !== null ? item.stockQty.toString() : "",
    });
    setShowItemForm(true);
  };

  const handleToggleItemActive = async (id: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/addon-items/${id}/toggle-active`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setSuccess("Item status updated!");
        setTimeout(() => setSuccess(null), 2000);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to toggle item status:", error);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/addon-items/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setSuccess("Item deleted successfully!");
        setTimeout(() => setSuccess(null), 3000);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
      setError("Failed to delete item");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleUpdateStock = async () => {
    if (!stockModal.itemId) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/addon-items/${stockModal.itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stockQty: parseInt(stockModal.newStock) || 0,
        }),
      });

      if (response.ok) {
        setSuccess("Stock updated!");
        setTimeout(() => setSuccess(null), 2000);
        setStockModal({ show: false, itemId: null, itemName: "", currentStock: 0, newStock: "" });
        fetchData();
      }
    } catch {
      setError("Failed to update stock");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSetOutOfStock = async (id: string, name: string) => {
    if (!confirm(`Set "${name}" to out of stock?`)) return;

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/addon-items/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stockQty: 0 }),
      });

      if (response.ok) {
        setSuccess("Set to out of stock!");
        setTimeout(() => setSuccess(null), 2000);
        fetchData();
      }
    } catch {
      setError("Failed to update stock");
      setTimeout(() => setError(null), 5000);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: AddonItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedItem) return;

    const dragIndex = items.findIndex(item => item.id === draggedItem.id);
    if (dragIndex === dropIndex) return;

    // Reorder items
    const newItems = [...items];
    const [removed] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, removed);

    // Update displayOrder for all items
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      displayOrder: index,
    }));

    setItems(updatedItems);
    
    // Update in database
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const itemOrders = updatedItems.map((item, index) => ({
        id: item.id,
        displayOrder: index,
      }));

      const response = await fetch(
        `/api/merchant/addon-categories/${categoryId}/reorder-items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ itemOrders }),
        }
      );

      if (response.ok) {
        setSuccess("Items reordered successfully!");
        setTimeout(() => setSuccess(null), 2000);
      } else {
        throw new Error("Failed to reorder items");
      }
    } catch {
      setError("Failed to save order");
      setTimeout(() => setError(null), 5000);
      fetchData(); // Revert to original order
    }

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return `${merchant.currency} 0`;
    return `${merchant.currency} ${numPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Edit Addon Category" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Edit Addon Category" />
        <div className="mt-6 py-10 text-center">
          <p className="text-sm text-error-600 dark:text-error-400">Category not found</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageBreadcrumb pageTitle={`Edit: ${category.name}`} />

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

        {/* Category Info Form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">Category Information</h3>
          
          <form onSubmit={handleUpdateCategory} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <input
                  type="text"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <FieldLabelWithTooltip
                  label="Min Selection"
                  tooltip="Minimum number of items customer must select from this category. Set to 0 for optional addons."
                />
                <input
                  type="number"
                  value={categoryForm.minSelection}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, minSelection: parseInt(e.target.value) || 0 }))}
                  min="0"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
              <div>
                <FieldLabelWithTooltip
                  label="Max Selection"
                  tooltip="Maximum number of items customer can select. Leave empty for unlimited selection. Set to 1 for single choice (radio), or higher for multiple choice (checkbox)."
                  required={false}
                />
                <input
                  type="number"
                  value={categoryForm.maxSelection}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, maxSelection: e.target.value === "" ? "" : parseInt(e.target.value) }))}
                  min="0"
                  placeholder="Unlimited"
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push("/admin/dashboard/addon-categories")}
                className="h-11 rounded-lg border border-gray-200 bg-white px-6 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-11 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Update Category"}
              </button>
            </div>
          </form>
        </div>

        {/* Addon Items Management */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Addon Items</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{items.length} items total</p>
            </div>
            <button
              onClick={() => {
                resetItemForm();
                setEditingItemId(null);
                setShowItemForm(true);
              }}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand-500 px-6 text-sm font-medium text-white hover:bg-brand-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Item
            </button>
          </div>

          {items.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No items yet. Click &quot;Add Item&quot; to create your first addon item.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Price</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Stock</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((item, index) => (
                    <tr 
                      key={item.id} 
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`cursor-move transition-colors ${
                        draggedItem?.id === item.id ? 'opacity-50' : ''
                      } ${
                        dragOverIndex === index ? 'bg-brand-50 dark:bg-brand-900/20 border-t-2 border-brand-500' : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'
                      }`}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col text-gray-400">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</p>
                            {item.description && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                          item.inputType === "SELECT"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
                        }`}>
                          {item.inputType === "SELECT" ? "Single Select" : "Quantity Input"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-gray-800 dark:text-white/90">
                          {formatPrice(item.price)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {item.trackStock ? (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              (item.stockQty || 0) > 10
                                ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                                : (item.stockQty || 0) > 0
                                ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400'
                                : 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-400'
                            }`}>
                              {item.stockQty || 0} pcs
                            </span>
                            <button
                              onClick={() => setStockModal({
                                show: true,
                                itemId: item.id,
                                itemName: item.name,
                                currentStock: item.stockQty || 0,
                                newStock: (item.stockQty || 0).toString(),
                              })}
                              className="text-brand-500 hover:text-brand-600"
                              title="Update stock"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">No tracking</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleItemActive(item.id)}
                          className={`inline-flex cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            item.isActive 
                              ? 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30' 
                              : 'bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30'
                          }`}
                        >
                          {item.isActive ? '● Active' : '○ Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                            title="Edit"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {item.trackStock && (item.stockQty || 0) > 0 && (
                            <button
                              onClick={() => handleSetOutOfStock(item.id, item.name)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-orange-200 bg-orange-50 text-orange-600 hover:bg-orange-100 dark:border-orange-900/50 dark:bg-orange-900/20 dark:text-orange-400"
                              title="Set Out of Stock"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                              </svg>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-error-200 bg-error-50 text-error-600 hover:bg-error-100 dark:border-error-900/50 dark:bg-error-900/20 dark:text-error-400"
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
            </div>
          )}
        </div>
      </div>

      {/* Item Form Modal */}
      <Suspense fallback={<ModalSkeleton />}>
        {showItemForm && (
          <AddonItemFormModal
            show={showItemForm}
            editingId={editingItemId}
            formData={itemFormData}
            categories={[{ id: category.id, name: category.name, minSelection: category.minSelection, maxSelection: category.maxSelection }]}
            submitting={submitting}
            onSubmit={handleItemFormSubmit}
            onChange={(e) => {
              const { name, value, type } = e.target;
              if (type === "checkbox") {
                const checked = (e.target as HTMLInputElement).checked;
                setItemFormData(prev => ({
                  ...prev,
                  [name]: checked,
                  ...(name === "trackStock" && !checked ? { stockQty: "" } : {}),
                }));
              } else {
                setItemFormData(prev => ({ ...prev, [name]: value }));
              }
            }}
            onCancel={() => {
              setShowItemForm(false);
              setEditingItemId(null);
              resetItemForm();
            }}
          />
        )}
      </Suspense>

      {/* Stock Modal */}
      <Suspense fallback={<ModalSkeleton />}>
        {stockModal.show && (
          <StockUpdateModal
            show={stockModal.show}
            itemName={stockModal.itemName}
            currentStock={stockModal.currentStock}
            newStock={stockModal.newStock}
            onStockChange={(value) => setStockModal(prev => ({ ...prev, newStock: value }))}
            onUpdate={handleUpdateStock}
            onClose={() => setStockModal({ show: false, itemId: null, itemName: "", currentStock: 0, newStock: "" })}
          />
        )}
      </Suspense>
    </div>
  );
}
