"use client";

import React, { useState, useEffect } from "react";

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
  currency,
  onClose,
  onRefresh,
}: ViewAddonItemsModalProps) {
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
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (isNaN(numPrice)) return `${currency} 0`;
    return `${currency} ${numPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

    const dragIndex = sortedItems.findIndex(item => item.id === draggedItem.id);
    if (dragIndex === dropIndex) return;

    // Reorder items
    const newItems = [...sortedItems];
    const [removed] = newItems.splice(dragIndex, 1);
    newItems.splice(dropIndex, 0, removed);

    // Update displayOrder for all items
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      displayOrder: index,
    }));

    setSortedItems(updatedItems);
    
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
        onRefresh();
      } else {
        throw new Error("Failed to reorder items");
      }
    } catch {
      setError("Failed to save order");
      setTimeout(() => setError(null), 5000);
      onRefresh();
    }

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  // Action handlers
  const handleToggleActive = async (id: string) => {
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
        onRefresh();
      }
    } catch {
      setError("Failed to update status");
      setTimeout(() => setError(null), 3000);
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
        onRefresh();
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
        onRefresh();
      }
    } catch {
      setError("Failed to update stock");
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-5xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Manage Items - {categoryName}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Drag & drop to reorder • {items.length} item{items.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {(success || error) && (
          <div className="px-6 pt-4">
            {success && (
              <div className="rounded-lg bg-success-50 p-3 dark:bg-success-900/20">
                <p className="text-sm text-success-600 dark:text-success-400">{success}</p>
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-error-50 p-3 dark:bg-error-900/20">
                <p className="text-sm text-error-600 dark:text-error-400">{error}</p>
              </div>
            )}
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-6">
          {sortedItems.length === 0 ? (
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
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            No tracking
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleToggleActive(item.id)}
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
            className="h-11 w-full rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600"
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
    </div>
  );
}
