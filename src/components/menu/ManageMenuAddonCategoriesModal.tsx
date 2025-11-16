"use client";

import React, { useState, useEffect } from "react";

interface AddonItem {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  isActive: boolean;
  inputType: string;
  trackStock: boolean;
  stockQty: number | null;
  displayOrder: number;
}

interface AddonCategory {
  id: string;
  name: string;
  description: string | null;
  minSelection: number;
  maxSelection: number | null;
  isActive: boolean;
  addonItems: AddonItem[];
}

interface AvailableAddonCategory extends AddonCategory {
  _count?: {
    addonItems: number;
  };
}

interface CurrentAddonCategory {
  addonCategoryId: string;
  isRequired: boolean;
  displayOrder: number;
  addonCategory: AddonCategory;
}

interface ManageMenuAddonCategoriesModalProps {
  show: boolean;
  menuId: string;
  menuName: string;
  currentAddonCategories: CurrentAddonCategory[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManageMenuAddonCategoriesModal({
  show,
  menuId,
  menuName,
  currentAddonCategories,
  onClose,
  onSuccess,
}: ManageMenuAddonCategoriesModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [availableCategories, setAvailableCategories] = useState<AvailableAddonCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<
    Array<{ id: string; isRequired: boolean; displayOrder: number }>
  >([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      fetchAvailableCategories();
      initializeSelectedCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const initializeSelectedCategories = () => {
    const selected = currentAddonCategories.map((cat, index) => ({
      id: cat.addonCategoryId,
      isRequired: cat.isRequired,
      displayOrder: cat.displayOrder ?? index,
    }));
    setSelectedCategories(selected.sort((a, b) => a.displayOrder - b.displayOrder));
  };

  const fetchAvailableCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch("/api/merchant/addon-categories", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch addon categories");
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setAvailableCategories(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const exists = prev.find((c) => c.id === categoryId);
      if (exists) {
        return prev.filter((c) => c.id !== categoryId);
      } else {
        return [
          ...prev,
          {
            id: categoryId,
            isRequired: false,
            displayOrder: prev.length,
          },
        ];
      }
    });
  };

  const handleToggleRequired = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, isRequired: !c.isRequired } : c
      )
    );
  };

  const handleDragStart = (e: React.DragEvent, categoryId: string) => {
    setDraggedItem(categoryId);
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

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedItem) return;

    const draggedIndex = selectedCategories.findIndex((c) => c.id === draggedItem);
    if (draggedIndex === -1 || draggedIndex === dropIndex) return;

    const reordered = [...selectedCategories];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(dropIndex, 0, removed);

    // Update displayOrder
    const updated = reordered.map((cat, index) => ({
      ...cat,
      displayOrder: index,
    }));

    setSelectedCategories(updated);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverIndex(null);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem("accessToken");
      if (!token) return;

      // Remove all current addon categories first
      const deletePromises = currentAddonCategories.map((cat) =>
        fetch(`/api/merchant/menu/${menuId}/addon-categories/${cat.addonCategoryId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      await Promise.all(deletePromises);

      // Add selected categories
      if (selectedCategories.length > 0) {
        const addPromises = selectedCategories.map((cat) =>
          fetch(`/api/merchant/menu/${menuId}/addon-categories`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              addonCategoryId: cat.id,
              isRequired: cat.isRequired,
              displayOrder: cat.displayOrder,
            }),
          })
        );

        const results = await Promise.all(addPromises);
        const failed = results.filter((r) => !r.ok);

        if (failed.length > 0) {
          throw new Error("Failed to add some addon categories");
        }
      }

      setSuccess("Addon categories updated successfully!");
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update addon categories");
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  const getCategoryInfo = (categoryId: string) => {
    return availableCategories.find((c) => c.id === categoryId);
  };

  const toggleCategoryExpand = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Manage Addon Categories - {menuName}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select addon categories and drag to reorder
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-10 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Available Categories */}
              <div>
                <h4 className="mb-3 font-semibold text-gray-800 dark:text-white/90">
                  Available Addon Categories
                </h4>
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                  {availableCategories.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No addon categories available
                    </p>
                  ) : (
                    availableCategories.map((category) => {
                      const isSelected = selectedCategories.some((c) => c.id === category.id);
                      const isExpanded = expandedCategory === category.id;

                      return (
                        <div
                          key={category.id}
                          className={`rounded-lg border bg-white dark:bg-gray-900 ${
                            isSelected
                              ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20"
                              : "border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          <div className="flex items-start gap-3 p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCategory(category.id)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                            />
                            <div className="flex-1 min-w-0">
                              <button
                                onClick={() => toggleCategoryExpand(category.id)}
                                className="w-full text-left"
                              >
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-800 dark:text-white/90">
                                    {category.name}
                                  </p>
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                    category.isActive
                                      ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                  }`}>
                                    {category.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                  <svg
                                    className={`h-4 w-4 text-gray-400 transition-transform ml-auto ${isExpanded ? 'rotate-180' : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                                {category.description && (
                                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                    {category.description}
                                  </p>
                                )}
                                <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                  <span>Min: {category.minSelection}</span>
                                  <span>Max: {category.maxSelection || '∞'}</span>
                                  <span className="font-medium text-brand-600 dark:text-brand-400">
                                    {category.addonItems?.length || 0} items
                                  </span>
                                </div>
                              </button>

                              {/* Expanded Items Preview */}
                              {isExpanded && category.addonItems && category.addonItems.length > 0 && (
                                <div className="mt-3 space-y-1.5 border-t border-gray-200 pt-3 dark:border-gray-700">
                                  {category.addonItems.map((item) => {
                                    const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
                                    const formattedPrice = itemPrice === 0 ? 'Free' : `A$ ${itemPrice.toFixed(2)}`;
                                    
                                    return (
                                      <div
                                        key={item.id}
                                        className={`rounded-lg border border-gray-200 bg-white p-2.5 dark:border-gray-700 dark:bg-gray-800/50 ${
                                          !item.isActive ? 'opacity-40' : ''
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-medium text-gray-800 dark:text-white/90">
                                                {item.name}
                                              </span>
                                              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                                {formattedPrice}
                                              </span>
                                            </div>
                                            {item.description && (
                                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                                {item.description}
                                              </p>
                                            )}
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                                              <span className="flex items-center gap-1">
                                                {item.inputType === 'QTY' ? (
                                                  <>
                                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                    </svg>
                                                    Quantity
                                                  </>
                                                ) : (
                                                  <>
                                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Select
                                                  </>
                                                )}
                                              </span>
                                              {item.trackStock && (
                                                <span className="flex items-center gap-1">
                                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                  </svg>
                                                  Stock: {item.stockQty || 0}
                                                </span>
                                              )}
                                              <span>Display: #{item.displayOrder}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Selected Categories (Ordered) */}
              <div>
                <h4 className="mb-3 font-semibold text-gray-800 dark:text-white/90">
                  Selected Categories ({selectedCategories.length})
                </h4>
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                  {selectedCategories.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      No categories selected
                    </p>
                  ) : (
                    selectedCategories.map((selected, index) => {
                      const category = getCategoryInfo(selected.id);
                      if (!category) return null;
                      const isExpanded = expandedCategory === selected.id;

                      return (
                        <div
                          key={selected.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, selected.id)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`rounded-lg border bg-white transition-all dark:bg-gray-900 ${
                            draggedItem === selected.id
                              ? "opacity-50"
                              : dragOverIndex === index
                              ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
                              : "border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          <div className="flex items-start gap-3 p-3">
                            <div className="flex cursor-move flex-col items-center text-gray-400">
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                              <span className="mt-1 text-xs font-semibold text-gray-600 dark:text-gray-400">
                                {index + 1}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <button
                                  onClick={() => toggleCategoryExpand(selected.id)}
                                  className="flex-1 text-left"
                                >
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-gray-800 dark:text-white/90">
                                      {category.name}
                                    </p>
                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                      category.isActive
                                        ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                    }`}>
                                      {category.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                    <svg
                                      className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </button>
                                <button
                                  onClick={() => handleToggleCategory(selected.id)}
                                  className="ml-2 text-error-600 hover:text-error-700 dark:text-error-400"
                                  title="Remove category"
                                >
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                              {category.description && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                  {category.description}
                                </p>
                              )}
                              <div className="mt-2 flex flex-wrap items-center gap-3">
                                <label className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={selected.isRequired}
                                    onChange={() => handleToggleRequired(selected.id)}
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-red-500 focus:ring-red-500"
                                  />
                                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Required
                                  </span>
                                </label>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  Min: {category.minSelection} | Max: {category.maxSelection || '∞'}
                                </span>
                                <span className="text-xs font-medium text-brand-600 dark:text-brand-400">
                                  {category.addonItems?.length || 0} items
                                </span>
                              </div>

                              {/* Expanded addon items for selected categories */}
                              {isExpanded && category.addonItems && category.addonItems.length > 0 && (
                                <div className="mt-3 space-y-1.5 border-t border-gray-200 pt-3 dark:border-gray-700">
                                  {category.addonItems.map((item) => {
                                    const itemPrice = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
                                    const formattedPrice = itemPrice === 0 ? 'Free' : `A$ ${itemPrice.toFixed(2)}`;
                                    
                                    return (
                                      <div
                                        key={item.id}
                                        className={`rounded-lg border border-gray-200 bg-white p-2.5 dark:border-gray-700 dark:bg-gray-800/50 ${
                                          !item.isActive ? 'opacity-40' : ''
                                        }`}
                                      >
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs font-medium text-gray-800 dark:text-white/90">
                                                {item.name}
                                              </span>
                                              <span className="text-xs font-semibold text-gray-900 dark:text-white">
                                                {formattedPrice}
                                              </span>
                                            </div>
                                            {item.description && (
                                              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                                {item.description}
                                              </p>
                                            )}
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                                              <span className="flex items-center gap-1">
                                                {item.inputType === 'QTY' ? (
                                                  <>
                                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                                    </svg>
                                                    Quantity
                                                  </>
                                                ) : (
                                                  <>
                                                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Select
                                                  </>
                                                )}
                                              </span>
                                              {item.trackStock && (
                                                <span className="flex items-center gap-1">
                                                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                  </svg>
                                                  Stock: {item.stockQty || 0}
                                                </span>
                                              )}
                                              <span>Display: #{item.displayOrder}</span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 dark:border-gray-800">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={submitting}
              className="h-11 flex-1 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="h-11 flex-1 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
