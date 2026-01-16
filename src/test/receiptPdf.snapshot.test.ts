import { describe, expect, it, vi } from 'vitest';

import { generateOrderReceiptPdfBuffer } from '@/lib/utils/orderReceiptPdfEmail';

function normalizePdfForSnapshot(pdf: Buffer): string {
  // jsPDF output can include timestamps/IDs; normalize known volatile fields.
  let text = pdf.toString('latin1');

  text = text.replace(/\/CreationDate\s*\(D:([^)]*)\)/g, (_m, inner: string) => {
    return `/CreationDate (D:${'0'.repeat(inner.length)})`;
  });

  text = text.replace(/\/ModDate\s*\(D:([^)]*)\)/g, (_m, inner: string) => {
    return `/ModDate (D:${'0'.repeat(inner.length)})`;
  });

  text = text.replace(/\/ID\s*\[<([0-9A-Fa-f]+)><([0-9A-Fa-f]+)>\]/g, (_m, id1: string, id2: string) => {
    const z1 = '0'.repeat(id1.length);
    const z2 = '0'.repeat(id2.length);
    return `/ID [<${z1}><${z2}>]`;
  });

  // Snapshot as base64 to keep the snapshot text-friendly.
  return Buffer.from(text, 'latin1').toString('base64');
}

describe('receipt PDF snapshot', () => {
  it('matches the canonical receipt PDF output (normalized)', async () => {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    const ignoreJsPdfNoise = (args: unknown[]) => {
      const first = args[0];
      if (typeof first !== 'string') return false;
      if (first.includes('jsPDF PubSub Error')) return true;
      if (first.includes("Cannot read properties of undefined (reading 'root')")) return true;
      return false;
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation((...args) => {
      if (ignoreJsPdfNoise(args)) return;
      originalConsoleError(...args);
    });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      if (ignoreJsPdfNoise(args)) return;
      originalConsoleWarn(...args);
    });

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    try {
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

      expect(normalizePdfForSnapshot(pdf)).toMatchSnapshot();
    } finally {
      randomSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
