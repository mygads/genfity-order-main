/**
 * Menu Repository
 * Handles menu, categories, and addons operations
 */

import prisma from '@/lib/db/client';
import { serializeData } from '@/lib/utils/serializer';

export class MenuRepository {
  /**
   * ========================================
   * MENU CATEGORIES
   * ========================================
   */

  async findAllCategories(merchantId: bigint) {
    const results = await prisma.menuCategory.findMany({
      where: {
        merchantId,
        deletedAt: null,
      },
      orderBy: { sortOrder: 'asc' },
    });
    return serializeData(results);
  }

  async findCategoryById(id: bigint) {
    const result = await prisma.menuCategory.findUnique({
      where: { id },
    });
    return serializeData(result);
  }

  async createCategory(data: {
    merchantId: bigint;
    name: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
    createdByUserId?: bigint;
  }) {
    const result = await prisma.menuCategory.create({
      data: {
        ...data,
        updatedByUserId: data.createdByUserId,
      },
    });
    return serializeData(result);
  }

  async updateCategory(id: bigint, data: {
    name?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
    updatedByUserId?: bigint;
  }) {
    const result = await prisma.menuCategory.update({
      where: { id },
      data,
    });
    return serializeData(result);
  }

  async deleteCategory(id: bigint, deletedByUserId?: bigint) {
    const result = await prisma.menuCategory.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedByUserId,
      },
    });
    return serializeData(result);
  }

  /**
   * ========================================
   * MENUS
   * ========================================
   */

  async findAllMenus(merchantId: bigint, categoryId?: bigint, includeInactive = true) {
    const results = await prisma.menu.findMany({
      where: {
        merchantId,
        // ✅ NEW: Use many-to-many relationship
        ...(categoryId && {
          categories: {
            some: {
              categoryId: categoryId,
            },
          },
        }),
        ...(includeInactive ? {} : { isActive: true }),
      },
      include: {
        // ✅ Include all categories (many-to-many)
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        addonCategories: {
          include: {
            addonCategory: {
              include: {
                addonItems: {
                  where: {
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return results;
  }

  async findMenuById(id: bigint) {
    const result = await prisma.menu.findUnique({
      where: { id },
      include: {
        category: true, // Keep for backward compatibility
        categories: {
          include: {
            category: true,
          },
        },
        addonCategories: {
          include: {
            addonCategory: {
              include: {
                addonItems: {
                  orderBy: { displayOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });
    return serializeData(result);
  }

  async createMenu(data: {
    merchantId: bigint;
    categoryId?: bigint;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isActive?: boolean;
    isPromo?: boolean;
    isSpicy?: boolean;
    isBestSeller?: boolean;
    isSignature?: boolean;
    isRecommended?: boolean;
    trackStock?: boolean;
    stockQty?: number;
    dailyStockTemplate?: number;
    autoResetStock?: boolean;
    createdByUserId?: bigint;
  }) {
    const result = await prisma.menu.create({
      data: {
        ...data,
        updatedByUserId: data.createdByUserId,
      },
    });
    return serializeData(result);
  }

  async updateMenu(id: bigint, data: {
    categoryId?: bigint;
    name?: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    isActive?: boolean;
    isPromo?: boolean;
    isSpicy?: boolean;
    isBestSeller?: boolean;
    isSignature?: boolean;
    isRecommended?: boolean;
    trackStock?: boolean;
    stockQty?: number;
    dailyStockTemplate?: number;
    autoResetStock?: boolean;
    updatedByUserId?: bigint;
  }) {
    const result = await prisma.menu.update({
      where: { id },
      data,
    });
    return serializeData(result);
  }

  async deleteMenu(id: bigint, deletedByUserId?: bigint) {
    const result = await prisma.menu.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedByUserId,
      },
    });
    return serializeData(result);
  }

  async updateStock(id: bigint, quantity: number) {
    const result = await prisma.menu.update({
      where: { id },
      data: {
        stockQty: {
          decrement: quantity,
        },
      },
    });
    return serializeData(result);
  }

  /**
   * ========================================
   * MENU CATEGORIES (Many-to-Many)
   * ========================================
   */

  async addMenuCategories(menuId: bigint, categoryIds: bigint[]) {
    const results = await Promise.all(
      categoryIds.map((categoryId) =>
        prisma.menuCategoryItem.create({
          data: {
            menuId,
            categoryId,
          },
        })
      )
    );
    return serializeData(results);
  }

  async removeMenuCategory(menuId: bigint, categoryId: bigint) {
    const result = await prisma.menuCategoryItem.deleteMany({
      where: {
        menuId,
        categoryId,
      },
    });
    return serializeData(result);
  }

  async removeAllMenuCategories(menuId: bigint) {
    const result = await prisma.menuCategoryItem.deleteMany({
      where: { menuId },
    });
    return serializeData(result);
  }

  async setMenuCategories(menuId: bigint, categoryIds: bigint[]) {
    // Remove all existing categories
    await this.removeAllMenuCategories(menuId);
    
    // Add new categories
    if (categoryIds.length > 0) {
      return await this.addMenuCategories(menuId, categoryIds);
    }
    
    return [];
  }

  /**
   * ========================================
   * ADDON CATEGORIES
   * ========================================
   */

  async findAllAddonCategories(merchantId: bigint) {
    const results = await prisma.addonCategory.findMany({
      where: {
        merchantId,
        deletedAt: null,
      },
      include: {
        addonItems: {
          where: {
            deletedAt: null,
          },
        },
      },
    });
    return serializeData(results);
  }

  async findAddonCategoryById(id: bigint) {
    const result = await prisma.addonCategory.findUnique({
      where: { id },
      include: {
        addonItems: true,
      },
    });
    return serializeData(result);
  }

  async createAddonCategory(data: {
    merchantId: bigint;
    name: string;
    description?: string;
    minSelection?: number;
    maxSelection?: number;
    isActive?: boolean;
    createdByUserId?: bigint;
  }) {
    const result = await prisma.addonCategory.create({
      data: {
        ...data,
        updatedByUserId: data.createdByUserId,
      },
    });
    return serializeData(result);
  }

  async updateAddonCategory(id: bigint, data: {
    name?: string;
    description?: string;
    minSelection?: number;
    maxSelection?: number;
    isActive?: boolean;
    updatedByUserId?: bigint;
  }) {
    const result = await prisma.addonCategory.update({
      where: { id },
      data,
    });
    return serializeData(result);
  }

  async deleteAddonCategory(id: bigint, deletedByUserId?: bigint) {
    const result = await prisma.addonCategory.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedByUserId,
      },
    });
    return serializeData(result);
  }

  /**
   * ========================================
   * ADDON ITEMS
   * ========================================
   */

  async findAddonItemsByCategoryId(categoryId: bigint) {
    const results = await prisma.addonItem.findMany({
      where: {
        addonCategoryId: categoryId,
        deletedAt: null,
      },
    });
    return serializeData(results);
  }

  async findAddonItemById(id: bigint) {
    const result = await prisma.addonItem.findUnique({
      where: { id },
    });
    return serializeData(result);
  }

  async createAddonItem(data: {
    addonCategoryId: bigint;
    name: string;
    description?: string;
    price: number;
    isActive?: boolean;
    trackStock?: boolean;
    stockQty?: number;
    dailyStockTemplate?: number;
    autoResetStock?: boolean;
    createdByUserId?: bigint;
  }) {
    const result = await prisma.addonItem.create({
      data: {
        ...data,
        updatedByUserId: data.createdByUserId,
      },
    });
    return serializeData(result);
  }

  async updateAddonItem(id: bigint, data: {
    name?: string;
    description?: string;
    price?: number;
    isActive?: boolean;
    trackStock?: boolean;
    stockQty?: number;
    dailyStockTemplate?: number;
    autoResetStock?: boolean;
    updatedByUserId?: bigint;
  }) {
    const result = await prisma.addonItem.update({
      where: { id },
      data,
    });
    return serializeData(result);
  }

  async deleteAddonItem(id: bigint, deletedByUserId?: bigint) {
    const result = await prisma.addonItem.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedByUserId,
      },
    });
    return serializeData(result);
  }

  async updateAddonStock(id: bigint, quantity: number) {
    const result = await prisma.addonItem.update({
      where: { id },
      data: {
        stockQty: {
          decrement: quantity,
        },
      },
    });
    return serializeData(result);
  }

  /**
   * Reset stock to daily template for addon item
   */
  async resetAddonStockToTemplate(id: bigint, updatedByUserId?: bigint) {
    const addonItem = await prisma.addonItem.findUnique({
      where: { id },
      select: { dailyStockTemplate: true },
    });

    if (!addonItem || addonItem.dailyStockTemplate === null) {
      throw new Error('Template stok harian belum diatur');
    }

    const result = await prisma.addonItem.update({
      where: { id },
      data: {
        stockQty: addonItem.dailyStockTemplate,
        lastStockResetAt: new Date(),
        updatedByUserId,
      },
    });
    return serializeData(result);
  }

  /**
   * Reset stock to daily template for menu item
   */
  async resetMenuStockToTemplate(id: bigint, updatedByUserId?: bigint) {
    const menu = await prisma.menu.findUnique({
      where: { id },
      select: { dailyStockTemplate: true },
    });

    if (!menu || menu.dailyStockTemplate === null) {
      throw new Error('Template stok harian belum diatur');
    }

    const result = await prisma.menu.update({
      where: { id },
      data: {
        stockQty: menu.dailyStockTemplate,
        lastStockResetAt: new Date(),
        updatedByUserId,
      },
    });
    return serializeData(result);
  }

  /**
   * Get all items with low stock (for Stock Management Dashboard)
   */
  async getLowStockItems(merchantId: bigint, threshold = 5) {
    const menus = await prisma.menu.findMany({
      where: {
        merchantId,
        deletedAt: null,
        trackStock: true,
        stockQty: {
          lte: threshold,
        },
      },
      select: {
        id: true,
        name: true,
        stockQty: true,
        dailyStockTemplate: true,
        isActive: true,
      },
    });

    const addonItems = await prisma.addonItem.findMany({
      where: {
        addonCategory: {
          merchantId,
          deletedAt: null,
        },
        deletedAt: null,
        trackStock: true,
        stockQty: {
          lte: threshold,
        },
      },
      select: {
        id: true,
        name: true,
        stockQty: true,
        dailyStockTemplate: true,
        isActive: true,
        addonCategory: {
          select: {
            name: true,
          },
        },
      },
    });

    return serializeData({
      menus,
      addonItems,
    });
  }

  /**
   * ========================================
   * MENU-ADDON LINKING
   * ========================================
   */

  async linkAddonToMenu(menuId: bigint, addonCategoryId: bigint) {
    const result = await prisma.menuAddonCategory.create({
      data: {
        menuId,
        addonCategoryId,
      },
    });
    return serializeData(result);
  }

  async unlinkAddonFromMenu(menuId: bigint, addonCategoryId: bigint) {
    const result = await prisma.menuAddonCategory.delete({
      where: {
        menuId_addonCategoryId: {
          menuId,
          addonCategoryId,
        },
      },
    });
    return serializeData(result);
  }

  async getMenuAddons(menuId: bigint) {
    const results = await prisma.menuAddonCategory.findMany({
      where: { menuId },
      include: {
        addonCategory: {
          include: {
            addonItems: {
              where: { isActive: true },
            },
          },
        },
      },
    });
    return serializeData(results);
  }
}

const menuRepository = new MenuRepository();
export default menuRepository;
