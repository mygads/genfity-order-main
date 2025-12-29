/**
 * Leave Group Order Session
 * DELETE /api/public/group-order/[code]/leave
 * 
 * @description
 * Allows a participant to leave a group order session.
 * If host leaves, they must transfer host first or session is cancelled.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';

interface RouteParams {
    params: Promise<{ code: string }>;
}

export async function DELETE(req: NextRequest, context: RouteParams) {
    try {
        const { code } = await context.params;
        const sessionCode = code.toUpperCase();
        const body = await req.json();
        const { deviceId } = body;

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

        // Find participant
        const participant = session.participants.find(p => p.deviceId === deviceId);

        if (!participant) {
            return NextResponse.json({
                success: false,
                error: 'PARTICIPANT_NOT_FOUND',
                message: 'You are not a participant in this session',
            }, { status: 404 });
        }

        // ========================================
        // HOST LEAVING - SPECIAL HANDLING
        // ========================================

        if (participant.isHost) {
            const otherParticipants = session.participants.filter(p => !p.isHost);

            if (otherParticipants.length === 0) {
                // No other participants - cancel the session
                await prisma.groupOrderSession.update({
                    where: { id: session.id },
                    data: { status: 'CANCELLED' },
                });

                console.log(`[GROUP ORDER] Session cancelled (host left, no others): ${sessionCode}`);

                return NextResponse.json({
                    success: true,
                    message: 'Session cancelled as you were the only participant',
                    data: { sessionCancelled: true },
                });
            }

            // Transfer host to first participant who joined
            const newHost = otherParticipants[0];

            await prisma.$transaction([
                // Remove current host
                prisma.groupOrderParticipant.delete({
                    where: { id: participant.id },
                }),
                // Make first participant the new host
                prisma.groupOrderParticipant.update({
                    where: { id: newHost.id },
                    data: { isHost: true },
                }),
            ]);

            console.log(`[GROUP ORDER] Host left, transferred to ${newHost.name} in session ${sessionCode}`);

            return NextResponse.json({
                success: true,
                message: `You have left the group. ${newHost.name} is now the host.`,
                data: {
                    sessionCancelled: false,
                    newHostName: newHost.name,
                },
            });
        }

        // ========================================
        // REGULAR PARTICIPANT LEAVING
        // ========================================

        await prisma.groupOrderParticipant.delete({
            where: { id: participant.id },
        });

        console.log(`[GROUP ORDER] Participant left: ${participant.name} from session ${sessionCode}`);

        return NextResponse.json({
            success: true,
            message: 'You have left the group order',
            data: { sessionCancelled: false },
        });

    } catch (error) {
        console.error('[GROUP ORDER] Leave session error:', error);
        return NextResponse.json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to leave session',
        }, { status: 500 });
    }
}
