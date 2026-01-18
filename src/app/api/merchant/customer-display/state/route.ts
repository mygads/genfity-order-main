/**
 * Customer Display State API
 * GET /api/merchant/customer-display/state
 * PUT /api/merchant/customer-display/state
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { Prisma } from '@prisma/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import { serializeBigInt } from '@/lib/utils/serializer';

const ALLOWED_MODES = ['CART', 'ORDER_REVIEW', 'THANK_YOU', 'IDLE'] as const;
const SESSION_LOOKBACK_HOURS = 24;

type AllowedMode = typeof ALLOWED_MODES[number];

type SessionMap = Record<string, Prisma.InputJsonValue>;

function pruneSessions(sessions: SessionMap): SessionMap {
  const now = Date.now();
  const cutoff = now - SESSION_LOOKBACK_HOURS * 60 * 60 * 1000;

  return Object.entries(sessions).reduce<SessionMap>((acc, [key, value]) => {
    if (!value || typeof value !== 'object') return acc;
    const updatedAt = (value as { updatedAt?: string | null }).updatedAt;
    if (!updatedAt) return acc;
    const parsed = new Date(updatedAt).getTime();
    if (Number.isNaN(parsed) || parsed < cutoff) return acc;
    acc[key] = value;
    return acc;
  }, {});
}

async function handleGet(_req: NextRequest, context: AuthContext) {
  try {
    if (!context.merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant context not found',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const state = await prisma.customerDisplayState.findUnique({
      where: { merchantId: context.merchantId },
    });

    if (!state) {
      return NextResponse.json({
        success: true,
        data: {
          mode: 'IDLE',
          isLocked: false,
          payload: null,
          updatedAt: null,
        },
        message: 'Customer display state ready',
        statusCode: 200,
      });
    }

    return NextResponse.json({
      success: true,
      data: serializeBigInt(state),
      message: 'Customer display state retrieved',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Customer display state fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to retrieve customer display state',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

async function handlePut(req: NextRequest, context: AuthContext) {
  try {
    if (!context.merchantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MERCHANT_NOT_FOUND',
          message: 'Merchant context not found',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      mode?: AllowedMode;
      payload?: unknown;
      isLocked?: boolean;
      source?: 'pos' | 'manual' | 'system';
    };
    const mode = body?.mode;

    if (!mode || !ALLOWED_MODES.includes(mode)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_MODE',
          message: 'Invalid display mode',
          statusCode: 400,
        },
        { status: 400 }
      );
    }

    const existing = await prisma.customerDisplayState.findUnique({
      where: { merchantId: context.merchantId },
    });

    const existingPayload = (existing?.payload && existing.payload !== null)
      ? (existing.payload as Record<string, Prisma.InputJsonValue>)
      : {};
    const existingSessions = (existingPayload as { sessions?: SessionMap })?.sessions;
    const cleanedSessions = existingSessions ? pruneSessions(existingSessions) : undefined;

    let payloadValue: Prisma.InputJsonValue | Prisma.NullTypes.JsonNull | undefined;

    if (body?.source === 'pos') {
      const sessionKey = context.sessionId ? context.sessionId.toString() : 'unknown';
      const existingSession = cleanedSessions?.[sessionKey] as Prisma.JsonObject | undefined;
      const sessionLocked = Boolean(existingSession?.isLocked);

      if (sessionLocked && body?.source === 'pos' && typeof body?.isLocked !== 'boolean') {
        return NextResponse.json({
          success: true,
          data: serializeBigInt(existing),
          message: 'Customer display locked',
          statusCode: 200,
        });
      }
      let staffName: string | null = null;

      try {
        const user = await prisma.user.findUnique({
          where: { id: context.userId },
          select: { name: true },
        });
        staffName = user?.name ?? null;
      } catch {
        staffName = null;
      }

      const sessionEntry: Prisma.JsonObject = {
        sessionId: context.sessionId ? context.sessionId.toString() : null,
        userId: context.userId.toString(),
        staffName,
        mode,
        payload: (body?.payload && typeof body.payload === 'object') ? body.payload : null,
        isLocked: typeof body?.isLocked === 'boolean'
          ? body.isLocked
          : (existingSession?.isLocked ?? false),
        updatedAt: new Date().toISOString(),
      };

      const nextSessions: SessionMap = {
        ...(cleanedSessions ?? {}),
        [sessionKey]: sessionEntry,
      };

      const basePayload = (body?.payload && typeof body.payload === 'object')
        ? body.payload as Record<string, Prisma.InputJsonValue>
        : {};

      payloadValue = {
        ...basePayload,
        sessions: nextSessions,
      } as Prisma.InputJsonValue;
    } else if (body?.payload === null) {
      payloadValue = cleanedSessions
        ? ({ sessions: cleanedSessions } as Prisma.InputJsonValue)
        : Prisma.JsonNull;
    } else if (body?.payload && typeof body.payload === 'object') {
      payloadValue = cleanedSessions
        ? ({ ...(body.payload as Record<string, Prisma.InputJsonValue>), sessions: cleanedSessions } as Prisma.InputJsonValue)
        : body.payload as Prisma.InputJsonValue;
    } else {
      payloadValue = body?.payload ?? undefined;
    }

    const updated = await prisma.customerDisplayState.upsert({
      where: { merchantId: context.merchantId },
      update: {
        mode,
        payload: payloadValue as Prisma.InputJsonValue | Prisma.NullTypes.JsonNull | undefined,
        ...(typeof body?.isLocked === 'boolean' && body?.source !== 'pos' ? { isLocked: body.isLocked } : {}),
      },
      create: {
        merchantId: context.merchantId,
        mode,
        isLocked: typeof body?.isLocked === 'boolean' && body?.source !== 'pos' ? body.isLocked : false,
        payload: payloadValue as Prisma.InputJsonValue | Prisma.NullTypes.JsonNull | undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeBigInt(updated),
      message: 'Customer display state updated',
      statusCode: 200,
    });
  } catch (error) {
    console.error('Customer display state update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to update customer display state',
        statusCode: 500,
      },
      { status: 500 }
    );
  }
}

export const GET = withMerchant(handleGet);
export const PUT = withMerchant(handlePut);
