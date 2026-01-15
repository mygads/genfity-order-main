"use client";

import React, { useState, useEffect, useMemo } from "react";
import { FaTimes, FaSearch, FaCopy } from "react-icons/fa";
import Image from "next/image";
import { useModalImplicitClose } from "@/hooks/useModalImplicitClose";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number | string;
  imageUrl: string | null;
  imageThumbUrl?: string | null;
  isActive: boolean;
  isSpicy: boolean;
  isBestSeller: boolean;
  isSignature: boolean;
  isRecommended: boolean;
  trackStock: boolean;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
  categories?: Array<{ id: string; name: string }>;
  addonCategories?: Array<{ id: string; name: string; isRequired: boolean }>;
}

interface DuplicateMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (menu: MenuItem) => void;
  token: string;
}

/**
 * Modal for selecting a menu item to duplicate
 * Used in create menu page to auto-fill form from existing menu
 */
export default function DuplicateMenuModal({
  isOpen,
  onClose,
  onSelect,
  token,
}: DuplicateMenuModalProps) {
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isDirty = Boolean(searchQuery.trim() || selectedId);
  const disableImplicitClose = loading || isDirty;

  const { onBackdropMouseDown } = useModalImplicitClose({
    isOpen,
    onClose,
    disableImplicitClose,
  });

  // Fetch menus when modal opens
  useEffect(() => {
    if (isOpen && token) {
      fetchMenus();
    }
    // Reset state when modal closes
    if (!isOpen) {
      setSearchQuery("");
      setSelectedId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, token]);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/merchant/menu", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setMenus(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch menus:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter menus by search query
  const filteredMenus = useMemo(() => {
    if (!searchQuery.trim()) return menus;
    const query = searchQuery.toLowerCase();
    return menus.filter(
      (menu) =>
        menu.name.toLowerCase().includes(query) ||
        menu.description?.toLowerCase().includes(query)
    );
  }, [menus, searchQuery]);

  const handleConfirm = () => {
    if (selectedId) {
      const selectedMenu = menus.find((m) => m.id === selectedId);
      if (selectedMenu) {
        onSelect(selectedMenu);
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
        onMouseDown={onBackdropMouseDown}
      />

      {/* Modal */}
      <div className="relative mx-4 w-full max-w-2xl rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
              <FaCopy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Duplicate from Existing Menu
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Select a menu item to copy its data
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

        {/* Search */}
        <div className="border-b border-gray-200 px-6 py-3 dark:border-gray-800">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Menu List */}
        <div className="max-h-96 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            </div>
          ) : filteredMenus.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-gray-400">
              {searchQuery ? "No menu items found" : "No menu items available"}
            </div>
          ) : (
            <div className="grid gap-2">
              {filteredMenus.map((menu) => (
                <button
                  key={menu.id}
                  onClick={() => setSelectedId(menu.id)}
                  className={`flex items-center gap-4 rounded-xl border-2 p-3 text-left transition-all ${
                    selectedId === menu.id
                      ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/20"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-750"
                  }`}
                >
                  {/* Image */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
                    {menu.imageUrl ? (
                      <Image
                        src={menu.imageUrl}
                        alt={menu.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400">
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {menu.name}
                      </span>
                      {!menu.isActive && (
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                          Inactive
                        </span>
                      )}
                    </div>
                    {menu.description && (
                      <p className="mt-0.5 truncate text-sm text-gray-500 dark:text-gray-400">
                        {menu.description}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        ${typeof menu.price === "number" ? menu.price.toFixed(2) : parseFloat(menu.price).toFixed(2)}
                      </span>
                      {menu.categories && menu.categories.length > 0 && (
                        <span className="text-gray-400">
                          • {menu.categories.map((c) => c.name).join(", ")}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Selection indicator */}
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      selectedId === menu.id
                        ? "border-brand-500 bg-brand-500 text-white"
                        : "border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    {selectedId === menu.id && (
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
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaCopy className="h-4 w-4" />
            Duplicate
          </button>
        </div>
      </div>
    </div>
  );
}
