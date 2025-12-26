/**
 * Payment Requests Verification API (Super Admin)
 * GET /api/admin/payment-requests - List pending verifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import paymentRequestService from '@/lib/services/PaymentRequestService';

async function handleGet(req: NextRequest, _context: AuthContext) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50', 10);
        const offset = parseInt(searchParams.get('offset') || '0', 10);

        const { requests, total } = await paymentRequestService.getPendingVerifications({ limit, offset });

        return NextResponse.json({
            success: true,
            data: {
                requests: requests.map((r: { id: bigint; merchantId: bigint; merchant: { code: string; name: string }; type: string; status: string; currency: string; amount: unknown; monthsRequested: number | null; transferNotes: string | null; transferProofUrl: string | null; confirmedAt: Date | null; createdAt: Date }) => ({
                    id: r.id.toString(),
                    merchantId: r.merchantId.toString(),
                    merchantCode: r.merchant.code,
                    merchantName: r.merchant.name,
                    type: r.type,
                    status: r.status,
                    currency: r.currency,
                    amount: Number(r.amount),
                    monthsRequested: r.monthsRequested,
                    transferNotes: r.transferNotes,
                    transferProofUrl: r.transferProofUrl,
                    confirmedAt: r.confirmedAt,
                    createdAt: r.createdAt,
                })),
                pagination: { total, limit, offset, hasMore: offset + requests.length < total },
            },
        });
    } catch (error) {
        console.error('Error getting payment requests:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get payment requests' },
            { status: 500 }
        );
    }
}

export const GET = withSuperAdmin(handleGet);
