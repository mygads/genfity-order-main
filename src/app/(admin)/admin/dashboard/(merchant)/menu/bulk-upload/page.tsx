"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { useToast } from "@/context/ToastContext";
import { TableActionButton } from "@/components/common/TableActionButton";
import { StatusToggle } from "@/components/common/StatusToggle";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { FaDownload, FaTrash, FaEdit, FaCheck, FaTimes, FaArrowLeft, FaSave, FaFileExcel, FaChevronDown, FaChevronUp, FaExclamationCircle, FaUpload, FaExclamationTriangle } from "react-icons/fa";
import * as XLSX from "xlsx";
import { useMerchant } from "@/context/MerchantContext";
import { fetchMerchantApi } from "@/lib/utils/orderApiClient";

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
  action: "new" | "update" | "unchanged";
  changedFields: string[];
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
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const { currency: _currency } = useMerchant();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<MenuUploadItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  type ExistingMenu = {
    id: string;
    name: string;
    description?: string | null;
    price?: number | string;
    isActive?: boolean;
    isSpicy?: boolean;
    isBestSeller?: boolean;
    isSignature?: boolean;
    isRecommended?: boolean;
    trackStock?: boolean;
    stockQty?: number | null;
    dailyStockTemplate?: number | null;
    autoResetStock?: boolean;
    categories?: Array<{ category?: { name?: string | null } | null }>;
    category?: { name?: string | null } | null;
  };

  const [existingMenus, setExistingMenus] = useState<ExistingMenu[]>([]);
  const [exporting, setExporting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const focusRow = (rowIndex: number) => {
    setItems((prev) => prev.map((it) => (it.rowIndex === rowIndex ? { ...it, isExpanded: true } : it)));
    setTimeout(() => {
      const el = document.getElementById(`menu-upload-row-${rowIndex}`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const normalizeText = (value: unknown): string => String(value ?? "").trim();

  const normalizeNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const parseBooleanWithDefault = (value: unknown, defaultValue: boolean): boolean => {
    if (value === null || value === undefined || value === "") return defaultValue;
    return parseBoolean(value);
  };

  const parseCategoryNames = (categoryNames: string): string[] => {
    if (!categoryNames) return [];
    return categoryNames
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
  };

  const getCategoryNameById = (categoryId: string): string | null => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || null;
  };

  const getNormalizedCategorySetForItem = (item: MenuUploadItem): string[] => {
    const names = (item.selectedCategoryIds.length > 0
      ? item.selectedCategoryIds.map((id) => getCategoryNameById(id)).filter(Boolean)
      : parseCategoryNames(item.categoryNames)) as string[];

    return names.map((n) => n.toLowerCase().trim()).filter(Boolean).sort();
  };

  const getNormalizedCategorySetForExisting = (menu: ExistingMenu): string[] => {
    const fromManyToMany = Array.isArray(menu.categories)
      ? menu.categories
          .map((c) => c?.category?.name)
          .filter(Boolean)
      : [];

    const fromSingle = menu.category?.name ? [menu.category.name] : [];
    const names = [...fromManyToMany, ...fromSingle].filter(Boolean) as string[];
    return names.map((n) => n.toLowerCase().trim()).filter(Boolean).sort();
  };

  const normalizeComparable = (params: {
    name: string;
    description: string | null;
    price: number;
    isActive: boolean;
    isSpicy: boolean;
    isBestSeller: boolean;
    isSignature: boolean;
    isRecommended: boolean;
    trackStock: boolean;
    stockQty: number | null;
    dailyStockTemplate: number | null;
    autoResetStock: boolean;
    categoryNamesSorted: string[];
  }) => {
    return {
      name: normalizeText(params.name),
      description: normalizeText(params.description ?? ""),
      price: Number(params.price),
      isActive: Boolean(params.isActive),
      isSpicy: Boolean(params.isSpicy),
      isBestSeller: Boolean(params.isBestSeller),
      isSignature: Boolean(params.isSignature),
      isRecommended: Boolean(params.isRecommended),
      trackStock: Boolean(params.trackStock),
      stockQty: params.trackStock ? (params.stockQty ?? 0) : null,
      dailyStockTemplate: params.trackStock ? (params.dailyStockTemplate ?? null) : null,
      autoResetStock: params.trackStock ? Boolean(params.autoResetStock) : false,
      categoryNamesSorted: params.categoryNamesSorted,
    };
  };

  const computeActionAndChanges = (item: MenuUploadItem): { action: MenuUploadItem["action"]; changedFields: string[] } => {
    if (!item.existingMenuId) return { action: "new", changedFields: [] };
    const existing = existingMenus.find((m) => m.id === item.existingMenuId);
    if (!existing) return { action: "update", changedFields: ["id"] };

    const existingComparable = normalizeComparable({
      name: existing.name,
      description: existing.description ?? null,
      price: Number(existing.price ?? 0),
      isActive: existing.isActive !== false,
      isSpicy: Boolean(existing.isSpicy),
      isBestSeller: Boolean(existing.isBestSeller),
      isSignature: Boolean(existing.isSignature),
      isRecommended: Boolean(existing.isRecommended),
      trackStock: Boolean(existing.trackStock),
      stockQty: existing.stockQty ?? null,
      dailyStockTemplate: existing.dailyStockTemplate ?? null,
      autoResetStock: Boolean(existing.autoResetStock),
      categoryNamesSorted: getNormalizedCategorySetForExisting(existing),
    });

    const itemComparable = normalizeComparable({
      name: item.name,
      description: item.description,
      price: item.price,
      isActive: item.isActive,
      isSpicy: item.isSpicy,
      isBestSeller: item.isBestSeller,
      isSignature: item.isSignature,
      isRecommended: item.isRecommended,
      trackStock: item.trackStock,
      stockQty: item.stockQty,
      dailyStockTemplate: item.dailyStockTemplate,
      autoResetStock: item.autoResetStock,
      categoryNamesSorted: getNormalizedCategorySetForItem(item),
    });

    const changedFields: string[] = [];
    if (existingComparable.name !== itemComparable.name) changedFields.push("name");
    if (existingComparable.description !== itemComparable.description) changedFields.push("description");
    if (existingComparable.price !== itemComparable.price) changedFields.push("price");
    if (existingComparable.isActive !== itemComparable.isActive) changedFields.push("isActive");
    if (existingComparable.isSpicy !== itemComparable.isSpicy) changedFields.push("isSpicy");
    if (existingComparable.isBestSeller !== itemComparable.isBestSeller) changedFields.push("isBestSeller");
    if (existingComparable.isSignature !== itemComparable.isSignature) changedFields.push("isSignature");
    if (existingComparable.isRecommended !== itemComparable.isRecommended) changedFields.push("isRecommended");
    if (existingComparable.trackStock !== itemComparable.trackStock) changedFields.push("trackStock");
    if ((existingComparable.stockQty ?? null) !== (itemComparable.stockQty ?? null)) changedFields.push("stockQty");
    if ((existingComparable.dailyStockTemplate ?? null) !== (itemComparable.dailyStockTemplate ?? null)) changedFields.push("dailyStockTemplate");
    if (existingComparable.autoResetStock !== itemComparable.autoResetStock) changedFields.push("autoResetStock");
    if (JSON.stringify(existingComparable.categoryNamesSorted) !== JSON.stringify(itemComparable.categoryNamesSorted)) changedFields.push("categories");

    return {
      action: changedFields.length === 0 ? "unchanged" : "update",
      changedFields,
    };
  };

  /**
   * Fetch categories for validation
   */
  const fetchCategories = useCallback(async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const response = await fetchMerchantApi("/api/merchant/categories", { token });

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

      const response = await fetchMerchantApi("/api/merchant/menu?limit=1000", { token });

      if (response.ok) {
        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setExistingMenus(data.data.map((m: any) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            price: m.price,
            isActive: m.isActive,
            isSpicy: m.isSpicy,
            isBestSeller: m.isBestSeller,
            isSignature: m.isSignature,
            isRecommended: m.isRecommended,
            trackStock: m.trackStock,
            stockQty: m.stockQty,
            dailyStockTemplate: m.dailyStockTemplate,
            autoResetStock: m.autoResetStock,
            categories: m.categories,
            category: m.category,
          })));
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

      const response = await fetchMerchantApi("/api/merchant/menu?limit=1000", { token });

      if (!response.ok) {
        throw new Error("Failed to fetch menu items");
      }

      const data = await response.json();
      const menus = data.data || [];

      if (menus.length === 0) {
        showError("No menu items to export");
        return;
      }

      // Format for Excel export - include ID for re-import/update
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const exportData = menus.map((menu: any) => ({
        "ID (do not edit)": menu.id,
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
        { wch: 12 }, // ID
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

    // Stock validation
    if (item.trackStock) {
      if (item.stockQty === null || item.stockQty < 0) {
        errors.push("Stock quantity is required when Track Stock is enabled");
      }

      if (item.autoResetStock && (item.dailyStockTemplate === null || item.dailyStockTemplate < 0)) {
        errors.push("Daily Stock Template is required when Auto Reset Stock is enabled");
      }
    } else {
      if (item.autoResetStock) {
        errors.push("Auto Reset Stock requires Track Stock = Yes");
      }

      if (item.stockQty !== null) {
        warnings.push("Stock Qty will be ignored because Track Stock is No");
      }

      if (item.dailyStockTemplate !== null) {
        warnings.push("Daily Stock Template will be ignored because Track Stock is No");
      }
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

      // Build lookup map for existing menus by name
      const existingMenuNameMap = new Map(existingMenus.map(m => [m.name.toLowerCase().trim(), m.id]));

      // Parse and validate data
      const parsedItems: MenuUploadItem[] = jsonData.map((row: unknown, index: number) => {
        const r = row as Record<string, unknown>;
        const categoryNames = String(r["Categories (comma-separated)"] || r["Categories"] || "").trim();

        // Extract ID if present (from exported file)
        const menuId = r["ID (do not edit)"] ? String(r["ID (do not edit)"]).trim() : undefined;

        const item: MenuUploadItem = {
          rowIndex: index + 2, // Excel rows start from 1, plus header row
          name: String(r["Name *"] || r["Name"] || "").trim(),
          description: String(r["Description"] || "").trim(),
          price: (() => {
            const num = normalizeNumber(r["Price *"] ?? r["Price"]);
            return typeof num === "number" ? num : Number.NaN;
          })(),
          categoryNames,
          selectedCategoryIds: [], // Will be populated after validation
          isActive: parseBooleanWithDefault(r["Is Active"], true),
          isSpicy: parseBoolean(r["Is Spicy"]),
          isBestSeller: parseBoolean(r["Is Best Seller"]),
          isSignature: parseBoolean(r["Is Signature"]),
          isRecommended: parseBoolean(r["Is Recommended"]),
          trackStock: parseBooleanWithDefault(r["Track Stock"], false),
          stockQty: parseNumber(r["Stock Qty"]),
          dailyStockTemplate: parseNumber(r["Daily Stock Template"]),
          autoResetStock: parseBooleanWithDefault(r["Auto Reset Stock"], false),
          action: "new",
          changedFields: [],
          errors: [],
          warnings: [],
          isEditing: false,
          isExpanded: false,
          existingMenuId: menuId, // Will be updated below if match found
        };

        // Check for existing menu by ID or name
        if (menuId) {
          item.existingMenuId = menuId;
        } else {
          // Try to match by name
          const matchedId = existingMenuNameMap.get(item.name.toLowerCase().trim());
          if (matchedId) {
            item.existingMenuId = matchedId;
          }
        }

        // Map category names to IDs
        item.selectedCategoryIds = mapCategoryNamesToIds(item.categoryNames);

        // Validate item
        const validation = validateItem(item);
        item.errors = validation.errors;
        item.warnings = validation.warnings;

        // Compute action (new/update/unchanged)
        const computed = computeActionAndChanges(item);
        item.action = computed.action;
        item.changedFields = computed.changedFields;

        if (item.existingMenuId && !existingMenus.some((m) => m.id === item.existingMenuId)) {
          item.errors.push(`Existing menu ID not found: ${item.existingMenuId}`);
        }

        return item;
      });

      const parsedNewCount = parsedItems.filter((i) => i.action === "new").length;
      const parsedUpdateCount = parsedItems.filter((i) => i.action === "update").length;
      const parsedUnchangedCount = parsedItems.filter((i) => i.action === "unchanged").length;

      setItems(parsedItems);

      showSuccess(
        `Loaded ${parsedItems.length} items (${parsedNewCount} new, ${parsedUpdateCount} update, ${parsedUnchangedCount} unchanged)`
      );
    } catch (error) {
      console.error("Failed to parse file:", error);
      showError("Failed to parse the uploaded file. Please check the format.");
    } finally {
      setUploading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, existingMenus, showError, showSuccess]);

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

      let updated: MenuUploadItem = { ...item, [field]: value } as MenuUploadItem;

      if (field === "trackStock" && value === false) {
        updated = {
          ...updated,
          stockQty: null,
          dailyStockTemplate: null,
          autoResetStock: false,
        };
      }

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

      const computed = computeActionAndChanges(updated);
      updated.action = computed.action;
      updated.changedFields = computed.changedFields;
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

      const updated: MenuUploadItem = { ...item, selectedCategoryIds: newIds, categoryNames: names } as MenuUploadItem;
      const validation = validateItem(updated);
      updated.errors = validation.errors;
      updated.warnings = validation.warnings;

      const computed = computeActionAndChanges(updated);
      updated.action = computed.action;
      updated.changedFields = computed.changedFields;

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
    const actionableItems = items.filter((i) => i.action !== "unchanged");
    const updateCount = actionableItems.filter((i) => i.action === "update").length;
    const newCount = actionableItems.filter((i) => i.action === "new").length;

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

    if (actionableItems.length === 0) {
      showError("No changes to save (all rows match existing data)");
      return;
    }

    // If there are duplicates and confirmation not shown yet, show dialog
    if (updateCount > 0 && !showConfirmDialog) {
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

      // Map category names to IDs (use selectedCategoryIds if available, fallback to categoryNames)
      const itemsWithCategoryIds = actionableItems.map(item => {
        // Use selectedCategoryIds directly if available, otherwise map from names
        const categoryIds = item.selectedCategoryIds.length > 0
          ? item.selectedCategoryIds
          : mapCategoryNamesToIds(item.categoryNames);

        return {
          id: item.existingMenuId || undefined, // Include ID for updates
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

      const response = await fetchMerchantApi("/api/merchant/menu/bulk-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: itemsWithCategoryIds, upsertByName: true }),
        token,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save menu items");
      }

      // Show appropriate success message
      const created = data.createdCount || 0;
      const updated = data.updatedCount || 0;
      if (updated > 0 && created > 0) {
        showSuccess(`Successfully created ${created} and updated ${updated} menu items!`);
      } else if (updated > 0) {
        showSuccess(`Successfully updated ${updated} menu items!`);
      } else {
        showSuccess(`Successfully created ${created} menu items!`);
      }
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
  const updateCount = items.filter((i) => i.action === "update").length;
  const newCount = items.filter((i) => i.action === "new").length;
  const unchangedCount = items.filter((i) => i.action === "unchanged").length;
  const errorRows = items.filter((i) => i.errors.length > 0).map((i) => i.rowIndex);
  const warningRows = items.filter((i) => i.warnings && i.warnings.length > 0).map((i) => i.rowIndex);

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
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6" data-tutorial="template-guide">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
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
                  data-tutorial="download-template"
                  className="inline-flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-600"
                >
                  <FaDownload className="h-4 w-4" />
                  Download Template
                </button>
                <button
                  onClick={exportCurrentMenu}
                  disabled={exporting}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-100 disabled:opacity-50 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-400"
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
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
              <span className="text-sm font-bold">2</span>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 dark:text-white">Upload Your File</h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Upload your filled Excel or CSV file. Supported formats: .xlsx, .xls, .csv
              </p>

              {/* Upload Zone */}
              <div
                data-tutorial="upload-zone"
                className={`mt-4 relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragActive
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
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
                        <span className="font-medium text-brand-600 dark:text-brand-400">Click to upload</span> or drag and drop
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
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3 lg:p-6" data-tutorial="preview-table">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400">
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
                      {updateCount > 0 && (
                        <span className="flex items-center gap-1.5 text-blue-600">
                          {updateCount} updates
                        </span>
                      )}
                      {unchangedCount > 0 && (
                        <span className="flex items-center gap-1.5 text-gray-500">
                          {unchangedCount} unchanged
                        </span>
                      )}
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

                    {(errorRows.length > 0 || warningRows.length > 0) && (
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                        {errorRows.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-red-700 dark:text-red-400">Errors in rows:</span>
                            <div className="flex flex-wrap gap-1">
                              {errorRows.slice(0, 24).map((row) => (
                                <button
                                  key={`err-${row}`}
                                  type="button"
                                  onClick={() => focusRow(row)}
                                  className="rounded-md bg-red-100 px-2 py-1 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/40"
                                  title={`Go to row #${row}`}
                                >
                                  #{row}
                                </button>
                              ))}
                              {errorRows.length > 24 && (
                                <span className="text-red-600 dark:text-red-400">+{errorRows.length - 24} more</span>
                              )}
                            </div>
                          </div>
                        )}
                        {warningRows.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-amber-700 dark:text-amber-300">Warnings in rows:</span>
                            <div className="flex flex-wrap gap-1">
                              {warningRows.slice(0, 24).map((row) => (
                                <button
                                  key={`warn-${row}`}
                                  type="button"
                                  onClick={() => focusRow(row)}
                                  className="rounded-md bg-amber-100 px-2 py-1 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:hover:bg-amber-900/40"
                                  title={`Go to row #${row}`}
                                >
                                  #{row}
                                </button>
                              ))}
                              {warningRows.length > 24 && (
                                <span className="text-amber-700 dark:text-amber-300">+{warningRows.length - 24} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      onClick={handleClear}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      <FaTimes className="h-4 w-4" />
                      Clear
                    </button>

                    <button
                      onClick={handleSave}
                      disabled={saving || errorCount > 0 || (newCount + updateCount) === 0}
                      data-tutorial="confirm-upload"
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                          {(newCount + updateCount) === 0
                            ? "No changes"
                            : `Save (${newCount} new, ${updateCount} update, ${unchangedCount} unchanged)`}
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
                  <div
                    key={index}
                    id={`menu-upload-row-${item.rowIndex}`}
                    className={`${item.errors.length > 0 ? "bg-red-50/50 dark:bg-red-900/5" : ""}`}
                  >
                    {/* Main Row */}
                    <div className="grid grid-cols-12 gap-4 px-4 py-4 items-center">
                      {/* Row Number */}
                      <div className="col-span-2 lg:col-span-1 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col gap-1">
                            <span>#{item.rowIndex}</span>
                            <span
                              className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                item.action === "new"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : item.action === "update"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                              }`}
                            >
                              {item.action === "new" ? "New" : item.action === "update" ? "Update" : "Unchanged"}
                            </span>
                            {item.action === "update" && item.changedFields.length > 0 && (
                              <span className="text-[11px] text-gray-500 dark:text-gray-500">
                                {item.changedFields.join(", ")}
                              </span>
                            )}
                          </div>
                      </div>

                      {/* Name */}
                      <div className="col-span-10 lg:col-span-3">
                        {item.isEditing ? (
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateItem(index, "name", e.target.value)}
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
                            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                              <FaExclamationCircle className="h-3 w-3" />
                              {item.errors.length} error{item.errors.length > 1 ? "s" : ""}
                            </span>
                            {item.warnings.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                                <FaExclamationTriangle className="h-3 w-3" />
                                {item.warnings.length} warning{item.warnings.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                              <FaCheck className="h-3 w-3" />
                              Valid
                            </span>
                            {item.warnings.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                                <FaExclamationTriangle className="h-3 w-3" />
                                {item.warnings.length} warning{item.warnings.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="col-span-2 lg:col-span-1 flex items-center justify-end gap-1">
                        <TableActionButton
                          icon={item.isExpanded ? FaChevronUp : FaChevronDown}
                          onClick={() => toggleExpanded(index)}
                          title={item.isExpanded ? "Collapse" : "Expand"}
                          aria-label={item.isExpanded ? "Collapse" : "Expand"}
                        />
                        <TableActionButton
                          icon={item.isEditing ? FaCheck : FaEdit}
                          onClick={() => toggleEdit(index)}
                          title={item.isEditing ? "Done" : "Edit"}
                          aria-label={item.isEditing ? "Done" : "Edit"}
                        />
                        <TableActionButton
                          icon={FaTrash}
                          tone="danger"
                          onClick={() => removeItem(index)}
                          title="Remove"
                          aria-label="Remove"
                        />
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

                        {item.errors.length === 0 && item.warnings.length > 0 && (
                          <div className="mb-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-900/20">
                            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Warnings:</p>
                            <ul className="mt-1 list-inside list-disc text-sm text-amber-700 dark:text-amber-200">
                              {item.warnings.map((w, i) => (
                                <li key={i}>{w}</li>
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
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
                                          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
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
                                ].map(flag => {
                                  if (flag.key === "isActive") {
                                    return (
                                      <div key={flag.key} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{flag.label}</span>
                                        <StatusToggle
                                          isActive={item.isActive}
                                          onToggle={() => updateItem(index, "isActive", !item.isActive)}
                                          size="sm"
                                          activeLabel={t("common.active")}
                                          inactiveLabel={t("common.inactive")}
                                        />
                                      </div>
                                    );
                                  }

                                  return (
                                    <label key={flag.key} className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={item[flag.key as keyof MenuUploadItem] as boolean}
                                        onChange={(e) => updateItem(index, flag.key as keyof MenuUploadItem, e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
                                      />
                                      <span className="text-sm text-gray-700 dark:text-gray-300">{flag.label}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <StatusToggle
                                  isActive={item.isActive}
                                  onToggle={() => {}}
                                  disabled
                                  size="sm"
                                  activeLabel={t("common.active")}
                                  inactiveLabel={t("common.inactive")}
                                />
                                {item.isSpicy && <span className="text-xs text-gray-600 dark:text-gray-400">• Spicy</span>}
                                {item.isBestSeller && <span className="text-xs text-gray-600 dark:text-gray-400">• Best Seller</span>}
                                {item.isSignature && <span className="text-xs text-gray-600 dark:text-gray-400">• Signature</span>}
                                {item.isRecommended && <span className="text-xs text-gray-600 dark:text-gray-400">• Recommended</span>}
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
                                    className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
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
                                        className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                        min="0"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-gray-500">Daily Template:</span>
                                      <input
                                        type="number"
                                        value={item.dailyStockTemplate ?? ""}
                                        onChange={(e) => updateItem(index, "dailyStockTemplate", e.target.value ? Number(e.target.value) : null)}
                                        className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                        min="0"
                                      />
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={item.autoResetStock}
                                        onChange={(e) => updateItem(index, "autoResetStock", e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-700"
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

      {/* Confirmation Dialog for Duplicates */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <FaExclamationTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Confirm Menu Updates
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Some items will overwrite existing menus
                </p>
              </div>
            </div>

            <div className="mb-6 rounded-lg bg-amber-50 p-4 dark:bg-amber-900/20">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold text-amber-600 dark:text-amber-400">{updateCount}</span> menu item(s) will be <strong>updated</strong> (only rows that differ)
                <br />
                <span className="font-semibold text-green-600 dark:text-green-400">{newCount}</span> menu item(s) will be <strong>created</strong> (new)
                {unchangedCount > 0 && (
                  <>
                    <br />
                    <span className="font-semibold text-gray-600 dark:text-gray-400">{unchangedCount}</span> menu item(s) are <strong>unchanged</strong> (skipped)
                  </>
                )}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
