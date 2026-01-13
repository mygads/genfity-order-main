/**
 * Join Group Order Session API
 * POST /api/public/group-order/[code]/join
 * 
 * @description
 * Join an existing group order session with rate limiting:
 * - 3 wrong attempts = 1 minute lockout
 * - Device ID for reconnection support
 * - Session code validated case-insensitively
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

interface RouteParams {
    params: Promise<{ code: string }>;
}

// Rate limit: 3 attempts per minute
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 3;

// Generate unique device ID if not provided
function generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export async function POST(req: NextRequest, context: RouteParams) {
    try {
        const params = await context.params;
        const code = params.code;
        const sessionCode = code.toUpperCase();
        const body = await req.json();

        const {
            name,
            deviceId: providedDeviceId,
            customerId, // Optional - if participant is logged in
        } = body;

        // ========================================
        // VALIDATION
        // ========================================

        if (!name || name.trim().length === 0) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Name is required to join the group',
            }, { status: 400 });
        }

        const deviceId = providedDeviceId || generateDeviceId();

        // ========================================
        // RATE LIMITING (3 attempts per minute)
        // ========================================

        const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

        const recentAttempts = await prisma.groupJoinAttempt.count({
            where: {
                deviceId,
                createdAt: { gte: windowStart },
                success: false,
            },
        });

        if (recentAttempts >= MAX_ATTEMPTS) {
            const waitTime = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
            return NextResponse.json({
                success: false,
                error: 'RATE_LIMITED',
                message: `Too many failed attempts. Please wait ${waitTime} seconds before trying again.`,
            }, { status: 429 });
        }

        // ========================================
        // FIND SESSION
        // ========================================

        const session = await prisma.groupOrderSession.findFirst({
            where: {
                sessionCode,
                status: 'OPEN',
                expiresAt: { gt: new Date() },
            },
            include: {
                participants: true,
                merchant: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        currency: true,
                    },
                },
            },
        });

        // Log attempt
        await prisma.groupJoinAttempt.create({
            data: {
                deviceId,
                attemptCode: sessionCode,
                success: !!session,
            },
        });

        if (!session) {
            return NextResponse.json({
                success: false,
                error: 'SESSION_NOT_FOUND',
                message: 'Invalid code or session has expired. Please check the code and try again.',
            }, { status: 404 });
        }

        // ========================================
        // CHECK IF ALREADY A PARTICIPANT
        // ========================================

        const existingParticipant = session.participants.find(p => p.deviceId === deviceId);

        if (existingParticipant) {
            // Device is already in the session - return session info (reconnection)
            console.log(`[GROUP ORDER] Reconnected: ${name} to session ${sessionCode}`);

            return NextResponse.json({
                success: true,
                data: {
                    ...serializeBigInt(session),
                    participantId: existingParticipant.id.toString(),
                    isReconnection: true,
                    deviceId,
                },
                message: 'Reconnected to group order session',
            });
        }

        // ========================================
        // CHECK MAX PARTICIPANTS
        // ========================================

        if (session.participants.length >= session.maxParticipants) {
            return NextResponse.json({
                success: false,
                error: 'SESSION_FULL',
                message: `This group has reached the maximum of ${session.maxParticipants} participants`,
            }, { status: 400 });
        }

        // ========================================
        // ADD PARTICIPANT
        // ========================================

        const participant = await prisma.groupOrderParticipant.create({
            data: {
                sessionId: session.id,
                customerId: customerId ? BigInt(customerId) : null,
                name: name.trim(),
                deviceId,
                isHost: false,
                cartItems: [],
                subtotal: 0,
            },
        });

        // Fetch updated session
        const updatedSession = await prisma.groupOrderSession.findUnique({
            where: { id: session.id },
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
                    },
                },
            },
        });

        console.log(`[GROUP ORDER] Participant joined: ${name} to session ${sessionCode}`);

        return NextResponse.json({
            success: true,
            data: {
                ...serializeBigInt(updatedSession),
                participantId: participant.id.toString(),
                isReconnection: false,
                deviceId,
            },
            message: 'Successfully joined the group order',
        }, { status: 201 });

    } catch (error) {
        console.error('[GROUP ORDER] Join session error:', error);
        return NextResponse.json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to join group order session',
        }, { status: 500 });
    }
}
