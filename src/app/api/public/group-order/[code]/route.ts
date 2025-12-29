/**
 * Group Order Session Details API
 * GET /api/public/group-order/[code] - Get session details
 * DELETE /api/public/group-order/[code] - Cancel session (host only)
 * 
 * @description
 * Retrieve session details including all participants and their carts.
 * Used for polling (every 5 seconds) to sync state across devices.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt, decimalToNumber } from '@/lib/utils/serializer';

interface RouteParams {
    params: Promise<{ code: string }>;
}

/**
 * GET /api/public/group-order/[code]
 * Get session details with all participants
 */
export async function GET(req: NextRequest, context: RouteParams) {
    try {
        const { code } = await context.params;
        const sessionCode = code.toUpperCase();

        const session = await prisma.groupOrderSession.findFirst({
            where: {
                sessionCode,
                status: { in: ['OPEN', 'LOCKED', 'SUBMITTED'] },
            },
            include: {
                participants: {
                    orderBy: { joinedAt: 'asc' },
                    include: {
                        customer: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                merchant: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        currency: true,
                        enableTax: true,
                        taxPercentage: true,
                        enableServiceCharge: true,
                        serviceChargePercent: true,
                        enablePackagingFee: true,
                        packagingFeeAmount: true,
                        isDineInEnabled: true,
                        isTakeawayEnabled: true,
                    },
                },
                order: {
                    select: {
                        id: true,
                        orderNumber: true,
                        status: true,
                        totalAmount: true,
                    },
                },
            },
        });

        if (!session) {
            return NextResponse.json({
                success: false,
                error: 'SESSION_NOT_FOUND',
                message: 'Group order session not found or has expired',
            }, { status: 404 });
        }

        // Check if session has expired
        if (session.expiresAt < new Date() && session.status === 'OPEN') {
            // Update status to expired
            await prisma.groupOrderSession.update({
                where: { id: session.id },
                data: { status: 'EXPIRED' },
            });

            return NextResponse.json({
                success: false,
                error: 'SESSION_EXPIRED',
                message: 'This group order session has expired',
            }, { status: 410 });
        }

        // Calculate totals
        const participantCount = session.participants.length;
        const totalSubtotal = session.participants.reduce(
            (sum, p) => sum + decimalToNumber(p.subtotal),
            0
        );

        // Find host
        const host = session.participants.find(p => p.isHost);

        return NextResponse.json({
            success: true,
            data: {
                ...serializeBigInt(session),
                summary: {
                    participantCount,
                    totalSubtotal,
                    hostName: host?.name || 'Unknown',
                    isExpired: session.expiresAt < new Date(),
                    expiresIn: Math.max(0, session.expiresAt.getTime() - Date.now()),
                },
            },
        });

    } catch (error) {
        console.error('[GROUP ORDER] Get session error:', error);
        return NextResponse.json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to fetch session details',
        }, { status: 500 });
    }
}

/**
 * DELETE /api/public/group-order/[code]
 * Cancel session (host only)
 */
export async function DELETE(req: NextRequest, context: RouteParams) {
    try {
        const { code } = await context.params;
        const sessionCode = code.toUpperCase();
        const body = await req.json();
        const { deviceId } = body;

        if (!deviceId) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Device ID is required',
            }, { status: 400 });
        }

        // Find session
        const session = await prisma.groupOrderSession.findFirst({
            where: {
                sessionCode,
                status: 'OPEN',
            },
            include: {
                participants: true,
            },
        });

        if (!session) {
            return NextResponse.json({
                success: false,
                error: 'SESSION_NOT_FOUND',
                message: 'Session not found or already closed',
            }, { status: 404 });
        }

        // Verify caller is host
        const host = session.participants.find(p => p.isHost && p.deviceId === deviceId);
        if (!host) {
            return NextResponse.json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'Only the host can cancel the session',
            }, { status: 403 });
        }

        // Cancel session
        await prisma.groupOrderSession.update({
            where: { id: session.id },
            data: { status: 'CANCELLED' },
        });

        console.log(`[GROUP ORDER] Session cancelled: ${sessionCode}`);

        return NextResponse.json({
            success: true,
            message: 'Group order session cancelled',
        });

    } catch (error) {
        console.error('[GROUP ORDER] Cancel session error:', error);
        return NextResponse.json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to cancel session',
        }, { status: 500 });
    }
}
