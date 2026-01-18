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

const POSITIVE_WORDS = [
    'good', 'great', 'excellent', 'amazing', 'love', 'friendly', 'fast', 'quick',
    'tasty', 'delicious', 'nice', 'satisfied', 'mantap', 'enak', 'lezat', 'ramah',
    'cepat', 'bagus', 'puas', 'mantul', 'recommended', 'recommend'
];
const NEGATIVE_WORDS = [
    'bad', 'slow', 'late', 'cold', 'rude', 'burnt', 'dirty', 'expensive', 'small',
    'poor', 'not good', 'delay', 'overpriced', 'mahal', 'lama', 'dingin', 'kurang',
    'kecewa', 'jelek', 'kotor', 'asin', 'gosong'
];

const TAG_KEYWORDS: Record<string, string[]> = {
    service: ['service', 'staff', 'waiter', 'cashier', 'ramah', 'pelayanan', 'kasir'],
    food: ['food', 'taste', 'flavor', 'tasty', 'delicious', 'enak', 'lezat', 'rasa', 'makanan'],
    delivery: ['delivery', 'driver', 'courier', 'antar', 'pengantaran'],
    price: ['price', 'expensive', 'cheap', 'mahal', 'murah', 'value'],
    portion: ['portion', 'portion size', 'small', 'besar', 'porsi', 'portion'],
    cleanliness: ['clean', 'dirty', 'kotor', 'bersih'],
    packaging: ['packaging', 'package', 'kemasan', 'bungkus'],
    speed: ['fast', 'quick', 'slow', 'late', 'cepat', 'lama'],
};

const normalizeText = (value?: string | null) => (value || '').toLowerCase();

const getSentiment = (comment: string | null | undefined, rating: number) => {
    const text = normalizeText(comment);
    const hasPositive = POSITIVE_WORDS.some((word) => text.includes(word));
    const hasNegative = NEGATIVE_WORDS.some((word) => text.includes(word));

    if (rating >= 4 && hasPositive && !hasNegative) return 'positive';
    if (rating <= 2 || hasNegative) return 'negative';
    return 'neutral';
};

const getTags = (comment: string | null | undefined) => {
    const text = normalizeText(comment);
    return Object.entries(TAG_KEYWORDS)
        .filter(([, keywords]) => keywords.some((keyword) => text.includes(keyword)))
        .map(([tag]) => tag);
};

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
        const sentiment = searchParams.get('sentiment');
        const tagFilter = searchParams.get('tag');
        const search = searchParams.get('search');

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
            OR?: Array<{ comment?: { contains: string; mode: 'insensitive' }; orderNumber?: { contains: string; mode: 'insensitive' } }>;
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

        if (search) {
            where.OR = [
                { comment: { contains: search, mode: 'insensitive' } },
                { orderNumber: { contains: search, mode: 'insensitive' } },
            ];
        }

        const requiresClientFilter = Boolean(sentiment || tagFilter);

        const feedback = await prisma.orderFeedback.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: requiresClientFilter ? 0 : (page - 1) * limit,
            take: requiresClientFilter ? undefined : limit,
        });

        const feedbackWithTags = feedback
            .map((item) => {
                const sentimentValue = getSentiment(item.comment, item.overallRating);
                const tags = getTags(item.comment);
                return {
                    ...item,
                    sentiment: sentimentValue,
                    tags,
                };
            })
            .filter((item) => {
                if (sentiment && item.sentiment !== sentiment) return false;
                if (tagFilter && !item.tags.includes(tagFilter)) return false;
                return true;
            });

        const totalCount = requiresClientFilter ? feedbackWithTags.length : await prisma.orderFeedback.count({ where });
        const paginated = requiresClientFilter
            ? feedbackWithTags.slice((page - 1) * limit, (page - 1) * limit + limit)
            : feedbackWithTags;

        return NextResponse.json({
            success: true,
            data: serializeBigInt(paginated),
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
