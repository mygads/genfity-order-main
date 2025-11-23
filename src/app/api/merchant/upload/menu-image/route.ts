/**
 * Upload Menu Image API
 * POST /api/merchant/upload/menu-image
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import { BlobService } from '@/lib/services/BlobService';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';

/**
 * POST /api/merchant/upload/menu-image
 * Upload menu item image
 */
async function handlePost(req: NextRequest, context: AuthContext) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const menuId = formData.get('menuId') as string;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: 'FILE_REQUIRED',
          message: 'File is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Validate file
    const validation = BlobService.validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_FILE',
          message: validation.error,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    // Get merchant
    const merchantUser = await prisma.merchantUser.findFirst({
      where: { userId: context.userId },
      include: { merchant: true },
    });

    if (!merchantUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    // Delete old image if exists and menuId provided
    if (menuId) {
      // BlobService expects string|number for IDs; convert bigint to string where needed
      await BlobService.deleteOldMenuImage(String(merchantUser.merchantId), menuId);
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Vercel Blob
    const result = await BlobService.uploadMenuImage(
      String(merchantUser.merchantId),
      menuId ? String(menuId) : String(Date.now()),
      buffer
    );

    // Update menu item with new image URL if menuId provided
    if (menuId) {
      await prisma.menu.update({
        where: { id: BigInt(menuId) },
        data: { imageUrl: result.url },
      });
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Image uploaded successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'UPLOAD_FAILED',
        message: 'Failed to upload image',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
