/**
 * Super Admin Vouchers API
 * GET /api/superadmin/vouchers - List all vouchers with pagination
 * POST /api/superadmin/vouchers - Create new voucher
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

// Type alias for VoucherType until Prisma is regenerated
type VoucherType = 'BALANCE' | 'SUBSCRIPTION_DAYS';

/**
 * GET /api/superadmin/vouchers
 * List all vouchers with pagination and filters
 */
async function handleGet(req: NextRequest, context: AuthContext) {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const type = searchParams.get('type') as VoucherType | null;
    const currency = searchParams.get('currency');
    const showInactive = searchParams.get('showInactive') === 'true';
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Build where clause
    const where: {
        type?: VoucherType;
        currency?: string | null;
        isActive?: boolean;
        OR?: Array<{ code?: { contains: string; mode: 'insensitive' }; description?: { contains: string; mode: 'insensitive' } }>;
    } = {};

    if (type) {
        where.type = type;
    }

    if (currency) {
        where.currency = currency === 'ALL' ? null : currency;
    }

    if (!showInactive) {
        where.isActive = true;
    }

    if (search) {
        where.OR = [
            { code: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
        ];
    }

    const [vouchers, total] = await Promise.all([
        prisma.voucher.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: offset,
            take: limit,
            include: {
                _count: {
                    select: { redemptions: true },
                },
            },
        }),
        prisma.voucher.count({ where }),
    ]);

    return NextResponse.json({
        success: true,
        data: {
            vouchers: serializeBigInt(vouchers),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: offset + vouchers.length < total,
            },
        },
    });
}

/**
 * POST /api/superadmin/vouchers
 * Create a new voucher
 */
async function handlePost(req: NextRequest, context: AuthContext) {
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
    } = body;

    // Validate required fields
    if (!code || !type || value === undefined) {
        return NextResponse.json(
            { success: false, error: 'VALIDATION_ERROR', message: 'Code, type, and value are required' },
            { status: 400 }
        );
    }

    // Validate type
    if (!['BALANCE', 'SUBSCRIPTION_DAYS'].includes(type)) {
        return NextResponse.json(
            { success: false, error: 'VALIDATION_ERROR', message: 'Invalid voucher type' },
            { status: 400 }
        );
    }

    // Validate currency if provided
    if (currency && !['IDR', 'AUD'].includes(currency)) {
        return NextResponse.json(
            { success: false, error: 'VALIDATION_ERROR', message: 'Currency must be IDR, AUD, or null (universal)' },
            { status: 400 }
        );
    }

    // Validate value is positive
    if (parseFloat(value) <= 0) {
        return NextResponse.json(
            { success: false, error: 'VALIDATION_ERROR', message: 'Value must be greater than 0' },
            { status: 400 }
        );
    }

    // Check if code already exists
    const existingVoucher = await prisma.voucher.findUnique({
        where: { code: code.toUpperCase() },
    });

    if (existingVoucher) {
        return NextResponse.json(
            { success: false, error: 'DUPLICATE_CODE', message: 'Voucher code already exists' },
            { status: 400 }
        );
    }

    // Create voucher
    const voucher = await prisma.voucher.create({
        data: {
            code: code.toUpperCase(),
            type: type as VoucherType,
            description: description || null,
            value: parseFloat(value),
            currency: currency || null,
            maxUsage: maxUsage ? parseInt(maxUsage, 10) : null,
            validFrom: validFrom ? new Date(validFrom) : null,
            validUntil: validUntil ? new Date(validUntil) : null,
            createdByUserId: context.userId,
        },
    });

    return NextResponse.json({
        success: true,
        data: serializeBigInt(voucher),
        message: 'Voucher created successfully',
    });
}

export const GET = withSuperAdmin(handleGet);
export const POST = withSuperAdmin(handlePost);
