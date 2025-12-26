/**
 * Referral Codes API (Super Admin)
 * GET /api/admin/referral-codes - List all codes with stats
 * POST /api/admin/referral-codes - Create new code
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import referralService from '@/lib/services/ReferralService';
import { z } from 'zod';

const createCodeSchema = z.object({
    code: z.string().min(3).max(20),
    description: z.string().max(500).optional(),
    discountType: z.enum(['NONE', 'PERCENTAGE', 'FIXED_AMOUNT', 'BONUS_DAYS']).optional(),
    discountValue: z.number().min(0).optional(),
    maxUsage: z.number().int().positive().optional(),
    validFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
    validUntil: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

async function handleGet(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);
        const includeInactive = searchParams.get('includeInactive') === 'true';

        const { codes, total } = await referralService.getAllCodes({ limit, offset, includeInactive });

        type ReferralCode = typeof codes[number];
        return NextResponse.json({
            success: true,
            data: {
                codes: codes.map((c: ReferralCode) => ({
                    id: c.id.toString(),
                    code: c.code,
                    description: c.description,
                    discountType: c.discountType,
                    discountValue: c.discountValue ? Number(c.discountValue) : null,
                    maxUsage: c.maxUsage,
                    currentUsage: c.currentUsage,
                    isActive: c.isActive,
                    validFrom: c.validFrom,
                    validUntil: c.validUntil,
                    createdAt: c.createdAt,
                    usageCount: c._count.usages,
                })),
                pagination: { total, limit, offset, hasMore: offset + codes.length < total },
            },
        });
    } catch (error) {
        console.error('Error getting referral codes:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get referral codes' },
            { status: 500 }
        );
    }
}

async function handlePost(req: NextRequest, context: AuthContext) {
    try {
        const body = await req.json();
        const validation = createCodeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const code = await referralService.createCode(validation.data, context.userId);

        return NextResponse.json({
            success: true,
            data: {
                id: code.id.toString(),
                code: code.code,
                description: code.description,
                discountType: code.discountType,
                discountValue: code.discountValue ? Number(code.discountValue) : null,
                maxUsage: code.maxUsage,
                isActive: code.isActive,
                validFrom: code.validFrom,
                validUntil: code.validUntil,
                createdAt: code.createdAt,
            },
            message: 'Referral code created successfully',
        }, { status: 201 });
    } catch (error: unknown) {
        console.error('Error creating referral code:', error);

        if (error instanceof Error) {
            if (error.message.includes('already exists')) {
                return NextResponse.json(
                    { success: false, error: 'CONFLICT', message: error.message },
                    { status: 409 }
                );
            }
            if (error.message.includes('Validation')) {
                return NextResponse.json(
                    { success: false, error: 'VALIDATION_ERROR', message: error.message },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to create referral code' },
            { status: 500 }
        );
    }
}

export const GET = withSuperAdmin(handleGet);
export const POST = withSuperAdmin(handlePost);
