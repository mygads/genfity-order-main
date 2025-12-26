/**
 * Referral Code Detail API (Super Admin)
 * GET /api/admin/referral-codes/[id] - Get code details with stats
 * PATCH /api/admin/referral-codes/[id] - Update code
 * DELETE /api/admin/referral-codes/[id] - Deactivate code
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import referralService from '@/lib/services/ReferralService';
import { z } from 'zod';

const updateCodeSchema = z.object({
    description: z.string().max(500).optional(),
    discountType: z.enum(['NONE', 'PERCENTAGE', 'FIXED_AMOUNT', 'BONUS_DAYS']).optional(),
    discountValue: z.number().min(0).optional(),
    maxUsage: z.number().int().positive().nullable().optional(),
    validFrom: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
    validUntil: z.string().nullable().optional().transform(val => val ? new Date(val) : null),
    isActive: z.boolean().optional(),
});

async function handleGet(
    _req: NextRequest,
    _context: unknown,
    routeContext: { params: Promise<Record<string, string>> }
) {
    try {
        const { id } = await routeContext.params;
        const codeId = BigInt(id);

        const codeWithStats = await referralService.getCodeWithStats(codeId);

        return NextResponse.json({
            success: true,
            data: {
                id: codeWithStats.id.toString(),
                code: codeWithStats.code,
                description: codeWithStats.description,
                discountType: codeWithStats.discountType,
                discountValue: codeWithStats.discountValue ? Number(codeWithStats.discountValue) : null,
                maxUsage: codeWithStats.maxUsage,
                currentUsage: codeWithStats.currentUsage,
                isActive: codeWithStats.isActive,
                validFrom: codeWithStats.validFrom,
                validUntil: codeWithStats.validUntil,
                createdAt: codeWithStats.createdAt,
                stats: codeWithStats.stats,
            },
        });
    } catch (error: unknown) {
        console.error('Error getting referral code:', error);

        if (error instanceof Error && error.message.includes('not found')) {
            return NextResponse.json(
                { success: false, error: 'NOT_FOUND', message: 'Referral code not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get referral code' },
            { status: 500 }
        );
    }
}

async function handlePatch(
    req: NextRequest,
    _context: unknown,
    routeContext: { params: Promise<Record<string, string>> }
) {
    try {
        const { id } = await routeContext.params;
        const codeId = BigInt(id);

        const body = await req.json();
        const validation = updateCodeSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const updateData = {
            ...validation.data,
            maxUsage: validation.data.maxUsage === null ? undefined : validation.data.maxUsage,
        };
        const code = await referralService.updateCode(codeId, updateData);

        return NextResponse.json({
            success: true,
            data: {
                id: code.id.toString(),
                code: code.code,
                description: code.description,
                discountType: code.discountType,
                discountValue: code.discountValue ? Number(code.discountValue) : null,
                maxUsage: code.maxUsage,
                currentUsage: code.currentUsage,
                isActive: code.isActive,
                validFrom: code.validFrom,
                validUntil: code.validUntil,
            },
            message: 'Referral code updated successfully',
        });
    } catch (error: unknown) {
        console.error('Error updating referral code:', error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    { success: false, error: 'NOT_FOUND', message: 'Referral code not found' },
                    { status: 404 }
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
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to update referral code' },
            { status: 500 }
        );
    }
}

async function handleDelete(
    _req: NextRequest,
    _context: unknown,
    routeContext: { params: Promise<Record<string, string>> }
) {
    try {
        const { id } = await routeContext.params;
        const codeId = BigInt(id);

        await referralService.deactivateCode(codeId);

        return NextResponse.json({
            success: true,
            message: 'Referral code deactivated successfully',
        });
    } catch (error: unknown) {
        console.error('Error deactivating referral code:', error);

        if (error instanceof Error && error.message.includes('not found')) {
            return NextResponse.json(
                { success: false, error: 'NOT_FOUND', message: 'Referral code not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to deactivate referral code' },
            { status: 500 }
        );
    }
}

export const GET = withSuperAdmin(handleGet);
export const PATCH = withSuperAdmin(handlePatch);
export const DELETE = withSuperAdmin(handleDelete);
