import prisma from '@/lib/db/client';
import { Prisma } from '@prisma/client';

/**
 * Menu Builder Service
 * 
 * Handles complex menu creation and updates with categories and addon categories
 * in a single transaction. Simplifies the menu creation workflow from 4 pages to 1.
 */

export interface MenuBuilderInput {
  // Basic Info
  name: string;
  description?: string;
  price: number;
  imageUrl?: string | null;
  isActive?: boolean;
  isPromo?: boolean;
  promoPrice?: number | null;
  promoStartDate?: Date | null;
  promoEndDate?: Date | null;
  
  // Stock Management
  trackStock?: boolean;
  stockQty?: number | null;
  dailyStockTemplate?: number | null;
  autoResetStock?: boolean;
  
  // Categories (many-to-many)
  categoryIds?: number[];
  
  // Addon Categories (many-to-many)
  addonCategoryIds?: number[];
}

export interface MenuBuilderResult {
  menu: {
    id: string;
    name: string;
    price: number;
    categories: Array<{ id: string; name: string }>;
    addonCategories: Array<{ id: string; name: string }>;
  };
}

export class MenuBuilderService {
  /**
   * Create a complete menu with categories and addon categories
   * 
   * @param merchantId - Merchant ID
   * @param userId - User ID for audit trail
   * @param input - Menu builder input data
   * @returns Created menu with all relations
   */
  static async createMenu(
    merchantId: bigint,
    userId: bigint,
    input: MenuBuilderInput
  ): Promise<MenuBuilderResult> {
    return await prisma.$transaction(async (tx) => {
      // 1. Create the menu
      const menu = await tx.menu.create({
        data: {
          merchantId,
          name: input.name,
          description: input.description,
          price: new Prisma.Decimal(input.price),
          imageUrl: input.imageUrl,
          isActive: input.isActive ?? true,
          isPromo: input.isPromo ?? false,
          promoPrice: input.promoPrice ? new Prisma.Decimal(input.promoPrice) : null,
          promoStartDate: input.promoStartDate,
          promoEndDate: input.promoEndDate,
          trackStock: input.trackStock ?? false,
          stockQty: input.stockQty,
          dailyStockTemplate: input.dailyStockTemplate,
          autoResetStock: input.autoResetStock ?? false,
          createdByUserId: userId,
          updatedByUserId: userId,
        },
      });

      // 2. Associate with categories (many-to-many)
      if (input.categoryIds && input.categoryIds.length > 0) {
        // Verify all categories belong to this merchant
        const categories = await tx.menuCategory.findMany({
          where: {
            id: { in: input.categoryIds.map(id => BigInt(id)) },
            merchantId,
            deletedAt: null,
          },
        });

        if (categories.length !== input.categoryIds.length) {
          throw new Error('Beberapa kategori tidak valid atau tidak ditemukan');
        }

        // Create menu-category associations
        await tx.menuCategoryItem.createMany({
          data: categories.map((cat: { id: bigint }) => ({
            menuId: menu.id,
            categoryId: cat.id,
          })),
        });
      }

      // 3. Associate with addon categories (many-to-many)
      if (input.addonCategoryIds && input.addonCategoryIds.length > 0) {
        // Verify all addon categories belong to this merchant
        const addonCategories = await tx.addonCategory.findMany({
          where: {
            id: { in: input.addonCategoryIds.map(id => BigInt(id)) },
            merchantId,
            deletedAt: null,
          },
        });

        if (addonCategories.length !== input.addonCategoryIds.length) {
          throw new Error('Beberapa kategori addon tidak valid atau tidak ditemukan');
        }

        // Create menu-addon-category associations
        await tx.menuAddonCategory.createMany({
          data: addonCategories.map((addonCat: { id: bigint }, index: number) => ({
            menuId: menu.id,
            addonCategoryId: addonCat.id,
            displayOrder: index,
          })),
        });
      }

      // 4. Fetch complete menu with relations
      const completeMenu = await tx.menu.findUnique({
        where: { id: menu.id },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          addonCategories: {
            include: {
              addonCategory: true,
            },
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
      });

      if (!completeMenu) {
        throw new Error('Menu tidak ditemukan setelah dibuat');
      }

      return {
        menu: {
          id: completeMenu.id.toString(),
          name: completeMenu.name,
          price: completeMenu.price.toNumber(),
          categories: completeMenu.categories.map((item) => ({
            id: item.category.id.toString(),
            name: item.category.name,
          })),
          addonCategories: completeMenu.addonCategories.map((item) => ({
            id: item.addonCategory.id.toString(),
            name: item.addonCategory.name,
          })),
        },
      };
    });
  }

  /**
   * Update a menu with categories and addon categories
   * 
   * @param menuId - Menu ID to update
   * @param merchantId - Merchant ID for verification
   * @param userId - User ID for audit trail
   * @param input - Menu builder input data
   * @returns Updated menu with all relations
   */
  static async updateMenu(
    menuId: bigint,
    merchantId: bigint,
    userId: bigint,
    input: MenuBuilderInput
  ): Promise<MenuBuilderResult> {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify menu exists and belongs to merchant
      const existingMenu = await tx.menu.findFirst({
        where: {
          id: menuId,
          merchantId,
          deletedAt: null,
        },
      });

      if (!existingMenu) {
        throw new Error('Menu tidak ditemukan');
      }

      // 2. Update the menu
      const menu = await tx.menu.update({
        where: { id: menuId },
        data: {
          name: input.name,
          description: input.description,
          price: new Prisma.Decimal(input.price),
          imageUrl: input.imageUrl,
          isActive: input.isActive,
          isPromo: input.isPromo,
          promoPrice: input.promoPrice ? new Prisma.Decimal(input.promoPrice) : null,
          promoStartDate: input.promoStartDate,
          promoEndDate: input.promoEndDate,
          trackStock: input.trackStock,
          stockQty: input.stockQty,
          dailyStockTemplate: input.dailyStockTemplate,
          autoResetStock: input.autoResetStock,
          updatedByUserId: userId,
        },
      });

      // 3. Update categories (delete all + recreate)
      if (input.categoryIds !== undefined) {
        await tx.menuCategoryItem.deleteMany({
          where: { menuId },
        });

        if (input.categoryIds.length > 0) {
          const categories = await tx.menuCategory.findMany({
            where: {
              id: { in: input.categoryIds.map(id => BigInt(id)) },
              merchantId,
              deletedAt: null,
            },
          });

          if (categories.length !== input.categoryIds.length) {
            throw new Error('Beberapa kategori tidak valid atau tidak ditemukan');
          }

          await tx.menuCategoryItem.createMany({
            data: categories.map((cat: { id: bigint }) => ({
              menuId: menu.id,
              categoryId: cat.id,
            })),
          });
        }
      }

      // 4. Update addon categories (delete all + recreate)
      if (input.addonCategoryIds !== undefined) {
        await tx.menuAddonCategory.deleteMany({
          where: { menuId },
        });

        if (input.addonCategoryIds.length > 0) {
          const addonCategories = await tx.addonCategory.findMany({
            where: {
              id: { in: input.addonCategoryIds.map(id => BigInt(id)) },
              merchantId,
              deletedAt: null,
            },
          });

          if (addonCategories.length !== input.addonCategoryIds.length) {
            throw new Error('Beberapa kategori addon tidak valid atau tidak ditemukan');
          }

          await tx.menuAddonCategory.createMany({
            data: addonCategories.map((addonCat: { id: bigint }, index: number) => ({
              menuId: menu.id,
              addonCategoryId: addonCat.id,
              displayOrder: index,
            })),
          });
        }
      }

      // 5. Fetch complete menu with relations
      const completeMenu = await tx.menu.findUnique({
        where: { id: menu.id },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          addonCategories: {
            include: {
              addonCategory: true,
            },
            orderBy: {
              displayOrder: 'asc',
            },
          },
        },
      });

      if (!completeMenu) {
        throw new Error('Menu tidak ditemukan setelah update');
      }

      return {
        menu: {
          id: completeMenu.id.toString(),
          name: completeMenu.name,
          price: completeMenu.price.toNumber(),
          categories: completeMenu.categories.map((item) => ({
            id: item.category.id.toString(),
            name: item.category.name,
          })),
          addonCategories: completeMenu.addonCategories.map((item) => ({
            id: item.addonCategory.id.toString(),
            name: item.addonCategory.name,
          })),
        },
      };
    });
  }

  /**
   * Get complete menu details for builder
   * 
   * @param menuId - Menu ID
   * @param merchantId - Merchant ID for verification
   * @returns Complete menu with all relations
   */
  static async getMenuForBuilder(menuId: bigint, merchantId: bigint) {
    const menu = await prisma.menu.findFirst({
      where: {
        id: menuId,
        merchantId,
        deletedAt: null,
      },
      include: {
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
                  where: {
                    deletedAt: null,
                  },
                  orderBy: {
                    displayOrder: 'asc',
                  },
                },
              },
            },
          },
          orderBy: {
            displayOrder: 'asc',
          },
        },
      },
    });

    if (!menu) {
      throw new Error('Menu tidak ditemukan');
    }

    return menu;
  }
}
