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
      where: { merchantId },
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
  }) {
    const result = await prisma.menuCategory.create({
      data,
    });
    return serializeData(result);
  }

  async updateCategory(id: bigint, data: {
    name?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const result = await prisma.menuCategory.update({
      where: { id },
      data,
    });
    return serializeData(result);
  }

  async deleteCategory(id: bigint) {
    const result = await prisma.menuCategory.delete({
      where: { id },
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
        ...(categoryId && {
          categories: {
            some: {
              categoryId,
            },
          },
        }),
        ...(!includeInactive && { isActive: true }),
      },
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
                  where: { isActive: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return serializeData(results);
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
                addonItems: true,
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
    trackStock?: boolean;
    stockQty?: number;
  }) {
    const result = await prisma.menu.create({
      data,
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
    trackStock?: boolean;
    stockQty?: number;
  }) {
    const result = await prisma.menu.update({
      where: { id },
      data,
    });
    return serializeData(result);
  }

  async deleteMenu(id: bigint) {
    const result = await prisma.menu.delete({
      where: { id },
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
      where: { merchantId },
      include: {
        addonItems: true,
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
  }) {
    const result = await prisma.addonCategory.create({
      data,
    });
    return serializeData(result);
  }

  async updateAddonCategory(id: bigint, data: {
    name?: string;
    description?: string;
    minSelection?: number;
    maxSelection?: number;
    isActive?: boolean;
  }) {
    const result = await prisma.addonCategory.update({
      where: { id },
      data,
    });
    return serializeData(result);
  }

  async deleteAddonCategory(id: bigint) {
    const result = await prisma.addonCategory.delete({
      where: { id },
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
      where: { addonCategoryId: categoryId },
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
  }) {
    const result = await prisma.addonItem.create({
      data,
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
  }) {
    const result = await prisma.addonItem.update({
      where: { id },
      data,
    });
    return serializeData(result);
  }

  async deleteAddonItem(id: bigint) {
    const result = await prisma.addonItem.delete({
      where: { id },
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
