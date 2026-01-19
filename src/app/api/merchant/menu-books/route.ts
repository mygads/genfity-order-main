/**
 * Merchant Menu Books API
 * GET /api/merchant/menu-books - List all menu books
 * POST /api/merchant/menu-books - Create new menu book
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/merchant/menu-books
 * Get all menu books for merchant
 */
async function handleGet(req: NextRequest, context: AuthContext) {
    try {
        const merchantId = context.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_ID_REQUIRED', message: 'Merchant ID is required' },
                { status: 400 }
            );
        }

        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const menuBooks = await prisma.menuBook.findMany({
            where: { merchantId },
            include: {
                items: {
                    include: {
                        menu: {
                            select: { id: true, name: true, price: true, imageUrl: true }
                        }
                    }
                },
                _count: {
                    select: { items: true, specialPrices: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            data: serializeBigInt(menuBooks),
        });
    } catch (error) {
        console.error('Error getting menu books:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to retrieve menu books' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/merchant/menu-books
 * Create new menu book
 */
async function handlePost(req: NextRequest, context: AuthContext) {
    try {
        const merchantId = context.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_ID_REQUIRED', message: 'Merchant ID is required' },
                { status: 400 }
            );
        }

        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const body = await req.json();
        const { name, description, menuIds } = body;

        if (!name || typeof name !== 'string') {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: 'Name is required' },
                { status: 400 }
            );
        }

        const menuBook = await prisma.menuBook.create({
            data: {
                merchantId,
                name: name.trim(),
                description: description?.trim() || null,
                isActive: true,
                items: menuIds?.length > 0 ? {
                    create: menuIds.map((menuId: string) => ({
                        menuId: BigInt(menuId)
                    }))
                } : undefined
            },
            include: {
                items: {
                    include: {
                        menu: { select: { id: true, name: true, price: true } }
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: serializeBigInt(menuBook),
            message: 'Menu book created successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating menu book:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to create menu book' },
            { status: 500 }
        );
    }
}

export const GET = withMerchant(handleGet);
export const POST = withMerchant(handlePost);
