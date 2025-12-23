"use client";

import React, { useState, useEffect } from "react";
import { useToast } from "@/context/ToastContext";

interface AddonItem {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  inputType: "SELECT" | "QTY";
  displayOrder?: number;
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
  addonCategoryId?: string;
}

interface ViewAddonItemsModalProps {
  show: boolean;
  categoryName: string;
  categoryId: string;
  items: AddonItem[];
  currency: string;
  onClose: () => void;
  onRefresh: () => void;
}

export default function ViewAddonItemsModal({
  show,
  categoryName,
  categoryId,
  items,
  // currency prop is currently unused but kept for interface consistency
  currency: _currency,
  onClose,
  onRefresh,
}: ViewAddonItemsModalProps) {
  const { showSuccess, showError } = useToast();
  const [sortedItems, setSortedItems] = useState<AddonItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<AddonItem | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [stockModal, setStockModal] = useState<{
    show: boolean;
    itemId: string | null;
    itemName: string;
    currentStock: number;
    newStock: string;
  }>({ show: false, itemId: null, itemName: "", currentStock: 0, newStock: "" });

  // Inline edit state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ name: string; price: string }>({ name: "", price: "" });

  // Add items state
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [availableItems, setAvailableItems] = useState<AddonItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingItems, setLoadingItems] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    itemId: string | null;
    itemName: string;
  }>({ show: false, itemId: null, itemName: "" });

  useEffect(() => {
    if (items.length > 0) {
      const sorted = [...items].sort((a, b) => {
        const orderA = a.displayOrder ?? 999;
        const orderB = b.displayOrder ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
      });
      setSortedItems(sorted);
    } else {
      setSortedItems([]);
    }
  }, [items]);

  if (!show) return null;

  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === 0) return 'Free';
    return `A$${numPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Drag and drop handlers with optimistic update
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

    const dragIndex = sortedItems.findIndex(item => item.id === draggedItem.id);
    if (dragIndex === dropIndex) return;

    // Optimistic update - reorder items immediately
    const newItems = [...sortedItems];
    const [removed] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, removed);

    // Update displayOrder for all items
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      displayOrder: index,
    }));

    // Update UI immediately
    setSortedItems(updatedItems);
    setDraggedItem(null);

    // Update in database in background
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
      // Revert on error
      onRefresh();
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  // Action handlers with optimistic updates
  const handleToggleActive = async (id: string) => {
    // Optimistic update - toggle status immediately
    setSortedItems(prev => prev.map(item =>
      item.id === id ? { ...item, isActive: !item.isActive } : item
    ));

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/addon-items/${id}/toggle-active`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        showSuccess("Item status updated!");
      } else {
        throw new Error("Failed to update status");
      }
    } catch {
      showError("Failed to update status");
      // Revert on error
      onRefresh();
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
        showSuccess("Stock updated!");
        setStockModal({ show: false, itemId: null, itemName: "", currentStock: 0, newStock: "" });
        onRefresh();
      }
    } catch {
      showError("Failed to update stock");
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
        showSuccess("Set to out of stock!");
        onRefresh();
      }
    } catch {
      showError("Failed to update stock");
    }
  };

  // Delete addon item from category with optimistic update
  const handleDeleteItem = async (itemId: string) => {
    // Optimistic update - remove item immediately
    setSortedItems(prev => prev.filter(item => item.id !== itemId));
    setDeleteConfirm({ show: false, itemId: null, itemName: "" });

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch(`/api/merchant/addon-items/${itemId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        showSuccess("Item deleted successfully!");
      } else {
        throw new Error("Failed to delete item");
      }
    } catch {
      showError("Failed to delete item");
      // Revert on error
      onRefresh();
    }
  };

  // Inline edit handlers
  const handleStartEdit = (item: AddonItem) => {
    setEditingItemId(item.id);
    setEditData({
      name: item.name,
      price: typeof item.price === 'string' ? item.price : item.price.toString(),
    });
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditData({ name: "", price: "" });
  };

  const handleSaveEdit = async (itemId: string) => {
    // Optimistic update - update item immediately
    setSortedItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, name: editData.name, price: parseFloat(editData.price) || 0 }
        : item
    ));
    setEditingItemId(null);
    const oldEditData = { ...editData };
    setEditData({ name: "", price: "" });

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
          name: oldEditData.name,
          price: parseFloat(oldEditData.price),
        }),
      });

      if (response.ok) {
        showSuccess("Item updated successfully!");
      } else {
        throw new Error("Failed to update item");
      }
    } catch {
      showError("Failed to update item");
      // Revert on error
      onRefresh();
    }
  };

  // Fetch available items (not in current category or all items for duplication)
  const fetchAvailableItems = async () => {
    try {
      setLoadingItems(true);
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch("/api/merchant/addon-items", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setAvailableItems(data.data);
        }
      }
    } catch {
      showError("Failed to load items");
    } finally {
      setLoadingItems(false);
    }
  };

  // Add item to category (or duplicate if already exists)
  const handleAddItem = async (item: AddonItem, shouldDuplicate: boolean) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      if (shouldDuplicate) {
        // Create duplicate of the item
        const createResponse = await fetch("/api/merchant/addon-items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            addonCategoryId: categoryId,
            name: `${item.name} (Copy)`,
            description: item.description,
            price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
            inputType: item.inputType,
            trackStock: item.trackStock,
            stockQty: item.trackStock ? 0 : null,
            displayOrder: sortedItems.length,
          }),
        });

        if (!createResponse.ok) {
          throw new Error("Failed to duplicate item");
        }
      } else {
        // Update existing item to link to this category
        const updateResponse = await fetch(`/api/merchant/addon-items/${item.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            addonCategoryId: categoryId,
            displayOrder: sortedItems.length,
          }),
        });

        if (!updateResponse.ok) {
          throw new Error("Failed to add item");
        }
      }

      showSuccess(shouldDuplicate ? "Item duplicated and added!" : "Item added successfully!");
      setShowAddItemsModal(false);
      setSearchQuery("");
      onRefresh();
    } catch {
      showError("Failed to add item");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-5xl h-[90vh] rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Manage Items - {categoryName}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Drag & drop to reorder • {items.length} item{items.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowAddItemsModal(true);
                fetchAvailableItems();
              }}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-500 px-5 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600 hover:shadow-primary-500/30 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Items
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>



        <div className="flex-1 overflow-y-auto p-6">
          {sortedItems.length === 0 && items.length === 0 ? (
            // Show skeleton loading when items are being fetched
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
                  {Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-700"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
                            <div className="h-3 w-48 rounded bg-gray-200 dark:bg-gray-700"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                          <div className="h-9 w-9 rounded-lg bg-gray-200 dark:bg-gray-700"></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No addon items in this category
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
                  {sortedItems.map((item, index) => (
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
                          <div className="flex-1">
                            {editingItemId === item.id ? (
                              <input
                                type="text"
                                value={editData.name}
                                onChange={(e) => setEditData(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full rounded border border-brand-300 bg-white px-2 py-1 text-sm font-medium text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-brand-700 dark:bg-gray-800 dark:text-white/90"
                                autoFocus
                              />
                            ) : (
                              <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</p>
                            )}
                            {item.description && editingItemId !== item.id && (
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
                        {editingItemId === item.id ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={editData.price}
                            onChange={(e) => setEditData(prev => ({ ...prev, price: e.target.value }))}
                            className="w-24 rounded border border-brand-300 bg-white px-2 py-1 text-sm font-semibold text-gray-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-brand-700 dark:bg-gray-800 dark:text-white/90"
                          />
                        ) : (
                          <span className={`text-sm font-semibold ${formatPrice(item.price) === 'Free'
                              ? 'text-success-600 dark:text-success-400'
                              : 'text-gray-800 dark:text-white/90'
                            }`}>
                            {formatPrice(item.price)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {item.trackStock ? (
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${(item.stockQty || 0) > 10
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
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            No tracking
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleActive(item.id)}
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
                          {editingItemId === item.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(item.id)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-success-200 bg-success-50 text-success-600 hover:bg-success-100 dark:border-success-900/50 dark:bg-success-900/20 dark:text-success-400"
                                title="Save"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
                                title="Cancel"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(item)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-400"
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
                                onClick={() => setDeleteConfirm({ show: true, itemId: item.id, itemName: item.name })}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-error-200 bg-error-50 text-error-600 hover:bg-error-100 dark:border-error-900/50 dark:bg-error-900/20 dark:text-error-400"
                                title="Delete"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-6 dark:border-gray-800">
          <button
            onClick={onClose}
            className="h-11 w-full rounded-xl bg-primary-500 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600 hover:shadow-primary-500/30 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
          >
            Close
          </button>
        </div>
      </div>

      {/* Stock Update Modal */}
      {stockModal.show && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Update Stock - {stockModal.itemName}
            </h4>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Current stock: {stockModal.currentStock} pcs
            </p>

            <div className="mt-4">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                New Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                value={stockModal.newStock}
                onChange={(e) => setStockModal(prev => ({ ...prev, newStock: e.target.value }))}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStockModal({ show: false, itemId: null, itemName: "", currentStock: 0, newStock: "" })}
                className="h-11 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStock}
                className="h-11 flex-1 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600"
              >
                Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-100 dark:bg-error-900/20">
                <svg className="h-6 w-6 text-error-600 dark:text-error-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Addon Item
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="mb-6 text-sm text-gray-700 dark:text-gray-300">
              Are you sure you want to delete <strong>&quot;{deleteConfirm.itemName}&quot;</strong>?
              This will permanently remove it from the system.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm({ show: false, itemId: null, itemName: "" })}
                className="h-11 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirm.itemId && handleDeleteItem(deleteConfirm.itemId)}
                className="h-11 flex-1 rounded-lg bg-error-600 text-sm font-medium text-white hover:bg-error-700"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Items Modal */}
      {showAddItemsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-800">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Add Items to {categoryName}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Search and add items • Items already in a category will be duplicated
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddItemsModal(false);
                  setSearchQuery("");
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingItems ? (
                <div className="py-10 text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading items...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableItems
                    .filter(item =>
                      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
                    )
                    .map((item) => {
                      const isInCurrentCategory = items.some(i => i.id === item.id);
                      const isInOtherCategory = item.addonCategoryId && item.addonCategoryId !== categoryId;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                                {item.name}
                              </p>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                {formatPrice(item.price)}
                              </span>
                              {isInCurrentCategory && (
                                <span className="inline-flex items-center rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                                  Already added
                                </span>
                              )}
                              {isInOtherCategory && !isInCurrentCategory && (
                                <span className="inline-flex items-center rounded-full bg-warning-100 px-2 py-0.5 text-xs font-medium text-warning-700 dark:bg-warning-900/20 dark:text-warning-400">
                                  In other category
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                            <div className="mt-1 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                              <span>{item.inputType === 'SELECT' ? 'Single Select' : 'Quantity Input'}</span>
                              {item.trackStock && <span>Stock: {item.stockQty || 0}</span>}
                            </div>
                          </div>
                          <div className="ml-4">
                            {isInCurrentCategory ? (
                              <button
                                disabled
                                className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-200 bg-gray-100 px-4 text-sm font-medium text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800"
                              >
                                Added
                              </button>
                            ) : isInOtherCategory ? (
                              <button
                                onClick={() => handleAddItem(item, true)}
                                className="inline-flex h-10 items-center gap-2 rounded-lg border border-warning-200 bg-warning-50 px-4 text-sm font-medium text-warning-700 hover:bg-warning-100 dark:border-warning-900/50 dark:bg-warning-900/20 dark:text-warning-400"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                Duplicate & Add
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAddItem(item, false)}
                                className="inline-flex h-10 items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 text-sm font-medium text-primary-700 shadow-sm transition-all hover:bg-primary-100 hover:shadow-md dark:border-primary-900/50 dark:bg-primary-900/20 dark:text-primary-400"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {availableItems.filter(item =>
                    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
                  ).length === 0 && (
                      <div className="py-10 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {searchQuery ? 'No items found matching your search' : 'No items available'}
                        </p>
                      </div>
                    )}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-6 dark:border-gray-800">
              <button
                onClick={() => {
                  setShowAddItemsModal(false);
                  setSearchQuery("");
                }}
                className="h-11 w-full rounded-xl bg-primary-500 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600 hover:shadow-primary-500/30 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
