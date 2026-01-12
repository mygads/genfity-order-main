/**
 * Group Order Details API
 * GET /api/public/orders/[orderNumber]/group-details
 * 
 * @description
 * Fetch group order breakdown - which participant ordered what items
 * and the bill splitting calculation.
 * 
 * Returns:
 * - isGroupOrder: boolean
 * - session: GroupOrderSession info
 * - participants: Array with their items and subtotals
 * - splitBill: Calculated bill split with tax/fees
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { decimalToNumber } from '@/lib/utils/serializer';
import type { Decimal } from '@prisma/client/runtime/library';
import { verifyOrderTrackingToken } from '@/lib/utils/orderTrackingToken';

interface RouteParams {
  params: Promise<{ orderNumber: string }>;
}

// Type for order item addon from database
interface DbAddon {
  addonName: string;
  addonPrice: Decimal;
  quantity: number;
}

// Type for group order detail from database
interface DbGroupOrderDetail {
  participantId: bigint;
  itemSubtotal: Decimal;
  orderItem: {
    id: bigint;
    menuName: string;
    menuPrice: Decimal;
    quantity: number;
    notes: string | null;
    addons: DbAddon[];
  } | null;
}

// Type for participant from database
interface DbParticipant {
  id: bigint;
  name: string;
  isHost: boolean;
  joinedAt: Date;
}

export async function GET(req: NextRequest, context: RouteParams) {
  try {
    const { orderNumber } = await context.params;

    const token = req.nextUrl.searchParams.get('token') || '';

    if (!orderNumber) {
      return NextResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Order number is required',
      }, { status: 400 });
    }

    // Find the order with merchant info
    const order = await prisma.order.findFirst({
      where: { orderNumber },
      include: {
        merchant: {
          select: {
            id: true,
            code: true,
            name: true,
            currency: true,
            taxPercentage: true,
            serviceChargePercent: true,
          },
        },
        orderItems: {
          include: {
            addons: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      }, { status: 404 });
    }

    // Tokenized access is REQUIRED for public tracking
    const merchantCode = order.merchant?.code || '';
    const ok = token
      ? verifyOrderTrackingToken({
          token,
          merchantCode,
          orderNumber: order.orderNumber,
        })
      : false;

    if (!ok) {
      return NextResponse.json({
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: 'Order not found',
      }, { status: 404 });
    }

    // Find the group order session for this order
    const groupSession = await prisma.groupOrderSession.findFirst({
      where: { orderId: order.id },
    });

    // If no group session, this is a regular order
    if (!groupSession) {
      return NextResponse.json({
        success: true,
        data: {
          isGroupOrder: false,
          order: {
            id: order.id.toString(),
            orderNumber: order.orderNumber,
            status: order.status,
            subtotal: decimalToNumber(order.subtotal),
            taxAmount: decimalToNumber(order.taxAmount),
            serviceChargeAmount: decimalToNumber(order.serviceChargeAmount),
            packagingFeeAmount: decimalToNumber(order.packagingFeeAmount),
            totalAmount: decimalToNumber(order.totalAmount),
          },
        },
        message: 'This is not a group order',
      });
    }

    // Fetch participants separately
    const participants = await prisma.groupOrderParticipant.findMany({
      where: { sessionId: groupSession.id },
      orderBy: { joinedAt: 'asc' },
      select: {
        id: true,
        name: true,
        isHost: true,
        joinedAt: true,
      },
    }) as DbParticipant[];

    // Fetch group order details with order items
    const groupOrderDetails = await prisma.groupOrderDetail.findMany({
      where: { sessionId: groupSession.id },
      include: {
        orderItem: {
          include: {
            addons: true,
          },
        },
      },
    }) as unknown as DbGroupOrderDetail[];

    // Calculate participant breakdown
    const round2 = (num: number): number => Math.round(num * 100) / 100;

    const subtotal = decimalToNumber(order.subtotal);
    const taxAmount = decimalToNumber(order.taxAmount);
    const serviceChargeAmount = decimalToNumber(order.serviceChargeAmount);
    const packagingFeeAmount = decimalToNumber(order.packagingFeeAmount);
    const totalAmount = decimalToNumber(order.totalAmount);

    // Group items by participant
    interface ParticipantBreakdown {
      id: string;
      name: string;
      isHost: boolean;
      items: Array<{
        id: string;
        menuName: string;
        menuPrice: number;
        quantity: number;
        subtotal: number;
        notes: string | null;
        addons: Array<{
          name: string;
          price: number;
          quantity: number;
        }>;
      }>;
      itemSubtotal: number;
    }

    const participantMap = new Map<string, ParticipantBreakdown>();

    // Initialize all participants (even those with no items)
    for (const participant of participants) {
      participantMap.set(participant.id.toString(), {
        id: participant.id.toString(),
        name: participant.name,
        isHost: participant.isHost,
        items: [],
        itemSubtotal: 0,
      });
    }

    // Group items by participant using GroupOrderDetail
    for (const detail of groupOrderDetails) {
      const participantId = detail.participantId.toString();
      const participant = participantMap.get(participantId);
      
      if (participant && detail.orderItem) {
        const item = detail.orderItem;
        participant.items.push({
          id: item.id.toString(),
          menuName: item.menuName,
          menuPrice: decimalToNumber(item.menuPrice),
          quantity: item.quantity,
          subtotal: decimalToNumber(detail.itemSubtotal),
          notes: item.notes,
          addons: item.addons.map((addon: DbAddon) => ({
            name: addon.addonName,
            price: decimalToNumber(addon.addonPrice),
            quantity: addon.quantity,
          })),
        });
        participant.itemSubtotal = round2(participant.itemSubtotal + decimalToNumber(detail.itemSubtotal));
      }
    }

    const participantsArray = Array.from(participantMap.values());

    // Calculate split bill
    const splitBill = participantsArray.map(p => {
      const shareRatio = subtotal > 0 ? p.itemSubtotal / subtotal : 0;
      const taxShare = round2(taxAmount * shareRatio);
      const serviceChargeShare = round2(serviceChargeAmount * shareRatio);
      const packagingFeeShare = round2(packagingFeeAmount * shareRatio);
      const total = round2(p.itemSubtotal + taxShare + serviceChargeShare + packagingFeeShare);

      return {
        participantId: p.id,
        participantName: p.name,
        isHost: p.isHost,
        itemCount: p.items.length,
        subtotal: p.itemSubtotal,
        taxShare,
        serviceChargeShare,
        packagingFeeShare,
        total,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        isGroupOrder: true,
        order: {
          id: order.id.toString(),
          orderNumber: order.orderNumber,
          status: order.status,
          orderType: groupSession.orderType,
          tableNumber: groupSession.tableNumber,
          subtotal,
          taxAmount,
          serviceChargeAmount,
          packagingFeeAmount,
          totalAmount,
          placedAt: order.placedAt,
        },
        session: {
          id: groupSession.id.toString(),
          sessionCode: groupSession.sessionCode,
          participantCount: participants.length,
          createdAt: groupSession.createdAt,
        },
        participants: participantsArray.map(p => ({
          id: p.id,
          name: p.name,
          isHost: p.isHost,
          items: p.items,
          subtotal: p.itemSubtotal,
        })),
        splitBill,
        merchant: {
          code: order.merchant.code,
          name: order.merchant.name,
          currency: order.merchant.currency,
        },
      },
      message: 'Group order details retrieved successfully',
    });

  } catch (error) {
    console.error('[GROUP ORDER] Get details error:', error);
    return NextResponse.json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to retrieve group order details',
    }, { status: 500 });
  }
}
