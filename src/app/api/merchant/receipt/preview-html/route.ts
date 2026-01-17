import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/client';
import { withMerchant } from '@/lib/middleware/auth';
import type { AuthContext } from '@/lib/middleware/auth';
import type { ReceiptSettings } from '@/lib/types/receiptSettings';
import { generateReceiptHTML } from '@/lib/utils/unifiedReceipt';

/**
 * Receipt HTML Preview
 * POST /api/merchant/receipt/preview-html
 *
 * Generates an HTML receipt preview using the same generator used for admin/POS printing.
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
  const inferredLanguage: 'en' | 'id' = currency === 'IDR' ? 'id' : 'en';
  const previewLanguage: 'en' | 'id' =
    receiptSettings.receiptLanguage === 'en' || receiptSettings.receiptLanguage === 'id'
      ? receiptSettings.receiptLanguage
      : inferredLanguage;

  const now = new Date();

  const html = generateReceiptHTML({
    merchant: {
      name: merchant.name,
      code: merchant.code,
      logoUrl: merchant.logoUrl,
      address: merchant.address,
      phone: merchant.phone || null,
      email: merchant.email,
      currency,
    },
    order: {
      orderId: 'preview',
      orderNumber: 'DEMO-1234',
      orderType: 'DELIVERY',
      tableNumber: null,
      deliveryUnit: 'Unit 12',
      deliveryBuildingName: 'Genfity Tower',
      deliveryBuildingNumber: '88',
      deliveryFloor: '7',
      deliveryInstructions:
        previewLanguage === 'id' ? 'Tolong taruh di resepsionis.' : 'Please leave at reception.',
      deliveryAddress: '123 Example Street, City',
      customerName: previewLanguage === 'id' ? 'Pelanggan' : 'Customer',
      customerPhone: previewLanguage === 'id' ? '08xx-xxxx-xxxx' : '+61 4xx xxx xxx',
      customerEmail: 'customer@example.com',
      trackingToken: 'demo-token',
      placedAt: now.toISOString(),
      paidAt: now.toISOString(),
      items: [
        {
          menuName: 'Chicken Burger',
          quantity: 2,
          unitPrice: 15.5,
          subtotal: 31,
          notes: previewLanguage === 'id' ? 'Tanpa bawang' : 'No onion',
          addons: [
            { addonName: 'Extra Cheese x2', addonPrice: 4 },
            { addonName: 'Bacon x2', addonPrice: 6 },
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
      discountLabel: previewLanguage === 'id' ? 'Diskon' : 'Discount',
      totalAmount: 42.5,
      amountPaid: 50,
      changeAmount: 7.5,
      paymentMethod: 'Cash',
      paymentStatus: 'COMPLETED',
      cashierName: previewLanguage === 'id' ? 'Kasir' : 'Cashier',
    },
    settings: receiptSettings,
    language: previewLanguage,
  });

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
});
