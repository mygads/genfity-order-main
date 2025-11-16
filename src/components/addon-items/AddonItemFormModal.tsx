"use client";

import React from "react";

interface AddonCategory {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number | null;
}

interface AddonItemFormData {
  addonCategoryId: string;
  name: string;
  description: string;
  price: string;
  inputType: "SELECT" | "QTY";
  trackStock: boolean;
  stockQty: string;
  dailyStockTemplate: string;
  autoResetStock: boolean;
}

interface AddonItemFormModalProps {
  show: boolean;
  editingId: string | null;
  formData: AddonItemFormData;
  categories: AddonCategory[];
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onCancel: () => void;
}

export default function AddonItemFormModal({
  show,
  editingId,
  formData,
  categories,
  submitting,
  onSubmit,
  onChange,
  onCancel,
}: AddonItemFormModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900 max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {editingId ? "Edit Addon Item" : "Create New Addon Item"}
          </h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Addon Category <span className="text-error-500">*</span>
              </label>
              <select
                name="addonCategoryId"
                value={formData.addonCategoryId}
                onChange={onChange}
                required
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} (min: {cat.minSelection}, max: {cat.maxSelection || '∞'})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Item Name <span className="text-error-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={onChange}
                required
                placeholder="e.g., Extra Cheese, Large Size"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={onChange}
                rows={2}
                placeholder="Describe this addon item"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Price <span className="text-error-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={onChange}
                required
                min="0"
                step="0.01"
                placeholder="0"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter 0 for free addon items
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Input Type <span className="text-error-500">*</span>
              </label>
              <select
                name="inputType"
                value={formData.inputType}
                onChange={onChange}
                required
                className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="SELECT">SELECT - Single Choice (qty = 1)</option>
                <option value="QTY">QTY - Quantity Input (can select multiple)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formData.inputType === "SELECT" 
                    ? "Customer can only select or not select (0 or 1)"
                    : "Customer can input quantity (0 to max)"
                  }
                </p>
              </div>
            </div>          <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="trackStock"
                name="trackStock"
                checked={formData.trackStock}
                onChange={onChange}
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <label htmlFor="trackStock" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Track Stock Inventory
              </label>
            </div>

            {formData.trackStock && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    name="stockQty"
                    value={formData.stockQty}
                    onChange={onChange}
                    min="0"
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Current stock quantity available
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Daily Stock Template
                  </label>
                  <input
                    type="number"
                    name="dailyStockTemplate"
                    value={formData.dailyStockTemplate}
                    onChange={onChange}
                    min="0"
                    placeholder="e.g., 50"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Starting stock quantity for daily resets (optional)
                  </p>
                </div>

                {formData.dailyStockTemplate && (
                  <div className="flex items-center rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                    <input
                      type="checkbox"
                      id="autoResetStock"
                      name="autoResetStock"
                      checked={formData.autoResetStock}
                      onChange={onChange}
                      className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <label htmlFor="autoResetStock" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Auto Reset Stock Daily
                    </label>
                    <div className="ml-auto">
                      <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                )}
                {formData.autoResetStock && formData.dailyStockTemplate && (
                  <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      ℹ️ Stock will automatically reset to {formData.dailyStockTemplate} units daily
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-11 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingId ? "Update Item" : "Create Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
