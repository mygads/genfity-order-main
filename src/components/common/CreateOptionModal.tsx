"use client";

import React from "react";
import { FaFileUpload, FaPlus, FaTimes } from "react-icons/fa";

interface CreateOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  onSingleCreate: () => void;
  onBulkUpload: () => void;
  singleCreateLabel?: string;
  bulkUploadLabel?: string;
}

/**
 * CreateOptionModal - Modal for choosing between single create or bulk upload
 * 
 * @specification copilot-instructions.md - UI/UX Standards
 * Shows 2 options when user clicks Create button:
 * 1. Single Create - Opens normal create form/page
 * 2. Bulk Upload - Opens bulk upload page with template download
 */
export default function CreateOptionModal({
  isOpen,
  onClose,
  title,
  description = "Choose how you want to add items",
  onSingleCreate,
  onBulkUpload,
  singleCreateLabel = "Create Single",
  bulkUploadLabel = "Bulk Upload",
}: CreateOptionModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-4">
            {/* Single Create Option */}
            <button
              onClick={() => {
                onClose();
                onSingleCreate();
              }}
              className="group flex items-center gap-4 rounded-xl border-2 border-gray-200 p-5 transition-all hover:border-primary-500 hover:bg-primary-50 dark:border-gray-700 dark:hover:border-primary-500 dark:hover:bg-primary-900/20"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 group-hover:bg-primary-500 group-hover:text-white dark:bg-primary-900/30 dark:text-primary-400">
                <FaPlus className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {singleCreateLabel}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Add items one by one with full customization
                </p>
              </div>
              <svg
                className="h-5 w-5 text-gray-400 group-hover:text-primary-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            {/* Bulk Upload Option */}
            <button
              onClick={() => {
                onClose();
                onBulkUpload();
              }}
              className="group flex items-center gap-4 rounded-xl border-2 border-gray-200 p-5 transition-all hover:border-green-500 hover:bg-green-50 dark:border-gray-700 dark:hover:border-green-500 dark:hover:bg-green-900/20"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600 group-hover:bg-green-500 group-hover:text-white dark:bg-green-900/30 dark:text-green-400">
                <FaFileUpload className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {bulkUploadLabel}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Import multiple items from Excel/CSV file
                </p>
              </div>
              <svg
                className="h-5 w-5 text-gray-400 group-hover:text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
