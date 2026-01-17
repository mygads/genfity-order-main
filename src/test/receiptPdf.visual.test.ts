import { describe, expect, it } from 'vitest';

import sharp from 'sharp';

import { generateOrderReceiptPdfBuffer } from '@/lib/utils/orderReceiptPdfEmail';

const visualEnabled = process.env.RECEIPT_VISUAL_SNAPSHOT === '1';
const itIf = visualEnabled ? it : it.skip;

/**
 * Optional image-based regression test.
 *
 * Enable locally/CI via: `RECEIPT_VISUAL_SNAPSHOT=1 pnpm -s test`
 *
 * This uses sharp's PDF rendering support (if available in the current build).
 */
describe('receipt PDF visual snapshot (optional)', () => {
  itIf('renders first page to PNG (base64 snapshot)', async () => {
    const pdf = await generateOrderReceiptPdfBuffer({
      orderNumber: '000123',
      merchantCode: 'WK',
      merchantName: 'Wellard Kebab House',
      merchantLogoUrl: null,
      merchantAddress: '123 Example Street, Perth WA',
      merchantPhone: '+61 400 000 000',
      merchantEmail: 'hello@example.com',
      receiptSettings: {
        paperSize: '80mm',
        showLogo: false,
        showTrackingQRCode: true,
        receiptLanguage: 'en',
      },
      customerName: 'Jane Customer',
      customerPhone: '+61 401 111 111',
      customerEmail: 'jane@example.com',
      orderType: 'DELIVERY',
      tableNumber: null,
      deliveryUnit: 'Unit 2',
      deliveryBuildingName: 'Example Tower',
      deliveryBuildingNumber: '10',
      deliveryFloor: '3',
      deliveryInstructions: 'Leave at door',
      deliveryAddress: '9 Delivery Road, Perth WA',
      items: [
        {
          menuName: 'Kebab',
          quantity: 1,
          unitPrice: 15,
          subtotal: 15,
          notes: 'No onions',
          addons: [
            {
              addonName: 'Extra sauce',
              quantity: 1,
              addonPrice: 1,
              subtotal: 1,
            },
          ],
        },
      ],
      subtotal: 16,
      taxAmount: 0,
      serviceChargeAmount: 0,
      packagingFeeAmount: 0,
      deliveryFeeAmount: 4,
      discountAmount: 0,
      totalAmount: 20,
      paymentMethod: 'CARD',
      currency: 'AUD',
      completedAt: new Date('2026-01-11T00:00:00.000Z'),
      locale: 'en',
      timeZone: 'UTC',
    });

    let png: Buffer;
    try {
      png = await sharp(pdf, { density: 160 }).png().toBuffer();
    } catch (e) {
      // If the current sharp build lacks PDF input support, fail with a clear message.
      throw new Error(
        `sharp could not render PDF to PNG. Ensure sharp has PDF support in this environment. Original error: ${String(
          (e as any)?.message || e
        )}`
      );
    }

    expect(png.toString('base64')).toMatchSnapshot();
  });
});
