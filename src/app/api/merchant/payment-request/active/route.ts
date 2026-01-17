/**
 * Payment Request Active API
 * GET /api/merchant/payment-request/active - Get current active payment request (PENDING/CONFIRMED)
 */

import { NextResponse } from 'next/server';
import { withMerchant, type AuthContext } from '@/lib/middleware/auth';
import paymentRequestService from '@/lib/services/PaymentRequestService';

export const GET = withMerchant(async (
    _request: Request,
    authContext: AuthContext
) => {
    try {
        const merchantId = authContext.merchantId;
        if (!merchantId) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        const active = await paymentRequestService.getActiveMerchantRequest(BigInt(merchantId));

        return NextResponse.json({
            success: true,
            data: active
                ? {
                      id: active.id.toString(),
                      type: active.type,
                      status: active.status,
                      currency: active.currency,
                      amount: Number(active.amount),
                      monthsRequested: active.monthsRequested,
                      bankName: active.bankName,
                      bankAccountNumber: active.bankAccountNumber,
                      bankAccountName: active.bankAccountName,
                      expiresAt: active.expiresAt,
                      createdAt: active.createdAt,
                  }
                : null,
        });
    } catch (error) {
        console.error('Error getting active payment request:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get active payment request' },
            { status: 500 }
        );
    }
});
