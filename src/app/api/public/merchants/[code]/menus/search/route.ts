/**
 * Public Menu Search API with Fuzzy Matching
 * GET /api/public/merchants/[code]/menus/search?q=query
 * 
 * Features:
 * - Full-text search with fuzzy matching
 * - Search by name, description
 * - Filter by category
 * - Relevance scoring
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { decimalToNumber } from '@/lib/utils/serializer';
import { SpecialPriceService } from '@/lib/services/SpecialPriceService';
import { invalidRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * Calculate similarity score using Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate relevance score (0-100)
 * Higher is better match
 */
function calculateRelevance(query: string, name: string, description: string | null): number {
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedName = name.toLowerCase();
  const normalizedDesc = (description || '').toLowerCase();

  let score = 0;

  // Exact match in name - highest score
  if (normalizedName === normalizedQuery) {
    score += 100;
  }
  // Name starts with query
  else if (normalizedName.startsWith(normalizedQuery)) {
    score += 80;
  }
  // Name contains query
  else if (normalizedName.includes(normalizedQuery)) {
    score += 60;
  }
  // Description contains query
  else if (normalizedDesc.includes(normalizedQuery)) {
    score += 40;
  }
  // Fuzzy match
  else {
    const distance = levenshteinDistance(normalizedQuery, normalizedName);
    const maxLen = Math.max(normalizedQuery.length, normalizedName.length);
    const similarity = (1 - distance / maxLen) * 100;
    score += Math.max(0, similarity - 30); // Only count if reasonably similar
  }

  // Bonus for word boundary matches
  const queryWords = normalizedQuery.split(/\s+/);
  const nameWords = normalizedName.split(/\s+/);

  queryWords.forEach(qWord => {
    if (nameWords.some(nWord => nWord.startsWith(qWord))) {
      score += 10;
    }
  });

  return Math.min(100, score);
}

/**
 * GET /api/public/merchants/[code]/menus/search
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const categoryId = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Query must be at least 2 characters',
      });
    }

    // Get merchant by code
    const merchant = await prisma.merchant.findUnique({
      where: { code: params.code },
      select: { id: true, isActive: true },
    });

    if (!merchant || !merchant.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant not found or inactive',
        },
        { status: 404 }
      );
    }

    // Build where condition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereCondition: any = {
      merchantId: merchant.id,
      isActive: true,
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    // Add category filter if provided
    if (categoryId && categoryId !== 'all') {
      if (!/^\d+$/.test(categoryId)) {
        const err = invalidRouteParam('category', 'Invalid category');
        return NextResponse.json(err.body, { status: err.status });
      }

      whereCondition.categories = {
        some: {
          categoryId: BigInt(categoryId),
        },
      };
    }

    // Get menus
    const menus = await prisma.menu.findMany({
      where: whereCondition,
      include: {
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      take: limit * 2, // Get more for scoring then trim
    });

    // Get active promo prices
    const menuIds = menus.map(m => m.id);
    const activePromoPrices = await SpecialPriceService.getActivePromoPrices(menuIds);

    // Calculate relevance scores and sort
    const scoredMenus = menus.map((menu) => {
      const menuIdStr = menu.id.toString();
      const promoPrice = activePromoPrices.get(menuIdStr) ?? null;
      const relevanceScore = calculateRelevance(query, menu.name, menu.description);

      return {
        id: menuIdStr,
        name: menu.name,
        description: menu.description,
        price: decimalToNumber(menu.price),
        imageUrl: menu.imageUrl,
        imageThumbUrl: (menu as unknown as { imageThumbUrl?: string | null }).imageThumbUrl ?? null,
        imageThumbMeta: (menu as unknown as { imageThumbMeta?: unknown | null }).imageThumbMeta ?? null,
        isActive: menu.isActive,
        isPromo: promoPrice !== null,
        promoPrice,
        isSpicy: menu.isSpicy,
        isBestSeller: menu.isBestSeller,
        isSignature: menu.isSignature,
        isRecommended: menu.isRecommended,
        trackStock: menu.trackStock,
        stockQty: menu.stockQty,
        categories: menu.categories.map(mc => ({
          id: mc.category.id.toString(),
          name: mc.category.name,
        })),
        relevanceScore,
      };
    });

    // Sort by relevance and limit
    const sortedMenus = scoredMenus
      .filter(m => m.relevanceScore > 20) // Filter out very low matches
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    return NextResponse.json({
      success: true,
      data: sortedMenus,
      meta: {
        query,
        total: sortedMenus.length,
      },
    });
  } catch (error) {
    console.error('Menu search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'SEARCH_ERROR',
        message: 'Failed to search menus',
      },
      { status: 500 }
    );
  }
}
