/**
 * Excel Export Utility
 * Provides simple CSV/Excel export functionality for menu items, categories, and addons
 */

interface ExportColumn {
  header: string;
  key: string;
  format?: (value: unknown) => string;
}

interface ExportOptions {
  filename: string;
  columns: ExportColumn[];
  data: unknown[];
}

/**
 * Convert data to CSV format
 */
function convertToCSV(columns: ExportColumn[], data: unknown[]): string {
  // Header row
  const headers = columns.map(col => `"${col.header}"`).join(',');
  
  // Data rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = (item as Record<string, unknown>)[col.key];
      const formatted = col.format ? col.format(value) : String(value ?? '');
      // Escape quotes and wrap in quotes
      return `"${formatted.replace(/"/g, '""')}"`;
    }).join(',');
  });

  return [headers, ...rows].join('\n');
}

/**
 * Download CSV file
 */
function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Main export function
 */
export function exportToExcel({ filename, columns, data }: ExportOptions): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const csvContent = convertToCSV(columns, data);
  const exportFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  
  downloadCSV(exportFilename, csvContent);
}

/**
 * Predefined export configurations
 */

// Menu items export
export function exportMenuItems(data: unknown[], merchantCurrency = 'AUD'): void {
  exportToExcel({
    filename: `menu-items-${new Date().toISOString().split('T')[0]}.csv`,
    columns: [
      { header: 'ID', key: 'id' },
      { header: 'Name', key: 'name' },
      { header: 'Description', key: 'description' },
      { 
        header: `Price (${merchantCurrency})`, 
        key: 'price',
        format: (value) => typeof value === 'number' || typeof value === 'string' 
          ? parseFloat(String(value)).toFixed(2) 
          : '0.00'
      },
      // Note: Promo Price removed - use Special Prices export instead
      { 
        header: 'Status', 
        key: 'isActive',
        format: (value) => value ? 'Active' : 'Inactive'
      },
      { 
        header: 'Stock Tracking', 
        key: 'trackStock',
        format: (value) => value ? 'Yes' : 'No'
      },
      { header: 'Stock Quantity', key: 'stockQty' },
      { 
        header: 'Categories', 
        key: 'categories',
        format: (value) => {
          if (Array.isArray(value)) {
            return value.map((c: { category?: { name?: string } }) => c.category?.name || '').join(', ');
          }
          return '';
        }
      },
      { 
        header: 'Created At', 
        key: 'createdAt',
        format: (value) => value ? new Date(String(value)).toLocaleDateString() : ''
      },
    ],
    data,
  });
}

// Categories export
export function exportCategories(data: unknown[]): void {
  exportToExcel({
    filename: `categories-${new Date().toISOString().split('T')[0]}.csv`,
    columns: [
      { header: 'ID', key: 'id' },
      { header: 'Name', key: 'name' },
      { header: 'Description', key: 'description' },
      { header: 'Sort Order', key: 'sortOrder' },
      { 
        header: 'Status', 
        key: 'isActive',
        format: (value) => value ? 'Active' : 'Inactive'
      },
      { 
        header: 'Menu Items', 
        key: '_count',
        format: (value) => {
          const count = value as { menuItems?: number };
          return String(count?.menuItems || 0);
        }
      },
      { 
        header: 'Created At', 
        key: 'createdAt',
        format: (value) => value ? new Date(String(value)).toLocaleDateString() : ''
      },
    ],
    data,
  });
}

// Addon categories export
export function exportAddonCategories(data: unknown[]): void {
  exportToExcel({
    filename: `addon-categories-${new Date().toISOString().split('T')[0]}.csv`,
    columns: [
      { header: 'ID', key: 'id' },
      { header: 'Name', key: 'name' },
      { header: 'Description', key: 'description' },
      { header: 'Min Selection', key: 'minSelection' },
      { 
        header: 'Max Selection', 
        key: 'maxSelection',
        format: (value) => value === null || value === undefined ? 'Unlimited' : String(value)
      },
      { 
        header: 'Status', 
        key: 'isActive',
        format: (value) => value ? 'Active' : 'Inactive'
      },
      { 
        header: 'Addon Items', 
        key: '_count',
        format: (value) => {
          const count = value as { addonItems?: number };
          return String(count?.addonItems || 0);
        }
      },
      { 
        header: 'Created At', 
        key: 'createdAt',
        format: (value) => value ? new Date(String(value)).toLocaleDateString() : ''
      },
    ],
    data,
  });
}

// Addon items export
export function exportAddonItems(data: unknown[], merchantCurrency = 'AUD'): void {
  exportToExcel({
    filename: `addon-items-${new Date().toISOString().split('T')[0]}.csv`,
    columns: [
      { header: 'ID', key: 'id' },
      { header: 'Name', key: 'name' },
      { header: 'Description', key: 'description' },
      { 
        header: `Price (${merchantCurrency})`, 
        key: 'price',
        format: (value) => typeof value === 'number' || typeof value === 'string' 
          ? parseFloat(String(value)).toFixed(2) 
          : '0.00'
      },
      { 
        header: 'Input Type', 
        key: 'inputType',
        format: (value) => value === 'SELECT' ? 'Single Select' : 'Quantity Input'
      },
      { 
        header: 'Status', 
        key: 'isActive',
        format: (value) => value ? 'Active' : 'Inactive'
      },
      { 
        header: 'Stock Tracking', 
        key: 'trackStock',
        format: (value) => value ? 'Yes' : 'No'
      },
      { header: 'Stock Quantity', key: 'stockQty' },
      { 
        header: 'Created At', 
        key: 'createdAt',
        format: (value) => value ? new Date(String(value)).toLocaleDateString() : ''
      },
    ],
    data,
  });
}
