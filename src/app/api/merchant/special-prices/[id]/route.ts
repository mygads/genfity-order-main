/**
 * Merchant Special Price Detail API
 * GET /api/merchant/special-prices/[id] - Get single special price
 * PUT /api/merchant/special-prices/[id] - Update special price
 * DELETE /api/merchant/special-prices/[id] - Delete special price
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/types/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { requireBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';
import { validateTimeRangeInput } from '@/lib/utils/validators';

/**
 * GET /api/merchant/special-prices/[id]
 */
async function handleGet(
    req: NextRequest,
    context: AuthContext,
    contextParams: RouteContext
) {
    try {
        const specialPriceIdResult = await requireBigIntRouteParam(contextParams, 'id');
        if (!specialPriceIdResult.ok) {
            return NextResponse.json(specialPriceIdResult.body, { status: specialPriceIdResult.status });
        }

        const specialPriceId = specialPriceIdResult.value;

        const merchantId = context.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'MERCHANT_ID_REQUIRED',
                    message: 'Merchant ID is required',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true },
        });

        if (!merchant) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'MERCHANT_NOT_FOUND',
                    message: 'Merchant not found',
                    statusCode: 404,
                },
                { status: 404 }
            );
        }

        const specialPrice = await prisma.specialPrice.findFirst({
            where: {
                id: specialPriceId,
                merchantId
            },
            include: {
                menuBook: {
                    include: {
                        items: {
                            include: { menu: { select: { id: true, name: true, price: true } } }
                        }
                    }
                },
                priceItems: {
                    include: { menu: { select: { id: true, name: true, price: true } } }
                }
            }
        });

        if (!specialPrice) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NOT_FOUND',
                    message: 'Special price not found',
                    statusCode: 404,
                },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: serializeBigInt(specialPrice),
        });
    } catch (error) {
        console.error('Error getting special price:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'INTERNAL_ERROR',
                message: 'Failed to get special price',
                statusCode: 500,
            },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/merchant/special-prices/[id]
 */
async function handlePut(
    req: NextRequest,
    context: AuthContext,
    contextParams: RouteContext
) {
    try {
        const specialPriceIdResult = await requireBigIntRouteParam(contextParams, 'id');
        if (!specialPriceIdResult.ok) {
            return NextResponse.json(specialPriceIdResult.body, { status: specialPriceIdResult.status });
        }

        const specialPriceId = specialPriceIdResult.value;

        const merchantId = context.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'MERCHANT_ID_REQUIRED',
                    message: 'Merchant ID is required',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true },
        });

        if (!merchant) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'MERCHANT_NOT_FOUND',
                    message: 'Merchant not found',
                    statusCode: 404,
                },
                { status: 404 }
            );
        }

        const existing = await prisma.specialPrice.findFirst({
            where: {
                id: specialPriceId,
                merchantId
            }
        });

        if (!existing) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NOT_FOUND',
                    message: 'Special price not found',
                    statusCode: 404,
                },
                { status: 404 }
            );
        }

        const body = await req.json();
        const {
            name, menuBookId, startDate, endDate,
            applicableDays, isAllDay, startTime, endTime, isActive, priceItems
        } = body;

        const timeValidationError = validateTimeRangeInput({ isAllDay, startTime, endTime });
        if (timeValidationError) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'VALIDATION_ERROR',
                    message: timeValidationError,
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        const updated = await prisma.$transaction(async (tx) => {
            const _specialPrice = await tx.specialPrice.update({
                where: { id: specialPriceId },
                data: {
                    name: name?.trim() || existing.name,
                    menuBookId: menuBookId ? BigInt(menuBookId) : existing.menuBookId,
                    startDate: startDate ? new Date(startDate) : existing.startDate,
                    endDate: endDate ? new Date(endDate) : existing.endDate,
                    applicableDays: applicableDays || existing.applicableDays,
                    isAllDay: isAllDay !== undefined ? isAllDay : existing.isAllDay,
                    startTime: isAllDay === false ? startTime : (isAllDay === true ? null : existing.startTime),
                    endTime: isAllDay === false ? endTime : (isAllDay === true ? null : existing.endTime),
                    isActive: isActive !== undefined ? isActive : existing.isActive,
                }
            });

            if (priceItems !== undefined) {
                await tx.specialPriceItem.deleteMany({
                    where: { specialPriceId }
                });

                if (priceItems.length > 0) {
                    await tx.specialPriceItem.createMany({
                        data: priceItems.map((item: { menuId: string; promoPrice: number }) => ({
                            specialPriceId,
                            menuId: BigInt(item.menuId),
                            promoPrice: item.promoPrice
                        }))
                    });
                }
            }

            return tx.specialPrice.findUnique({
                where: { id: specialPriceId },
                include: {
                    menuBook: { select: { id: true, name: true } },
                    priceItems: {
                        include: { menu: { select: { id: true, name: true, price: true } } }
                    }
                }
            });
        });

        return NextResponse.json({
            success: true,
            data: serializeBigInt(updated),
            message: 'Special price updated successfully',
        });
    } catch (error) {
        console.error('Error updating special price:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'INTERNAL_ERROR',
                message: 'Failed to update special price',
                statusCode: 500,
            },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/merchant/special-prices/[id]
 */
async function handleDelete(
    req: NextRequest,
    context: AuthContext,
    contextParams: RouteContext
) {
    try {
        const specialPriceIdResult = await requireBigIntRouteParam(contextParams, 'id');
        if (!specialPriceIdResult.ok) {
            return NextResponse.json(specialPriceIdResult.body, { status: specialPriceIdResult.status });
        }

        const specialPriceId = specialPriceIdResult.value;

        const merchantId = context.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'MERCHANT_ID_REQUIRED',
                    message: 'Merchant ID is required',
                    statusCode: 400,
                },
                { status: 400 }
            );
        }

        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true },
        });

        if (!merchant) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'MERCHANT_NOT_FOUND',
                    message: 'Merchant not found',
                    statusCode: 404,
                },
                { status: 404 }
            );
        }

        const existing = await prisma.specialPrice.findFirst({
            where: {
                id: specialPriceId,
                merchantId
            }
        });

        if (!existing) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'NOT_FOUND',
                    message: 'Special price not found',
                    statusCode: 404,
                },
                { status: 404 }
            );
        }

        await prisma.specialPrice.delete({
            where: { id: specialPriceId }
        });

        return NextResponse.json({
            success: true,
            message: 'Special price deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting special price:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'INTERNAL_ERROR',
                message: 'Failed to delete special price',
                statusCode: 500,
            },
            { status: 500 }
        );
    }
}

export const GET = withMerchant(handleGet);
export const PUT = withMerchant(handlePut);
export const DELETE = withMerchant(handleDelete);
