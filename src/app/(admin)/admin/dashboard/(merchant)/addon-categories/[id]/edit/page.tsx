"use client";

import React, { useState, useEffect, lazy, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { FieldLabelWithTooltip } from "@/components/ui/Tooltip";
import { useToast } from "@/context/ToastContext";
import { EditAddonCategorySkeleton } from "@/components/common/SkeletonLoaders";

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
  dailyStockTemplate: string;
  autoResetStock: boolean;
}

export default function EditAddonCategoryPage() {
  const router = useRouter();
  const params = useParams();
  const categoryId = params?.id as string;
  const { showSuccess, showError } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [category, setCategory] = useState<AddonCategory | null>(null);
  const [items, setItems] = useState<AddonItem[]>([]);
  const [_merchant, _setMerchant] = useState<{ currency: string }>({ currency: "AUD" });

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

  const [originalCategoryForm, setOriginalCategoryForm] = useState<{
    name: string;
    description: string;
    minSelection: number;
    maxSelection: number | string;
  } | null>(null);

  // Check if form has changes compared to original data
  const hasChanges = (): boolean => {
    if (!originalCategoryForm) return false;
    return (
      categoryForm.name !== originalCategoryForm.name ||
      categoryForm.description !== originalCategoryForm.description ||
      categoryForm.minSelection !== originalCategoryForm.minSelection ||
      categoryForm.maxSelection !== originalCategoryForm.maxSelection
    );
  };

  const [itemFormData, setItemFormData] = useState<AddonItemFormData>({
    addonCategoryId: categoryId || "",
    name: "",
    description: "",
    price: "0",
    inputType: "SELECT",
    trackStock: false,
    stockQty: "",
    dailyStockTemplate: "",
    autoResetStock: false,
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
        const formValues = {
          name: categoryData.data.name,
          description: categoryData.data.description || "",
          minSelection: categoryData.data.minSelection,
          maxSelection: categoryData.data.maxSelection !== null ? categoryData.data.maxSelection : "",
        };
        setCategoryForm(formValues);
        setOriginalCategoryForm(formValues);
      }

      if (itemsData.success && Array.isArray(itemsData.data)) {
        setItems(itemsData.data);
      }

      if (merchantRes.ok) {
        const merchantData = await merchantRes.json();
        if (merchantData.success && merchantData.data) {
          _setMerchant({ currency: merchantData.data.currency || "AUD" });
        }
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
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

      showSuccess("Category updated successfully!");
      fetchData();
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleItemFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const isEditing = !!editingItemId;
    const previousItems = [...items];

    // Prepare the new/updated item data
    const newItemData = {
      name: itemFormData.name,
      description: itemFormData.description || null,
      price: parseFloat(itemFormData.price) || 0,
      inputType: itemFormData.inputType as "SELECT" | "QTY",
      trackStock: itemFormData.trackStock,
      stockQty: itemFormData.trackStock && itemFormData.stockQty ? parseInt(itemFormData.stockQty) : null,
      isActive: true,
    };

    if (isEditing) {
      // Optimistic update for edit - update UI immediately
      setItems(prev => prev.map(item =>
        item.id === editingItemId ? { ...item, ...newItemData } : item
      ));
      showSuccess("Item updated successfully!");
      setShowItemForm(false);
      setEditingItemId(null);
      resetItemForm();
    }

    // Close modal immediately for add (but don't add to list yet - need ID)
    if (!isEditing) {
      setShowItemForm(false);
      resetItemForm();
    }

    // API call in background
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const url = isEditing
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
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to save item");

      if (!isEditing) {
        // For add - add new item with ID from response
        const data = await response.json();
        if (data.success && data.data) {
          setItems(prev => [...prev, data.data]);
          showSuccess("Item created successfully!");
        } else {
          // Fallback: fetch all data
          fetchData();
        }
      }
    } catch (err) {
      if (isEditing) {
        // Revert on error for edit
        setItems(previousItems);
      }
      showError(err instanceof Error ? err.message : "An error occurred");
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
      dailyStockTemplate: "",
      autoResetStock: false,
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
      dailyStockTemplate: "",
      autoResetStock: false,
    });
    setShowItemForm(true);
  };

  const handleToggleItemActive = async (id: string) => {
    // Optimistic update - update UI immediately
    const currentItem = items.find(item => item.id === id);
    if (!currentItem) return;

    const newStatus = !currentItem.isActive;
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, isActive: newStatus } : item
    ));
    showSuccess(`Item ${newStatus ? 'activated' : 'deactivated'} successfully!`);

    // API call in background
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/addon-items/${id}/toggle-active`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // Revert on error
        setItems(prev => prev.map(item =>
          item.id === id ? { ...item, isActive: currentItem.isActive } : item
        ));
        showError("Failed to update item status");
      }
    } catch (error) {
      console.error("Failed to toggle item status:", error);
      // Revert on error
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, isActive: currentItem.isActive } : item
      ));
      showError("Failed to update item status");
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    // Optimistic update - remove from UI immediately
    const deletedItem = items.find(item => item.id === id);
    const deletedIndex = items.findIndex(item => item.id === id);
    setItems(prev => prev.filter(item => item.id !== id));
    showSuccess("Item deleted successfully!");

    // API call in background
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/addon-items/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        // Revert on error - add item back
        if (deletedItem) {
          setItems(prev => {
            const newItems = [...prev];
            newItems.splice(deletedIndex, 0, deletedItem);
            return newItems;
          });
        }
        showError("Failed to delete item");
      }
    } catch (error) {
      console.error("Failed to delete item:", error);
      // Revert on error
      if (deletedItem) {
        setItems(prev => {
          const newItems = [...prev];
          newItems.splice(deletedIndex, 0, deletedItem);
          return newItems;
        });
      }
      showError("Failed to delete item");
    }
  };

  const handleUpdateStock = async () => {
    if (!stockModal.itemId) return;

    const itemId = stockModal.itemId;
    const newStock = parseInt(stockModal.newStock) || 0;
    const currentItem = items.find(item => item.id === itemId);
    const previousStock = currentItem?.stockQty || 0;

    // Optimistic update - update UI immediately
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, stockQty: newStock } : item
    ));
    showSuccess("Stock updated!");
    setStockModal({ show: false, itemId: null, itemName: "", currentStock: 0, newStock: "" });

    // API call in background
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/addon-items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          stockQty: newStock,
        }),
      });

      if (!response.ok) {
        // Revert on error
        setItems(prev => prev.map(item =>
          item.id === itemId ? { ...item, stockQty: previousStock } : item
        ));
        showError("Failed to update stock");
      }
    } catch {
      // Revert on error
      setItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, stockQty: previousStock } : item
      ));
      showError("Failed to update stock");
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
        showSuccess("Items reordered successfully!");
      } else {
        throw new Error("Failed to reorder items");
      }
    } catch {
      showError("Failed to save order");
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
    if (isNaN(numPrice) || numPrice === 0) return 'Free';
    return `A$${numPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div>
        <PageBreadcrumb pageTitle="Edit Addon Category" />
        <EditAddonCategorySkeleton />
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
        {/* Category Info Form */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          {/* Header */}
          <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-5 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Edit Addon Category</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Update category details: {category.name}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleUpdateCategory} className="p-6 lg:p-8">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Name <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="e.g., Toppings, Spice Level"
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                  </svg>
                  Description
                </label>
                <input
                  type="text"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
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
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6 dark:border-gray-800">
              <button
                type="button"
                onClick={() => router.push("/admin/dashboard/addon-categories")}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back
              </button>
              {hasChanges() ? (
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-500 px-6 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600 hover:shadow-primary-500/30 focus:outline-none focus:ring-4 focus:ring-primary-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Update Category
                    </>
                  )}
                </button>
              ) : (
                <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-gray-100 px-6 text-sm font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  No changes
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Addon Items Management */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
          {/* Header */}
          <div className="border-b border-gray-200 bg-gray-50/50 px-6 py-5 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success-100 text-success-600 dark:bg-success-900/30 dark:text-success-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Addon Items</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{items.length} items total • Drag to reorder</p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetItemForm();
                  setEditingItemId(null);
                  setShowItemForm(true);
                }}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-500 px-5 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600 hover:shadow-primary-500/30 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Item
              </button>
            </div>
          </div>

          <div className="p-6">

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
                        className={`cursor-move transition-colors ${draggedItem?.id === item.id ? 'opacity-50' : ''
                          } ${dragOverIndex === index ? 'bg-brand-50 dark:bg-brand-900/20 border-t-2 border-brand-500' : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'
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
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${item.inputType === "SELECT"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
                            }`}>
                            {item.inputType === "SELECT" ? "Single Select" : "Quantity Input"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-semibold ${
                            formatPrice(item.price) === 'Free' 
                              ? 'text-success-600 dark:text-success-400' 
                              : 'text-gray-800 dark:text-white/90'
                          }`}>
                            {formatPrice(item.price)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {item.trackStock ? (
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${(item.stockQty || 0) > 10
                              ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                              : (item.stockQty || 0) > 0
                                ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400'
                                : 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-400'
                              }`}>
                              {item.stockQty || 0} pcs
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 dark:text-gray-400">No tracking</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleToggleItemActive(item.id)}
                            className={`inline-flex cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${item.isActive
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
    </div>
  );
}
