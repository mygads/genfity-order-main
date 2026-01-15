"use client";

import React from "react";

interface StockUpdateModalProps {
  show: boolean;
  itemName: string;
  currentStock: number;
  newStock: string;
  onStockChange: (value: string) => void;
  onUpdate: () => void;
  onClose: () => void;
}

export default function StockUpdateModal({
  show,
  itemName,
  currentStock,
  newStock,
  onStockChange,
  onUpdate,
  onClose,
}: StockUpdateModalProps) {
  if (!show) return null;

  const normalizedNewStock = String(newStock ?? '').trim();
  const isDirty = normalizedNewStock !== '' && normalizedNewStock !== String(currentStock);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (isDirty) return;
        onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Update Stock
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Item: <span className="font-medium text-gray-800 dark:text-white/90">{itemName}</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current Stock: <span className="font-medium text-gray-800 dark:text-white/90">{currentStock} pcs</span>
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              New Stock Quantity
            </label>
            <input
              type="number"
              value={newStock}
              onChange={(e) => onStockChange(e.target.value)}
              min="0"
              placeholder="0"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onUpdate}
              className="flex-1 h-11 rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600"
            >
              Update Stock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
