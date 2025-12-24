"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";

interface MenuRelationship {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isRequired: boolean;
  displayOrder: number;
}

interface MenuRelationshipModalProps {
  show: boolean;
  categoryId: string;
  categoryName: string;
  onClose: () => void;
}

export default function MenuRelationshipModal({
  show,
  categoryId,
  categoryName,
  onClose,
}: MenuRelationshipModalProps) {
  const router = useRouter();
  const { showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [menus, setMenus] = useState<MenuRelationship[]>([]);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (show && categoryId) {
      fetchMenuRelationships();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, categoryId]);

  const fetchMenuRelationships = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch(
        `/api/merchant/addon-categories/${categoryId}/relationships`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch menu relationships");
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setMenus(data.data);
        // Default to collapsed for all menus
        setExpandedMenus(new Set());
      } else {
        setMenus([]);
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "An error occurred");
      setMenus([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMenuExpand = (menuId: string) => {
    setExpandedMenus((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(menuId)) {
        newSet.delete(menuId);
      } else {
        newSet.add(menuId);
      }
      return newSet;
    });
  };

  const handleNavigateToMenu = (menuId: string) => {
    router.push(`/admin/dashboard/menu/edit/${menuId}`);
    onClose();
  };

  const handleExpandAll = () => {
    setExpandedMenus(new Set(menus.map((m) => m.id)));
  };

  const handleCollapseAll = () => {
    setExpandedMenus(new Set());
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl h-[90vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-6 dark:border-gray-800 shrink-0">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Menu Relationships
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Addon Category: <span className="font-medium text-gray-900 dark:text-white">{categoryName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 flex-1 min-h-0">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-500 border-r-transparent"></div>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Loading menu relationships...
              </p>
            </div>
          ) : menus.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                <svg className="h-8 w-8 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h4 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                No Menus Using This Addon Category
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This addon category is not currently assigned to any menu items.
                <br />
                You can safely delete it if no longer needed.
              </p>
            </div>
          ) : (
            <>
              {/* Summary and Controls */}
              <div className="mb-6 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500 text-white">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total Menus
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {menus.length}
                    </p>
                  </div>
                  <div className="ml-6">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Required
                    </p>
                    <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                      {menus.filter((m) => m.isRequired).length}
                    </p>
                  </div>
                  <div className="ml-6">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Optional
                    </p>
                    <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      {menus.filter((m) => !m.isRequired).length}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleExpandAll}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Expand All
                  </button>
                  <button
                    onClick={handleCollapseAll}
                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Collapse All
                  </button>
                </div>
              </div>

              {/* Relationship Tree */}
              <div className="space-y-2">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  {categoryName}
                  <span className="ml-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                    {menus.length} menu{menus.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="ml-6 space-y-2 border-l-2 border-gray-200 pl-4 dark:border-gray-800">
                  {menus.map((menu) => {
                    const isExpanded = expandedMenus.has(menu.id);
                    return (
                      <div
                        key={menu.id}
                        className="rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/50"
                      >
                        {/* Menu Header */}
                        <div className="flex items-center justify-between p-4">
                          <div className="flex flex-1 items-center gap-3">
                            <button
                              onClick={() => toggleMenuExpand(menu.id)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            >
                              <svg
                                className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900 dark:text-white">
                                  {menu.name}
                                </h4>
                                {menu.isRequired ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Required
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                    Optional
                                  </span>
                                )}
                              </div>
                              {menu.description && (
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                                  {menu.description}
                                </p>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/30">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Price
                                </p>
                                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                                  A${menu.price.toFixed(2)}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Display Order
                                </p>
                                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                                  #{menu.displayOrder}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                  Addon Status
                                </p>
                                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                                  {menu.isRequired ? 'Customer must select' : 'Customer can skip'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 p-6 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {menus.length > 0 ? (
              <span>
                ⚠️ This addon category is actively used and cannot be deleted without breaking menu configurations
              </span>
            ) : (
              <span>
                ✓ This addon category is not in use and can be safely deleted
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary-500 px-6 text-sm font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:bg-primary-600 hover:shadow-primary-500/30 focus:outline-none focus:ring-4 focus:ring-primary-500/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
