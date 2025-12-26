/**
 * Referral Code Usage API (Super Admin)
 * GET /api/admin/referral-codes/[id]/usage - Get usage history with merchant info
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import referralService from '@/lib/services/ReferralService';

async function handleGet(
    req: NextRequest,
    _context: unknown,
    routeContext: { params: Promise<Record<string, string>> }
) {
    try {
        const { id } = await routeContext.params;
        const codeId = BigInt(id);

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const merchants = await referralService.getMerchantsUsingCode(codeId, { limit, offset });

        type MerchantUsage = Awaited<ReturnType<typeof referralService.getMerchantsUsingCode>>[number];
        return NextResponse.json({
            success: true,
            data: {
                merchants: merchants.map((m: MerchantUsage) => ({
                    id: m.id.toString(),
                    code: m.code,
                    name: m.name,
                    referralCodeUsed: m.referralCodeUsed,
                    subscription: m.subscription,
                    usedAt: m.usedAt,
                })),
            },
        });
    } catch (error: unknown) {
        console.error('Error getting referral code usage:', error);

        if (error instanceof Error && error.message.includes('not found')) {
            return NextResponse.json(
                { success: false, error: 'NOT_FOUND', message: 'Referral code not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get referral code usage' },
            { status: 500 }
        );
    }
}

export const GET = withSuperAdmin(handleGet);
