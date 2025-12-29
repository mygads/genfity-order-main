/**
 * Group Order / Split Bill API
 * POST /api/public/group-order - Create new group order session
 * 
 * @description
 * Creates a new group order session where:
 * - Host creates session with 4-char alphanumeric code
 * - Friends can join using the code or QR scan
 * - Session expires after 2 hours
 * 
 * @security
 * - Merchant validation
 * - Code collision prevention with retry logic
 * - Device ID for session tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

// Generate 4-char alphanumeric code (A-Z, 0-9)
function generateSessionCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded O, I, 0, 1 to avoid confusion
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Generate unique device ID if not provided
function generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            merchantCode,
            orderType,
            tableNumber,
            hostName,
            hostPhone: _hostPhone,
            deviceId: providedDeviceId,
            customerId, // Optional - if host is logged in
        } = body;

        // ========================================
        // VALIDATION
        // ========================================

        if (!merchantCode) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Merchant code is required',
            }, { status: 400 });
        }

        if (!hostName || hostName.trim().length === 0) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Host name is required',
            }, { status: 400 });
        }

        if (!orderType || !['DINE_IN', 'TAKEAWAY'].includes(orderType)) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Valid order type is required (DINE_IN or TAKEAWAY)',
            }, { status: 400 });
        }

        // Table number required for dine-in
        if (orderType === 'DINE_IN' && !tableNumber) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Table number is required for dine-in orders',
            }, { status: 400 });
        }

        // Get merchant by code
        const merchant = await prisma.merchant.findUnique({
            where: { code: merchantCode },
        });

        if (!merchant || !merchant.isActive) {
            return NextResponse.json({
                success: false,
                error: 'MERCHANT_INACTIVE',
                message: 'Merchant is currently not accepting orders',
            }, { status: 400 });
        }

        // ========================================
        // GENERATE UNIQUE SESSION CODE
        // ========================================

        let sessionCode = '';
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
            sessionCode = generateSessionCode();

            // Check if code exists and is still active
            const existingSession = await prisma.groupOrderSession.findFirst({
                where: {
                    sessionCode,
                    status: { in: ['OPEN', 'LOCKED'] },
                },
            });

            if (!existingSession) {
                break;
            }

            attempts++;
        }

        if (attempts >= maxAttempts) {
            return NextResponse.json({
                success: false,
                error: 'CODE_GENERATION_FAILED',
                message: 'Unable to generate unique session code. Please try again.',
            }, { status: 500 });
        }

        // ========================================
        // CREATE SESSION AND HOST PARTICIPANT
        // ========================================

        const deviceId = providedDeviceId || generateDeviceId();
        const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

        const session = await prisma.$transaction(async (tx) => {
            // Create session
            const createdSession = await tx.groupOrderSession.create({
                data: {
                    sessionCode,
                    merchantId: merchant.id,
                    orderType,
                    tableNumber: tableNumber || null,
                    status: 'OPEN',
                    maxParticipants: 15,
                    expiresAt,
                },
            });

            // Create host as first participant
            await tx.groupOrderParticipant.create({
                data: {
                    sessionId: createdSession.id,
                    customerId: customerId ? BigInt(customerId) : null,
                    name: hostName.trim(),
                    deviceId,
                    isHost: true,
                    cartItems: [],
                    subtotal: 0,
                },
            });

            // Return session with participants
            return await tx.groupOrderSession.findUnique({
                where: { id: createdSession.id },
                include: {
                    participants: {
                        orderBy: { joinedAt: 'asc' },
                    },
                    merchant: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                            currency: true,
                            isDineInEnabled: true,
                            isTakeawayEnabled: true,
                        },
                    },
                },
            });
        });

        console.log(`[GROUP ORDER] Session created: ${sessionCode} by ${hostName}`);

        return NextResponse.json({
            success: true,
            data: {
                ...serializeBigInt(session),
                deviceId, // Return deviceId for client storage
            },
            message: 'Group order session created successfully',
        }, { status: 201 });

    } catch (error) {
        console.error('[GROUP ORDER] Create session error:', error);
        return NextResponse.json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to create group order session',
        }, { status: 500 });
    }
}

/**
 * GET /api/public/group-order - List active sessions (for debugging/admin)
 * This endpoint is mostly for testing, not used in production flow
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const merchantCode = searchParams.get('merchantCode');

        if (!merchantCode) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Merchant code is required',
            }, { status: 400 });
        }

        const merchant = await prisma.merchant.findUnique({
            where: { code: merchantCode },
        });

        if (!merchant) {
            return NextResponse.json({
                success: false,
                error: 'MERCHANT_NOT_FOUND',
                message: 'Merchant not found',
            }, { status: 404 });
        }

        const sessions = await prisma.groupOrderSession.findMany({
            where: {
                merchantId: merchant.id,
                status: 'OPEN',
                expiresAt: { gt: new Date() },
            },
            include: {
                participants: {
                    select: {
                        id: true,
                        name: true,
                        isHost: true,
                        subtotal: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        return NextResponse.json({
            success: true,
            data: serializeBigInt(sessions),
        });

    } catch (error) {
        console.error('[GROUP ORDER] List sessions error:', error);
        return NextResponse.json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to fetch sessions',
        }, { status: 500 });
    }
}
