/**
 * Public Merchant Stock Stream API (Server-Sent Events)
 * GET /api/public/merchants/[code]/stock-stream
 * 
 * @description
 * Real-time stock updates using Server-Sent Events (SSE).
 * Sends stock quantity changes for menus and addon items.
 * 
 * Benefits:
 * - Lightweight: One-way server-to-client communication
 * - Vercel/GCloud compatible: Works with serverless functions
 * - Auto-reconnect: Built into EventSource API
 * - No WebSocket complexity: Simpler infrastructure
 * 
 * @specification copilot-instructions.md - Performance Optimization
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/db/client';
import type { RouteContext } from '@/lib/utils/routeContext';

// Stock data structure sent to clients
interface StockUpdate {
  menuId: string;
  stockQty: number | null;
  trackStock: boolean;
  addonItems?: Array<{
    id: string;
    stockQty: number | null;
    trackStock: boolean;
  }>;
}

// Keep-alive interval in milliseconds
const KEEP_ALIVE_INTERVAL = 30000; // 30 seconds

// Stock check interval in milliseconds
const STOCK_CHECK_INTERVAL = 5000; // 5 seconds

/**
 * GET /api/public/merchants/[code]/stock-stream
 * SSE endpoint for real-time stock updates
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  const params = await context.params;
  const merchantCode = params.code;

  // Verify merchant exists
  const merchant = await prisma.merchant.findUnique({
    where: { code: merchantCode },
    select: { id: true, isActive: true },
  });

  if (!merchant || !merchant.isActive) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'MERCHANT_NOT_FOUND',
        message: 'Merchant not found or inactive',
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Track previous stock state for change detection
  let previousStockMap: Map<string, number | null> = new Map();

  // Fetch current stock data
  async function fetchStockData(): Promise<StockUpdate[]> {
    const menus = await prisma.menu.findMany({
      where: {
        merchantId: merchant!.id,
        isActive: true,
        deletedAt: null,
        trackStock: true, // Only fetch stock-tracked items
      },
      select: {
        id: true,
        stockQty: true,
        trackStock: true,
        addonCategories: {
          include: {
            addonCategory: {
              include: {
                addonItems: {
                  where: {
                    isActive: true,
                    deletedAt: null,
                    trackStock: true,
                  },
                  select: {
                    id: true,
                    stockQty: true,
                    trackStock: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return menus.map((menu) => ({
      menuId: menu.id.toString(),
      stockQty: menu.stockQty,
      trackStock: menu.trackStock,
      addonItems: menu.addonCategories.flatMap((mac) =>
        mac.addonCategory.addonItems.map((item) => ({
          id: item.id.toString(),
          stockQty: item.stockQty,
          trackStock: item.trackStock,
        }))
      ),
    }));
  }

  // Check for stock changes and return only changed items
  async function getStockChanges(): Promise<StockUpdate[] | null> {
    const currentStock = await fetchStockData();
    const changes: StockUpdate[] = [];

    for (const item of currentStock) {
      const prevQty = previousStockMap.get(item.menuId);
      
      // Check if menu stock changed
      if (prevQty !== item.stockQty) {
        changes.push(item);
        previousStockMap.set(item.menuId, item.stockQty);
      }

      // Check addon items for changes (simplified - could be more granular)
      if (item.addonItems) {
        for (const addon of item.addonItems) {
          const addonKey = `addon_${addon.id}`;
          const prevAddonQty = previousStockMap.get(addonKey);
          
          if (prevAddonQty !== addon.stockQty) {
            // Include this menu in changes if any addon changed
            if (!changes.find(c => c.menuId === item.menuId)) {
              changes.push(item);
            }
            previousStockMap.set(addonKey, addon.stockQty);
          }
        }
      }
    }

    return changes.length > 0 ? changes : null;
  }

  // Initialize stock map
  const initialStock = await fetchStockData();
  for (const item of initialStock) {
    previousStockMap.set(item.menuId, item.stockQty);
    if (item.addonItems) {
      for (const addon of item.addonItems) {
        previousStockMap.set(`addon_${addon.id}`, addon.stockQty);
      }
    }
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send initial stock data
      controller.enqueue(
        encoder.encode(`event: initial\ndata: ${JSON.stringify(initialStock)}\n\n`)
      );

      // Keep-alive timer
      const keepAliveTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keep-alive\n\n`));
        } catch {
          // Stream closed
          clearInterval(keepAliveTimer);
        }
      }, KEEP_ALIVE_INTERVAL);

      // Stock check timer
      const stockCheckTimer = setInterval(async () => {
        try {
          const changes = await getStockChanges();
          if (changes) {
            controller.enqueue(
              encoder.encode(`event: stock-update\ndata: ${JSON.stringify(changes)}\n\n`)
            );
          }
        } catch (error) {
          console.error('[SSE] Stock check error:', error);
        }
      }, STOCK_CHECK_INTERVAL);

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(keepAliveTimer);
        clearInterval(stockCheckTimer);
        controller.close();
      });
    },
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
