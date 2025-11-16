import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/serverAuth';
import { MenuBuilderService, MenuBuilderInput } from '@/lib/services/MenuBuilderService';
import prisma from '@/lib/db/client';
import { z } from 'zod';

/**
 * Menu Builder API Endpoint
 * 
 * Unified endpoint for creating/updating menus with categories and addon categories
 * in a single request. Reduces menu creation from 15 minutes (4 pages) to <5 minutes (1 page).
 * 
 * @route POST /api/merchant/menu/builder
 * @route PUT /api/merchant/menu/builder/[id]
 */

// Validation schema
const menuBuilderSchema = z.object({
  name: z.string().min(1, 'Nama menu harus diisi'),
  description: z.string().optional(),
  price: z.number().positive('Harga harus lebih dari 0'),
  imageUrl: z.string().url().optional().or(z.literal('')).nullable(),
  isActive: z.boolean().optional().default(true),
  isPromo: z.boolean().optional().default(false),
  promoPrice: z.number().positive().optional().nullable(),
  promoStartDate: z.string().datetime().optional().nullable(),
  promoEndDate: z.string().datetime().optional().nullable(),
  trackStock: z.boolean().optional().default(false),
  stockQty: z.number().int().min(0).optional().nullable(),
  dailyStockTemplate: z.number().int().min(0).optional().nullable(),
  autoResetStock: z.boolean().optional().default(false),
  categoryIds: z.array(z.number().int().positive()).optional().default([]),
  addonCategoryIds: z.array(z.number().int().positive()).optional().default([]),
});

/**
 * POST - Create new menu with all relations
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Anda harus login terlebih dahulu',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    const userId = authUser.id;

    // Get merchant
    const merchantUser = await prisma.merchantUser.findFirst({
      where: {
        userId: userId,
      },
    });

    if (!merchantUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant tidak ditemukan',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const merchantId = merchantUser.merchantId;

    // Parse and validate
    const body = await request.json();
    
    const validation = menuBuilderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Data tidak valid',
          details: validation.error.issues,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const input: MenuBuilderInput = {
      ...validation.data,
      promoStartDate: validation.data.promoStartDate
        ? new Date(validation.data.promoStartDate)
        : undefined,
      promoEndDate: validation.data.promoEndDate
        ? new Date(validation.data.promoEndDate)
        : undefined,
    };

    // Create menu
    const result = await MenuBuilderService.createMenu(merchantId, userId, input);

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Menu berhasil dibuat',
        statusCode: 201,
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Menu builder create error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: 'BUILDER_ERROR',
          message: error.message,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan internal',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update existing menu with all relations
 */
export async function PUT(request: NextRequest) {
  try {
    // Authentication
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Anda harus login terlebih dahulu',
          statusCode: 401,
        },
        { status: 401 }
      );
    }

    const userId = authUser.id;

    // Get merchant
    const merchantUser = await prisma.merchantUser.findFirst({
      where: {
        userId: userId,
      },
    });

    if (!merchantUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant tidak ditemukan',
          statusCode: 404,
        },
        { status: 404 }
      );
    }

    const merchantId = merchantUser.merchantId;

    // Parse and validate
    const body = await request.json();
    
    // Extract menuId from body
    if (!body.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'ID menu harus diisi',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const menuId = BigInt(body.id);
    const validation = menuBuilderSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Data tidak valid',
          details: validation.error.issues,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const input: MenuBuilderInput = {
      ...validation.data,
      promoStartDate: validation.data.promoStartDate
        ? new Date(validation.data.promoStartDate)
        : undefined,
      promoEndDate: validation.data.promoEndDate
        ? new Date(validation.data.promoEndDate)
        : undefined,
    };

    // Update menu
    const result = await MenuBuilderService.updateMenu(menuId, merchantId, userId, input);

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Menu berhasil diupdate',
        statusCode: 200,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Menu builder update error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        {
          success: false,
          error: 'BUILDER_ERROR',
          message: error.message,
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan internal',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}
