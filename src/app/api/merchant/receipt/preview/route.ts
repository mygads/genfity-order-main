import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import type { ReceiptSettings } from '@/lib/types/receiptSettings';
import { generateOrderReceiptPdfBuffer } from '@/lib/utils/orderReceiptPdfEmail';

/**
 * Receipt PDF Preview
 * POST /api/merchant/receipt/preview
 *
 * Generates a canonical receipt PDF using merchant profile + provided settings.
 */
export const POST = withMerchant(async (req: NextRequest, auth: AuthContext) => {
  const merchantId = auth.merchantId;
  if (!merchantId) {
    return NextResponse.json(
      {
        success: false,
        error: 'MERCHANT_ID_REQUIRED',
        message: 'Merchant ID is required',
        statusCode: 400,
      },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const receiptSettings = ((body as any)?.receiptSettings || {}) as Partial<ReceiptSettings>;

  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    select: {
      code: true,
      name: true,
      logoUrl: true,
      address: true,
      phone: true,
      email: true,
      currency: true,
      timezone: true,
    },
  });

  if (!merchant || !merchant.code) {
    return NextResponse.json(
      {
        success: false,
        error: 'NOT_FOUND',
        message: 'Merchant not found',
        statusCode: 404,
      },
      { status: 404 }
    );
  }

  const currency = merchant.currency || 'AUD';
  const timeZone = merchant.timezone || 'Australia/Sydney';
  const locale: 'en' | 'id' = currency === 'IDR' ? 'id' : 'en';

  const now = new Date();

  const pdfBuffer = await generateOrderReceiptPdfBuffer({
    orderNumber: 'DEMO-1234',
    merchantCode: merchant.code,
    merchantName: merchant.name,
    merchantLogoUrl: merchant.logoUrl,
    merchantAddress: merchant.address,
    merchantPhone: merchant.phone || null,
    merchantEmail: merchant.email,
    receiptSettings,
    customerName: locale === 'id' ? 'Pelanggan' : 'Customer',
    customerPhone: locale === 'id' ? '08xx-xxxx-xxxx' : '+61 4xx xxx xxx',
    customerEmail: 'customer@example.com',
    orderType: 'DELIVERY',
    tableNumber: null,
    deliveryUnit: 'Unit 12',
    deliveryBuildingName: 'Genfity Tower',
    deliveryBuildingNumber: '88',
    deliveryFloor: '7',
    deliveryInstructions: locale === 'id' ? 'Tolong taruh di resepsionis.' : 'Please leave at reception.',
    deliveryAddress: '123 Example Street, City',
    items: [
      {
        menuName: 'Chicken Burger',
        quantity: 2,
        unitPrice: 15.5,
        subtotal: 31,
        notes: locale === 'id' ? 'Tanpa bawang' : 'No onion',
        addons: [
          { addonName: 'Extra Cheese', addonPrice: 2, quantity: 2, subtotal: 4 },
          { addonName: 'Bacon', addonPrice: 3, quantity: 2, subtotal: 6 },
        ],
      },
      {
        menuName: 'French Fries',
        quantity: 1,
        unitPrice: 8,
        subtotal: 8,
      },
    ],
    subtotal: 39,
    taxAmount: 0,
    serviceChargeAmount: 0,
    packagingFeeAmount: 1,
    deliveryFeeAmount: 7.5,
    discountAmount: 5,
    totalAmount: 42.5,
    paymentMethod: locale === 'id' ? 'Cash' : 'Cash',
    currency,
    completedAt: now,
    locale,
    timeZone,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="receipt_preview.pdf"',
      'Cache-Control': 'no-store',
    },
  });
});
