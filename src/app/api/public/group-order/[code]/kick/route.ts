/**
 * Kick Participant from Group Order Session
 * DELETE /api/public/group-order/[code]/kick
 * 
 * @description
 * Host can kick a participant from the group.
 * Requires confirmation if participant has items in cart.
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

        const {
            deviceId,        // Host's device ID
            participantId,   // ID of participant to kick
            confirmed,       // True if user confirmed kick (when participant has items)
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

        if (!participantId) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Participant ID to kick is required',
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
                message: 'Only the host can remove participants',
            }, { status: 403 });
        }

        // Find participant to kick
        const targetParticipant = session.participants.find(
            p => p.id.toString() === participantId
        );

        if (!targetParticipant) {
            return NextResponse.json({
                success: false,
                error: 'PARTICIPANT_NOT_FOUND',
                message: 'Participant not found in this session',
            }, { status: 404 });
        }

        // Cannot kick yourself (host)
        if (targetParticipant.isHost) {
            return NextResponse.json({
                success: false,
                error: 'INVALID_OPERATION',
                message: 'You cannot kick yourself. Use "Leave Group" instead.',
            }, { status: 400 });
        }

        // ========================================
        // CHECK IF CONFIRMATION NEEDED
        // ========================================

        const cartItems = targetParticipant.cartItems as unknown[];
        const hasItems = Array.isArray(cartItems) && cartItems.length > 0;

        if (hasItems && !confirmed) {
            return NextResponse.json({
                success: false,
                error: 'CONFIRMATION_REQUIRED',
                message: `${targetParticipant.name} has items in their cart. Are you sure you want to remove them?`,
                data: {
                    participantName: targetParticipant.name,
                    itemCount: cartItems.length,
                    requiresConfirmation: true,
                },
            }, { status: 400 });
        }

        // ========================================
        // KICK PARTICIPANT
        // ========================================

        await prisma.groupOrderParticipant.delete({
            where: { id: targetParticipant.id },
        });

        console.log(`[GROUP ORDER] Participant kicked: ${targetParticipant.name} from session ${sessionCode} by ${host.name}`);

        return NextResponse.json({
            success: true,
            message: `${targetParticipant.name} has been removed from the group`,
            data: {
                kickedParticipant: {
                    id: targetParticipant.id.toString(),
                    name: targetParticipant.name,
                },
            },
        });

    } catch (error) {
        console.error('[GROUP ORDER] Kick participant error:', error);
        return NextResponse.json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to remove participant',
        }, { status: 500 });
    }
}
