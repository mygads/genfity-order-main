/**
 * Stock Photo Detail API - Super Admin Management
 * 
 * GET /api/admin/stock-photos/[id] - Get single stock photo
 * PUT /api/admin/stock-photos/[id] - Update stock photo
 * DELETE /api/admin/stock-photos/[id] - Soft delete stock photo
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import type { AuthContext } from '@/lib/middleware/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET - Get single stock photo
 */
async function getHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const { id } = await context.params;
  const photoId = BigInt(id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const photo = await (prisma as any).stockPhoto.findUnique({
    where: { id: photoId },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!photo) {
    return NextResponse.json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Stock photo not found',
      statusCode: 404,
    }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: serializeBigInt(photo),
    message: 'Stock photo retrieved successfully',
    statusCode: 200,
  });
}

/**
 * PUT - Update stock photo
 */
async function putHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const { id } = await context.params;
  const photoId = BigInt(id);
  const body = await request.json();
  const { category, name, imageUrl, thumbnailUrl, thumbnailMeta, isActive } = body;

  // Check if photo exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).stockPhoto.findUnique({
    where: { id: photoId },
  });

  if (!existing) {
    return NextResponse.json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Stock photo not found',
      statusCode: 404,
    }, { status: 404 });
  }

  // Build update data
  const updateData: {
    category?: string;
    name?: string;
    imageUrl?: string;
    thumbnailUrl?: string | null;
    thumbnailMeta?: unknown | null;
    isActive?: boolean;
  } = {};

  if (category !== undefined) {
    updateData.category = category
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (c: string) => c.toUpperCase());
  }
  if (name !== undefined) updateData.name = name.trim();
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
  if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl || null;
  if (thumbnailMeta !== undefined) updateData.thumbnailMeta = thumbnailMeta ?? null;
  if (isActive !== undefined) updateData.isActive = isActive;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const photo = await (prisma as any).stockPhoto.update({
    where: { id: photoId },
    data: updateData,
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    data: serializeBigInt(photo),
    message: 'Stock photo updated successfully',
    statusCode: 200,
  });
}

/**
 * DELETE - Soft delete stock photo
 */
async function deleteHandler(
  request: NextRequest,
  authContext: AuthContext,
  context: RouteContext
) {
  const { id } = await context.params;
  const photoId = BigInt(id);

  // Check if photo exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (prisma as any).stockPhoto.findUnique({
    where: { id: photoId },
  });

  if (!existing) {
    return NextResponse.json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Stock photo not found',
      statusCode: 404,
    }, { status: 404 });
  }

  // Soft delete by setting isActive to false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).stockPhoto.update({
    where: { id: photoId },
    data: { isActive: false },
  });

  return NextResponse.json({
    success: true,
    message: 'Stock photo deleted successfully',
    statusCode: 200,
  });
}

// Wrapper functions to handle context parameter properly
export const GET = withSuperAdmin((req: NextRequest, auth: AuthContext) => 
  getHandler(req, auth, { params: Promise.resolve({ id: req.url.split('/').pop()! }) })
);

export const PUT = withSuperAdmin((req: NextRequest, auth: AuthContext) => 
  putHandler(req, auth, { params: Promise.resolve({ id: req.url.split('/').pop()! }) })
);

export const DELETE = withSuperAdmin((req: NextRequest, auth: AuthContext) => 
  deleteHandler(req, auth, { params: Promise.resolve({ id: req.url.split('/').pop()! }) })
);
