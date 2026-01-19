/**
 * Upload Confirm API (Menu Images)
 * POST /api/merchant/upload/menu-image/confirm
 *
 * Body:
 * - imageUrl: string
 * - imageThumbUrl: string
 * - imageThumb2xUrl?: string
 * - imageThumbMeta?: object
 * - menuId?: string
 */

import { NextRequest, NextResponse } from 'next/server';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import prisma from '@/lib/db/client';
import { BlobService } from '@/lib/services/BlobService';

async function handlePost(request: NextRequest, context: AuthContext) {
  try {
    const body = await request.json();
    const { imageUrl, imageThumbUrl, imageThumb2xUrl, imageThumbMeta, menuId } = body || {};

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'URL_REQUIRED', message: 'imageUrl is required', statusCode: 400 },
        { status: 400 }
      );
    }

    if (!imageThumbUrl || typeof imageThumbUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'THUMB_URL_REQUIRED', message: 'imageThumbUrl is required', statusCode: 400 },
        { status: 400 }
      );
    }

    const urlsToValidate = [imageUrl, imageThumbUrl, imageThumb2xUrl].filter(Boolean) as string[];
    for (const url of urlsToValidate) {
      if (!BlobService.isManagedUrl(url)) {
        return NextResponse.json(
          { success: false, error: 'INVALID_URL', message: 'URL is not managed by R2', statusCode: 400 },
          { status: 400 }
        );
      }
    }

    if (!context.merchantId) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_ID_REQUIRED', message: 'Merchant ID is required', statusCode: 400 },
        { status: 400 }
      );
    }

    const merchant = await prisma.merchant.findUnique({
      where: { id: context.merchantId },
      select: { id: true, code: true },
    });

    if (!merchant) {
      return NextResponse.json(
        { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found', statusCode: 404 },
        { status: 404 }
      );
    }

    const merchantCodeLower = merchant.code.toLowerCase();
    for (const url of urlsToValidate) {
      const lowerUrl = url.toLowerCase();
      if (!lowerUrl.includes(`/merchants/${merchantCodeLower}/`)) {
        return NextResponse.json(
          { success: false, error: 'UNAUTHORIZED', message: 'Cannot update this asset', statusCode: 403 },
          { status: 403 }
        );
      }
    }

    if (menuId) {
      let menuIdValue: bigint;
      try {
        menuIdValue = BigInt(menuId);
      } catch {
        return NextResponse.json(
          { success: false, error: 'INVALID_MENU_ID', message: 'menuId must be numeric', statusCode: 400 },
          { status: 400 }
        );
      }

      const existing = await prisma.menu.findFirst({
        where: { id: menuIdValue, merchantId: merchant.id },
        select: { id: true, imageUrl: true, imageThumbUrl: true, imageThumbMeta: true },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'MENU_NOT_FOUND', message: 'Menu not found', statusCode: 404 },
          { status: 404 }
        );
      }

      await prisma.menu.update({
        where: { id: menuIdValue },
        data: {
          imageUrl,
          imageThumbUrl,
          ...(imageThumbMeta !== undefined ? { imageThumbMeta: imageThumbMeta as object } : {}),
        },
      });

      const urlsToDelete = new Set<string>();
      if (existing.imageUrl && existing.imageUrl !== imageUrl) {
        urlsToDelete.add(existing.imageUrl);
      }
      if (existing.imageThumbUrl && existing.imageThumbUrl !== imageThumbUrl) {
        urlsToDelete.add(existing.imageThumbUrl);
      }

      if (existing.imageThumbMeta && typeof existing.imageThumbMeta === 'object') {
        const meta = existing.imageThumbMeta as { variants?: Array<{ url?: string | null }> };
        if (Array.isArray(meta.variants)) {
          meta.variants
            .map((variant) => variant.url)
            .filter((url): url is string => Boolean(url))
            .forEach((url) => {
              if (url !== imageThumbUrl && url !== imageThumb2xUrl) {
                urlsToDelete.add(url);
              }
            });
        }
      }

      for (const url of urlsToDelete) {
        try {
          await BlobService.deleteFile(url);
        } catch {
          // ignore cleanup errors
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl,
        imageThumbUrl,
        imageThumb2xUrl: imageThumb2xUrl || null,
        imageThumbMeta: imageThumbMeta ?? null,
      },
      message: 'Menu image confirmed successfully',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Menu image confirm error:', error);
    return NextResponse.json(
      { success: false, error: 'CONFIRM_FAILED', message: 'Failed to confirm menu image', statusCode: 500 },
      { status: 500 }
    );
  }
}

export const POST = withMerchant(handlePost);
