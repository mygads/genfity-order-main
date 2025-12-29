/**
 * Update Cart in Group Order Session
 * PUT /api/public/group-order/[code]/cart
 * 
 * @description
 * Update a participant's cart items within a group order session.
 * Called whenever the participant modifies their cart.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { Decimal } from '@prisma/client/runtime/library';

interface RouteParams {
    params: Promise<{ code: string }>;
}

interface CartItem {
    cartItemId: string;
    menuId: string;
    menuName: string;
    price: number;
    quantity: number;
    addons?: Array<{
        id: string;
        name: string;
        price: number;
    }>;
    notes?: string;
}

export async function PUT(req: NextRequest, context: RouteParams) {
    try {
        const { code } = await context.params;
        const sessionCode = code.toUpperCase();
        const body = await req.json();

        const { deviceId, cartItems, subtotal: _subtotal } = body;

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

        if (!Array.isArray(cartItems)) {
            return NextResponse.json({
                success: false,
                error: 'VALIDATION_ERROR',
                message: 'Cart items must be an array',
            }, { status: 400 });
        }

        // ========================================
        // FIND SESSION AND PARTICIPANT
        // ========================================

        const session = await prisma.groupOrderSession.findFirst({
            where: {
                sessionCode,
                status: 'OPEN',
                expiresAt: { gt: new Date() },
            },
            include: {
                participants: true,
            },
        });

        if (!session) {
            return NextResponse.json({
                success: false,
                error: 'SESSION_NOT_FOUND',
                message: 'Session not found, closed, or expired',
            }, { status: 404 });
        }

        // Find participant by device ID
        const participant = session.participants.find(p => p.deviceId === deviceId);

        if (!participant) {
            return NextResponse.json({
                success: false,
                error: 'PARTICIPANT_NOT_FOUND',
                message: 'You are not a participant in this session',
            }, { status: 403 });
        }

        // ========================================
        // CALCULATE SUBTOTAL (server-side validation)
        // ========================================

        let calculatedSubtotal = 0;

        for (const item of cartItems as CartItem[]) {
            const itemPrice = Number(item.price) || 0;
            const itemQty = Number(item.quantity) || 0;
            let itemTotal = itemPrice * itemQty;

            // Add addon prices
            if (item.addons && Array.isArray(item.addons)) {
                for (const addon of item.addons) {
                    const addonPrice = Number(addon.price) || 0;
                    // Addon price is already per addon, multiply by item quantity
                    itemTotal += addonPrice * itemQty;
                }
            }

            calculatedSubtotal += itemTotal;
        }

        // Use server-calculated subtotal (client subtotal is for reference only)
        const finalSubtotal = Math.round(calculatedSubtotal * 100) / 100;

        // ========================================
        // UPDATE PARTICIPANT CART
        // ========================================

        const updatedParticipant = await prisma.groupOrderParticipant.update({
            where: { id: participant.id },
            data: {
                cartItems: cartItems as object,
                subtotal: new Decimal(finalSubtotal),
            },
        });

        console.log(`[GROUP ORDER] Cart updated for ${participant.name} in session ${sessionCode}: ${cartItems.length} items, subtotal $${finalSubtotal}`);

        return NextResponse.json({
            success: true,
            data: {
                participantId: updatedParticipant.id.toString(),
                cartItems: updatedParticipant.cartItems,
                subtotal: finalSubtotal,
                itemCount: cartItems.length,
            },
            message: 'Cart updated successfully',
        });

    } catch (error) {
        console.error('[GROUP ORDER] Update cart error:', error);
        return NextResponse.json({
            success: false,
            error: 'INTERNAL_ERROR',
            message: 'Failed to update cart',
        }, { status: 500 });
    }
}
