import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import prisma from "@/lib/db/client";
import { withMerchant } from "@/lib/middleware/auth";
import { serializeBigInt } from "@/lib/utils/serializer";

/**
 * POST /api/merchant/addon-categories/bulk-delete
 * Bulk soft delete addon categories
 */
export const POST = withMerchant(async (req: NextRequest, authContext) => {
  try {
    const { userId, merchantId } = authContext;
    const body = await req.json();
    const { ids } = body;

    // Validation
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "Addon category IDs are required" },
        { status: 400 }
      );
    }

    // Convert string IDs to BigInt
    const categoryIds = ids.map((id) => BigInt(id));

    // Verify all categories belong to this merchant
    const categories = await prisma.addonCategory.findMany({
      where: {
        id: { in: categoryIds },
        merchantId: merchantId,
        deletedAt: null, // Only non-deleted categories
      },
    });

    if (categories.length !== categoryIds.length) {
      return NextResponse.json(
        { success: false, message: "Some addon categories not found or already deleted" },
        { status: 404 }
      );
    }

    // Use transaction to soft delete categories and their items
    await prisma.$transaction(async (tx) => {
      // Soft delete addon categories
      await tx.addonCategory.updateMany({
        where: {
          id: { in: categoryIds },
          merchantId: merchantId,
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedByUserId: userId,
        },
      });

      // Soft delete all addon items in these categories
      await tx.addonItem.updateMany({
        where: {
          addonCategoryId: { in: categoryIds },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
          deletedByUserId: userId,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${categories.length} addon category(ies) and their items`,
      data: serializeBigInt({ count: categories.length }),
    });
  } catch (error) {
    console.error("Bulk delete addon categories error:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error instanceof Error ? error.message : "Failed to delete addon categories" 
      },
      { status: 500 }
    );
  }
});
