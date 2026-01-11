/**
 * Merchant Feedback API
 * GET /api/merchant/feedback - Get all feedback for merchant
 * 
 * Features:
 * - List all feedback with pagination
 * - Filter by date range and rating
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant, AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

/**
 * GET /api/merchant/feedback
 * Get feedback list for merchant
 * 
 * Query params:
 * - page: number (default 1)
 * - limit: number (default 20)
 * - minRating: 1-5 (filter by minimum overall rating)
 * - maxRating: 1-5 (filter by maximum overall rating)
 * - startDate: ISO date string
 * - endDate: ISO date string
 */
export const GET = withMerchant(async (
    request: NextRequest,
    context: AuthContext
) => {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
        const minRating = parseInt(searchParams.get('minRating') || '1', 10);
        const maxRating = parseInt(searchParams.get('maxRating') || '5', 10);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Ensure merchantId is defined
        if (!context.merchantId) {
            return NextResponse.json(
                { success: false, error: 'MERCHANT_REQUIRED', message: 'Merchant context required' },
                { status: 403 }
            );
        }

        // Build where clause
        const where: {
            merchantId: bigint;
            overallRating?: { gte?: number; lte?: number };
            createdAt?: { gte?: Date; lte?: Date };
        } = {
            merchantId: context.merchantId,
        };

        // Rating filter
        if (minRating > 1 || maxRating < 5) {
            where.overallRating = {
                gte: Math.max(1, Math.min(5, minRating)),
                lte: Math.max(1, Math.min(5, maxRating)),
            };
        }

        // Date filter
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        // Get total count
        const totalCount = await prisma.orderFeedback.count({ where });

        // Get feedback
        const feedback = await prisma.orderFeedback.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        });

        return NextResponse.json({
            success: true,
            data: serializeBigInt(feedback),
            meta: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
            },
        });
    } catch (error) {
        console.error('[Merchant Feedback GET] Error:', error);
        return NextResponse.json(
            { success: false, error: 'FEEDBACK_ERROR', message: 'Failed to fetch feedback' },
            { status: 500 }
        );
    }
});
