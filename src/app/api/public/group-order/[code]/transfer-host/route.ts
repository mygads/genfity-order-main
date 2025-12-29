/**
 * Transfer Host Role in Group Order Session
 * POST /api/public/group-order/[code]/transfer-host
 * 
 * @description
 * Host can transfer their host role to another participant.
 * Previous host remains as a regular participant.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { serializeBigInt } from '@/lib/utils/serializer';

interface RouteParams {
    params: Promise<{ code: string }>;
}

export async function POST(req: NextRequest, context: RouteParams) {
    try {
        const { code } = await context.params;
        const sessionCode = code.toUpperCase();
        const body = await req.json();

        const {
            deviceId,          // Current host's device ID
            newHostId,         // ID of participant who will become host
        } = body;

        // ========================================
        // VALIDATION
        // ========================================

        if (!deviceId) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Device ID is required',
            }, { status: 400 });
        }

        if (!newHostId) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'New host ID is required',
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

        // Verify caller is current host
        const currentHost = session.participants.find(p => p.isHost && p.deviceId === deviceId);
        if (!currentHost) {
            return NextResponse.json({
                success: false,
                error: 'UNAUTHORIZED',
                message: 'Only the current host can transfer host role',
            }, { status: 403 });
        }

        // Find new host
        const newHost = session.participants.find(
            p => p.id.toString() === newHostId && !p.isHost
        );

        if (!newHost) {
            return NextResponse.json({
                success: false,
                error: 'PARTICIPANT_NOT_FOUND',
                message: 'Selected participant not found or is already the host',
            }, { status: 404 });
        }

        // ========================================
        // TRANSFER HOST
        // ========================================

        await prisma.$transaction([
            // Remove host role from current host
            prisma.groupOrderParticipant.update({
                where: { id: currentHost.id },
                data: { isHost: false },
            }),
            // Add host role to new host
            prisma.groupOrderParticipant.update({
                where: { id: newHost.id },
                data: { isHost: true },
            }),
        ]);

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

        console.log(`[GROUP ORDER] Host transferred from ${currentHost.name} to ${newHost.name} in session ${sessionCode}`);

        return NextResponse.json({
            success: true,
            data: serializeBigInt(updatedSession),
            message: `${newHost.name} is now the host`,
        });

    } catch (error) {
        console.error('[GROUP ORDER] Transfer host error:', error);
        return NextResponse.json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to transfer host role',
        }, { status: 500 });
    }
}
