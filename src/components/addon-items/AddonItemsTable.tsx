"use client";

import React from "react";

interface AddonCategory {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number | null;
}

interface AddonItem {
  id: string;
  addonCategoryId: string;
  name: string;
  description: string | null;
  price: string | number;
  inputType: "SELECT" | "QTY";
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
  lastStockResetAt: string | null;
  createdAt: string;
  addonCategory?: AddonCategory;
}

interface AddonItemsTableProps {
  items: AddonItem[];
  categories: AddonCategory[];
  currency: string;
  onEdit: (item: AddonItem) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string, name: string) => void;
}

export default function AddonItemsTable({
  items,
  categories,
  // currency prop is currently unused but kept for interface consistency
  currency: _currency,
  onEdit,
  onToggleActive,
  onDelete,
}: AddonItemsTableProps) {
  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === 0) return 'Free';
    return `A$${numPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getCategoryName = (item: AddonItem): string => {
    if (item.addonCategory?.name) return item.addonCategory.name;
    const category = categories.find(c => c.id === item.addonCategoryId);
    return category?.name || 'Unknown';
  };

  const getInputTypeLabel = (type: string): string => {
    return type === "SELECT" ? "Checkbox / Radio" : "Quantity (+/-)";
  };

  const getInputTypeBadgeColor = (type: string): string => {
    return type === "SELECT"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
      : "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
  };

  if (items.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No items match your filters
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-auto">
        <thead>
          <tr className="bg-gray-50 text-left dark:bg-gray-900/50">
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Name</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Category</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Type</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Price</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Stock</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Status</th>
            <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
              <td className="px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">{item.name}</p>
                  {item.description && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{item.description}</p>
                  )}
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                  {getCategoryName(item)}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getInputTypeBadgeColor(item.inputType)}`}>
                  {getInputTypeLabel(item.inputType)}
                </span>
              </td>
              <td className="px-4 py-4">
                <span className={`text-sm font-semibold ${formatPrice(item.price) === 'Free'
                    ? 'text-success-600 dark:text-success-400'
                    : 'text-gray-800 dark:text-white/90'
                  }`}>
                  {formatPrice(item.price)}
                </span>
              </td>
              <td className="px-4 py-4">
                {item.trackStock ? (
                  <div className="space-y-1.5">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${(item.stockQty || 0) > 10
                        ? 'bg-success-100 text-success-700 dark:bg-success-900/20 dark:text-success-400'
                        : (item.stockQty || 0) > 0
                          ? 'bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400'
                          : 'bg-error-100 text-error-700 dark:bg-error-900/20 dark:text-error-400'
                      }`}>
                      {item.stockQty || 0} pcs
                    </span>
                    {item.dailyStockTemplate !== null && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Template: {item.dailyStockTemplate}</span>
                      </div>
                    )}
                    {item.autoResetStock && (
                      <div className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Auto Reset
                      </div>
                    )}
                    {item.lastStockResetAt && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Reset: {new Date(item.lastStockResetAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    No tracking
                  </span>
                )}
              </td>
              <td className="px-4 py-4">
                <button
                  onClick={() => onToggleActive(item.id, item.isActive)}
                  className={`inline-flex cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${item.isActive
                      ? 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30'
                      : 'bg-error-100 text-error-700 hover:bg-error-200 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30'
                    }`}
                  title={item.isActive ? "Click to deactivate" : "Click to activate"}
                >
                  {item.isActive ? '● Active' : '○ Inactive'}
                </button>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    title="Edit"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => onDelete(item.id, item.name)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-error-200 bg-error-50 text-error-600 hover:bg-error-100 dark:border-error-900/50 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30"
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
  );
}
