/**
 * Stock Photos API - Super Admin Management
 * 
 * GET /api/admin/stock-photos - List all stock photos with filtering
 * POST /api/admin/stock-photos - Create new stock photo
 * 
 * Query Parameters (GET):
 * - category: string (optional) - Filter by category
 * - search: string (optional) - Search by name or category
 * - page: number (optional) - Page number (default: 1)
 * - limit: number (optional) - Items per page (default: 20)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import type { AuthContext } from '@/lib/middleware/auth';

/**
 * GET - List all stock photos
 */
async function getHandler(request: NextRequest, authContext: AuthContext) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    isActive: true,
  };

  if (category) {
    where.category = category;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Get total count and photos
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [total, photos] = await Promise.all([
    (prisma as any).stockPhoto.count({ where }),
    (prisma as any).stockPhoto.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { category: 'asc' },
        { createdAt: 'desc' },
        { id: 'asc' }, // Stable tie-breaker for consistent ordering
      ],
      skip: offset,
      take: limit,
    }),
  ]);

  // Get all unique categories for filtering
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categories = await (prisma as any).stockPhoto.groupBy({
    by: ['category'],
    where: { isActive: true },
    _count: { id: true },
    orderBy: { category: 'asc' },
  });

  return NextResponse.json({
    success: true,
    data: {
      photos: serializeBigInt(photos),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categories: categories.map((c: any) => ({
        name: c.category,
        count: c._count.id,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
    message: 'Stock photos retrieved successfully',
    statusCode: 200,
  });
}

/**
 * POST - Create new stock photo
 */
async function postHandler(request: NextRequest, authContext: AuthContext) {
  const body = await request.json();
  const { category, name, imageUrl, thumbnailUrl, thumbnailMeta } = body;

  // Validation
  if (!category || !name || !imageUrl) {
    return NextResponse.json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Category, name, and imageUrl are required',
      statusCode: 400,
    }, { status: 400 });
  }

  // Normalize category (title case)
  const normalizedCategory = category
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  // Create stock photo
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const photo = await (prisma as any).stockPhoto.create({
    data: {
      category: normalizedCategory,
      name: name.trim(),
      imageUrl,
      thumbnailUrl: thumbnailUrl || null,
      thumbnailMeta: thumbnailMeta ?? null,
      uploadedByUserId: authContext.userId,
    },
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
    message: 'Stock photo created successfully',
    statusCode: 201,
  }, { status: 201 });
}

export const GET = withSuperAdmin(getHandler);
export const POST = withSuperAdmin(postHandler);
