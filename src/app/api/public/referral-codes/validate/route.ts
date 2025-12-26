/**
 * Public Referral Code Validation API
 * POST /api/public/referral-codes/validate - Validate a referral code
 */

import { NextRequest, NextResponse } from 'next/server';
import referralService from '@/lib/services/ReferralService';
import { z } from 'zod';

const validateSchema = z.object({
    code: z.string().min(1),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const validation = validateSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: 'Referral code is required' },
                { status: 400 }
            );
        }

        const result = await referralService.validateCode(validation.data.code);

        if (!result.valid) {
            return NextResponse.json(
                { success: false, valid: false, message: result.error },
                { status: 200 } // 200 because validation worked, just not valid
            );
        }

        return NextResponse.json({
            success: true,
            valid: true,
            data: {
                code: result.code?.code,
                discountType: result.code?.discountType,
                discountValue: result.code?.discountValue,
            },
        });
    } catch (error) {
        console.error('Error validating referral code:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to validate referral code' },
            { status: 500 }
        );
    }
}
