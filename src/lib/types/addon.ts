/**
 * Addon Type Definitions
 * Based on Prisma schema: AddonCategory, AddonItem, MenuAddonCategory
 */

// Enum for addon item input types
export enum AddonInputType {
  SELECT = "SELECT", // Button select (single choice)
  QTY = "QTY", // Input quantity (can select multiple)
}

export interface AddonCategory {
  id: string | bigint;
  merchantId: string | bigint;
  name: string;
  description: string | null;
  minSelection: number;
  maxSelection: number | null;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  addonItems?: AddonItem[];
  _count?: {
    addonItems: number;
    menuAddonCategories: number;
  };
}

export interface AddonItem {
  id: string | bigint;
  addonCategoryId: string | bigint;
  name: string;
  description: string | null;
  price: number | string;
  inputType: AddonInputType;
  displayOrder: number;
  isActive: boolean;
  trackStock: boolean;
  stockQty: number | null;
  lowStockThreshold?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  addonCategory?: AddonCategory;
}

export interface MenuAddonCategory {
  menuId: string | bigint;
  addonCategoryId: string | bigint;
  isRequired: boolean;
  displayOrder: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  menu?: {
    id: string | bigint;
    name: string;
    price: number;
    imageUrl?: string | null;
  };
  addonCategory?: AddonCategory;
}

// DTOs for API requests
export interface CreateAddonCategoryDTO {
  name: string;
  description?: string;
  minSelection?: number;
  maxSelection?: number;
}

export interface UpdateAddonCategoryDTO {
  name?: string;
  description?: string;
  minSelection?: number;
  maxSelection?: number;
  isActive?: boolean;
}

export interface CreateAddonItemDTO {
  addonCategoryId: string | bigint;
  name: string;
  description?: string;
  price?: number;
  inputType?: AddonInputType;
  displayOrder?: number;
  trackStock?: boolean;
  stockQty?: number;
  lowStockThreshold?: number;
  dailyStockTemplate?: number;
  autoResetStock?: boolean;
}

export interface UpdateAddonItemDTO {
  name?: string;
  description?: string;
  price?: number;
  inputType?: AddonInputType;
  displayOrder?: number;
  isActive?: boolean;
  trackStock?: boolean;
  stockQty?: number;
  lowStockThreshold?: number | null;
  dailyStockTemplate?: number;
  autoResetStock?: boolean;
}

export interface AddMenuAddonDTO {
  menuId: string | bigint;
  isRequired?: boolean;
  displayOrder?: number;
}

export interface UpdateMenuAddonDTO {
  isRequired?: boolean;
  displayOrder?: number;
}
