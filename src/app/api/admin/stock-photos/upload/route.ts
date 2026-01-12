/**
 * Stock Photo Upload API
 * 
 * POST /api/admin/stock-photos/upload - Upload image file to blob storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { BlobService } from '@/lib/services/BlobService';
import type { AuthContext } from '@/lib/middleware/auth';
import sharp from 'sharp';

/**
 * POST - Upload stock photo image to blob storage
 */
async function postHandler(request: NextRequest, _authContext: AuthContext) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'No file provided',
        statusCode: 400,
      }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'File must be an image',
        statusCode: 400,
      }, { status: 400 });
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'File size must be less than 5MB',
        statusCode: 400,
      }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = file.name.split('.').pop() || 'jpg';
    const pathname = `stock-photos/${timestamp}.${extension}`;

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const sourceMetadata = await sharp(buffer).metadata();
    const sourceWidth = sourceMetadata.width ?? null;
    const sourceHeight = sourceMetadata.height ?? null;

    const thumbJpegBuffer = await sharp(buffer)
      .rotate()
      .resize(600, 600, { fit: 'cover' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    const thumb2xJpegBuffer = await sharp(buffer)
      .rotate()
      .resize(1200, 1200, { fit: 'cover' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    // Upload to blob storage
    const result = await BlobService.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 86400 * 365, // 1 year cache for stock photos
    });

    const thumbResult = await BlobService.uploadFile(
      thumbJpegBuffer,
      `stock-photos/thumbs/${timestamp}-thumb.jpg`,
      {
        access: 'public',
        addRandomSuffix: true,
        cacheControlMaxAge: 86400 * 365,
        contentType: 'image/jpeg',
      }
    );

    const thumb2xResult = await BlobService.uploadFile(
      thumb2xJpegBuffer,
      `stock-photos/thumbs/${timestamp}-thumb-2x.jpg`,
      {
        access: 'public',
        addRandomSuffix: true,
        cacheControlMaxAge: 86400 * 365,
        contentType: 'image/jpeg',
      }
    );

    const thumbMeta = {
      format: 'jpeg',
      source: {
        width: sourceWidth,
        height: sourceHeight,
        format: sourceMetadata.format ?? null,
      },
      variants: [
        { dpr: 1, width: 600, height: 600, url: thumbResult.url },
        { dpr: 2, width: 1200, height: 1200, url: thumb2xResult.url },
      ],
    };

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        pathname: result.pathname,
        thumbUrl: thumbResult.url,
        thumb2xUrl: thumb2xResult.url,
        thumbMeta,
      },
      message: 'Image uploaded successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Stock photo upload error:', error);
    return NextResponse.json({
      success: false,
      error: 'UPLOAD_ERROR',
      message: 'Failed to upload image',
      statusCode: 500,
    }, { status: 500 });
  }
}

export const POST = withSuperAdmin(postHandler);
