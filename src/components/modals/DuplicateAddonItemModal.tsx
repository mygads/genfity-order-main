"use client";

import React, { useState, useEffect, useMemo } from "react";
import { FaTimes, FaSearch, FaCopy } from "react-icons/fa";

interface AddonItem {
  id: string;
  addonCategoryId: string;
  name: string;
  description: string | null;
  price: number | string;
  inputType: "SELECT" | "QTY";
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
  addonCategory?: {
    id: string;
    name: string;
  };
}

interface AddonCategory {
  id: string;
  name: string;
}

interface DuplicateAddonItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: AddonItem) => void;
  token: string;
  categories: AddonCategory[];
}

/**
 * Modal for selecting an addon item to duplicate
 * Used in addon items page to auto-fill form from existing item
 */
export default function DuplicateAddonItemModal({
  isOpen,
  onClose,
  onSelect,
  token,
  categories,
}: DuplicateAddonItemModalProps) {
  const [items, setItems] = useState<AddonItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Fetch addon items when modal opens
  useEffect(() => {
    if (isOpen && token) {
      fetchItems();
    }
    // Reset state when modal closes
    if (!isOpen) {
      setSearchQuery("");
      setFilterCategory("all");
      setSelectedId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, token]);

  const fetchItems = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await fetch("/api/merchant/addon-items", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setItems(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch addon items:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter items by search query and category
  const filteredItems = useMemo(() => {
    let result = items;

    // Filter by category
    if (filterCategory !== "all") {
      result = result.filter((item) => item.addonCategoryId === filterCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [items, searchQuery, filterCategory]);

  // Group items by category for display
  const groupedItems = useMemo(() => {
    const groups: Record<string, AddonItem[]> = {};
    
    filteredItems.forEach((item) => {
      const categoryName = item.addonCategory?.name || "Uncategorized";
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(item);
    });

    return groups;
  }, [filteredItems]);

  const handleConfirm = () => {
    if (selectedId) {
      const selectedItem = items.find((i) => i.id === selectedId);
      if (selectedItem) {
        onSelect(selectedItem);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <FaCopy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Duplicate from Existing Addon
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select an addon item to copy its data
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 border-b border-gray-200 px-6 py-3 dark:border-gray-800">
          {/* Search */}
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search addon items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-800 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Items List */}
        <div className="max-h-96 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              {searchQuery || filterCategory !== "all"
                ? "No addon items found"
                : "No addon items available"}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
                <div key={categoryName}>
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {categoryName}
                  </h3>
                  <div className="grid gap-2">
                    {categoryItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedId(item.id)}
                        className={`flex items-center gap-4 rounded-xl border-2 p-3 text-left transition-all ${
                          selectedId === item.id
                            ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-750"
                        }`}
                      >
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {item.name}
                            </span>
                            {!item.isActive && (
                              <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                Inactive
                              </span>
                            )}
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                              {item.inputType}
                            </span>
                          </div>
                          {item.description && (
                            <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                              {item.description}
                            </p>
                          )}
                          <div className="mt-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                            ${typeof item.price === "number" ? item.price.toFixed(2) : parseFloat(item.price).toFixed(2)}
                          </div>
                        </div>

                        {/* Selection indicator */}
                        <div
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            selectedId === item.id
                              ? "border-primary-500 bg-primary-500 text-white"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {selectedId === item.id && (
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaCopy className="h-4 w-4" />
            Duplicate
          </button>
        </div>
      </div>
    </div>
  );
}
