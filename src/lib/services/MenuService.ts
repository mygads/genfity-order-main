/**
 * Menu Service
 * Business logic for menu management (categories, items, addons)
 */

import menuRepository from '@/lib/repositories/MenuRepository';
import merchantRepository from '@/lib/repositories/MerchantRepository';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  ERROR_CODES,
} from '@/lib/constants/errors';
import type {
  MenuCategory,
  Menu,
  AddonCategory,
  AddonItem,
  MenuAddonCategory,
} from '@/lib/types';

/**
 * Menu category input
 */
export interface MenuCategoryInput {
  merchantId: bigint;
  name: string;
  description?: string;
  sortOrder?: number;
  userId?: bigint; // For audit trail (createdBy/updatedBy)
}

/**
 * Menu item input
 */
export interface MenuInput {
  merchantId: bigint;
  categoryId?: bigint;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isActive?: boolean;
  isPromo?: boolean;
  promoPrice?: number;
  promoStartDate?: Date;
  promoEndDate?: Date;
  trackStock?: boolean;
  stockQty?: number;
  dailyStockTemplate?: number;
  autoResetStock?: boolean;
  userId?: bigint; // For audit trail (createdBy/updatedBy)
}

/**
 * Addon category input
 */
export interface AddonCategoryInput {
  merchantId: bigint;
  name: string;
  description?: string;
  minSelection?: number;
  maxSelection?: number;
  userId?: bigint; // For audit trail (createdBy/updatedBy)
}

/**
 * Addon item input
 */
export interface AddonItemInput {
  categoryId: bigint;
  name: string;
  price: number;
  isActive?: boolean;
  trackStock?: boolean;
  stockQty?: number;
  userId?: bigint; // For audit trail (createdBy/updatedBy)
}

/**
 * Menu Service Class
 */
class MenuService {
  // ========================================
  // MENU CATEGORIES
  // ========================================

  /**
   * Create menu category
   */
  async createCategory(input: MenuCategoryInput): Promise<MenuCategory> {
    // Validate merchant exists
    const merchant = await merchantRepository.findById(input.merchantId);
    if (!merchant) {
      throw new NotFoundError(
        'Merchant not found',
        ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    // Validate required fields
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError(
        'Category name is required',
        ERROR_CODES.REQUIRED_FIELD
      );
    }

    return await menuRepository.createCategory({
      merchantId: input.merchantId,
      name: input.name.trim(),
      description: input.description?.trim(),
      sortOrder: input.sortOrder ?? 0,
      createdByUserId: input.userId,
    });
  }

  /**
   * Update menu category
   */
  async updateCategory(
    categoryId: bigint,
    input: Partial<MenuCategoryInput>
  ): Promise<MenuCategory> {
    // Validate category exists
    const existing = await menuRepository.findCategoryById(categoryId);
    if (!existing) {
      throw new NotFoundError(
        'Category not found',
        ERROR_CODES.CATEGORY_NOT_FOUND
      );
    }

    return await menuRepository.updateCategory(categoryId, {
      name: input.name?.trim(),
      description: input.description?.trim(),
      sortOrder: input.sortOrder,
      updatedByUserId: input.userId,
    });
  }

  /**
   * Delete menu category
   */
  async deleteCategory(categoryId: bigint, userId?: bigint): Promise<void> {
    // Validate category exists
    const existing = await menuRepository.findCategoryById(categoryId);
    if (!existing) {
      throw new NotFoundError(
        'Category not found',
        ERROR_CODES.CATEGORY_NOT_FOUND
      );
    }

    // Check if category has menus
    const menus = await menuRepository.findAllMenus(existing.merchantId, categoryId, true);
    if (menus.length > 0) {
      throw new ConflictError(
        'Cannot delete category with existing menu items',
        ERROR_CODES.CONFLICT
      );
    }

    await menuRepository.deleteCategory(categoryId, userId);
  }

  /**
   * Get categories by merchant
   */
  async getCategoriesByMerchant(merchantId: bigint): Promise<MenuCategory[]> {
    return await menuRepository.findAllCategories(merchantId);
  }

  // ========================================
  // MENU ITEMS
  // ========================================

  /**
   * Create menu item
   */
  async createMenu(input: MenuInput): Promise<Menu> {
    // Validate merchant exists
    const merchant = await merchantRepository.findById(input.merchantId);
    if (!merchant) {
      throw new NotFoundError(
        'Merchant not found',
        ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    // Validate category exists and belongs to merchant
    const category = await menuRepository.findCategoryById(input.categoryId);
    if (!category) {
      throw new NotFoundError(
        'Category not found',
        ERROR_CODES.CATEGORY_NOT_FOUND
      );
    }
    if (category.merchantId !== input.merchantId) {
      throw new ValidationError(
        'Category does not belong to this merchant',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    // Validate required fields
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError(
        'Menu name is required',
        ERROR_CODES.REQUIRED_FIELD
      );
    }

    // Validate price
    if (input.price < 0) {
      throw new ValidationError(
        'Price must be greater than or equal to 0',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    // Validate stock quantity
    if (input.trackStock && (input.stockQty === undefined || input.stockQty < 0)) {
      throw new ValidationError(
        'Stock quantity is required when trackStock is true',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    return await menuRepository.createMenu({
      merchantId: input.merchantId,
      categoryId: input.categoryId,
      name: input.name.trim(),
      description: input.description?.trim(),
      price: input.price,
      imageUrl: input.imageUrl,
      isActive: input.isActive ?? true,
      isPromo: input.isPromo ?? false,
      promoPrice: input.promoPrice,
      promoStartDate: input.promoStartDate,
      promoEndDate: input.promoEndDate,
      trackStock: input.trackStock ?? false,
      stockQty: input.stockQty ?? undefined,
      dailyStockTemplate: input.dailyStockTemplate,
      autoResetStock: input.autoResetStock ?? false,
      createdByUserId: input.userId,
    });
  }

  /**
   * Update menu item
   */
  async updateMenu(menuId: bigint, input: Partial<MenuInput>): Promise<Menu> {
    // Validate menu exists
    const existing = await menuRepository.findMenuById(menuId);
    if (!existing) {
      throw new NotFoundError(
        'Menu item not found',
        ERROR_CODES.MENU_NOT_FOUND
      );
    }

    // Validate category if provided
    if (input.categoryId) {
      const category = await menuRepository.findCategoryById(input.categoryId);
      if (!category) {
        throw new NotFoundError(
          'Category not found',
          ERROR_CODES.CATEGORY_NOT_FOUND
        );
      }
      if (category.merchantId !== existing.merchantId) {
        throw new ValidationError(
          'Category does not belong to this merchant',
          ERROR_CODES.VALIDATION_FAILED
        );
      }
    }

    // Validate price if provided
    if (input.price !== undefined && input.price < 0) {
      throw new ValidationError(
        'Price must be greater than or equal to 0',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    return await menuRepository.updateMenu(menuId, {
      categoryId: input.categoryId,
      name: input.name?.trim(),
      description: input.description?.trim(),
      price: input.price,
      imageUrl: input.imageUrl,
      isActive: input.isActive,
      isPromo: input.isPromo,
      promoPrice: input.promoPrice,
      promoStartDate: input.promoStartDate,
      promoEndDate: input.promoEndDate,
      trackStock: input.trackStock,
      stockQty: input.stockQty,
      dailyStockTemplate: input.dailyStockTemplate,
      autoResetStock: input.autoResetStock,
      updatedByUserId: input.userId,
    });
  }

  /**
   * Delete menu item
   */
  async deleteMenu(menuId: bigint, userId?: bigint): Promise<void> {
    // Validate menu exists
    const existing = await menuRepository.findMenuById(menuId);
    if (!existing) {
      throw new NotFoundError(
        'Menu item not found',
        ERROR_CODES.MENU_NOT_FOUND
      );
    }

    await menuRepository.deleteMenu(menuId, userId);
  }

  /**
   * Get menus by merchant
   */
  async getMenusByMerchant(
    merchantId: bigint,
    categoryId?: bigint
  ): Promise<Menu[]> {
    return await menuRepository.findAllMenus(merchantId, categoryId, true);
  }

  /**
   * Get menu with addons
   */
  async getMenuWithAddons(menuId: bigint): Promise<Menu | null> {
    return await menuRepository.findMenuById(menuId);
  }

  /**
   * Update menu stock
   */
  async updateMenuStock(menuId: bigint, quantity: number): Promise<Menu> {
    // Validate menu exists
    const existing = await menuRepository.findMenuById(menuId);
    if (!existing) {
      throw new NotFoundError(
        'Menu item not found',
        ERROR_CODES.MENU_NOT_FOUND
      );
    }

    if (!existing.trackStock) {
      throw new ValidationError(
        'Menu item does not track stock',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    return await menuRepository.updateMenu(menuId, {
      stockQty: quantity,
      isActive: quantity > 0,
    });
  }

  /**
   * Decrement menu stock (for order processing)
   */
  async decrementMenuStock(menuId: bigint, quantity: number): Promise<void> {
    // Validate menu exists and has stock
    const menu = await menuRepository.findMenuById(menuId);
    if (!menu) {
      throw new NotFoundError(
        'Menu item not found',
        ERROR_CODES.MENU_NOT_FOUND
      );
    }

    if (!menu.trackStock) {
      // No stock tracking, skip
      return;
    }

    if (menu.stockQty === null || menu.stockQty < quantity) {
      throw new ValidationError(
        'Insufficient stock',
        ERROR_CODES.MENU_OUT_OF_STOCK
      );
    }

    // Decrement stock
    await menuRepository.updateMenu(menuId, {
      stockQty: menu.stockQty - quantity,
      isActive: menu.stockQty - quantity > 0,
    });
  }

  /**
   * Toggle menu active status
   */
  async toggleMenuActive(menuId: bigint): Promise<Menu> {
    const menu = await menuRepository.findMenuById(menuId);
    if (!menu) {
      throw new NotFoundError(
        'Menu item not found',
        ERROR_CODES.MENU_NOT_FOUND
      );
    }

    return await menuRepository.updateMenu(menuId, {
      isActive: !menu.isActive,
    });
  }

  /**
   * Add stock to menu item
   */
  async addMenuStock(menuId: bigint, quantity: number): Promise<Menu> {
    if (quantity <= 0) {
      throw new ValidationError(
        'Quantity must be greater than 0',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    const menu = await menuRepository.findMenuById(menuId);
    if (!menu) {
      throw new NotFoundError(
        'Menu item not found',
        ERROR_CODES.MENU_NOT_FOUND
      );
    }

    if (!menu.trackStock) {
      throw new ValidationError(
        'Menu item does not track stock',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    const currentStock = menu.stockQty || 0;
    return await menuRepository.updateMenu(menuId, {
      stockQty: currentStock + quantity,
      isActive: true,
    });
  }

  /**
   * Reset daily stock for menu items with autoResetStock enabled
   */
  async resetDailyStock(merchantId?: bigint): Promise<number> {
    const menus = await menuRepository.findAllMenus(merchantId, undefined, false);
    
    let resetCount = 0;
    for (const menu of menus) {
      if (menu.autoResetStock && menu.dailyStockTemplate !== null) {
        await menuRepository.updateMenu(menu.id, {
          stockQty: menu.dailyStockTemplate,
          isActive: menu.dailyStockTemplate > 0,
          lastStockResetAt: new Date(),
        });
        resetCount++;
      }
    }

    return resetCount;
  }

  /**
   * Setup promo for menu item
   */
  async setupMenuPromo(
    menuId: bigint,
    promoData: {
      isPromo: boolean;
      promoPrice?: number;
      promoStartDate?: Date;
      promoEndDate?: Date;
    }
  ): Promise<Menu> {
    const menu = await menuRepository.findMenuById(menuId);
    if (!menu) {
      throw new NotFoundError(
        'Menu item not found',
        ERROR_CODES.MENU_NOT_FOUND
      );
    }

    // Validate promo price
    if (promoData.isPromo && promoData.promoPrice) {
      if (promoData.promoPrice < 0) {
        throw new ValidationError(
          'Promo price must be greater than or equal to 0',
          ERROR_CODES.VALIDATION_FAILED
        );
      }

      const originalPrice = typeof menu.price === 'number' 
        ? menu.price 
        : parseFloat(menu.price.toString());

      if (promoData.promoPrice >= originalPrice) {
        throw new ValidationError(
          'Promo price must be less than original price',
          ERROR_CODES.VALIDATION_FAILED
        );
      }
    }

    return await menuRepository.updateMenu(menuId, {
      isPromo: promoData.isPromo,
      promoPrice: promoData.promoPrice,
      promoStartDate: promoData.promoStartDate,
      promoEndDate: promoData.promoEndDate,
    });
  }

  // ========================================
  // ADDON CATEGORIES
  // ========================================

  /**
   * Create addon category
   */
  async createAddonCategory(
    input: AddonCategoryInput
  ): Promise<AddonCategory> {
    // Validate merchant exists
    const merchant = await merchantRepository.findById(input.merchantId);
    if (!merchant) {
      throw new NotFoundError(
        'Merchant not found',
        ERROR_CODES.MERCHANT_NOT_FOUND
      );
    }

    // Validate required fields
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError(
        'Addon category name is required',
        ERROR_CODES.REQUIRED_FIELD
      );
    }

    // Validate selection rules
    const minSelection = input.minSelection ?? 0;
    const maxSelection = input.maxSelection ?? null;

    if (minSelection < 0) {
      throw new ValidationError(
        'Minimum selection must be greater than or equal to 0',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    if (maxSelection !== null && maxSelection < minSelection) {
      throw new ValidationError(
        'Maximum selection must be greater than or equal to minimum selection',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    return await menuRepository.createAddonCategory({
      merchantId: input.merchantId,
      name: input.name.trim(),
      description: input.description?.trim(),
      minSelection,
      maxSelection: maxSelection ?? undefined,
      createdByUserId: input.userId,
    });
  }

  /**
   * Update addon category
   */
  async updateAddonCategory(
    categoryId: bigint,
    input: Partial<AddonCategoryInput>
  ): Promise<AddonCategory> {
    // Validate category exists
    const existing = await menuRepository.findAddonCategoryById(categoryId);
    if (!existing) {
      throw new NotFoundError(
        'Addon category not found',
        ERROR_CODES.CATEGORY_NOT_FOUND
      );
    }

    // Validate selection rules if provided
    if (input.minSelection !== undefined || input.maxSelection !== undefined) {
      const minSelection = input.minSelection ?? existing.minSelection;
      const maxSelection = input.maxSelection ?? existing.maxSelection;

      if (minSelection < 0) {
        throw new ValidationError(
          'Minimum selection must be greater than or equal to 0',
          ERROR_CODES.VALIDATION_FAILED
        );
      }

      if (maxSelection !== null && maxSelection < minSelection) {
        throw new ValidationError(
          'Maximum selection must be greater than or equal to minimum selection',
          ERROR_CODES.VALIDATION_FAILED
        );
      }
    }

    return await menuRepository.updateAddonCategory(categoryId, {
      name: input.name?.trim(),
      description: input.description?.trim(),
      minSelection: input.minSelection,
      maxSelection: input.maxSelection,
      updatedByUserId: input.userId,
    });
  }

  /**
   * Delete addon category
   */
  async deleteAddonCategory(categoryId: bigint, userId?: bigint): Promise<void> {
    // Validate category exists
    const existing = await menuRepository.findAddonCategoryById(categoryId);
    if (!existing) {
      throw new NotFoundError(
        'Addon category not found',
        ERROR_CODES.CATEGORY_NOT_FOUND
      );
    }

    // Check if category has items
    const items = await menuRepository.findAddonItemsByCategoryId(categoryId);
    if (items.length > 0) {
      throw new ConflictError(
        'Cannot delete addon category with existing items',
        ERROR_CODES.CONFLICT
      );
    }

    await menuRepository.deleteAddonCategory(categoryId, userId);
  }

  /**
   * Get addon categories by merchant
   */
  async getAddonCategoriesByMerchant(
    merchantId: bigint
  ): Promise<AddonCategory[]> {
    return await menuRepository.findAllAddonCategories(merchantId);
  }

  // ========================================
  // ADDON ITEMS
  // ========================================

  /**
   * Create addon item
   */
  async createAddonItem(input: AddonItemInput): Promise<AddonItem> {
    // Validate category exists
    const category = await menuRepository.findAddonCategoryById(
      input.categoryId
    );
    if (!category) {
      throw new NotFoundError(
        'Addon category not found',
        ERROR_CODES.CATEGORY_NOT_FOUND
      );
    }

    // Validate required fields
    if (!input.name || input.name.trim().length === 0) {
      throw new ValidationError(
        'Addon item name is required',
        ERROR_CODES.REQUIRED_FIELD
      );
    }

    // Validate price
    if (input.price < 0) {
      throw new ValidationError(
        'Price must be greater than or equal to 0',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    return await menuRepository.createAddonItem({
      addonCategoryId: input.categoryId,
      name: input.name.trim(),
      price: input.price,
      isActive: input.isActive ?? true,
      trackStock: input.trackStock ?? false,
      stockQty: input.stockQty ?? undefined,
      createdByUserId: input.userId,
    });
  }

  /**
   * Update addon item
   */
  async updateAddonItem(
    itemId: bigint,
    input: Partial<AddonItemInput>
  ): Promise<AddonItem> {
    // Validate item exists
    const existing = await menuRepository.findAddonItemById(itemId);
    if (!existing) {
      throw new NotFoundError(
        'Addon item not found',
        ERROR_CODES.ADDON_NOT_FOUND
      );
    }

    // Validate price if provided
    if (input.price !== undefined && input.price < 0) {
      throw new ValidationError(
        'Price must be greater than or equal to 0',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    return await menuRepository.updateAddonItem(itemId, {
      name: input.name?.trim(),
      price: input.price,
      isActive: input.isActive,
      trackStock: input.trackStock,
      stockQty: input.stockQty,
      updatedByUserId: input.userId,
    });
  }

  /**
   * Delete addon item
   */
  async deleteAddonItem(itemId: bigint, userId?: bigint): Promise<void> {
    // Validate item exists
    const existing = await menuRepository.findAddonItemById(itemId);
    if (!existing) {
      throw new NotFoundError(
        'Addon item not found',
        ERROR_CODES.ADDON_NOT_FOUND
      );
    }

    await menuRepository.deleteAddonItem(itemId, userId);
  }

  /**
   * Get addon items by category
   */
  async getAddonItemsByCategory(categoryId: bigint): Promise<AddonItem[]> {
    return await menuRepository.findAddonItemsByCategoryId(categoryId);
  }

  // ========================================
  // MENU-ADDON LINKING
  // ========================================

  /**
   * Link addon category to menu
   */
  async linkAddonToMenu(
    menuId: bigint,
    addonCategoryId: bigint
  ): Promise<MenuAddonCategory> {
    // Validate menu exists
    const menu = await menuRepository.findMenuById(menuId);
    if (!menu) {
      throw new NotFoundError(
        'Menu item not found',
        ERROR_CODES.MENU_NOT_FOUND
      );
    }

    // Validate addon category exists and belongs to same merchant
    const addonCategory = await menuRepository.findAddonCategoryById(
      addonCategoryId
    );
    if (!addonCategory) {
      throw new NotFoundError(
        'Addon category not found',
        ERROR_CODES.CATEGORY_NOT_FOUND
      );
    }

    if (addonCategory.merchantId !== menu.merchantId) {
      throw new ValidationError(
        'Addon category does not belong to the same merchant',
        ERROR_CODES.VALIDATION_FAILED
      );
    }

    return await menuRepository.linkAddonToMenu(menuId, addonCategoryId);
  }

  /**
   * Unlink addon category from menu
   */
  async unlinkAddonFromMenu(
    menuId: bigint,
    addonCategoryId: bigint
  ): Promise<void> {
    await menuRepository.unlinkAddonFromMenu(menuId, addonCategoryId);
  }

  /**
   * Get menu addons
   */
  async getMenuAddons(menuId: bigint): Promise<MenuAddonCategory[]> {
    return await menuRepository.getMenuAddons(menuId);
  }

  // ========================================
  // VALIDATION HELPERS
  // ========================================

  /**
   * Validate addon selection for order
   */
  async validateAddonSelection(
    addonCategoryId: bigint,
    selectedAddonIds: bigint[]
  ): Promise<boolean> {
    const category = await menuRepository.findAddonCategoryById(
      addonCategoryId
    );
    if (!category) {
      throw new NotFoundError(
        'Addon category not found',
        ERROR_CODES.CATEGORY_NOT_FOUND
      );
    }

    const selectedCount = selectedAddonIds.length;

    // Check minimum selection
    if (selectedCount < category.minSelection) {
      throw new ValidationError(
        `Minimum ${category.minSelection} addon(s) required for ${category.name}`,
        ERROR_CODES.INVALID_ADDON_SELECTION
      );
    }

    // Check maximum selection
    if (
      category.maxSelection !== null &&
      selectedCount > category.maxSelection
    ) {
      throw new ValidationError(
        `Maximum ${category.maxSelection} addon(s) allowed for ${category.name}`,
        ERROR_CODES.INVALID_ADDON_SELECTION
      );
    }

    // Validate all selected addons exist and are available
    for (const addonId of selectedAddonIds) {
      const addon = await menuRepository.findAddonItemById(addonId);
      if (!addon || addon.addonCategoryId !== addonCategoryId) {
        throw new ValidationError(
          'Invalid addon selection',
          ERROR_CODES.INVALID_ADDON_SELECTION
        );
      }

      if (!addon.isActive) {
        throw new ValidationError(
          `Addon "${addon.name}" is not available`,
          ERROR_CODES.ADDON_INACTIVE
        );
      }

      // Check stock if applicable
      if (addon.trackStock && (addon.stockQty === null || addon.stockQty <= 0)) {
        throw new ValidationError(
          `Addon "${addon.name}" is out of stock`,
          ERROR_CODES.ADDON_OUT_OF_STOCK
        );
      }
    }

    return true;
  }

  /**
   * Calculate total price for menu with addons
   */
  async calculateMenuPrice(
    menuId: bigint,
    selectedAddonIds: bigint[]
  ): Promise<number> {
    const menu = await menuRepository.findMenuById(menuId);
    if (!menu) {
      throw new NotFoundError(
        'Menu item not found',
        ERROR_CODES.MENU_NOT_FOUND
      );
    }

    let totalPrice = Number(menu.price);

    // Add addon prices
    for (const addonId of selectedAddonIds) {
      const addon = await menuRepository.findAddonItemById(addonId);
      if (addon) {
        totalPrice += Number(addon.price);
      }
    }

    return totalPrice;
  }
}

// Export singleton instance
const menuService = new MenuService();
export default menuService;
