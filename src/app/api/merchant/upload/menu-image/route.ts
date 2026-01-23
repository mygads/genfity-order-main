/**
 * Upload Menu Image API
 * POST /api/merchant/upload/menu-image
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import { BlobService } from '@/lib/services/BlobService';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import sharp from 'sharp';

/**
 * POST /api/merchant/upload/menu-image
 * Upload menu item image
 */
async function handlePost(req: NextRequest, context: AuthContext) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const menuId = formData.get('menuId') as string;
    const warnings: string[] = [];

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

    if (!context.merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_ID_REQUIRED',
          message: 'Merchant ID is required',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: context.merchantId },
      select: { id: true, code: true },
    });

    if (!merchant) {
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

    const merchantCode = merchant.code;

    let menuIdValue: bigint | null = null;
    let previousImageUrl: string | null = null;
    let previousThumbUrl: string | null = null;
    let previousThumbMeta: any = null;
    if (menuId) {
      try {
        menuIdValue = BigInt(menuId);
      } catch {
        return NextResponse.json(
          {
            success: false,
            error: 'INVALID_MENU_ID',
            message: 'menuId must be numeric',
            statusCode: 400,
          },
          { status: 400 }
        );
      }

      const menu = await prisma.menu.findFirst({
        where: { id: menuIdValue, merchantId: merchant.id },
        select: {
          id: true,
          imageUrl: true,
          imageThumbUrl: true,
          imageThumbMeta: true,
        },
      });

      if (!menu) {
        return NextResponse.json(
          {
            success: false,
            error: 'MENU_NOT_FOUND',
            message: 'Menu not found',
            statusCode: 404,
          },
          { status: 404 }
        );
      }

      previousImageUrl = menu.imageUrl;
      previousThumbUrl = menu.imageThumbUrl;
      previousThumbMeta = menu.imageThumbMeta;
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Read image metadata for validation/warnings
    const sourceMetadata = await sharp(buffer).metadata();
    const sourceWidth = sourceMetadata.width ?? null;
    const sourceHeight = sourceMetadata.height ?? null;

    if (sourceWidth !== null && sourceWidth < 800) {
      warnings.push(
        `Image is quite small (${sourceWidth}px wide). For best quality in menu detail/zoom, upload an image at least 800px wide.`
      );
    }

    // Normalize to JPEG and create a thumbnail
    const fullJpegBuffer = await sharp(buffer)
      .rotate()
      .jpeg({ quality: 95, mozjpeg: true })
      .toBuffer();

    const thumbJpegBuffer = await sharp(buffer)
      .rotate()
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    const thumb2xJpegBuffer = await sharp(buffer)
      .rotate()
      .resize(600, 600, { fit: 'cover' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    const imageKey = menuId ? String(menuId) : String(Date.now());

    // Upload to R2 storage
    const result = await BlobService.uploadMenuImage(merchantCode, imageKey, fullJpegBuffer);

    const thumbResult = await BlobService.uploadMenuImageThumbnail(merchantCode, imageKey, thumbJpegBuffer);

    const thumb2xResult = await BlobService.uploadMenuImageThumbnail2x(
      merchantCode,
      imageKey,
      thumb2xJpegBuffer
    );

    const imageThumbMeta = {
      format: 'jpeg',
      source: {
        width: sourceWidth,
        height: sourceHeight,
        format: sourceMetadata.format ?? null,
      },
      variants: [
        { dpr: 1, width: 300, height: 300, url: thumbResult.url },
        { dpr: 2, width: 600, height: 600, url: thumb2xResult.url },
      ],
    };

    // Update menu item with new image URL if menuId provided
    if (menuIdValue) {
      await prisma.menu.update({
        where: { id: menuIdValue },
        data: {
          imageUrl: result.url,
          imageThumbUrl: thumbResult.url,
          imageThumbMeta: imageThumbMeta as unknown as object,
          updatedByUserId: context.userId,
        },
      });

      // Best-effort cleanup previous assets AFTER successful DB update
      const urlsToDelete: string[] = [];
      if (previousImageUrl && previousImageUrl !== result.url) {
        urlsToDelete.push(previousImageUrl);
      }
      if (previousThumbUrl && previousThumbUrl !== thumbResult.url) {
        urlsToDelete.push(previousThumbUrl);
      }

      const oldVariants = previousThumbMeta?.variants;
      if (Array.isArray(oldVariants)) {
        for (const variant of oldVariants) {
          const url = variant?.url;
          if (typeof url === 'string') urlsToDelete.push(url);
        }
      }

      if (urlsToDelete.length > 0) {
        await Promise.all(
          urlsToDelete.map(async (url) => {
            try {
              await BlobService.deleteFile(url);
            } catch {
              warnings.push('Failed to delete a previous image from storage.');
            }
          })
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        thumbUrl: thumbResult.url,
        thumb2xUrl: thumb2xResult.url,
        thumbMeta: imageThumbMeta,
        warnings,
      },
      message: warnings.length > 0 ? 'Image uploaded with warnings' : 'Image uploaded successfully',
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
