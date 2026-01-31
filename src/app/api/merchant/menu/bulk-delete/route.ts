import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import prisma from "@/lib/db/client";
import { withMerchant } from "@/lib/middleware/auth";
import { serializeBigInt } from "@/lib/utils/serializer";

/**
 * POST /api/merchant/menu/bulk-delete
 * Bulk soft delete menu items
 */
export const POST = withMerchant(async (req: NextRequest, authContext) => {
  try {
    const { userId, merchantId } = authContext;
    const body = await req.json();
    const { ids } = body;

    // Validation
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_IDS', message: "Menu item IDs are required", statusCode: 400 },
        { status: 400 }
      );
    }

    // Convert string IDs to BigInt
    const menuIds = ids.map((id) => BigInt(id));

    // Verify all menus belong to this merchant
    const menus = await prisma.menu.findMany({
      where: {
        id: { in: menuIds },
        merchantId: merchantId,
        deletedAt: null, // Only non-deleted menus
      },
    });

    if (menus.length !== menuIds.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'NOT_FOUND',
          message: "Some menu items not found or already deleted",
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Soft delete (set deletedAt and deletedByUserId)
    const result = await prisma.menu.updateMany({
      where: {
        id: { in: menuIds },
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
      message: `Successfully deleted ${result.count} menu item(s)`,
      data: serializeBigInt({ count: result.count }),
    });
  } catch (error) {
    console.error("Bulk delete menu error:", error);
    return NextResponse.json(
      { 
        success: false,
        error: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : "Failed to delete menu items",
        statusCode: 500,
      },
      { status: 500 }
    );
  }
});
