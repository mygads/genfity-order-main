/**
 * Stock Photos API - Merchant Browse
 * 
 * GET /api/merchant/stock-photos - Browse stock photos for menu items
 * 
 * Query Parameters:
 * - category: string (optional) - Filter by category
 * - search: string (optional) - Search by name or category
 * - page: number (optional) - Page number (default: 1)
 * - limit: number (optional) - Items per page (default: 24)
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import type { AuthContext } from '@/lib/middleware/auth';

/**
 * GET - Browse stock photos
 */
async function getHandler(request: NextRequest, _authContext: AuthContext) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '24');
  const offset = (page - 1) * limit;

  // Build where clause - only active photos
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
      select: {
        id: true,
        category: true,
        name: true,
        imageUrl: true,
        thumbnailUrl: true,
        thumbnailMeta: true,
      },
      orderBy: [
        { category: 'asc' },
        { usageCount: 'desc' },
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

export const GET = withMerchant(getHandler);
