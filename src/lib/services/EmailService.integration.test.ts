import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendMailMock = vi.fn().mockResolvedValue({ messageId: 'test-message-id' });
const createTransportMock = vi.fn(() => ({ sendMail: sendMailMock }));

vi.mock('nodemailer', () => {
  return {
    default: {
      createTransport: createTransportMock,
    },
  };
});

const generateOrderReceiptPdfBufferMock = vi
  .fn()
  .mockResolvedValue(Buffer.from('%PDF-1.4\n%mock'));

vi.mock('@/lib/utils/orderReceiptPdfEmail', () => {
  return {
    generateOrderReceiptPdfBuffer: generateOrderReceiptPdfBufferMock,
  };
});

describe('EmailService (integration-ish)', () => {
  beforeEach(() => {
    sendMailMock.mockClear();
    createTransportMock.mockClear();
    generateOrderReceiptPdfBufferMock.mockClear();

    // Avoid Next.js dev-mode singleton caching between tests
    delete (globalThis as unknown as { emailService?: unknown }).emailService;

    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.SMTP_FROM_EMAIL = 'noreply@genfity.com';
    process.env.NEXT_PUBLIC_APP_URL = 'https://order.genfity.com';

    vi.resetModules();
  });

  it('sends completed email with PDF attachment and localized subject (ID)', async () => {
    const { default: emailService } = await import('@/lib/services/EmailService');

    const sent = await emailService.sendOrderCompleted({
      to: 'budi@example.com',
      customerName: 'Budi',
      orderNumber: 'A1B2C3',
      merchantName: 'Warung Contoh',
      merchantCode: 'WC',
      merchantAddress: 'Jl. Contoh No. 1',
      merchantPhone: '0812-0000',
      merchantCountry: 'Indonesia',
      merchantTimezone: 'Asia/Jakarta',
      currency: 'IDR',
      orderType: 'TAKEAWAY',
      items: [
        { menuName: 'Nasi Goreng', quantity: 1, unitPrice: 20000, subtotal: 20000 },
        { menuName: 'Es Teh', quantity: 1, unitPrice: 5000, subtotal: 5000 },
      ],
      subtotal: 25000,
      taxAmount: 0,
      serviceChargeAmount: 0,
      packagingFeeAmount: 0,
      totalAmount: 25000,
      completedAt: new Date('2026-01-11T00:00:00.000Z'),
    });

    expect(sent).toBe(true);
    expect(createTransportMock).toHaveBeenCalled();
    expect(sendMailMock).toHaveBeenCalledTimes(1);

    const args = sendMailMock.mock.calls[0]?.[0];
    expect(args.from).toContain('Genfity Order');
    expect(args.subject).toContain('Pesanan Selesai');
    expect(args.attachments?.[0]?.filename).toBe('receipt-WC-A1B2C3.pdf');
    expect(Buffer.isBuffer(args.attachments?.[0]?.content)).toBe(true);
  });

  it('localizes customer welcome subject by merchant country (EN vs ID)', async () => {
    const { default: emailService } = await import('@/lib/services/EmailService');

    await emailService.sendCustomerWelcome({
      to: 'alex@example.com',
      name: 'Alex',
      email: 'alex@example.com',
      phone: '0400',
      tempPassword: 'Temp1234',
      merchantCountry: 'Australia',
    });

    let args = sendMailMock.mock.calls.at(-1)?.[0];
    expect(args.subject).toContain('Welcome to GENFITY');

    await emailService.sendCustomerWelcome({
      to: 'budi@example.com',
      name: 'Budi',
      email: 'budi@example.com',
      phone: '0812',
      tempPassword: 'Temp1234',
      merchantCountry: 'Indonesia',
    });

    args = sendMailMock.mock.calls.at(-1)?.[0];
    expect(args.subject).toContain('Selamat Datang');
  });

  it('localizes password reset subject by provided locale', async () => {
    const { default: emailService } = await import('@/lib/services/EmailService');

    await emailService.sendPasswordResetOTP({
      to: 'budi@example.com',
      name: 'Budi',
      code: '123456',
      expiresInMinutes: 60,
      locale: 'id',
    });

    const args = sendMailMock.mock.calls.at(-1)?.[0];
    expect(args.subject).toContain('Kode Reset Password');
  });
});
