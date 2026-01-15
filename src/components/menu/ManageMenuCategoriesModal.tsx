"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useModalImplicitClose } from "@/hooks/useModalImplicitClose";

interface MenuCategory {
  id: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

interface CurrentMenuCategory {
  categoryId: string;
  category: {
    id: string;
    name: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  };
}

interface ManageMenuCategoriesModalProps {
  show: boolean;
  menuId: string;
  menuName: string;
  currentCategories: CurrentMenuCategory[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManageMenuCategoriesModal({
  show,
  menuId,
  menuName,
  currentCategories,
  onClose,
  onSuccess,
}: ManageMenuCategoriesModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [availableCategories, setAvailableCategories] = useState<MenuCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const initialSelectedCategoryIds = useMemo(
    () => currentCategories.map((cat) => cat.categoryId).slice().sort(),
    [currentCategories]
  );

  const isDirty = useMemo(() => {
    const current = [...selectedCategories].sort();
    if (current.length !== initialSelectedCategoryIds.length) return true;
    for (let i = 0; i < current.length; i += 1) {
      if (current[i] !== initialSelectedCategoryIds[i]) return true;
    }
    return false;
  }, [selectedCategories, initialSelectedCategoryIds]);

  useEffect(() => {
    if (show) {
      fetchAvailableCategories();
      initializeSelectedCategories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  // Search state
  const [availableSearch, setAvailableSearch] = useState("");
  const [selectedSearch, setSelectedSearch] = useState("");

  // Filtered categories using useMemo
  const filteredAvailableCategories = useMemo(() => {
    if (!availableSearch.trim()) return availableCategories;
    return availableCategories.filter(cat =>
      cat.name.toLowerCase().includes(availableSearch.toLowerCase())
    );
  }, [availableCategories, availableSearch]);

  const filteredSelectedCategories = useMemo(() => {
    if (!selectedSearch.trim()) return selectedCategories;
    return selectedCategories.filter(catId => {
      const category = availableCategories.find(c => c.id === catId);
      return category?.name.toLowerCase().includes(selectedSearch.toLowerCase());
    });
  }, [selectedCategories, availableCategories, selectedSearch]);

  const initializeSelectedCategories = () => {
    const selected = currentCategories.map((cat) => cat.categoryId);
    setSelectedCategories(selected);
  };

  const fetchAvailableCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch("/api/merchant/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch menu categories");
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setAvailableCategories(
          data.data.sort((a: MenuCategory, b: MenuCategory) =>
            (a.sortOrder || 0) - (b.sortOrder || 0)
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) => {
      const exists = prev.includes(categoryId);
      if (exists) {
        return prev.filter((id) => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const token = localStorage.getItem("accessToken");
      if (!token) return;

      // Update menu categories via API
      const response = await fetch(`/api/merchant/menu/${menuId}/categories`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          categoryIds: selectedCategories,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to update menu categories");
      }

      setSuccess("Menu categories updated successfully!");
      setTimeout(() => {
        onSuccess();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update menu categories");
    } finally {
      setSubmitting(false);
    }
  };

  const disableImplicitClose = submitting || isDirty;
  const { onBackdropMouseDown } = useModalImplicitClose({
    isOpen: show,
    onClose,
    disableImplicitClose,
  });

  if (!show) return null;

  const getCategoryInfo = (categoryId: string) => {
    return availableCategories.find((c) => c.id === categoryId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={onBackdropMouseDown}
    >
      <div className="w-full max-w-4xl rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Manage Menu Categories - {menuName}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Select which categories this menu belongs to
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
          <div className="px-6 pt-4 space-y-2">
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
                  Available Categories
                </h4>
                {/* Search Input */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search available categories..."
                    value={availableSearch}
                    onChange={(e) => setAvailableSearch(e.target.value)}
                    data-tutorial="category-search"
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50 max-h-[350px] overflow-y-auto">
                  {filteredAvailableCategories.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {availableSearch ? "No matching categories" : "No categories available"}
                    </p>
                  ) : (
                    filteredAvailableCategories.map((category) => {

                      const isSelected = selectedCategories.includes(category.id);

                      return (
                        <div
                          key={category.id}
                          className={`rounded-lg border bg-white p-3 dark:bg-gray-900 ${isSelected
                            ? "border-brand-300 bg-brand-50 dark:border-brand-700 dark:bg-brand-900/20"
                            : "border-gray-200 dark:border-gray-700"
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCategory(category.id)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-800 dark:text-white/90">
                                  {category.name}
                                </p>
                                {category.isActive ? (
                                  <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-900/20 dark:text-success-400">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              {category.description && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                  {category.description}
                                </p>
                              )}
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Sort Order: #{category.sortOrder || 0}
                              </div>
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
                <h4 className="mb-3 font-semibold text-gray-800 dark:text-white/90" data-tutorial="category-filters">
                  Selected Categories ({selectedCategories.length})
                </h4>
                {/* Search Input */}
                <div className="mb-3">
                  <input
                    type="text"
                    placeholder="Search selected categories..."
                    value={selectedSearch}
                    onChange={(e) => setSelectedSearch(e.target.value)}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white/90 dark:placeholder:text-white/40"
                  />
                </div>
                <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50 max-h-[350px] overflow-y-auto">
                  {filteredSelectedCategories.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                      {selectedSearch ? "No matching categories" : "No categories selected"}
                    </p>
                  ) : (
                    filteredSelectedCategories.map((categoryId) => {

                      const category = getCategoryInfo(categoryId);
                      if (!category) return null;

                      return (
                        <div
                          key={categoryId}
                          className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-gray-800 dark:text-white/90">
                                  {category.name}
                                </p>
                                {category.isActive ? (
                                  <span className="inline-flex items-center rounded-full bg-success-100 px-2 py-0.5 text-xs font-medium text-success-700 dark:bg-success-900/20 dark:text-success-400">
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                                    Inactive
                                  </span>
                                )}
                              </div>
                              {category.description && (
                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                  {category.description}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleToggleCategory(categoryId)}
                              className="text-error-600 hover:text-error-700 dark:text-error-400"
                              title="Remove category"
                            >
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
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
              disabled={submitting || selectedCategories.length === 0}
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
