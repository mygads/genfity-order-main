/**
 * Merchant Balance Adjust API (Super Admin)
 * POST /api/admin/merchants/[id]/balance/adjust - Manually adjust balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSuperAdmin } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import balanceService from '@/lib/services/BalanceService';
import emailService from '@/lib/services/EmailService';
import prisma from '@/lib/db/client';
import { z } from 'zod';

const adjustSchema = z.object({
    amount: z.number(), // Can be positive or negative
    description: z.string().min(1).max(500),
});

async function handlePost(
    req: NextRequest,
    context: AuthContext,
    routeContext: { params: Promise<Record<string, string>> }
) {
    try {
        const { id } = await routeContext.params;
        const merchantId = BigInt(id);

        const body = await req.json();
        const validation = adjustSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { success: false, error: 'VALIDATION_ERROR', message: validation.error.issues[0].message },
                { status: 400 }
            );
        }

        const { amount, description } = validation.data;

        // Get merchant info before adjustment for email
        const merchant = await prisma.merchant.findUnique({
            where: { id: merchantId },
            select: { 
                name: true, 
                email: true, 
                currency: true,
                country: true,
                timezone: true,
                merchantBalance: {
                    select: { balance: true }
                }
            },
        });

        if (!merchant) {
            return NextResponse.json(
                { success: false, error: 'NOT_FOUND', message: 'Merchant not found' },
                { status: 404 }
            );
        }

        // Get admin name for email
        const admin = await prisma.user.findUnique({
            where: { id: context.userId },
            select: { name: true },
        });

        await balanceService.adjustBalance(
            merchantId,
            amount,
            description,
            context.userId
        );

        // Get new balance after adjustment
        const updatedBalance = await prisma.merchantBalance.findUnique({
            where: { merchantId },
            select: { balance: true },
        });

        // Send email notification to merchant
        if (merchant.email) {
            try {
                await emailService.sendBalanceAdjustmentNotification({
                    to: merchant.email,
                    merchantName: merchant.name,
                    amount: amount,
                    description: description,
                    newBalance: updatedBalance ? Number(updatedBalance.balance) : 0,
                    currency: merchant.currency || 'AUD',
                    merchantCountry: merchant.country,
                    merchantTimezone: merchant.timezone,
                    adjustedBy: admin?.name || 'Administrator',
                    adjustedAt: new Date(),
                });
                console.log(`✅ Balance adjustment email sent to ${merchant.email}`);
            } catch (emailError) {
                console.error('Failed to send balance adjustment email:', emailError);
                // Don't fail the request if email fails
            }
        }

        return NextResponse.json({
            success: true,
            message: `Balance adjusted by ${amount >= 0 ? '+' : ''}${amount}`,
        });
    } catch (error: unknown) {
        console.error('Error adjusting balance:', error);

        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    { success: false, error: 'NOT_FOUND', message: error.message },
                    { status: 404 }
                );
            }
            if (error.message.includes('negative')) {
                return NextResponse.json(
                    { success: false, error: 'BAD_REQUEST', message: error.message },
                    { status: 400 }
                );
            }
        }

        return NextResponse.json(
            { success: false, error: 'INTERNAL_ERROR', message: 'Failed to adjust balance' },
            { status: 500 }
        );
    }
}

export const POST = withSuperAdmin(handlePost);
