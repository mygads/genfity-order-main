"use client";

import React from "react";
import { FaEdit, FaTrash } from "react-icons/fa";
import { TableActionButton } from "@/components/common/TableActionButton";

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
  currency,
  onEdit,
  onToggleActive,
  onDelete,
}: AddonItemsTableProps) {
  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === 0) return 'Free';

    const currencyCode = currency || 'AUD';
    try {
      return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(numPrice);
    } catch {
      return `${numPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const getCategoryName = (item: AddonItem): string => {
    if (item.addonCategory?.name) return item.addonCategory.name;
    const category = categories.find(c => c.id === item.addonCategoryId);
    return category?.name || 'Unknown';
  };

  const getInputTypeLabel = (item: AddonItem): string => {
    const category = item.addonCategory || categories.find(c => c.id === item.addonCategoryId);
    if (!category) return item.inputType === "SELECT" ? "Selection" : "Quantity (+/-)";
    const max = category.maxSelection;
    if (item.inputType === "QTY") return "Quantity (+/-)";
    return max === 1 ? "Radio" : "Checkbox";
  };

  const getInputTypeBadgeColor = (item: AddonItem): string => {
    const category = item.addonCategory || categories.find(c => c.id === item.addonCategoryId);
    if (item.inputType === "QTY") return "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400";
    const max = category?.maxSelection;
    return max === 1
      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400"
      : "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400";
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
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getInputTypeBadgeColor(item)}`}>
                  {getInputTypeLabel(item)}
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
                  <TableActionButton
                    icon={FaEdit}
                    onClick={() => onEdit(item)}
                    title="Edit"
                    aria-label="Edit"
                  />
                  <TableActionButton
                    icon={FaTrash}
                    tone="danger"
                    onClick={() => onDelete(item.id, item.name)}
                    title="Delete"
                    aria-label="Delete"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
