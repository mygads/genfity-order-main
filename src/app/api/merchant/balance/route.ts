/**
 * Merchant Balance API
 * GET /api/merchant/balance - Get balance info
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchantOwner } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import balanceService from '@/lib/services/BalanceService';

/**
 * GET /api/merchant/balance
 * Get balance info for current merchant
 */
async function handleGet(req: NextRequest, context: AuthContext) {
    try {
        // Get merchant from user's merchant_users relationship
        const merchantUser = await prisma.merchantUser.findFirst({
            where: { userId: context.userId },
            include: { merchant: true },
        });

        if (!merchantUser) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const currency = merchantUser.merchant.currency || 'IDR';
        const balanceInfo = await balanceService.getBalanceInfo(merchantUser.merchantId, currency);

        // Get billing summary for deposit mode
        const billingSummary = await balanceService.getBillingSummary(merchantUser.merchantId);

        return NextResponse.json({
            success: true,
            data: {
                ...balanceInfo,
                billingSummary,
            },
        });
    } catch (error) {
        console.error('Error getting balance:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get balance' },
            { status: 500 }
        );
    }
}

export const GET = withMerchantOwner(handleGet);
