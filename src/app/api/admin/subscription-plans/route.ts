/**
 * Subscription Plans API (Super Admin)
 * GET /api/admin/subscription-plans - List plans
 * PUT /api/admin/subscription-plans - Update pricing
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import subscriptionRepository from '@/lib/repositories/SubscriptionRepository';
import { z } from 'zod';

const updatePlanSchema = z.object({
    trialDays: z.number().min(1).max(365).optional(),
    depositMinimumIdr: z.number().positive().optional(),
    orderFeeIdr: z.number().positive().optional(),
    monthlyPriceIdr: z.number().positive().optional(),
    depositMinimumAud: z.number().positive().optional(),
    orderFeeAud: z.number().positive().optional(),
    monthlyPriceAud: z.number().positive().optional(),
    bankNameIdr: z.string().max(100).optional(),
    bankAccountIdr: z.string().max(50).optional(),
    bankAccountNameIdr: z.string().max(100).optional(),
    bankNameAud: z.string().max(100).optional(),
    bankAccountAud: z.string().max(50).optional(),
    bankAccountNameAud: z.string().max(100).optional(),
    // Influencer Commission Settings
    influencerFirstCommissionPercent: z.number().min(0).max(100).optional(),
    influencerRecurringCommissionPercent: z.number().min(0).max(100).optional(),
    influencerMinWithdrawalIdr: z.number().positive().optional(),
    influencerMinWithdrawalAud: z.number().positive().optional(),
});

async function handleGet(_req: NextRequest, _context: AuthContext) {
    try {
        const plans = await subscriptionRepository.getAllPlans(false);

        return NextResponse.json({
            success: true,
            data: plans.map((plan: any) => ({
                id: plan.id.toString(),
                planKey: plan.planKey,
                displayName: plan.displayName,
                description: plan.description,
                trialDays: plan.trialDays,
                depositMinimumIdr: Number(plan.depositMinimumIdr),
                orderFeeIdr: Number(plan.orderFeeIdr),
                monthlyPriceIdr: Number(plan.monthlyPriceIdr),
                depositMinimumAud: Number(plan.depositMinimumAud),
                orderFeeAud: Number(plan.orderFeeAud),
                monthlyPriceAud: Number(plan.monthlyPriceAud),
                bankNameIdr: plan.bankNameIdr,
                bankAccountIdr: plan.bankAccountIdr,
                bankAccountNameIdr: plan.bankAccountNameIdr,
                bankNameAud: plan.bankNameAud,
                bankAccountAud: plan.bankAccountAud,
                bankAccountNameAud: plan.bankAccountNameAud,
                influencerFirstCommissionPercent: Number(plan.influencerFirstCommissionPercent),
                influencerRecurringCommissionPercent: Number(plan.influencerRecurringCommissionPercent),
                influencerMinWithdrawalIdr: Number(plan.influencerMinWithdrawalIdr),
                influencerMinWithdrawalAud: Number(plan.influencerMinWithdrawalAud),
                isActive: plan.isActive,
            })),
        });
    } catch (error) {
        console.error('Error getting subscription plans:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to get subscription plans' },
            { status: 500 }
        );
    }
}

async function handlePut(req: NextRequest, _context: AuthContext) {
    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: 'Plan ID is required' },
                { status: 400 }
            );
        }

        const validation = updatePlanSchema.safeParse(updateData);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const updatedPlan = await subscriptionRepository.updatePlan(BigInt(id), validation.data);

        return NextResponse.json({
            success: true,
            message: 'Subscription plan updated successfully',
            data: { id: updatedPlan.id.toString(), planKey: updatedPlan.planKey },
        });
    } catch (error) {
        console.error('Error updating subscription plan:', error);
        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to update subscription plan' },
            { status: 500 }
        );
    }
}

export const GET = withSuperAdmin(handleGet);
export const PUT = withSuperAdmin(handlePut);
