import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import prisma from "@/lib/db/client";
import { withMerchant } from "@/lib/middleware/auth";
import { serializeBigInt } from "@/lib/utils/serializer";

/**
 * POST /api/merchant/categories/bulk-delete
 * Bulk soft delete categories
 */
export const POST = withMerchant(async (req: NextRequest, authContext) => {
  try {
    const { userId, merchantId } = authContext;
    const body = await req.json();
    const { ids } = body;

    // Validation
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_IDS', message: "Category IDs are required", statusCode: 400 },
        { status: 400 }
      );
    }

    // Convert string IDs to BigInt
    const categoryIds = ids.map((id) => BigInt(id));

    // Verify all categories belong to this merchant
    const categories = await prisma.menuCategory.findMany({
      where: {
        id: { in: categoryIds },
        merchantId: merchantId,
        deletedAt: null, // Only non-deleted categories
      },
    });

    if (categories.length !== categoryIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: "Some categories not found or already deleted",
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Soft delete (set deletedAt and deletedByUserId)
    const result = await prisma.menuCategory.updateMany({
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

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.count} category(ies)`,
      data: serializeBigInt({ count: result.count }),
    });
  } catch (error) {
    console.error("Bulk delete categories error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : "Failed to delete categories",
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
