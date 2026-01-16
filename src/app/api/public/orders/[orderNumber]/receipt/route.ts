import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { verifyOrderTrackingToken } from '@/lib/utils/orderTrackingToken';
import type { RouteContext } from '@/lib/utils/routeContext';
import { generateOrderReceiptPdfBuffer } from '@/lib/utils/orderReceiptPdfEmail';

/**
 * Public Receipt PDF
 * GET /api/public/orders/[orderNumber]/receipt?token=...
 *
 * Token-gated (same rules as public order detail endpoint).
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const { orderNumber } = params;

  const token = request.nextUrl.searchParams.get('token') || '';
  const download = request.nextUrl.searchParams.get('download') === '1';

  if (!orderNumber) {
    return NextResponse.json(
      {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Order number is required',
        statusCode: 400,
      },
      { status: 400 }
    );
  }

  const order = await prisma.order.findFirst({
    where: { orderNumber },
    include: {
      orderItems: {
        include: {
          addons: true,
          menu: {
            select: {
              name: true,
            },
          },
        },
      },
      reservation: {
        select: {
          tableNumber: true,
        },
      },
      customer: {
        select: {
          name: true,
          email: true,
          phone: true,
        },
      },
      merchant: {
        select: {
          code: true,
          name: true,
          phone: true,
          email: true,
          address: true,
          currency: true,
          timezone: true,
          logoUrl: true,
          receiptSettings: true,
        },
      },
      payment: {
        include: {
          paidBy: {
            select: {
              name: true,
            },
          },
        },
      },
      orderDiscounts: {
        select: {
          label: true,
        },
      },
    },
  });

  // Avoid leaking existence for invalid/missing tokens.
  if (!order || !order.merchant?.code) {
    return NextResponse.json(
      {
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: 'Order not found',
        statusCode: 404,
      },
      { status: 404 }
    );
  }

  const merchantCode = order.merchant.code || '';
  const ok = token
    ? verifyOrderTrackingToken({
        token,
        merchantCode,
        orderNumber: order.orderNumber,
      })
    : false;

  if (!ok) {
    return NextResponse.json(
      {
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: 'Order not found',
        statusCode: 404,
      },
      { status: 404 }
    );
  }

  const currency = order.merchant.currency || 'AUD';
  const timeZone = order.merchant.timezone || 'Australia/Sydney';
  const locale = currency === 'IDR' ? 'id' : 'en';

  const discountLabel = Array.isArray(order.orderDiscounts)
    ? order.orderDiscounts
        .map((d) => (typeof d?.label === 'string' ? d.label : ''))
        .filter((s) => s.trim() !== '')
        .join(' + ') || undefined
    : undefined;

  const pdfBuffer = await generateOrderReceiptPdfBuffer({
    orderNumber: order.orderNumber,
    merchantCode: order.merchant.code,
    merchantName: order.merchant.name,
    merchantLogoUrl: order.merchant.logoUrl,
    merchantAddress: order.merchant.address,
    merchantPhone: order.merchant.phone,
    merchantEmail: order.merchant.email,
    receiptSettings: (order.merchant.receiptSettings || {}) as any,
    customerName: order.customer?.name || (order as any).customerName || (locale === 'id' ? 'Pelanggan' : 'Customer'),
    customerPhone: order.customer?.phone || (order as any).customerPhone || null,
    customerEmail: order.customer?.email || (order as any).customerEmail || null,
    orderType: order.orderType as any,
    tableNumber: (order as any).tableNumber || order.reservation?.tableNumber || null,
    deliveryUnit: (order as any).deliveryUnit || null,
    deliveryBuildingName: (order as any).deliveryBuildingName || null,
    deliveryBuildingNumber: (order as any).deliveryBuildingNumber || null,
    deliveryFloor: (order as any).deliveryFloor || null,
    deliveryInstructions: (order as any).deliveryInstructions || null,
    deliveryAddress: (order as any).deliveryAddress || null,
    items: (order.orderItems || []).map((item: any) => ({
      menuName: item.menuName || item.menu?.name || 'Item',
      quantity: Number(item.quantity) || 0,
      unitPrice: item.unitPrice !== null && item.unitPrice !== undefined ? Number(item.unitPrice) : undefined,
      subtotal: Number(item.subtotal) || 0,
      notes: item.notes || null,
      addons: Array.isArray(item.addons)
        ? item.addons.map((addon: any) => ({
            addonName: addon.addonName || addon.addonItem?.name || 'Addon',
            addonPrice: addon.addonPrice !== null && addon.addonPrice !== undefined ? Number(addon.addonPrice) : undefined,
            quantity: addon.quantity !== null && addon.quantity !== undefined ? Number(addon.quantity) : undefined,
            subtotal: addon.subtotal !== null && addon.subtotal !== undefined ? Number(addon.subtotal) : undefined,
          }))
        : [],
    })),
    subtotal: Number(order.subtotal) || 0,
    taxAmount: order.taxAmount !== null && order.taxAmount !== undefined ? Number(order.taxAmount) : 0,
    serviceChargeAmount: (order as any).serviceChargeAmount !== null && (order as any).serviceChargeAmount !== undefined
      ? Number((order as any).serviceChargeAmount)
      : 0,
    packagingFeeAmount: (order as any).packagingFeeAmount !== null && (order as any).packagingFeeAmount !== undefined
      ? Number((order as any).packagingFeeAmount)
      : 0,
    deliveryFeeAmount: (order as any).deliveryFeeAmount !== null && (order as any).deliveryFeeAmount !== undefined
      ? Number((order as any).deliveryFeeAmount)
      : 0,
    discountAmount: (order as any).discountAmount !== null && (order as any).discountAmount !== undefined
      ? Number((order as any).discountAmount)
      : 0,
    totalAmount: Number(order.totalAmount) || 0,
    paymentMethod: order.payment?.paymentMethod ? String(order.payment.paymentMethod) : null,
    currency,
    completedAt: (order as any).completedAt ? new Date((order as any).completedAt) : new Date(order.placedAt),
    locale,
    timeZone,
  });

  const filename = `receipt_${order.merchant.code}_${order.orderNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
