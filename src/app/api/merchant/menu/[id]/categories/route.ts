/**
 * PUT /api/merchant/menu/[id]/categories - Update menu categories (many-to-many)
 * Replaces all existing category associations with new ones
 */

import { NextRequest, NextResponse } from "next/server";
import { withMerchant } from "@/lib/middleware/auth";
import prisma from "@/lib/db/client";
import { serializeBigInt } from "@/lib/utils/serializer";
import { getRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * PUT /api/merchant/menu/[id]/categories
 * Update menu categories (many-to-many relationship)
 */
export const PUT = withMerchant(async (req: NextRequest, authContext, routeContext: RouteContext) => {
  try {
    const { userId, merchantId } = authContext;

    // Be defensive: if params are mis-shaped we can still parse the id from the pathname.
    let menuIdStr = await getRouteParam(routeContext, 'id');
    if (!menuIdStr || !/^\d+$/.test(menuIdStr)) {
      const parts = req.nextUrl.pathname.split('/').filter(Boolean);
      const menuIndex = parts.lastIndexOf('menu');
      const candidate = menuIndex >= 0 ? parts[menuIndex + 1] : undefined;
      if (candidate && /^\d+$/.test(candidate)) {
        menuIdStr = candidate;
      }
    }

    if (!menuIdStr || !/^\d+$/.test(menuIdStr)) {
      return NextResponse.json(
        { success: false, message: 'Invalid menu id' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { categoryIds } = body;

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json(
        { success: false, message: "categoryIds must be an array" },
        { status: 400 }
      );
    }

    const menuIdNum = BigInt(menuIdStr);

    const parsedCategoryIds: bigint[] = [];
    if (categoryIds.length > 0) {
      try {
        for (const rawId of categoryIds) {
          parsedCategoryIds.push(BigInt(String(rawId)));
        }
      } catch {
        return NextResponse.json(
          { success: false, message: "categoryIds must contain valid numeric IDs" },
          { status: 400 }
        );
      }
    }

    // Verify menu belongs to merchant
    const menu = await prisma.menu.findFirst({
      where: {
        id: menuIdNum,
        merchantId: merchantId,
        deletedAt: null,
      },
    });

    if (!menu) {
      return NextResponse.json(
        { success: false, message: "Menu not found" },
        { status: 404 }
      );
    }

    // Verify all categories belong to merchant
    if (parsedCategoryIds.length > 0) {
      const categories = await prisma.menuCategory.findMany({
        where: {
          id: { in: parsedCategoryIds },
          merchantId: merchantId,
          deletedAt: null,
        },
      });

      if (categories.length !== parsedCategoryIds.length) {
        return NextResponse.json(
          { success: false, message: "One or more categories not found" },
          { status: 400 }
        );
      }
    }

    // Update categories in transaction
    await prisma.$transaction(async (tx) => {
      // Delete all existing category associations
      await tx.menuCategoryItem.deleteMany({
        where: { menuId: menuIdNum },
      });

      // Create new category associations
      if (parsedCategoryIds.length > 0) {
        await tx.menuCategoryItem.createMany({
          data: parsedCategoryIds.map((categoryId) => ({
            menuId: menuIdNum,
            categoryId,
          })),
        });
      }

      // Update menu's updatedAt and updatedByUserId
      await tx.menu.update({
        where: { id: menuIdNum },
        data: {
          updatedByUserId: userId,
        },
      });
    });

    // Fetch updated menu with categories
    const updatedMenu = await prisma.menu.findUnique({
      where: { id: menuIdNum },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Menu categories updated successfully",
      data: serializeBigInt(updatedMenu),
    });
  } catch (error) {
    console.error("Update menu categories error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to update menu categories",
      },
      { status: 500 }
    );
  }
});
