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
        const merchantId = context.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_ID_REQUIRED', message: 'Merchant ID is required' },
                { status: 400 }
            );
        }

        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { id: true, currency: true },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const currency = merchant.currency || 'IDR';
        const balanceInfo = await balanceService.getBalanceInfo(merchantId, currency);

        // Get billing summary for deposit mode
        const billingSummary = await balanceService.getBillingSummary(merchantId);

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
