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

    const merchantCode = merchantUser.merchant.code;

    // Delete old image if exists and menuId provided
    if (menuId) {
      await BlobService.deleteOldMenuImage(merchantCode, menuId);
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

    // Upload to Vercel Blob
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
    if (menuId) {
      await prisma.menu.update({
        where: { id: BigInt(menuId) },
        data: {
          imageUrl: result.url,
          imageThumbUrl: thumbResult.url,
          imageThumbMeta: imageThumbMeta as unknown as object,
        },
      });
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
