/**
 * Super Admin Voucher Detail API
 * GET /api/superadmin/vouchers/[id] - Get voucher details
 * PUT /api/superadmin/vouchers/[id] - Update voucher
 * DELETE /api/superadmin/vouchers/[id] - Delete voucher
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { getBigIntRouteParam, type RouteContext } from '@/lib/utils/routeContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VoucherRecord = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VoucherRedemptionRecord = any;

// Type alias for VoucherType until Prisma is regenerated
type VoucherType = 'BALANCE' | 'SUBSCRIPTION_DAYS';

/**
 * GET /api/superadmin/vouchers/[id]
 * Get voucher details with redemption history
 */
async function handleGet(
    req: NextRequest,
    context: AuthContext,
    routeContext: RouteContext
) {
    const voucherId = await getBigIntRouteParam(routeContext, 'id');
    if (!voucherId) {
        return NextResponse.json(
            { success: false, error: 'VALIDATION_ERROR', message: 'Invalid voucher id' },
            { status: 400 }
        );
    }

    const voucher = await prisma.voucher.findUnique({
        where: { id: voucherId },
        include: {
            redemptions: {
                orderBy: { redeemedAt: 'desc' },
                take: 50,
            },
        },
    }) as VoucherRecord | null;

    if (!voucher) {
        return NextResponse.json(
            { success: false, error: 'NOT_FOUND', message: 'Voucher not found' },
            { status: 404 }
        );
    }

    // Get merchant info for redemptions
    const merchantIds = [...new Set(voucher.redemptions.map((r: VoucherRedemptionRecord) => r.merchantId))] as bigint[];
    const merchants = await prisma.merchant.findMany({
        where: { id: { in: merchantIds } },
        select: { id: true, code: true, name: true },
    });

    const merchantMap = new Map(merchants.map(m => [m.id.toString(), m]));

    const redemptionsWithMerchant = voucher.redemptions.map((r: VoucherRedemptionRecord) => ({
        ...r,
        merchant: merchantMap.get(r.merchantId.toString()) || null,
    }));

    return NextResponse.json({
        success: true,
        data: serializeBigInt({
            ...voucher,
            redemptions: redemptionsWithMerchant,
        }),
    });
}

/**
 * PUT /api/superadmin/vouchers/[id]
 * Update voucher
 */
async function handlePut(
    req: NextRequest,
    context: AuthContext,
    routeContext: RouteContext
) {
    const voucherId = await getBigIntRouteParam(routeContext, 'id');
    if (!voucherId) {
        return NextResponse.json(
            { success: false, error: 'VALIDATION_ERROR', message: 'Invalid voucher id' },
            { status: 400 }
        );
    }
    const body = await req.json();

    const {
        code,
        type,
        description,
        value,
        currency,
        maxUsage,
        validFrom,
        validUntil,
        isActive,
    } = body;

    // Check if voucher exists
    const existingVoucher = await prisma.voucher.findUnique({
        where: { id: voucherId },
    });

    if (!existingVoucher) {
        return NextResponse.json(
            { success: false, error: 'NOT_FOUND', message: 'Voucher not found' },
            { status: 404 }
        );
    }

    // If changing code, check for duplicates
    if (code && code.toUpperCase() !== existingVoucher.code) {
        const duplicateVoucher = await prisma.voucher.findUnique({
            where: { code: code.toUpperCase() },
        });

        if (duplicateVoucher) {
            return NextResponse.json(
                { success: false, error: 'DUPLICATE_CODE', message: 'Voucher code already exists' },
                { status: 400 }
            );
        }
    }

    // Validate type if provided
    if (type && !['BALANCE', 'SUBSCRIPTION_DAYS'].includes(type)) {
        return NextResponse.json(
            { success: false, error: 'VALIDATION_ERROR', message: 'Invalid voucher type' },
            { status: 400 }
        );
    }

    // Validate currency if provided
    if (currency !== undefined && currency !== null && !['IDR', 'AUD'].includes(currency)) {
        return NextResponse.json(
            { success: false, error: 'VALIDATION_ERROR', message: 'Currency must be IDR, AUD, or null (universal)' },
            { status: 400 }
        );
    }

    // Build update data
    const updateData: {
        code?: string;
        type?: VoucherType;
        description?: string | null;
        value?: number;
        currency?: string | null;
        maxUsage?: number | null;
        validFrom?: Date | null;
        validUntil?: Date | null;
        isActive?: boolean;
    } = {};

    if (code !== undefined) updateData.code = code.toUpperCase();
    if (type !== undefined) updateData.type = type as VoucherType;
    if (description !== undefined) updateData.description = description || null;
    if (value !== undefined) updateData.value = parseFloat(value);
    if (currency !== undefined) updateData.currency = currency || null;
    if (maxUsage !== undefined) updateData.maxUsage = maxUsage ? parseInt(maxUsage, 10) : null;
    if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : null;
    if (validUntil !== undefined) updateData.validUntil = validUntil ? new Date(validUntil) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    const voucher = await prisma.voucher.update({
        where: { id: voucherId },
        data: updateData,
    });

    return NextResponse.json({
        success: true,
        data: serializeBigInt(voucher),
        message: 'Voucher updated successfully',
    });
}

/**
 * DELETE /api/superadmin/vouchers/[id]
 * Delete voucher (only if no redemptions)
 */
async function handleDelete(
    req: NextRequest,
    context: AuthContext,
    routeContext: RouteContext
) {
    const voucherId = await getBigIntRouteParam(routeContext, 'id');
    if (!voucherId) {
        return NextResponse.json(
            { success: false, error: 'VALIDATION_ERROR', message: 'Invalid voucher id' },
            { status: 400 }
        );
    }

    // Check if voucher exists and has redemptions
    const voucher = await prisma.voucher.findUnique({
        where: { id: voucherId },
        include: {
            _count: { select: { redemptions: true } },
        },
    });

    if (!voucher) {
        return NextResponse.json(
            { success: false, error: 'NOT_FOUND', message: 'Voucher not found' },
            { status: 404 }
        );
    }

    // If voucher has redemptions, just deactivate instead of delete
    if (voucher._count.redemptions > 0) {
        await prisma.voucher.update({
            where: { id: voucherId },
            data: { isActive: false },
        });

        return NextResponse.json({
            success: true,
            message: 'Voucher has redemption history and was deactivated instead of deleted',
        });
    }

    // Delete voucher
    await prisma.voucher.delete({
        where: { id: voucherId },
    });

    return NextResponse.json({
        success: true,
        message: 'Voucher deleted successfully',
    });
}

export const GET = withSuperAdmin(handleGet);
export const PUT = withSuperAdmin(handlePut);
export const DELETE = withSuperAdmin(handleDelete);
