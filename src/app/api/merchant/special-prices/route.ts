/**
 * Merchant Special Prices API
 * GET /api/merchant/special-prices - List all special prices
 * POST /api/merchant/special-prices - Create new special price
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/merchant/special-prices
 */
async function handleGet(req: NextRequest, context: AuthContext) {
    try {
        const merchantUser = await prisma.merchantUser.findFirst({
            where: { userId: context.userId },
        });

        if (!merchantUser) {
            return NextResponse.json(
                { success: false, message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const specialPrices = await prisma.specialPrice.findMany({
            where: { merchantId: merchantUser.merchantId },
            include: {
                menuBook: {
                    select: { id: true, name: true, _count: { select: { items: true } } }
                },
                _count: { select: { priceItems: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            success: true,
            data: serializeBigInt(specialPrices),
        });
    } catch (error) {
        console.error('Error getting special prices:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to retrieve special prices' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/merchant/special-prices
 */
async function handlePost(req: NextRequest, context: AuthContext) {
    try {
        const merchantUser = await prisma.merchantUser.findFirst({
            where: { userId: context.userId },
        });

        if (!merchantUser) {
            return NextResponse.json(
                { success: false, message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const body = await req.json();
        const {
            name, menuBookId, startDate, endDate,
            applicableDays, isAllDay, startTime, endTime, priceItems
        } = body;

        if (!name || !menuBookId || !startDate || !endDate) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify menu book belongs to merchant
        const menuBook = await prisma.menuBook.findFirst({
            where: {
                id: BigInt(menuBookId),
                merchantId: merchantUser.merchantId
            }
        });

        if (!menuBook) {
            return NextResponse.json(
                { success: false, message: 'Menu book not found' },
                { status: 404 }
            );
        }

        const specialPrice = await prisma.specialPrice.create({
            data: {
                merchantId: merchantUser.merchantId,
                menuBookId: BigInt(menuBookId),
                name: name.trim(),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                applicableDays: applicableDays || [0, 1, 2, 3, 4, 5, 6],
                isAllDay: isAllDay !== false,
                startTime: !isAllDay ? startTime : null,
                endTime: !isAllDay ? endTime : null,
                isActive: true,
                priceItems: priceItems?.length > 0 ? {
                    create: priceItems.map((item: { menuId: string; promoPrice: number }) => ({
                        menuId: BigInt(item.menuId),
                        promoPrice: item.promoPrice
                    }))
                } : undefined
            },
            include: {
                menuBook: { select: { id: true, name: true } },
                priceItems: {
                    include: { menu: { select: { id: true, name: true, price: true } } }
                }
            }
        });

        return NextResponse.json({
            success: true,
            data: serializeBigInt(specialPrice),
            message: 'Special price created successfully',
        }, { status: 201 });
    } catch (error) {
        console.error('Error creating special price:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to create special price' },
            { status: 500 }
        );
    }
}

export const GET = withMerchant(handleGet);
export const POST = withMerchant(handlePost);
