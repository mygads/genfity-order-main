"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/context/ToastContext";
import { FaDownload, FaTrash, FaEdit, FaCheck, FaTimes, FaArrowLeft, FaSave, FaFileExcel, FaChevronDown, FaChevronUp, FaExclamationCircle, FaUpload, FaExclamationTriangle } from "react-icons/fa";
import * as XLSX from "xlsx";
import { useMerchant } from "@/context/MerchantContext";

interface MenuUploadItem {
  rowIndex: number;
  name: string;
  description: string;
  price: number;
  categoryNames: string; // Comma-separated category names
  selectedCategoryIds: string[]; // For multi-select
  isActive: boolean;
  isSpicy: boolean;
  isBestSeller: boolean;
  isSignature: boolean;
  isRecommended: boolean;
  trackStock: boolean;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
  errors: string[];       // Blocking errors
  warnings: string[];     // Non-blocking warnings
  isEditing: boolean;
  isExpanded: boolean; // For card expansion
  existingMenuId?: string; // If this matches an existing menu
}

interface Category {
  id: string;
  name: string;
}

/**
 * Menu Bulk Upload Page
 * 
 * Redesigned for better UX:
 * - Clean, professional card-based design
 * - Category select dropdown instead of text input
 * - Responsive table with horizontal scroll
 * - Better validation handling
 * - Expandable rows for editing
 */
export default function MenuBulkUploadPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const { currency: _currency } = useMerchant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<MenuUploadItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [_existingMenus, setExistingMenus] = useState<Array<{ id: string; name: string }>>([]);
  const [exporting, setExporting] = useState(false);

  /**
   * Fetch categories for validation
   */
  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch("/api/merchant/categories", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  }, []);

  /**
   * Fetch existing menus for duplicate detection
   */
  const fetchExistingMenus = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch("/api/merchant/menu?limit=1000", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setExistingMenus(data.data.map((m: { id: string; name: string }) => ({ id: m.id, name: m.name })));
        }
      }
    } catch (error) {
      console.error("Failed to fetch existing menus:", error);
    }
  }, []);

  // Fetch categories and existing menus on mount
  useEffect(() => {
    fetchCategories();
    fetchExistingMenus();
  }, [fetchCategories, fetchExistingMenus]);

  /**
   * Export current menu items to Excel for editing
   */
  const exportCurrentMenu = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/merchant/menu?limit=1000", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch menu items");
      }

      const data = await response.json();
      const menus = data.data || [];

      if (menus.length === 0) {
        showError("No menu items to export");
        return;
      }

      // Format for Excel export
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exportData = menus.map((menu: any) => ({
        "Name *": menu.name,
        "Description": menu.description || "",
        "Price *": Number(menu.price),
        "Categories (comma-separated)": menu.categories?.map((c: { category: { name: string } }) => c.category?.name).filter(Boolean).join(", ") || "",
        "Is Active": menu.isActive ? "Yes" : "No",
        "Is Spicy": menu.isSpicy ? "Yes" : "No",
        "Is Best Seller": menu.isBestSeller ? "Yes" : "No",
        "Is Signature": menu.isSignature ? "Yes" : "No",
        "Is Recommended": menu.isRecommended ? "Yes" : "No",
        "Track Stock": menu.trackStock ? "Yes" : "No",
        "Stock Qty": menu.stockQty || "",
        "Daily Stock Template": menu.dailyStockTemplate || "",
        "Auto Reset Stock": menu.autoResetStock ? "Yes" : "No",
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 25 }, { wch: 50 }, { wch: 12 }, { wch: 30 },
        { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 12 },
        { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 15 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Menu Items");
      XLSX.writeFile(wb, `menu_export_${new Date().toISOString().split('T')[0]}.xlsx`);

      showSuccess(`Exported ${menus.length} menu items`);
    } catch (error) {
      console.error("Failed to export menu:", error);
      showError(error instanceof Error ? error.message : "Failed to export menu");
    } finally {
      setExporting(false);
    }
  };

  /**
   * Generate and download Excel template
   */
  const downloadTemplate = () => {
    const templateData = [
      {
        "Name *": "Nasi Goreng Spesial",
        "Description": "Nasi goreng dengan telur, ayam, dan sayuran segar",
        "Price *": 25000,
        "Categories (comma-separated)": "Main Course, Rice",
        "Is Active": "Yes",
        "Is Spicy": "Yes",
        "Is Best Seller": "No",
        "Is Signature": "Yes",
        "Is Recommended": "No",
        "Track Stock": "Yes",
        "Stock Qty": 50,
        "Daily Stock Template": 50,
        "Auto Reset Stock": "Yes",
      },
      {
        "Name *": "Es Teh Manis",
        "Description": "Teh manis dingin segar",
        "Price *": 8000,
        "Categories (comma-separated)": "Beverages",
        "Is Active": "Yes",
        "Is Spicy": "No",
        "Is Best Seller": "Yes",
        "Is Signature": "No",
        "Is Recommended": "Yes",
        "Track Stock": "No",
        "Stock Qty": "",
        "Daily Stock Template": "",
        "Auto Reset Stock": "No",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Name
      { wch: 50 }, // Description
      { wch: 12 }, // Price
      { wch: 30 }, // Categories
      { wch: 10 }, // Is Active
      { wch: 10 }, // Is Spicy
      { wch: 15 }, // Is Best Seller
      { wch: 12 }, // Is Signature
      { wch: 15 }, // Is Recommended
      { wch: 12 }, // Track Stock
      { wch: 10 }, // Stock Qty
      { wch: 18 }, // Daily Stock Template
      { wch: 15 }, // Auto Reset Stock
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Menu Items");
    XLSX.writeFile(wb, "menu_upload_template.xlsx");
  };

  /**
   * Parse boolean value from Excel
   */
  const parseBoolean = (value: unknown): boolean => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const lower = value.toLowerCase().trim();
      return lower === "yes" || lower === "true" || lower === "1";
    }
    if (typeof value === "number") return value === 1;
    return false;
  };

  /**
   * Parse number value from Excel
   */
  const parseNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  };

  /**
   * Validate a single menu item - Only name and price are required
   * Returns errors (blocking) and warnings (non-blocking recommendations)
   */
  const validateItem = (item: MenuUploadItem): { errors: string[], warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required: Name
    if (!item.name || item.name.trim() === "") {
      errors.push("Name is required");
    }

    // Required: Price (must be valid number >= 0)
    if (item.price === null || item.price === undefined || isNaN(item.price) || item.price < 0) {
      errors.push("Valid price is required (must be >= 0)");
    }

    // Optional: Stock validation only when trackStock is enabled
    if (item.trackStock && item.stockQty !== null && item.stockQty < 0) {
      errors.push("Stock quantity cannot be negative");
    }

    // Warnings for optional but recommended fields
    if (!item.selectedCategoryIds || item.selectedCategoryIds.length === 0) {
      warnings.push("No category assigned - item may be hard to find");
    }

    if (!item.description || item.description.trim() === "") {
      warnings.push("No description - consider adding one");
    }

    return { errors, warnings };
  };

  /**
   * Map category names to IDs (helper function)
   */
  const mapCategoryNamesToIds = (categoryNames: string): string[] => {
    if (!categoryNames) return [];
    const nameList = categoryNames.split(",").map(c => c.trim().toLowerCase()).filter(c => c);
    const ids: string[] = [];
    for (const name of nameList) {
      const cat = categories.find(c => c.name.toLowerCase() === name);
      if (cat) {
        ids.push(cat.id);
      }
    }
    return ids;
  };

  /**
   * Handle file upload (drag & drop or click)
   */
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    // Validate file type
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      showError("Please upload an Excel file (.xlsx, .xls) or CSV file");
      return;
    }

    setUploading(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        showError("The uploaded file is empty");
        setUploading(false);
        return;
      }

      // Parse and validate data
      const parsedItems: MenuUploadItem[] = jsonData.map((row: unknown, index: number) => {
        const r = row as Record<string, unknown>;
        const categoryNames = String(r["Categories (comma-separated)"] || r["Categories"] || "").trim();
        const item: MenuUploadItem = {
          rowIndex: index + 2, // Excel rows start from 1, plus header row
          name: String(r["Name *"] || r["Name"] || "").trim(),
          description: String(r["Description"] || "").trim(),
          price: parseNumber(r["Price *"] || r["Price"]) || 0,
          categoryNames,
          selectedCategoryIds: [], // Will be populated after validation
          isActive: parseBoolean(r["Is Active"]),
          isSpicy: parseBoolean(r["Is Spicy"]),
          isBestSeller: parseBoolean(r["Is Best Seller"]),
          isSignature: parseBoolean(r["Is Signature"]),
          isRecommended: parseBoolean(r["Is Recommended"]),
          trackStock: parseBoolean(r["Track Stock"]),
          stockQty: parseNumber(r["Stock Qty"]),
          dailyStockTemplate: parseNumber(r["Daily Stock Template"]),
          autoResetStock: parseBoolean(r["Auto Reset Stock"]),
          errors: [],
          warnings: [],
          isEditing: false,
          isExpanded: false,
        };

        // Map category names to IDs
        item.selectedCategoryIds = mapCategoryNamesToIds(item.categoryNames);

        // Validate item
        const validation = validateItem(item);
        item.errors = validation.errors;
        item.warnings = validation.warnings;
        return item;
      });

      setItems(parsedItems);
      showSuccess(`Loaded ${parsedItems.length} items from file`);
    } catch (error) {
      console.error("Failed to parse file:", error);
      showError("Failed to parse the uploaded file. Please check the format.");
    } finally {
      setUploading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, showError, showSuccess]);

  /**
   * Handle drag events
   */
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  /**
   * Handle drop event
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  }, [handleFileUpload]);

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  /**
   * Toggle edit mode for an item
   */
  const toggleEdit = (index: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, isEditing: !item.isEditing, isExpanded: !item.isEditing ? true : item.isExpanded } : item
    ));
  };

  /**
   * Toggle expanded view for an item
   */
  const toggleExpanded = (index: number) => {
    setItems(prev => prev.map((item, i) =>
      i === index ? { ...item, isExpanded: !item.isExpanded } : item
    ));
  };

  /**
   * Update item field
   */
  const updateItem = (index: number, field: keyof MenuUploadItem, value: unknown) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;

      const updated = { ...item, [field]: value };

      // If updating selectedCategoryIds, also update categoryNames for display
      if (field === "selectedCategoryIds" && Array.isArray(value)) {
        const names = (value as string[])
          .map(id => categories.find(c => c.id === id)?.name)
          .filter(Boolean)
          .join(", ");
        updated.categoryNames = names;
      }

      const validation = validateItem(updated);
      updated.errors = validation.errors;
      updated.warnings = validation.warnings;
      return updated;
    }));
  };

  /**
   * Toggle category selection for an item
   */
  const toggleCategory = (index: number, categoryId: string) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;

      const currentIds = item.selectedCategoryIds || [];
      const newIds = currentIds.includes(categoryId)
        ? currentIds.filter(id => id !== categoryId)
        : [...currentIds, categoryId];

      const names = newIds
        .map(id => categories.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join(", ");

      const updated = { ...item, selectedCategoryIds: newIds, categoryNames: names };
      const validation = validateItem(updated);
      updated.errors = validation.errors;
      updated.warnings = validation.warnings;
      return updated;
    }));
  };

  /**
   * Remove item from list
   */
  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * Save all items to database
   */
  const handleSave = async () => {
    // Check for errors
    const itemsWithErrors = items.filter(item => item.errors.length > 0);
    if (itemsWithErrors.length > 0) {
      showError(`Please fix ${itemsWithErrors.length} item(s) with errors before saving`);
      return;
    }

    if (items.length === 0) {
      showError("No items to save");
      return;
    }

    setSaving(true);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      // Map category names to IDs (use selectedCategoryIds if available, fallback to categoryNames)
      const itemsWithCategoryIds = items.map(item => {
        // Use selectedCategoryIds directly if available, otherwise map from names
        const categoryIds = item.selectedCategoryIds.length > 0
          ? item.selectedCategoryIds
          : mapCategoryNamesToIds(item.categoryNames);

        return {
          name: item.name,
          description: item.description || undefined,
          price: item.price,
          categoryIds,
          isActive: item.isActive,
          isSpicy: item.isSpicy,
          isBestSeller: item.isBestSeller,
          isSignature: item.isSignature,
          isRecommended: item.isRecommended,
          trackStock: item.trackStock,
          stockQty: item.trackStock ? item.stockQty : null,
          dailyStockTemplate: item.trackStock ? item.dailyStockTemplate : null,
          autoResetStock: item.trackStock ? item.autoResetStock : false,
        };
      });

      const response = await fetch("/api/merchant/menu/bulk-upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: itemsWithCategoryIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save menu items");
      }

      showSuccess(`Successfully created ${data.createdCount} menu items!`);
      router.push("/admin/dashboard/menu");
    } catch (error) {
      console.error("Failed to save:", error);
      showError(error instanceof Error ? error.message : "Failed to save menu items");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Clear all items and reset
   */
  const handleClear = () => {
    setItems([]);
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Count items with errors and warnings
  const errorCount = items.filter(item => item.errors.length > 0).length;
  const warningCount = items.filter(item => item.warnings && item.warnings.length > 0).length;
  const validCount = items.length - errorCount;

  return (
    <div>
      <PageBreadcrumb
        pageTitle="Bulk Upload Menu"
        customItems={[
          { name: "Menu", path: "/admin/dashboard/menu" },
          { name: "Bulk Upload" },
        ]}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Bulk Upload Menu Items
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Download template, fill in your menu items, and upload to create multiple items at once
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/dashboard/menu")}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FaArrowLeft className="h-4 w-4" />
              Back to Menu
            </button>
          </div>
        </div>

        {/* Step 1: Download Template */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <span className="text-sm font-bold">1</span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">Download Template or Export Current Menu</h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Download a blank template or export your current menu items for editing. Re-upload to update existing items.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600"
                >
                  <FaDownload className="h-4 w-4" />
                  Download Template
                </button>
                <button
                  onClick={exportCurrentMenu}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-50 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-400"
                >
                  {exporting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <FaUpload className="h-4 w-4" />
                      Export Current Menu
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Upload File */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <span className="text-sm font-bold">2</span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">Upload Your File</h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Upload your filled Excel or CSV file. Supported formats: .xlsx, .xls, .csv
              </p>

              {/* Upload Zone */}
              <div
                className={`mt-4 relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragActive
                  ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                  : "border-gray-300 dark:border-gray-700"
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                    <FaFileExcel className="h-7 w-7 text-green-600" />
                  </div>

                  {fileName ? (
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">{fileName}</p>
                      <p className="text-sm text-gray-500">{items.length} items loaded</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-gray-700 dark:text-gray-300">
                        <span className="font-medium text-primary-600 dark:text-primary-400">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-sm text-gray-500">Excel or CSV file (max 10MB)</p>
                    </div>
                  )}

                  {uploading && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing file...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Preview & Edit */}
        {items.length > 0 && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                <span className="text-sm font-bold">3</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">Preview & Edit</h4>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Review your items, fix any errors, and save to create menu items
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-green-600">
                        <FaCheck className="h-3.5 w-3.5" />
                        {validCount} valid
                      </span>
                      {warningCount > 0 && (
                        <span className="flex items-center gap-1.5 text-amber-600">
                          <FaExclamationTriangle className="h-3.5 w-3.5" />
                          {warningCount} warnings
                        </span>
                      )}
                      {errorCount > 0 && (
                        <span className="flex items-center gap-1.5 text-red-600">
                          <FaTimes className="h-3.5 w-3.5" />
                          {errorCount} errors
                        </span>
                      )}
                    </div>

                    <button
                      onClick={handleClear}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <FaTimes className="h-4 w-4" />
                      Clear
                    </button>

                    <button
                      onClick={handleSave}
                      disabled={saving || errorCount > 0}
                      className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaSave className="h-4 w-4" />
                          Save {validCount} Items
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              {/* Table Header */}
              <div className="hidden lg:grid lg:grid-cols-12 gap-4 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                <div className="col-span-1">Row</div>
                <div className="col-span-3">Name</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-3">Categories</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item, index) => (
                  <div key={index} className={`${item.errors.length > 0 ? "bg-red-50/50 dark:bg-red-900/5" : ""}`}>
                    {/* Main Row */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center">
                      {/* Row Number */}
                      <div className="col-span-2 lg:col-span-1 text-sm text-gray-500 dark:text-gray-400">
                        #{item.rowIndex}
                      </div>

                      {/* Name */}
                      <div className="col-span-10 lg:col-span-3">
                        {item.isEditing ? (
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(index, "name", e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            placeholder="Menu name"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name || "-"}</span>
                        )}
                      </div>

                      {/* Price */}
                      <div className="col-span-4 lg:col-span-2">
                        {item.isEditing ? (
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(index, "price", Number(e.target.value))}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            min="0"
                            step="0.01"
                          />
                        ) : (
                          <span className="text-sm text-gray-600 dark:text-gray-400">{item.price?.toLocaleString() || "0"}</span>
                        )}
                      </div>

                      {/* Categories */}
                      <div className="col-span-4 lg:col-span-3">
                        <div className="flex flex-wrap gap-1">
                          {item.selectedCategoryIds.length > 0 ? (
                            item.selectedCategoryIds.slice(0, 2).map(catId => {
                              const cat = categories.find(c => c.id === catId);
                              return cat ? (
                                <span key={catId} className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                  {cat.name}
                                </span>
                              ) : null;
                            })
                          ) : item.categoryNames ? (
                            <span className="text-sm text-gray-500 dark:text-gray-400">{item.categoryNames}</span>
                          ) : (
                            <span className="text-sm text-gray-400 dark:text-gray-500">No category</span>
                          )}
                          {item.selectedCategoryIds.length > 2 && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                              +{item.selectedCategoryIds.length - 2}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="col-span-2 lg:col-span-2">
                        {item.errors.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                            <FaExclamationCircle className="h-3 w-3" />
                            {item.errors.length} error{item.errors.length > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                            <FaCheck className="h-3 w-3" />
                            Valid
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 lg:col-span-1 flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleExpanded(index)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                          title={item.isExpanded ? "Collapse" : "Expand"}
                        >
                          {item.isExpanded ? <FaChevronUp className="h-3 w-3" /> : <FaChevronDown className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => toggleEdit(index)}
                          className={`rounded-lg p-2 ${item.isEditing
                            ? "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                            : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            }`}
                          title={item.isEditing ? "Done" : "Edit"}
                        >
                          {item.isEditing ? <FaCheck className="h-3 w-3" /> : <FaEdit className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => removeItem(index)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                          title="Remove"
                        >
                          <FaTrash className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {(item.isExpanded || item.isEditing) && (
                      <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-4 dark:border-gray-800 dark:bg-gray-800/30">
                        {/* Error Messages */}
                        {item.errors.length > 0 && (
                          <div className="mb-4 rounded-lg bg-red-50 p-3 dark:bg-red-900/20">
                            <p className="text-sm font-medium text-red-700 dark:text-red-400">Please fix the following errors:</p>
                            <ul className="mt-1 list-inside list-disc text-sm text-red-600 dark:text-red-300">
                              {item.errors.map((err, i) => (
                                <li key={i}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {/* Description */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
                            {item.isEditing ? (
                              <textarea
                                value={item.description}
                                onChange={(e) => updateItem(index, "description", e.target.value)}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                rows={2}
                                placeholder="Optional description"
                              />
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">{item.description || "-"}</p>
                            )}
                          </div>

                          {/* Categories Selection */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Categories</label>
                            {item.isEditing ? (
                              <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-600 dark:bg-gray-800">
                                <div className="max-h-32 overflow-y-auto space-y-1">
                                  {categories.length === 0 ? (
                                    <p className="text-sm text-gray-400 py-1">No categories available</p>
                                  ) : (
                                    categories.map(cat => (
                                      <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 py-1">
                                        <input
                                          type="checkbox"
                                          checked={item.selectedCategoryIds.includes(cat.id)}
                                          onChange={() => toggleCategory(index, cat.id)}
                                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{cat.name}</span>
                                      </label>
                                    ))
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {item.selectedCategoryIds.length > 0
                                  ? item.selectedCategoryIds.map(id => categories.find(c => c.id === id)?.name).filter(Boolean).join(", ")
                                  : item.categoryNames || "-"
                                }
                              </p>
                            )}
                          </div>

                          {/* Flags */}
                          <div>
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Flags</label>
                            {item.isEditing ? (
                              <div className="space-y-2">
                                {[
                                  { key: "isActive", label: "Active" },
                                  { key: "isSpicy", label: "Spicy" },
                                  { key: "isBestSeller", label: "Best Seller" },
                                  { key: "isSignature", label: "Signature" },
                                  { key: "isRecommended", label: "Recommended" },
                                ].map(flag => (
                                  <label key={flag.key} className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={item[flag.key as keyof MenuUploadItem] as boolean}
                                      onChange={(e) => updateItem(index, flag.key as keyof MenuUploadItem, e.target.checked)}
                                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{flag.label}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {item.isActive && <span className="text-xs text-gray-600 dark:text-gray-400">Active</span>}
                                {item.isSpicy && <span className="text-xs text-gray-600 dark:text-gray-400">• Spicy</span>}
                                {item.isBestSeller && <span className="text-xs text-gray-600 dark:text-gray-400">• Best Seller</span>}
                                {item.isSignature && <span className="text-xs text-gray-600 dark:text-gray-400">• Signature</span>}
                                {item.isRecommended && <span className="text-xs text-gray-600 dark:text-gray-400">• Recommended</span>}
                                {!item.isActive && !item.isSpicy && !item.isBestSeller && !item.isSignature && !item.isRecommended && (
                                  <span className="text-xs text-gray-400">None</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Stock Settings */}
                          <div className="lg:col-span-3">
                            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">Stock Settings</label>
                            {item.isEditing ? (
                              <div className="flex flex-wrap items-center gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.trackStock}
                                    onChange={(e) => updateItem(index, "trackStock", e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                  />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">Track Stock</span>
                                </label>
                                {item.trackStock && (
                                  <>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-500">Qty:</span>
                                      <input
                                        type="number"
                                        value={item.stockQty ?? ""}
                                        onChange={(e) => updateItem(index, "stockQty", e.target.value ? Number(e.target.value) : null)}
                                        className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                        min="0"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-500">Daily Template:</span>
                                      <input
                                        type="number"
                                        value={item.dailyStockTemplate ?? ""}
                                        onChange={(e) => updateItem(index, "dailyStockTemplate", e.target.value ? Number(e.target.value) : null)}
                                        className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm focus:border-primary-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                        min="0"
                                      />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={item.autoResetStock}
                                        onChange={(e) => updateItem(index, "autoResetStock", e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
                                      />
                                      <span className="text-sm text-gray-700 dark:text-gray-300">Auto Reset</span>
                                    </label>
                                  </>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {item.trackStock
                                  ? `Stock: ${item.stockQty ?? 0} | Daily: ${item.dailyStockTemplate ?? "-"} | Auto Reset: ${item.autoResetStock ? "Yes" : "No"}`
                                  : "Not tracking stock"
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
