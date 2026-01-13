/**
 * Public Menu Search API with Fuzzy Matching
 * GET /api/public/menu/[merchantCode]/search - Search menu items
 * 
 * Features:
 * - Full-text search on name and description
 * - Fuzzy matching using Levenshtein distance
 * - Category filtering
 * - Price range filtering
 * - Sorting options
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';
import { SpecialPriceService } from '@/lib/services/SpecialPriceService';
import { isMenuAvailable } from '@/lib/services/MenuSchedulingService';
import type { RouteContext } from '@/lib/utils/routeContext';

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate fuzzy match score (0-1, higher is better)
 */
function fuzzyMatchScore(query: string, text: string): number {
  const queryLower = query.toLowerCase();
  const textLower = text.toLowerCase();

  // Exact match
  if (textLower === queryLower) return 1;

  // Contains exact query
  if (textLower.includes(queryLower)) {
    // Higher score if it's at the start
    if (textLower.startsWith(queryLower)) return 0.95;
    return 0.85;
  }

  // Word match
  const queryWords = queryLower.split(/\s+/);
  const textWords = textLower.split(/\s+/);
  const matchedWords = queryWords.filter(qw => 
    textWords.some(tw => tw.includes(qw) || qw.includes(tw))
  );
  if (matchedWords.length > 0) {
    return 0.7 * (matchedWords.length / queryWords.length);
  }

  // Levenshtein distance based score
  const distance = levenshteinDistance(queryLower, textLower);
  const maxLength = Math.max(queryLower.length, textLower.length);
  const similarity = 1 - distance / maxLength;

  return similarity > 0.5 ? similarity * 0.6 : 0;
}

/**
 * GET /api/public/menu/[merchantCode]/search
 * Search menu items with fuzzy matching
 * 
 * Query params:
 * - q: search query (required)
 * - categoryId: filter by category ID
 * - minPrice: minimum price
 * - maxPrice: maximum price
 * - sort: 'relevance' | 'price_asc' | 'price_desc' | 'name' | 'popular'
 * - limit: max results (default 20)
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const { searchParams } = new URL(request.url);
  
  const query = searchParams.get('q')?.trim() || '';
  const categoryId = searchParams.get('categoryId');
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : undefined;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : undefined;
  const sort = searchParams.get('sort') || 'relevance';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  try {
    // Get merchant
    const merchant = await prisma.merchant.findUnique({
      where: { code: params.merchantCode },
      select: {
        id: true,
        timezone: true,
        isActive: true,
        isOpen: true,
      },
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

    // Build where clause
    const whereClause: Record<string, unknown> = {
      merchantId: merchant.id,
      isActive: true,
      deletedAt: null,
    };

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      whereClause.price = {};
      if (minPrice !== undefined) {
        (whereClause.price as Record<string, number>).gte = minPrice;
      }
      if (maxPrice !== undefined) {
        (whereClause.price as Record<string, number>).lte = maxPrice;
      }
    }

    // Get menus with categories
    const menus = await prisma.menu.findMany({
      where: whereClause,
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        addonCategories: {
          include: {
            addonCategory: {
              include: {
                addonItems: {
                  where: {
                    isActive: true,
                    deletedAt: null,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Filter by category if specified
    let filteredMenus = menus;
    if (categoryId) {
      const catId = BigInt(categoryId);
      filteredMenus = menus.filter(menu =>
        menu.categories.some(mc => mc.categoryId === catId)
      );
    }

    // Filter by schedule availability
    filteredMenus = filteredMenus.filter(menu =>
      isMenuAvailable(
        {
          isActive: menu.isActive,
          scheduleEnabled: menu.scheduleEnabled,
          scheduleStartTime: menu.scheduleStartTime,
          scheduleEndTime: menu.scheduleEndTime,
          scheduleDays: menu.scheduleDays,
        },
        merchant.timezone
      )
    );

    // Get active special prices for this merchant
    const activeSpecialPrices = await SpecialPriceService.getActivePromoPricesForMerchant(merchant.id);

    // Calculate search scores and transform menus
    const scoredMenus = filteredMenus.map(menu => {
      // Calculate fuzzy match score
      let score = 0;
      if (query) {
        const nameScore = fuzzyMatchScore(query, menu.name);
        const descScore = menu.description ? fuzzyMatchScore(query, menu.description) * 0.5 : 0;
        
        // Check category names
        const categoryScore = Math.max(
          0,
          ...menu.categories.map(mc => 
            fuzzyMatchScore(query, mc.category.name) * 0.3
          )
        );

        score = Math.max(nameScore, descScore, categoryScore);
      } else {
        score = 1; // No query = all items match
      }

      // Get special price if exists
      const menuIdStr = menu.id.toString();
      const promoPrice = activeSpecialPrices.get(menuIdStr) ?? null;
      const basePrice = decimalToNumber(menu.price);

      return {
        id: menu.id,
        name: menu.name,
        description: menu.description,
        price: basePrice,
        imageUrl: menu.imageUrl,
        imageThumbUrl: (menu as unknown as { imageThumbUrl?: string | null }).imageThumbUrl ?? null,
        imageThumbMeta: (menu as unknown as { imageThumbMeta?: unknown | null }).imageThumbMeta ?? null,
        isActive: menu.isActive,
        isSpicy: menu.isSpicy,
        isBestSeller: menu.isBestSeller,
        isSignature: menu.isSignature,
        isRecommended: menu.isRecommended,
        trackStock: menu.trackStock,
        stockQty: menu.stockQty,
        categories: menu.categories.map(mc => ({
          id: mc.category.id,
          name: mc.category.name,
        })),
        addonCategories: menu.addonCategories.map(mac => ({
          id: mac.addonCategory.id,
          name: mac.addonCategory.name,
          minSelection: mac.addonCategory.minSelection,
          maxSelection: mac.addonCategory.maxSelection,
          addonItems: mac.addonCategory.addonItems.map(item => ({
            id: item.id,
            name: item.name,
            price: decimalToNumber(item.price),
            isActive: item.isActive,
          })),
        })),
        isPromo: !!promoPrice,
        promoPrice,
        discountPercent: promoPrice ? Math.round((1 - promoPrice / basePrice) * 100) : null,
        _score: score,
      };
    });

    // Filter by minimum score threshold
    const threshold = query ? 0.3 : 0;
    let results = scoredMenus.filter(m => m._score >= threshold);

    // Sort results
    switch (sort) {
      case 'relevance':
        results.sort((a, b) => b._score - a._score);
        break;
      case 'price_asc':
        results.sort((a, b) => (a.promoPrice || a.price) - (b.promoPrice || b.price));
        break;
      case 'price_desc':
        results.sort((a, b) => (b.promoPrice || b.price) - (a.promoPrice || a.price));
        break;
      case 'name':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'popular':
        // Sort by bestseller/signature flags first, then by name
        results.sort((a, b) => {
          const aPopular = (a.isBestSeller ? 2 : 0) + (a.isSignature ? 1 : 0);
          const bPopular = (b.isBestSeller ? 2 : 0) + (b.isSignature ? 1 : 0);
          return bPopular - aPopular || a.name.localeCompare(b.name);
        });
        break;
    }

    // Limit results
    results = results.slice(0, limit);

    // Remove internal score from response
    const finalResults = results.map(({ _score, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      data: {
        query,
        totalResults: finalResults.length,
        menus: serializeBigInt(finalResults),
      },
    });
  } catch (error) {
    console.error('Menu search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'SEARCH_ERROR',
        message: 'Failed to search menu items',
      },
      { status: 500 }
    );
  }
}
