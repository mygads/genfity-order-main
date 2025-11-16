/**
 * AddonService
 * Business logic layer for addon management
 */

import AddonRepository from '@/lib/repositories/AddonRepository';
import {
  CreateAddonCategoryDTO,
  UpdateAddonCategoryDTO,
  CreateAddonItemDTO,
  UpdateAddonItemDTO,
} from '@/lib/types/addon';

export class AddonService {
  private repository = AddonRepository;

  // ==================== ADDON CATEGORIES ====================

  /**
   * Get all addon categories for a merchant
   */
  async getAddonCategories(merchantId: bigint) {
    return await this.repository.getAddonCategories(merchantId);
  }

  /**
   * Get single addon category
   */
  async getAddonCategoryById(id: bigint, merchantId: bigint) {
    const category = await this.repository.getAddonCategoryById(id, merchantId);
    if (!category) {
      throw new Error('Addon category not found');
    }
    return category;
  }

  /**
   * Create addon category
   */
  async createAddonCategory(merchantId: bigint, data: CreateAddonCategoryDTO) {
    // Validation
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Category name is required');
    }

    if (data.name.trim().length > 100) {
      throw new Error('Category name must be less than 100 characters');
    }

    if (data.minSelection !== undefined && data.minSelection < 0) {
      throw new Error('Minimum selection cannot be negative');
    }

    if (data.maxSelection !== undefined && data.maxSelection !== null) {
      if (data.maxSelection < 0) {
        throw new Error('Maximum selection cannot be negative');
      }

      const minSel = data.minSelection || 0;
      if (data.maxSelection < minSel) {
        throw new Error(
          'Maximum selection must be greater than or equal to minimum selection'
        );
      }
    }

    return await this.repository.createAddonCategory(merchantId, data);
  }

  /**
   * Update addon category
   */
  async updateAddonCategory(
    id: bigint,
    merchantId: bigint,
    data: UpdateAddonCategoryDTO
  ) {
    // Verify category exists
    await this.getAddonCategoryById(id, merchantId);

    // Validation
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Category name is required');
      }

      if (data.name.trim().length > 100) {
        throw new Error('Category name must be less than 100 characters');
      }
    }

    if (data.minSelection !== undefined && data.minSelection < 0) {
      throw new Error('Minimum selection cannot be negative');
    }

    if (data.maxSelection !== undefined && data.maxSelection !== null) {
      if (data.maxSelection < 0) {
        throw new Error('Maximum selection cannot be negative');
      }

      // If both are provided, validate
      if (data.minSelection !== undefined && data.maxSelection < data.minSelection) {
        throw new Error(
          'Maximum selection must be greater than or equal to minimum selection'
        );
      }
    }

    const result = await this.repository.updateAddonCategory(
      id,
      merchantId,
      data
    );

    if (result.count === 0) {
      throw new Error('Failed to update addon category');
    }

    return await this.getAddonCategoryById(id, merchantId);
  }

  /**
   * Toggle addon category status
   */
  async toggleAddonCategoryActive(id: bigint, merchantId: bigint) {
    const result = await this.repository.toggleAddonCategoryActive(
      id,
      merchantId
    );

    if (!result) {
      throw new Error('Addon category not found');
    }

    return result;
  }

  /**
   * Delete addon category
   */
  async deleteAddonCategory(id: bigint, merchantId: bigint) {
    return await this.repository.deleteAddonCategory(id, merchantId);
  }

  // ==================== ADDON ITEMS ====================

  /**
   * Get addon items by category
   */
  async getAddonItems(addonCategoryId: bigint, merchantId: bigint) {
    return await this.repository.getAddonItems(addonCategoryId, merchantId);
  }

  /**
   * Get all addon items for a merchant
   */
  async getAllAddonItemsByMerchant(merchantId: bigint) {
    return await this.repository.getAllAddonItemsByMerchant(merchantId);
  }

  /**
   * Get single addon item
   */
  async getAddonItemById(id: bigint, merchantId: bigint) {
    const item = await this.repository.getAddonItemById(id, merchantId);
    if (!item) {
      throw new Error('Addon item not found');
    }
    return item;
  }

  /**
   * Create addon item
   */
  async createAddonItem(merchantId: bigint, data: CreateAddonItemDTO) {
    // Validation
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Addon item name is required');
    }

    if (data.name.trim().length > 100) {
      throw new Error('Addon item name must be less than 100 characters');
    }

    if (data.price === undefined || data.price === null) {
      throw new Error('Price is required');
    }

    if (data.price < 0) {
      throw new Error('Price cannot be negative');
    }

    if (data.trackStock) {
      if (data.stockQty !== undefined && data.stockQty < 0) {
        throw new Error('Stock quantity cannot be negative');
      }
    }

    return await this.repository.createAddonItem(merchantId, data);
  }

  /**
   * Update addon item
   */
  async updateAddonItem(
    id: bigint,
    merchantId: bigint,
    data: UpdateAddonItemDTO
  ) {
    // Verify item exists
    await this.getAddonItemById(id, merchantId);

    // Validation
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Addon item name is required');
      }

      if (data.name.trim().length > 100) {
        throw new Error('Addon item name must be less than 100 characters');
      }
    }

    if (data.price !== undefined && data.price < 0) {
      throw new Error('Price cannot be negative');
    }

    if (data.stockQty !== undefined && data.stockQty < 0) {
      throw new Error('Stock quantity cannot be negative');
    }

    return await this.repository.updateAddonItem(id, merchantId, data);
  }

  /**
   * Toggle addon item status
   */
  async toggleAddonItemActive(id: bigint, merchantId: bigint) {
    const result = await this.repository.toggleAddonItemActive(id, merchantId);

    if (!result) {
      throw new Error('Addon item not found');
    }

    return result;
  }

  /**
   * Update addon item stock (add/subtract)
   */
  async updateAddonItemStock(
    id: bigint,
    merchantId: bigint,
    quantity: number
  ) {
    if (quantity === 0) {
      throw new Error('Quantity must be non-zero');
    }

    return await this.repository.updateAddonItemStock(id, merchantId, quantity);
  }

  /**
   * Set addon item stock (absolute value)
   */
  async setAddonItemStock(id: bigint, merchantId: bigint, quantity: number) {
    if (quantity < 0) {
      throw new Error('Stock quantity cannot be negative');
    }

    return await this.repository.setAddonItemStock(id, merchantId, quantity);
  }

  /**
   * Delete addon item
   */
  async deleteAddonItem(id: bigint, merchantId: bigint) {
    return await this.repository.deleteAddonItem(id, merchantId);
  }

  // ==================== MENU-ADDON ASSOCIATIONS ====================

  /**
   * Get menus using an addon category
   */
  async getMenusByAddonCategory(addonCategoryId: bigint, merchantId: bigint) {
    return await this.repository.getMenusByAddonCategory(
      addonCategoryId,
      merchantId
    );
  }

  /**
   * Add addon category to menu
   */
  async addAddonCategoryToMenu(
    menuId: bigint,
    addonCategoryId: bigint,
    merchantId: bigint
  ) {
    return await this.repository.addAddonCategoryToMenu(
      menuId,
      addonCategoryId,
      merchantId
    );
  }

  /**
   * Remove addon category from menu
   */
  async removeAddonCategoryFromMenu(
    menuId: bigint,
    addonCategoryId: bigint,
    merchantId: bigint
  ) {
    return await this.repository.removeAddonCategoryFromMenu(
      menuId,
      addonCategoryId,
      merchantId
    );
  }

  /**
   * Reorder addon items within a category
   */
  async reorderAddonItems(
    addonCategoryId: bigint,
    merchantId: bigint,
    itemOrders: Array<{ id: bigint; displayOrder: number }>
  ) {
    // Validate display orders are non-negative
    for (const item of itemOrders) {
      if (item.displayOrder < 0) {
        throw new Error('Display order cannot be negative');
      }
    }

    return await this.repository.reorderAddonItems(
      addonCategoryId,
      merchantId,
      itemOrders
    );
  }

  /**
   * Get addon categories for a menu
   */
  async getAddonCategoriesByMenu(menuId: bigint, merchantId: bigint) {
    return await this.repository.getAddonCategoriesByMenu(menuId, merchantId);
  }

  /**
   * Update menu addon category (isRequired, displayOrder)
   */
  async updateMenuAddonCategory(
    menuId: bigint,
    addonCategoryId: bigint,
    merchantId: bigint,
    data: { isRequired?: boolean; displayOrder?: number }
  ) {
    if (data.displayOrder !== undefined && data.displayOrder < 0) {
      throw new Error('Display order cannot be negative');
    }

    return await this.repository.updateMenuAddonCategory(
      menuId,
      addonCategoryId,
      merchantId,
      data
    );
  }
}

const addonService = new AddonService();
export default addonService;
