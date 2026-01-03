/**
 * Bulk Upload Stock Photos API
 * 
 * POST /api/admin/stock-photos/bulk - Upload multiple photos to a category
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import type { AuthContext } from '@/lib/middleware/auth';

interface BulkPhotoItem {
  name: string;
  imageUrl: string;
  thumbnailUrl?: string;
}

/**
 * POST - Bulk create stock photos
 */
async function postHandler(request: NextRequest, authContext: AuthContext) {
  const body = await request.json();
  const { category, photos } = body as { category: string; photos: BulkPhotoItem[] };

  // Validation
  if (!category || !photos || !Array.isArray(photos) || photos.length === 0) {
    return NextResponse.json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Category and photos array are required',
      statusCode: 400,
    }, { status: 400 });
  }

  // Validate each photo
  for (const photo of photos) {
    if (!photo.name || !photo.imageUrl) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Each photo must have name and imageUrl',
        statusCode: 400,
      }, { status: 400 });
    }
  }

  // Normalize category
  const normalizedCategory = category
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Create all photos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createdPhotos = await prisma.$transaction(
    photos.map(photo =>
      (prisma as any).stockPhoto.create({
        data: {
          category: normalizedCategory,
          name: photo.name.trim(),
          imageUrl: photo.imageUrl,
          thumbnailUrl: photo.thumbnailUrl || null,
          uploadedByUserId: authContext.userId,
        },
      })
    )
  );

  return NextResponse.json({
    success: true,
    data: {
      count: createdPhotos.length,
      photos: serializeBigInt(createdPhotos),
    },
    message: `${createdPhotos.length} stock photos created successfully`,
    statusCode: 201,
  }, { status: 201 });
}

export const POST = withSuperAdmin(postHandler);
