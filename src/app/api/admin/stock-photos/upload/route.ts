/**
 * Stock Photo Upload API
 * 
 * POST /api/admin/stock-photos/upload - Upload image file to blob storage
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { BlobService } from '@/lib/services/BlobService';
import type { AuthContext } from '@/lib/middleware/auth';

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

    // Upload to blob storage
    const result = await BlobService.uploadFile(file, pathname, {
      access: 'public',
      addRandomSuffix: true,
      cacheControlMaxAge: 86400 * 365, // 1 year cache for stock photos
    });

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        pathname: result.pathname,
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
