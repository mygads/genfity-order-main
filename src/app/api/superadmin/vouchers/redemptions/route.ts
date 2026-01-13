/**
 * Super Admin Voucher Redemptions API
 * GET /api/superadmin/vouchers/redemptions - List all redemptions with pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';
import { parseOptionalBigIntQueryParam } from '@/lib/utils/routeContext';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VoucherRedemptionRecord = any;

/**
 * GET /api/superadmin/vouchers/redemptions
 * List all voucher redemptions with pagination
 */
async function handleGet(req: NextRequest, context: AuthContext) {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const voucherIdResult = parseOptionalBigIntQueryParam(searchParams, 'voucherId', 'Invalid voucherId');
    if (!voucherIdResult.ok) {
        return NextResponse.json(voucherIdResult.body, { status: voucherIdResult.status });
    }

    const merchantIdResult = parseOptionalBigIntQueryParam(searchParams, 'merchantId', 'Invalid merchantId');
    if (!merchantIdResult.ok) {
        return NextResponse.json(merchantIdResult.body, { status: merchantIdResult.status });
    }

    const offset = (page - 1) * limit;

    // Build where clause
    const where: {
        voucherId?: bigint;
        merchantId?: bigint;
    } = {};

    if (voucherIdResult.value !== null) {
        where.voucherId = voucherIdResult.value;
    }

    if (merchantIdResult.value !== null) {
        where.merchantId = merchantIdResult.value;
    }

    const [redemptions, total] = await Promise.all([
        prisma.voucherRedemption.findMany({
            where,
            orderBy: { redeemedAt: 'desc' },
            skip: offset,
            take: limit,
            include: {
                voucher: {
                    select: { code: true, type: true, description: true },
                },
            },
        }),
        prisma.voucherRedemption.count({ where }),
    ]) as [VoucherRedemptionRecord[], number];

    // Get merchant info for redemptions
    const merchantIds = [...new Set(redemptions.map((r: VoucherRedemptionRecord) => r.merchantId))] as bigint[];
    const merchants = await prisma.merchant.findMany({
        where: { id: { in: merchantIds } },
        select: { id: true, code: true, name: true, currency: true },
    });

    const merchantMap = new Map(merchants.map(m => [m.id.toString(), m]));

    // Get user info for redemptions
    const userIds = [...new Set(redemptions.map((r: VoucherRedemptionRecord) => r.redeemedByUserId))] as bigint[];
    const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map(u => [u.id.toString(), u]));

    const redemptionsWithDetails = redemptions.map((r: VoucherRedemptionRecord) => ({
        ...r,
        merchant: merchantMap.get(r.merchantId.toString()) || null,
        redeemedBy: userMap.get(r.redeemedByUserId.toString()) || null,
    }));

    return NextResponse.json({
        success: true,
        data: {
            redemptions: serializeBigInt(redemptionsWithDetails),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: offset + redemptions.length < total,
            },
        },
    });
}

export const GET = withSuperAdmin(handleGet);
