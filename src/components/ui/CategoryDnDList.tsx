"use client";

import React, { useState } from 'react';
import { FaGripVertical, FaPencilAlt, FaTrash, FaEye, FaEyeSlash } from 'react-icons/fa';
import InlineEditField from './InlineEditField';

interface Category {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  sortOrder: number;
  isActive: boolean;
  _count?: {
    menuItems?: number;
    menus?: number;
  };
}

interface CategoryDnDListProps {
  categories: Category[];
  onReorder: (reorderedCategories: Category[]) => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string, categoryName: string) => void;
  onToggleActive: (categoryId: string, currentStatus: boolean, categoryName: string) => void;
  onManageMenus?: (category: Category) => void;
  onInlineUpdate?: (id: string, field: 'name' | 'description', value: string) => Promise<void>;
}

export default function CategoryDnDList({
  categories,
  onReorder,
  onEdit,
  onDelete,
  onToggleActive,
  onManageMenus,
  onInlineUpdate,
}: CategoryDnDListProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex === null || dragOverIndex === null || draggedIndex === dragOverIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...categories];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(dragOverIndex, 0, removed);

    // Update sortOrder for all items
    const updatedCategories = reordered.map((cat, idx) => ({
      ...cat,
      sortOrder: idx,
      displayOrder: idx + 1,
    }));

    onReorder(updatedCategories);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2">
      <div className="mb-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <FaGripVertical className="text-gray-400" />
        <span>Drag to reorder categories</span>
      </div>

      {categories.map((category, index) => (
        <div
          key={category.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`group relative flex items-center gap-3 rounded-lg border bg-white p-4 transition-all dark:bg-gray-800 ${
            draggedIndex === index
              ? 'border-brand-500 opacity-50 shadow-lg'
              : dragOverIndex === index
              ? 'border-brand-300 border-dashed'
              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
          }`}
        >
          {/* Drag Handle */}
          <div className="cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing dark:hover:text-gray-300">
            <FaGripVertical className="h-5 w-5" />
          </div>

          {/* Order Number */}
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            {category.sortOrder + 1}
          </div>

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {onInlineUpdate ? (
                <InlineEditField
                  value={category.name}
                  onSave={async (newValue: string | number) => {
                    const stringValue = String(newValue);
                    if (stringValue.trim() && stringValue !== category.name) {
                      await onInlineUpdate(category.id, 'name', stringValue);
                    }
                  }}
                  type="text"
                  className="text-sm font-semibold text-gray-800 dark:text-white/90"
                  displayClassName="truncate"
                />
              ) : (
                <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 truncate">
                  {category.name}
                </h4>
              )}
              {!category.isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-error-100 px-2 py-0.5 text-xs font-medium text-error-700 dark:bg-error-900/20 dark:text-error-400">
                  <FaEyeSlash className="h-3 w-3" />
                  Hidden
                </span>
              )}
            </div>
            {onInlineUpdate ? (
              <InlineEditField
                value={category.description || ''}
                onSave={async (newValue: string | number) => {
                  const stringValue = String(newValue);
                  if (stringValue !== (category.description || '')) {
                    await onInlineUpdate(category.id, 'description', stringValue);
                  }
                }}
                type="text"
                placeholder="Add description..."
                className="mt-1 text-xs text-gray-500 dark:text-gray-400"
                displayClassName="truncate"
              />
            ) : (
              category.description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                  {category.description}
                </p>
              )
            )}
            <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center gap-1">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {category._count?.menuItems || category._count?.menus || 0} items
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onToggleActive(category.id, category.isActive, category.name)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                category.isActive
                  ? 'bg-success-100 text-success-700 hover:bg-success-200 dark:bg-success-900/20 dark:text-success-400 dark:hover:bg-success-900/30'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
              }`}
              title={category.isActive ? 'Hide category' : 'Show category'}
            >
              {category.isActive ? <FaEye className="h-3.5 w-3.5" /> : <FaEyeSlash className="h-3.5 w-3.5" />}
            </button>

            {onManageMenus && (
              <button
                onClick={() => onManageMenus(category)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100 dark:border-brand-900/50 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/30"
                title="Manage menus"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </button>
            )}

            <button
              onClick={() => onEdit(category)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              title="Edit category"
            >
              <FaPencilAlt className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={() => onDelete(category.id, category.name)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-error-200 bg-error-50 text-error-600 hover:bg-error-100 dark:border-error-900/50 dark:bg-error-900/20 dark:text-error-400 dark:hover:bg-error-900/30"
              title="Delete category"
            >
              <FaTrash className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}

      {categories.length === 0 && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-800/50">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">No categories yet</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Create your first category to organize your menu</p>
        </div>
      )}
    </div>
  );
}
