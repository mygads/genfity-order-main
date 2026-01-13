/**
 * Merchant Menu Book Detail API
 * GET /api/merchant/menu-books/[id] - Get single menu book
 * PUT /api/merchant/menu-books/[id] - Update menu book
 * DELETE /api/merchant/menu-books/[id] - Delete menu book
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

/**
 * GET /api/merchant/menu-books/[id]
 */
async function handleGet(
    req: NextRequest,
    context: AuthContext,
    contextParams: RouteContext
) {
    try {
        const menuBookIdResult = await requireBigIntRouteParam(contextParams, 'id');
        if (!menuBookIdResult.ok) {
            return NextResponse.json(menuBookIdResult.body, { status: menuBookIdResult.status });
        }

        const menuBookId = menuBookIdResult.value;

        const merchantUser = await prisma.merchantUser.findFirst({
            where: { userId: context.userId },
        });

        if (!merchantUser) {
            return NextResponse.json(
                { success: false, message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const menuBook = await prisma.menuBook.findFirst({
            where: {
                id: menuBookId,
                merchantId: merchantUser.merchantId
            },
            include: {
                items: {
                    include: {
                        menu: { select: { id: true, name: true, price: true, imageUrl: true } }
                    }
                },
                specialPrices: {
                    select: { id: true, name: true, isActive: true }
                }
            }
        });

        if (!menuBook) {
            return NextResponse.json(
                { success: false, message: 'Menu book not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: serializeBigInt(menuBook),
        });
    } catch (error) {
        console.error('Error getting menu book:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to get menu book' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/merchant/menu-books/[id]
 */
async function handlePut(
    req: NextRequest,
    context: AuthContext,
    contextParams: RouteContext
) {
    try {
        const menuBookIdResult = await requireBigIntRouteParam(contextParams, 'id');
        if (!menuBookIdResult.ok) {
            return NextResponse.json(menuBookIdResult.body, { status: menuBookIdResult.status });
        }

        const menuBookId = menuBookIdResult.value;

        const merchantUser = await prisma.merchantUser.findFirst({
            where: { userId: context.userId },
        });

        if (!merchantUser) {
            return NextResponse.json(
                { success: false, message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const existing = await prisma.menuBook.findFirst({
            where: {
                id: menuBookId,
                merchantId: merchantUser.merchantId
            }
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, message: 'Menu book not found' },
                { status: 404 }
            );
        }

        const body = await req.json();
        const { name, description, isActive, menuIds } = body;

        const updated = await prisma.$transaction(async (tx) => {
            const _menuBook = await tx.menuBook.update({
                where: { id: menuBookId },
                data: {
                    name: name?.trim() || existing.name,
                    description: description !== undefined ? description?.trim() || null : existing.description,
                    isActive: isActive !== undefined ? isActive : existing.isActive,
                }
            });

            if (menuIds !== undefined) {
                await tx.menuBookItem.deleteMany({
                    where: { menuBookId }
                });

                if (menuIds.length > 0) {
                    await tx.menuBookItem.createMany({
                        data: menuIds.map((menuId: string) => ({
                            menuBookId,
                            menuId: BigInt(menuId)
                        }))
                    });
                }
            }

            return tx.menuBook.findUnique({
                where: { id: menuBookId },
                include: {
                    items: {
                        include: {
                            menu: { select: { id: true, name: true, price: true } }
                        }
                    }
                }
            });
        });

        return NextResponse.json({
            success: true,
            data: serializeBigInt(updated),
            message: 'Menu book updated successfully',
        });
    } catch (error) {
        console.error('Error updating menu book:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to update menu book' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/merchant/menu-books/[id]
 */
async function handleDelete(
    req: NextRequest,
    context: AuthContext,
    contextParams: RouteContext
) {
    try {
        const menuBookIdResult = await requireBigIntRouteParam(contextParams, 'id');
        if (!menuBookIdResult.ok) {
            return NextResponse.json(menuBookIdResult.body, { status: menuBookIdResult.status });
        }

        const menuBookId = menuBookIdResult.value;

        const merchantUser = await prisma.merchantUser.findFirst({
            where: { userId: context.userId },
        });

        if (!merchantUser) {
            return NextResponse.json(
                { success: false, message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const existing = await prisma.menuBook.findFirst({
            where: {
                id: menuBookId,
                merchantId: merchantUser.merchantId
            },
            include: { _count: { select: { specialPrices: true } } }
        });

        if (!existing) {
            return NextResponse.json(
                { success: false, message: 'Menu book not found' },
                { status: 404 }
            );
        }

        if (existing._count.specialPrices > 0) {
            return NextResponse.json(
                { success: false, message: 'Cannot delete menu book with active special prices' },
                { status: 400 }
            );
        }

        await prisma.menuBook.delete({
            where: { id: menuBookId }
        });

        return NextResponse.json({
            success: true,
            message: 'Menu book deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting menu book:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to delete menu book' },
            { status: 500 }
        );
    }
}

export const GET = withMerchant(handleGet);
export const PUT = withMerchant(handlePut);
export const DELETE = withMerchant(handleDelete);
