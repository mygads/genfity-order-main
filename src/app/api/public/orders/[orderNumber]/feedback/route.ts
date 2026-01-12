import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';
import { verifyOrderTrackingToken } from '@/lib/utils/orderTrackingToken';

interface FeedbackBody {
    overallRating: number;
    serviceRating?: number;
    foodRating?: number;
    comment?: string;
}

/**
 * GET /api/public/orders/[orderNumber]/feedback
 * Check if feedback exists for an order
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ orderNumber: string }> }
) {
    try {
        const { orderNumber } = await context.params;

        const token = request.nextUrl.searchParams.get('token') || '';

        if (!orderNumber) {
            return NextResponse.json(
                { success: false, message: 'Order number is required' },
                { status: 400 }
            );
        }

        // Token is required (public endpoint)
        const orderForToken = await prisma.order.findFirst({
            where: { orderNumber },
            select: {
                orderNumber: true,
                merchant: { select: { code: true } },
            },
        });

        if (!orderForToken) {
            return NextResponse.json(
                { success: false, message: 'Order not found' },
                { status: 404 }
            );
        }

        const ok = token
            ? verifyOrderTrackingToken({
                token,
                merchantCode: orderForToken.merchant?.code || '',
                orderNumber: orderForToken.orderNumber,
            })
            : false;

        if (!ok) {
            return NextResponse.json(
                { success: false, message: 'Order not found' },
                { status: 404 }
            );
        }

        // Check if feedback exists
        const feedback = await prisma.orderFeedback.findUnique({
            where: { orderNumber },
            select: {
                id: true,
                overallRating: true,
                serviceRating: true,
                foodRating: true,
                comment: true,
                createdAt: true,
            },
        });

        return NextResponse.json({
            success: true,
            hasFeedback: !!feedback,
            data: feedback ? serializeBigInt(feedback) : null,
        });
    } catch (error) {
        console.error('[Feedback GET] Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to check feedback' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/public/orders/[orderNumber]/feedback
 * Submit feedback for an order
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ orderNumber: string }> }
) {
    try {
        const { orderNumber } = await context.params;

        const token = request.nextUrl.searchParams.get('token') || '';

        if (!orderNumber) {
            return NextResponse.json(
                { success: false, message: 'Order number is required' },
                { status: 400 }
            );
        }

        // Parse request body
        const body: FeedbackBody = await request.json();

        // Validate overall rating (required)
        if (!body.overallRating || body.overallRating < 1 || body.overallRating > 5) {
            return NextResponse.json(
                { success: false, message: 'Overall rating must be between 1 and 5' },
                { status: 400 }
            );
        }

        // Validate optional ratings
        if (body.serviceRating && (body.serviceRating < 1 || body.serviceRating > 5)) {
            return NextResponse.json(
                { success: false, message: 'Service rating must be between 1 and 5' },
                { status: 400 }
            );
        }
        if (body.foodRating && (body.foodRating < 1 || body.foodRating > 5)) {
            return NextResponse.json(
                { success: false, message: 'Food rating must be between 1 and 5' },
                { status: 400 }
            );
        }

        // Check if feedback already exists
        const existingFeedback = await prisma.orderFeedback.findUnique({
            where: { orderNumber },
        });

        if (existingFeedback) {
            return NextResponse.json(
                { success: false, message: 'Feedback already submitted for this order' },
                { status: 409 }
            );
        }

        // Find the order to get merchantId and validate token
        const order = await prisma.order.findFirst({
            where: { orderNumber },
            select: {
                id: true,
                orderNumber: true,
                merchantId: true,
                orderType: true,
                status: true,
                deliveryStatus: true,
                placedAt: true,
                completedAt: true,
                deliveryDeliveredAt: true,
                merchant: { select: { code: true } },
            },
        });

        if (!order) {
            return NextResponse.json(
                { success: false, message: 'Order not found' },
                { status: 404 }
            );
        }

        const ok = token
            ? verifyOrderTrackingToken({
                token,
                merchantCode: order.merchant?.code || '',
                orderNumber: order.orderNumber,
            })
            : false;

        if (!ok) {
            return NextResponse.json(
                { success: false, message: 'Order not found' },
                { status: 404 }
            );
        }

        // Delivery-only feedback (Grab/Gojek style)
        if (order.orderType !== 'DELIVERY') {
            return NextResponse.json(
                { success: false, message: 'Feedback is only available for delivery orders' },
                { status: 400 }
            );
        }

        // Require delivered
        if (order.deliveryStatus !== 'DELIVERED' && !order.deliveryDeliveredAt) {
            return NextResponse.json(
                { success: false, message: 'Feedback can only be submitted after delivery is completed' },
                { status: 400 }
            );
        }

        // Calculate order completion time in minutes
        let orderCompletionMinutes: number | null = null;
        const completedAt = order.deliveryDeliveredAt || order.completedAt;
        if (completedAt && order.placedAt) {
            const completionTime = new Date(completedAt).getTime() - new Date(order.placedAt).getTime();
            orderCompletionMinutes = Math.round(completionTime / (1000 * 60));
        }

        // Create feedback
        const feedback = await prisma.orderFeedback.create({
            data: {
                orderNumber,
                merchantId: order.merchantId,
                overallRating: body.overallRating,
                serviceRating: body.serviceRating || null,
                foodRating: body.foodRating || null,
                comment: body.comment || null,
                orderCompletionMinutes,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Feedback submitted successfully',
            data: {
                id: feedback.id.toString(),
                overallRating: feedback.overallRating,
                orderCompletionMinutes: feedback.orderCompletionMinutes,
            },
        });
    } catch (error) {
        console.error('[Feedback POST] Error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to submit feedback' },
            { status: 500 }
        );
    }
}
