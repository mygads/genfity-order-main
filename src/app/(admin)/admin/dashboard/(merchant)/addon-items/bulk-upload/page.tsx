"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/context/ToastContext";
import { FaDownload, FaTrash, FaEdit, FaCheck, FaTimes, FaArrowLeft, FaSave, FaFileExcel, FaExclamationTriangle, FaUpload } from "react-icons/fa";
import * as XLSX from "xlsx";

interface AddonUploadItem {
  rowIndex: number;
  addonCategoryName: string;
  name: string;
  description: string;
  price: number;
  inputType: "SELECT" | "QTY";
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
  dailyStockTemplate: number | null;
  autoResetStock: boolean;
  displayOrder: number;
  errors: string[];
  warnings: string[];
  isEditing: boolean;
  existingAddonId?: string; // If this matches an existing addon
}

interface AddonCategory {
  id: string;
  name: string;
}

interface ExistingAddon {
  id: string;
  name: string;
  addonCategoryId: string;
}

/**
 * Addon Items Bulk Upload Page
 * 
 * Features:
 * 1. Download Excel template with correct columns
 * 2. Export current addon items for editing
 * 3. Upload filled Excel file
 * 4. Preview data with validation
 * 5. Edit items inline before saving
 * 6. Bulk save to database (create or update)
 * 7. Duplicate detection with confirmation
 */
export default function AddonItemsBulkUploadPage() {
  const router = useRouter();
  const { showSuccess, showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<AddonUploadItem[]>([]);
  const [categories, setCategories] = useState<AddonCategory[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [existingAddons, setExistingAddons] = useState<ExistingAddon[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  /**
   * Fetch addon categories for validation
   */
  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch("/api/merchant/addon-categories", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          setCategories(data.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch addon categories:", error);
    }
  }, []);

  /**
   * Fetch existing addon items for duplicate detection
   */
  const fetchExistingAddons = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetch("/api/merchant/addon-items?limit=1000", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setExistingAddons(data.data.map((a: any) => ({
            id: a.id,
            name: a.name,
            addonCategoryId: a.addonCategoryId,
          })));
        }
      }
    } catch (error) {
      console.error("Failed to fetch existing addons:", error);
    }
  }, []);

  // Fetch categories and existing addons on mount
  useEffect(() => {
    fetchCategories();
    fetchExistingAddons();
  }, [fetchCategories, fetchExistingAddons]);

  /**
   * Export current addon items to Excel for editing
   */
  const exportCurrentAddons = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      const response = await fetch("/api/merchant/addon-items?limit=1000", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch addon items");
      }

      const data = await response.json();
      const addons = data.data || [];

      if (addons.length === 0) {
        showError("No addon items to export");
        return;
      }

      // Format for Excel export - include ID for re-import/update
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exportData = addons.map((addon: any) => ({
        "ID (do not edit)": addon.id,
        "Addon Category Name *": addon.addonCategory?.name || "",
        "Name *": addon.name,
        "Description": addon.description || "",
        "Price *": Number(addon.price),
        "Input Type (SELECT/QTY)": addon.inputType,
        "Is Active": addon.isActive ? "Yes" : "No",
        "Track Stock": addon.trackStock ? "Yes" : "No",
        "Stock Qty": addon.stockQty || "",
        "Daily Stock Template": addon.dailyStockTemplate || "",
        "Auto Reset Stock": addon.autoResetStock ? "Yes" : "No",
        "Display Order": addon.displayOrder || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 12 }, // ID
        { wch: 25 }, // Addon Category Name
        { wch: 20 }, // Name
        { wch: 30 }, // Description
        { wch: 10 }, // Price
        { wch: 22 }, // Input Type
        { wch: 10 }, // Is Active
        { wch: 12 }, // Track Stock
        { wch: 10 }, // Stock Qty
        { wch: 18 }, // Daily Stock Template
        { wch: 15 }, // Auto Reset Stock
        { wch: 12 }, // Display Order
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Addon Items");
      XLSX.writeFile(wb, `addon_items_export_${new Date().toISOString().split('T')[0]}.xlsx`);

      showSuccess(`Exported ${addons.length} addon items`);
    } catch (error) {
      console.error("Failed to export addons:", error);
      showError(error instanceof Error ? error.message : "Failed to export addon items");
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
        "Addon Category Name *": "Toppings",
        "Name *": "Extra Cheese",
        "Description": "Melted mozzarella cheese",
        "Price *": 5000,
        "Input Type (SELECT/QTY)": "SELECT",
        "Is Active": "Yes",
        "Track Stock": "No",
        "Stock Qty": "",
        "Daily Stock Template": "",
        "Auto Reset Stock": "No",
        "Display Order": 1,
      },
      {
        "Addon Category Name *": "Toppings",
        "Name *": "Bacon Bits",
        "Description": "Crispy bacon bits",
        "Price *": 8000,
        "Input Type (SELECT/QTY)": "SELECT",
        "Is Active": "Yes",
        "Track Stock": "Yes",
        "Stock Qty": 100,
        "Daily Stock Template": 100,
        "Auto Reset Stock": "Yes",
        "Display Order": 2,
      },
      {
        "Addon Category Name *": "Spice Level",
        "Name *": "Extra Hot",
        "Description": "Very spicy",
        "Price *": 0,
        "Input Type (SELECT/QTY)": "SELECT",
        "Is Active": "Yes",
        "Track Stock": "No",
        "Stock Qty": "",
        "Daily Stock Template": "",
        "Auto Reset Stock": "No",
        "Display Order": 1,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Addon Category Name
      { wch: 20 }, // Name
      { wch: 30 }, // Description
      { wch: 10 }, // Price
      { wch: 22 }, // Input Type
      { wch: 10 }, // Is Active
      { wch: 12 }, // Track Stock
      { wch: 10 }, // Stock Qty
      { wch: 18 }, // Daily Stock Template
      { wch: 15 }, // Auto Reset Stock
      { wch: 12 }, // Display Order
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Addon Items");
    XLSX.writeFile(wb, "addon_items_upload_template.xlsx");
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
   * Parse input type from Excel
   */
  const parseInputType = (value: unknown): "SELECT" | "QTY" => {
    if (typeof value === "string") {
      const upper = value.toUpperCase().trim();
      if (upper === "QTY" || upper === "QUANTITY") return "QTY";
    }
    return "SELECT";
  };

  /**
   * Validate a single addon item - Returns errors and warnings
   */
  const validateItem = (item: AddonUploadItem): { errors: string[], warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!item.addonCategoryName || item.addonCategoryName.trim() === "") {
      errors.push("Addon Category Name is required");
    } else {
      // Check if category exists
      const categoryExists = categories.some(
        c => c.name.toLowerCase() === item.addonCategoryName.toLowerCase()
      );
      if (!categoryExists) {
        errors.push(`Addon Category "${item.addonCategoryName}" not found`);
      }
    }

    if (!item.name || item.name.trim() === "") {
      errors.push("Name is required");
    }

    if (item.price === null || item.price === undefined || isNaN(item.price) || item.price < 0) {
      errors.push("Valid price is required (must be >= 0)");
    }

    if (item.trackStock && (item.stockQty === null || item.stockQty < 0)) {
      errors.push("Stock quantity is required when tracking stock");
    }

    // Warnings for optional fields
    if (!item.description || item.description.trim() === "") {
      warnings.push("No description - consider adding one");
    }

    return { errors, warnings };
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

      // Build lookup map for existing addons by name + category combo
      const existingAddonMap = new Map(
        existingAddons.map(a => {
          const cat = categories.find(c => c.id === a.addonCategoryId);
          const key = `${a.name.toLowerCase().trim()}::${cat?.name?.toLowerCase().trim() || ''}`;
          return [key, a.id];
        })
      );

      // Parse and validate data
      const parsedItems: AddonUploadItem[] = jsonData.map((row: unknown, index: number) => {
        const r = row as Record<string, unknown>;
        
        // Extract ID if present (from exported file)
        const addonId = r["ID (do not edit)"] ? String(r["ID (do not edit)"]).trim() : undefined;
        
        const item: AddonUploadItem = {
          rowIndex: index + 2, // Excel rows start from 1, plus header row
          addonCategoryName: String(r["Addon Category Name *"] || r["Addon Category Name"] || r["Category"] || "").trim(),
          name: String(r["Name *"] || r["Name"] || "").trim(),
          description: String(r["Description"] || "").trim(),
          price: parseNumber(r["Price *"] || r["Price"]) || 0,
          inputType: parseInputType(r["Input Type (SELECT/QTY)"] || r["Input Type"]),
          isActive: parseBoolean(r["Is Active"]),
          trackStock: parseBoolean(r["Track Stock"]),
          stockQty: parseNumber(r["Stock Qty"]),
          dailyStockTemplate: parseNumber(r["Daily Stock Template"]),
          autoResetStock: parseBoolean(r["Auto Reset Stock"]),
          displayOrder: parseNumber(r["Display Order"]) || 0,
          errors: [],
          warnings: [],
          isEditing: false,
          existingAddonId: addonId,
        };

        // Check for existing addon by ID or name+category
        if (addonId) {
          item.existingAddonId = addonId;
        } else {
          // Try to match by name + category
          const lookupKey = `${item.name.toLowerCase().trim()}::${item.addonCategoryName.toLowerCase().trim()}`;
          const matchedId = existingAddonMap.get(lookupKey);
          if (matchedId) {
            item.existingAddonId = matchedId;
          }
        }

        // Validate item
        const validation = validateItem(item);
        item.errors = validation.errors;
        item.warnings = validation.warnings;

        // Add warning if this will update existing addon
        if (item.existingAddonId && !item.warnings.includes("Will update existing addon")) {
          item.warnings.push("Will update existing addon");
        }

        return item;
      });

      // Calculate duplicate and new counts
      const dupes = parsedItems.filter(i => i.existingAddonId).length;
      const news = parsedItems.length - dupes;
      setDuplicateCount(dupes);
      setNewCount(news);

      setItems(parsedItems);

      if (dupes > 0) {
        showSuccess(`Loaded ${parsedItems.length} items (${dupes} will update existing, ${news} are new)`);
      } else {
        showSuccess(`Loaded ${parsedItems.length} items from file`);
      }
    } catch (error) {
      console.error("Failed to parse file:", error);
      showError("Failed to parse the uploaded file. Please check the format.");
    } finally {
      setUploading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, existingAddons, showError, showSuccess]);

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
      i === index ? { ...item, isEditing: !item.isEditing } : item
    ));
  };

  /**
   * Update item field
   */
  const updateItem = (index: number, field: keyof AddonUploadItem, value: unknown) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      
      const updated = { ...item, [field]: value };
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

    // If there are duplicates and confirmation not shown yet, show dialog
    if (duplicateCount > 0 && !showConfirmDialog) {
      setShowConfirmDialog(true);
      return;
    }

    setSaving(true);
    setShowConfirmDialog(false);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/admin/login");
        return;
      }

      // Map category names to IDs
      const itemsWithCategoryIds = items.map(item => {
        const category = categories.find(c => c.name.toLowerCase() === item.addonCategoryName.toLowerCase());

        return {
          id: item.existingAddonId || undefined, // Include ID for updates
          addonCategoryId: category?.id || "",
          name: item.name,
          description: item.description,
          price: item.price,
          inputType: item.inputType,
          isActive: item.isActive,
          trackStock: item.trackStock,
          stockQty: item.stockQty,
          dailyStockTemplate: item.dailyStockTemplate,
          autoResetStock: item.autoResetStock,
          displayOrder: item.displayOrder,
        };
      });

      const response = await fetch("/api/merchant/addon-items/bulk-upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: itemsWithCategoryIds, upsertByName: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save addon items");
      }

      // Show appropriate success message
      const created = data.createdCount || 0;
      const updated = data.updatedCount || 0;
      if (updated > 0 && created > 0) {
        showSuccess(`Successfully created ${created} and updated ${updated} addon items!`);
      } else if (updated > 0) {
        showSuccess(`Successfully updated ${updated} addon items!`);
      } else {
        showSuccess(`Successfully created ${created} addon items!`);
      }
      router.push("/admin/dashboard/addon-items");
    } catch (error) {
      console.error("Failed to save:", error);
      showError(error instanceof Error ? error.message : "Failed to save addon items");
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
    setDuplicateCount(0);
    setNewCount(0);
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
        pageTitle="Bulk Upload Addon Items"
        customItems={[
          { name: "Addon Items", path: "/admin/dashboard/addon-items" },
          { name: "Bulk Upload" },
        ]}
      />

      {/* Confirmation Dialog for Duplicates */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowConfirmDialog(false)} />
          <div className="relative z-[250] w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="flex items-center gap-3 text-amber-600">
              <FaExclamationTriangle className="h-6 w-6" />
              <h3 className="text-lg font-semibold">Confirm Update</h3>
            </div>
            <p className="mt-3 text-gray-600 dark:text-gray-400">
              {duplicateCount} addon item(s) will be <strong>updated</strong> (existing items with the same name in the same category).
              {newCount > 0 && ` ${newCount} new item(s) will be created.`}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-500">
              Are you sure you want to continue?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
              >
                Yes, Update {duplicateCount} Item(s)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Bulk Upload Addon Items
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Download template or export current addons, edit, and upload to create or update multiple items at once
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/dashboard/addon-items")}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <FaArrowLeft className="h-4 w-4" />
              Back to Addon Items
            </button>
          </div>
        </div>

        {/* Step 1: Download Template or Export */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              <span className="text-sm font-bold">1</span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">Download Template or Export Current Addons</h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Download a blank template or export your current addon items for editing. Re-upload to update existing items.
              </p>
              <div className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                <strong>Note:</strong> Addon Category names must match existing categories exactly.
                {categories.length > 0 && (
                  <span className="ml-1">
                    Available: {categories.map(c => c.name).join(", ")}
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600"
                >
                  <FaDownload className="h-4 w-4" />
                  Download Template
                </button>
                <button
                  onClick={exportCurrentAddons}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
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
                      Export Current Addons
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
                className={`mt-4 relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  dragActive
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
                      Review your items, fix any errors, and save to create or update addon items
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1.5 text-green-600">
                        <FaCheck className="h-3.5 w-3.5" />
                        {validCount} valid
                      </span>
                      {errorCount > 0 && (
                        <span className="flex items-center gap-1.5 text-red-600">
                          <FaTimes className="h-3.5 w-3.5" />
                          {errorCount} errors
                        </span>
                      )}
                      {warningCount > 0 && (
                        <span className="flex items-center gap-1.5 text-amber-600">
                          <FaExclamationTriangle className="h-3.5 w-3.5" />
                          {warningCount} warnings
                        </span>
                      )}
                      {duplicateCount > 0 && (
                        <span className="flex items-center gap-1.5 text-blue-600">
                          {duplicateCount} updates
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
                          {duplicateCount > 0 ? `Save (${newCount} new, ${duplicateCount} update)` : `Save ${validCount} Items`}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Row</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Category</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Name</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Price</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Type</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Stock</th>
                    <th className="pb-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Status</th>
                    <th className="pb-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {items.map((item, index) => (
                    <tr key={index} className={item.errors.length > 0 ? "bg-red-50 dark:bg-red-900/10" : ""}>
                      <td className="py-3 text-sm text-gray-600 dark:text-gray-400">
                        {item.rowIndex}
                      </td>
                      <td className="py-3">
                        {item.isEditing ? (
                          <select
                            value={item.addonCategoryName}
                            onChange={(e) => updateItem(index, "addonCategoryName", e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          >
                            <option value="">Select Category</option>
                            {categories.map(cat => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-gray-600 dark:text-gray-400">{item.addonCategoryName || "-"}</span>
                        )}
                      </td>
                      <td className="py-3">
                        {item.isEditing ? (
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(index, "name", e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        ) : (
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{item.name || "-"}</span>
                        )}
                      </td>
                      <td className="py-3">
                        {item.isEditing ? (
                          <input
                            type="number"
                            value={item.price}
                            onChange={(e) => updateItem(index, "price", Number(e.target.value))}
                            className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          />
                        ) : (
                          <span className="text-sm text-gray-600 dark:text-gray-400">{item.price?.toLocaleString() || "0"}</span>
                        )}
                      </td>
                      <td className="py-3">
                        {item.isEditing ? (
                          <select
                            value={item.inputType}
                            onChange={(e) => updateItem(index, "inputType", e.target.value)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          >
                            <option value="SELECT">SELECT</option>
                            <option value="QTY">QTY</option>
                          </select>
                        ) : (
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.inputType === "QTY"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                          }`}>
                            {item.inputType}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {item.trackStock ? `${item.stockQty ?? 0}` : "-"}
                        </span>
                      </td>
                      <td className="py-3">
                        {item.errors.length > 0 ? (
                          <div className="group relative">
                            <span className="flex items-center gap-1 text-xs text-red-600">
                              <FaTimes className="h-3 w-3" />
                              {item.errors.length} error{item.errors.length > 1 ? "s" : ""}
                            </span>
                            <div className="absolute left-0 top-full z-10 mt-1 hidden w-64 rounded-lg bg-red-600 p-2 text-xs text-white shadow-lg group-hover:block">
                              <ul className="list-disc pl-4 space-y-1">
                                {item.errors.map((err, i) => (
                                  <li key={i}>{err}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <FaCheck className="h-3 w-3" />
                            Valid
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleEdit(index)}
                            className={`rounded-lg p-2 text-sm ${
                              item.isEditing
                                ? "bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400"
                                : "text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            }`}
                            title={item.isEditing ? "Done editing" : "Edit"}
                          >
                            {item.isEditing ? <FaCheck className="h-4 w-4" /> : <FaEdit className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => removeItem(index)}
                            className="rounded-lg p-2 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                            title="Remove"
                          >
                            <FaTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
