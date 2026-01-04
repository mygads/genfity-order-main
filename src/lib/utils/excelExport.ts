/**
 * Excel Export Utility
 * Provides Excel export functionality for menu items, categories, and addons
 * Uses XLSX library for proper Excel format compatible with bulk upload
 */

import * as XLSX from 'xlsx';

interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  format?: (value: unknown) => string | number;
}

interface ExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExportColumn[];
  data: unknown[];
}

/**
 * Main export function - exports to proper Excel format
 */
export function exportToExcel({ filename, sheetName = 'Sheet1', columns, data }: ExportOptions): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Transform data to match column structure
  const exportData = data.map(item => {
    const row: Record<string, string | number> = {};
    columns.forEach(col => {
      const value = (item as Record<string, unknown>)[col.key];
      if (col.format) {
        row[col.header] = col.format(value);
      } else if (typeof value === 'string' || typeof value === 'number') {
        row[col.header] = value;
      } else if (value === null || value === undefined) {
        row[col.header] = '';
      } else {
        row[col.header] = String(value);
      }
    });
    return row;
  });

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Set column widths
  ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

  // Create workbook and append sheet
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Export file
  const exportFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, exportFilename);
}

/**
 * Predefined export configurations
 */

// Menu items export - matches bulk upload template format for import/export compatibility
export function exportMenuItems(data: unknown[], _merchantCurrency = 'AUD'): void {
  exportToExcel({
    filename: `menu_export_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Menu Items',
    columns: [
      { header: 'ID (do not edit)', key: 'id', width: 12 },
      { header: 'Name *', key: 'name', width: 25 },
      { header: 'Description', key: 'description', width: 50 },
      { 
        header: 'Price *', 
        key: 'price',
        width: 12,
        format: (value) => typeof value === 'number' || typeof value === 'string' 
          ? Number(parseFloat(String(value)).toFixed(2))
          : 0
      },
      { 
        header: 'Categories (comma-separated)', 
        key: 'categories',
        width: 30,
        format: (value) => {
          if (Array.isArray(value)) {
            return value.map((c: { category?: { name?: string } }) => c.category?.name || '').filter(Boolean).join(', ');
          }
          return '';
        }
      },
      { 
        header: 'Is Active', 
        key: 'isActive',
        width: 10,
        format: (value) => value ? 'Yes' : 'No'
      },
      { 
        header: 'Is Spicy', 
        key: 'isSpicy',
        width: 10,
        format: (value) => value ? 'Yes' : 'No'
      },
      { 
        header: 'Is Best Seller', 
        key: 'isBestSeller',
        width: 15,
        format: (value) => value ? 'Yes' : 'No'
      },
      { 
        header: 'Is Signature', 
        key: 'isSignature',
        width: 12,
        format: (value) => value ? 'Yes' : 'No'
      },
      { 
        header: 'Is Recommended', 
        key: 'isRecommended',
        width: 15,
        format: (value) => value ? 'Yes' : 'No'
      },
      { 
        header: 'Track Stock', 
        key: 'trackStock',
        width: 12,
        format: (value) => value ? 'Yes' : 'No'
      },
      { 
        header: 'Stock Qty', 
        key: 'stockQty',
        width: 10,
        format: (value) => value !== null && value !== undefined && value !== '' ? Number(value) : ''
      },
      { 
        header: 'Daily Stock Template', 
        key: 'dailyStockTemplate',
        width: 18,
        format: (value) => value !== null && value !== undefined && value !== '' ? Number(value) : ''
      },
      { 
        header: 'Auto Reset Stock', 
        key: 'autoResetStock',
        width: 15,
        format: (value) => value ? 'Yes' : 'No'
      },
    ],
    data,
  });
}

// Categories export
export function exportCategories(data: unknown[]): void {
  exportToExcel({
    filename: `categories_export_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Categories',
    columns: [
      { header: 'ID', key: 'id', width: 12 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Sort Order', key: 'sortOrder', width: 12 },
      { 
        header: 'Status', 
        key: 'isActive',
        width: 10,
        format: (value) => value ? 'Active' : 'Inactive'
      },
      { 
        header: 'Menu Items', 
        key: '_count',
        width: 12,
        format: (value) => {
          const count = value as { menuItems?: number };
          return count?.menuItems || 0;
        }
      },
      { 
        header: 'Created At', 
        key: 'createdAt',
        width: 15,
        format: (value) => value ? new Date(String(value)).toLocaleDateString() : ''
      },
    ],
    data,
  });
}

// Addon categories export
export function exportAddonCategories(data: unknown[]): void {
  exportToExcel({
    filename: `addon_categories_export_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Addon Categories',
    columns: [
      { header: 'ID', key: 'id', width: 12 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Min Selection', key: 'minSelection', width: 15 },
      { 
        header: 'Max Selection', 
        key: 'maxSelection',
        width: 15,
        format: (value) => value === null || value === undefined ? 'Unlimited' : Number(value)
      },
      { 
        header: 'Status', 
        key: 'isActive',
        width: 10,
        format: (value) => value ? 'Active' : 'Inactive'
      },
      { 
        header: 'Addon Items', 
        key: '_count',
        width: 12,
        format: (value) => {
          const count = value as { addonItems?: number };
          return count?.addonItems || 0;
        }
      },
      { 
        header: 'Created At', 
        key: 'createdAt',
        width: 15,
        format: (value) => value ? new Date(String(value)).toLocaleDateString() : ''
      },
    ],
    data,
  });
}

// Addon items export
export function exportAddonItems(data: unknown[], _merchantCurrency = 'AUD'): void {
  exportToExcel({
    filename: `addon_items_export_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Addon Items',
    columns: [
      { header: 'ID', key: 'id', width: 12 },
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Description', key: 'description', width: 40 },
      { 
        header: 'Price', 
        key: 'price',
        width: 12,
        format: (value) => typeof value === 'number' || typeof value === 'string' 
          ? Number(parseFloat(String(value)).toFixed(2))
          : 0
      },
      { 
        header: 'Input Type', 
        key: 'inputType',
        width: 15,
        format: (value) => value === 'SELECT' ? 'Single Select' : 'Quantity Input'
      },
      { 
        header: 'Status', 
        key: 'isActive',
        width: 10,
        format: (value) => value ? 'Active' : 'Inactive'
      },
      { 
        header: 'Stock Tracking', 
        key: 'trackStock',
        width: 15,
        format: (value) => value ? 'Yes' : 'No'
      },
      { 
        header: 'Stock Quantity', 
        key: 'stockQty',
        width: 15,
        format: (value) => value !== null && value !== undefined && value !== '' ? Number(value) : ''
      },
      { 
        header: 'Created At', 
        key: 'createdAt',
        width: 15,
        format: (value) => value ? new Date(String(value)).toLocaleDateString() : ''
      },
    ],
    data,
  });
}
