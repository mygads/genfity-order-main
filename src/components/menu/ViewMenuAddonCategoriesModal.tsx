"use client";

import React, { useState } from "react";

interface AddonItem {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  inputType: string;
  isActive: boolean;
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
  addonItems: AddonItem[];
}

interface MenuAddonCategory {
  addonCategoryId: string;
  isRequired: boolean;
  displayOrder: number;
  addonCategory: AddonCategory;
}

interface ViewMenuAddonCategoriesModalProps {
  show: boolean;
  menuName: string;
  addonCategories: MenuAddonCategory[];
  currency: string;
  onClose: () => void;
}

export default function ViewMenuAddonCategoriesModal({
  show,
  menuName,
  addonCategories,
  currency,
  onClose,
}: ViewMenuAddonCategoriesModalProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  if (!show) return null;

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === "string" ? parseFloat(price) : price;
    return `${currency} ${numPrice.toLocaleString("en-AU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Sort by displayOrder
  const sortedCategories = [...addonCategories].sort((a, b) => {
    const orderA = a.displayOrder ?? 999;
    const orderB = b.displayOrder ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.addonCategory.name.localeCompare(b.addonCategory.name);
  });

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        onClose();
      }}
    >
      <div className="flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Addon Categories
            </h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {menuName} • {addonCategories.length} {addonCategories.length === 1 ? 'category' : 'categories'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {sortedCategories.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No addon categories linked
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map((mac, index) => {
                const isExpanded = expandedCategory === mac.addonCategoryId;
                const sortedItems = [...(mac.addonCategory.addonItems || [])].sort((a, b) => {
                  const orderA = a.displayOrder ?? 999;
                  const orderB = b.displayOrder ?? 999;
                  if (orderA !== orderB) return orderA - orderB;
                  return a.name.localeCompare(b.name);
                });

                return (
                  <div
                    key={mac.addonCategoryId}
                    className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/50"
                  >
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(mac.addonCategoryId)}
                      className="w-full p-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-900/20 dark:text-brand-400">
                              {index + 1}
                            </span>
                            <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                              {mac.addonCategory.name}
                            </h4>
                            {mac.isRequired && (
                              <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/20 dark:text-red-400">
                                Required
                              </span>
                            )}
                          </div>
                          {mac.addonCategory.description && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                              {mac.addonCategory.description}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                            <span>Min: {mac.addonCategory.minSelection}</span>
                            <span>Max: {mac.addonCategory.maxSelection || '∞'}</span>
                            <span className="font-medium text-brand-600 dark:text-brand-400">
                              {sortedItems.length} items
                            </span>
                          </div>
                        </div>
                        <svg
                          className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded Items */}
                    {isExpanded && sortedItems.length > 0 && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 text-left dark:border-gray-700">
                                <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                                  #
                                </th>
                                <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                                  Name
                                </th>
                                <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                                  Type
                                </th>
                                <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                                  Price
                                </th>
                                <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                                  Stock
                                </th>
                                <th className="px-3 py-2 text-xs font-semibold uppercase text-gray-600 dark:text-gray-400">
                                  Status
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {sortedItems.map((item, itemIndex) => (
                                <tr key={item.id} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                                  <td className="px-3 py-2.5 text-xs text-gray-500 dark:text-gray-400">
                                    {itemIndex + 1}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {item.name}
                                    </p>
                                    {item.description && (
                                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                        {item.description}
                                      </p>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                      item.inputType === "SELECT"
                                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400"
                                    }`}>
                                      {item.inputType === "SELECT" ? "Select" : "Quantity"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                      {formatPrice(item.price)}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2.5">
                                    {item.trackStock ? (
                                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                        (item.stockQty || 0) > 10
                                          ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                                          : (item.stockQty || 0) > 0
                                          ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400'
                                          : 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-400'
                                      }`}>
                                        {item.stockQty || 0}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400 dark:text-gray-500">-</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2.5">
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                      item.isActive 
                                        ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400' 
                                        : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                                    }`}>
                                      {item.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {isExpanded && sortedItems.length === 0 && (
                      <div className="border-t border-gray-200 p-4 text-center dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No items
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 dark:border-gray-800">
          <button
            onClick={onClose}
            className="h-10 w-full rounded-lg bg-brand-500 text-sm font-medium text-white transition-colors hover:bg-brand-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
