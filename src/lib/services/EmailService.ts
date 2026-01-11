/**
 * Email Service
 * Handles email sending using SMTP (Nodemailer)
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  getPasswordNotificationTemplate,
  getOrderConfirmationTemplate,
  getOrderCompletedTemplate,
  getCustomerWelcomeTemplate,
  getStaffWelcomeTemplate,
  getTestEmailTemplate,
  getPermissionUpdateTemplate,
  getPaymentVerifiedTemplate,
  getBalanceAdjustmentTemplate,
  getSubscriptionExtendedTemplate,
} from '@/lib/utils/emailTemplates';
import { formatCurrency } from '@/lib/utils/format';
import { generateOrderReceiptPdfBuffer } from '@/lib/utils/orderReceiptPdfEmail';
import { formatFullOrderNumber } from '@/lib/utils/format';

// Track initialization to prevent duplicate logs
let isInitialized = false;

function extractEmailFromFromHeader(value: string): string {
  const trimmed = value.trim();
  const lt = trimmed.lastIndexOf('<');
  const gt = trimmed.lastIndexOf('>');
  if (lt !== -1 && gt !== -1 && gt > lt) {
    return trimmed.slice(lt + 1, gt).trim();
  }
  return trimmed;
}

function isValidEmailAddress(value: string): boolean {
  const email = extractEmailFromFromHeader(value);
  // Basic sanity check (intentionally conservative)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  /**
   * Initialize SMTP transporter
   */
  private initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASS || process.env.SMTP_PASSWORD; // Support both SMTP_PASS and SMTP_PASSWORD

    const configuredFromEmail = process.env.SMTP_FROM_EMAIL;
    if (configuredFromEmail && !isValidEmailAddress(configuredFromEmail)) {
      console.warn(
        `⚠️  SMTP_FROM_EMAIL looks invalid: "${configuredFromEmail}". ` +
          `Set SMTP_FROM_EMAIL to an address like "noreply@genfity.com" and SMTP_FROM_NAME to "Genfity Order".`
      );
    }

    // Skip initialization if SMTP credentials are not configured
    if (!smtpHost || !smtpUser || !smtpPassword) {
      if (!isInitialized) {
        console.warn('⚠️  SMTP credentials not configured. Email sending will be disabled.');
        isInitialized = true;
      }
      return;
    }

    try {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
        // Timeout settings to prevent hanging connections
        connectionTimeout: 30000, // 30 seconds to establish connection
        greetingTimeout: 30000,   // 30 seconds for SMTP greeting
        socketTimeout: 60000,     // 60 seconds for socket inactivity
        // Pool settings for better performance
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5, // 5 emails per second max
      });

      // Only log once in development to avoid spam
      if (!isInitialized) {
        // console.log('✅ Email service initialized with SMTP');
        isInitialized = true;
      }
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  private getMerchantEmailLocale(merchantCountry?: string | null): 'en' | 'id' {
    if (!merchantCountry) return 'en';
    const normalized = merchantCountry.trim().toLowerCase();
    if (normalized === 'indonesia' || normalized === 'id') return 'id';
    return 'en';
  }

  private getMerchantTimeZone(merchantTimezone?: string | null): string {
    return merchantTimezone || 'Australia/Sydney';
  }

  private formatDateTimeForMerchant(params: {
    date: Date;
    locale: 'en' | 'id';
    timeZone: string;
    withTime?: boolean;
  }): string {
    const intlLocale = params.locale === 'id' ? 'id-ID' : 'en-AU';
    const options: Intl.DateTimeFormatOptions = params.withTime
      ? {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: params.timeZone,
        }
      : {
          year: 'numeric',
          month: 'short',
          day: '2-digit',
          timeZone: params.timeZone,
        };

    return new Intl.DateTimeFormat(intlLocale, options).format(params.date);
  }

  /**
   * Send email with retry mechanism
   */
  public async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
    attachments?: Array<{
      filename: string;
      content: Buffer;
      contentType?: string;
    }>;
  }): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const fromName = process.env.SMTP_FROM_NAME || 'Genfity Order';
        const fromEmail = options.from || process.env.SMTP_FROM_EMAIL || 'noreply@genfity.com';
        const from = fromEmail.includes('<') ? fromEmail : `${fromName} <${fromEmail}>`;

        const info = await this.transporter.sendMail({
          from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          ...(options.attachments && options.attachments.length > 0
            ? { attachments: options.attachments }
            : {}),
        });

        // console.log('✅ Email sent:', info.messageId);
        return true;
      } catch (error) {
        lastError = error as Error;
        const isTimeout = (error as NodeJS.ErrnoException).code === 'ETIMEDOUT' || 
                          (error as Error).message?.includes('timeout');
        
        console.warn(`⚠️ Email attempt ${attempt}/${maxRetries} failed:`, 
          isTimeout ? 'Connection timeout' : (error as Error).message);

        if (attempt < maxRetries && isTimeout) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
      }
    }

    console.error('❌ Failed to send email after retries:', lastError?.message);
    return false;
  }

  /**
   * Send password notification email to new merchant/staff
   */
  async sendPasswordNotification(params: {
    to: string;
    name: string;
    email: string;
    tempPassword: string;
    merchantCountry?: string | null;
  }): Promise<boolean> {
    const locale = this.getMerchantEmailLocale(params.merchantCountry);
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/login`;
    const supportEmail = process.env.EMAIL_FROM || 'support@genfity.com';

    const html = getPasswordNotificationTemplate({
      name: params.name,
      email: params.email,
      tempPassword: params.tempPassword,
      dashboardUrl,
      supportEmail,
      locale,
    });

    return this.sendEmail({
      to: params.to,
      subject:
        locale === 'id'
          ? 'GENFITY - Kredensial Akun Baru Anda'
          : 'GENFITY - Your New Account Credentials',
      html,
    });
  }

  /**
   * Send order confirmation email to customer
   */
  async sendOrderConfirmation(params: {
    to: string;
    customerName: string;
    orderNumber: string;
    merchantName: string;
    merchantCode: string;
    merchantCountry?: string;
    merchantTimezone?: string;
    currency?: string;
    orderType: 'DINE_IN' | 'TAKEAWAY';
    tableNumber?: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    subtotal: number;
    tax: number;
    total: number;
  }): Promise<boolean> {
    const merchantLocale = this.getMerchantEmailLocale(params.merchantCountry);
    const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${params.merchantCode}/order-summary?orderNumber=${params.orderNumber}`;

    const currency = params.currency || 'AUD';

    const displayOrderNumber = formatFullOrderNumber(params.orderNumber, params.merchantCode);

    const html = getOrderConfirmationTemplate({
      customerName: params.customerName,
      orderNumber: displayOrderNumber,
      merchantName: params.merchantName,
      orderType: params.orderType === 'DINE_IN' ? 'Dine In' : 'Takeaway',
      tableNumber: params.tableNumber,
      items: params.items,
      subtotal: params.subtotal,
      tax: params.tax,
      total: params.total,
      trackingUrl,
      currency,
      locale: merchantLocale,
    });

    const subject =
      merchantLocale === 'id'
        ? `Konfirmasi Pesanan - ${displayOrderNumber}`
        : `Order Confirmation - ${displayOrderNumber}`;

    return this.sendEmail({ to: params.to, subject, html });
  }

  /**
   * Send test email (for testing SMTP configuration)
   */
  async sendTestEmail(to: string): Promise<boolean> {
    const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM_EMAIL || 'support@genfity.com';

    return this.sendEmail({
      to,
      subject: 'GENFITY - Test Email',
      html: getTestEmailTemplate({ supportEmail }),
    });
  }

  /**
   * Send order completed email to customer
   */
  async sendOrderCompleted(params: {
    to: string;
    customerName: string;
    orderNumber: string;
    merchantName: string;
    merchantCode: string;
    merchantLogoUrl?: string | null;
    merchantAddress?: string | null;
    merchantPhone?: string | null;
    merchantEmail?: string | null;
    receiptSettings?: unknown;
    merchantCountry?: string;
    merchantTimezone?: string;
    currency?: string;
    orderType: 'DINE_IN' | 'TAKEAWAY';
    tableNumber?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    items: Array<{
      menuName: string;
      quantity: number;
      unitPrice?: number;
      subtotal: number;
      notes?: string | null;
      addons?: Array<{
        addonName: string;
        addonPrice?: number;
        quantity?: number;
        subtotal?: number;
      }>;
    }>;
    subtotal: number;
    taxAmount?: number;
    serviceChargeAmount?: number;
    packagingFeeAmount?: number;
    discountAmount?: number;
    totalAmount: number;
    paymentMethod?: string | null;
    completedAt: Date;
  }): Promise<boolean> {
    const merchantLocale = this.getMerchantEmailLocale(params.merchantCountry);
    const intlLocale = merchantLocale === 'id' ? 'id-ID' : 'en-AU';
    const timeZone = this.getMerchantTimeZone(params.merchantTimezone);
    const currency = params.currency || 'AUD';
    const displayOrderNumber = formatFullOrderNumber(params.orderNumber, params.merchantCode);

    const html = getOrderCompletedTemplate({
      customerName: params.customerName,
      orderNumber: displayOrderNumber,
      merchantName: params.merchantName,
      orderType: params.orderType === 'DINE_IN' ? 'Dine In' : 'Takeaway',
      items: params.items.map((i) => ({
        name: i.menuName,
        quantity: i.quantity,
        price: i.subtotal,
      })),
      total: params.totalAmount,
      completedAt: new Intl.DateTimeFormat(intlLocale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
      }).format(params.completedAt),
      currency,
      locale: merchantLocale,
    });

    const subject =
      merchantLocale === 'id'
        ? `Pesanan Selesai - ${displayOrderNumber} | Terima kasih!`
        : `Order Completed - ${displayOrderNumber} | Thank you!`;

    let attachments:
      | Array<{ filename: string; content: Buffer; contentType?: string }>
      | undefined;

    try {
      const pdf = await generateOrderReceiptPdfBuffer({
        orderNumber: params.orderNumber,
        merchantCode: params.merchantCode,
        merchantName: params.merchantName,
        merchantLogoUrl: params.merchantLogoUrl,
        merchantAddress: params.merchantAddress,
        merchantPhone: params.merchantPhone,
        merchantEmail: params.merchantEmail,
        receiptSettings: params.receiptSettings as any,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        customerEmail: params.customerEmail,
        orderType: params.orderType,
        tableNumber: params.tableNumber,
        items: params.items,
        subtotal: params.subtotal,
        taxAmount: params.taxAmount,
        serviceChargeAmount: params.serviceChargeAmount,
        packagingFeeAmount: params.packagingFeeAmount,
        discountAmount: params.discountAmount,
        totalAmount: params.totalAmount,
        paymentMethod: params.paymentMethod,
        currency,
        completedAt: params.completedAt,
        locale: merchantLocale,
        timeZone,
      });

      attachments = [
        {
          filename: `receipt-${displayOrderNumber}.pdf`,
          content: pdf,
          contentType: 'application/pdf',
        },
      ];
    } catch (error) {
      console.error('[EmailService] Failed generating PDF receipt attachment:', error);
    }

    return this.sendEmail({ to: params.to, subject, html, attachments });
  }

  /**
   * Send welcome email to new customer (registered via checkout)
   */
  async sendCustomerWelcome(params: {
    to: string;
    name: string;
    email: string;
    phone: string;
    tempPassword: string;
    merchantCountry?: string | null;
  }): Promise<boolean> {
    const locale = this.getMerchantEmailLocale(params.merchantCountry);
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;
    const supportEmail = process.env.EMAIL_FROM || 'support@genfity.com';

    const html = getCustomerWelcomeTemplate({
      name: params.name,
      email: params.email,
      phone: params.phone,
      tempPassword: params.tempPassword,
      loginUrl,
      supportEmail,
      locale,
    });

    return this.sendEmail({
      to: params.to,
      subject:
        locale === 'id'
          ? 'Selamat Datang di GENFITY - Kredensial Akun Anda'
          : 'Welcome to GENFITY - Your Account Credentials',
      html,
    });
  }

  /**
   * Send password reset OTP email
   */
  async sendPasswordResetOTP(params: {
    to: string;
    name: string;
    code: string;
    expiresInMinutes: number;
    locale?: 'en' | 'id';
  }): Promise<boolean> {
    const { getPasswordResetOTPTemplate } = await import('@/lib/utils/emailTemplates');
    const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM_EMAIL || 'support@genfity.com';

    const locale = params.locale || 'en';

    const html = getPasswordResetOTPTemplate({
      name: params.name,
      code: params.code,
      expiresInMinutes: params.expiresInMinutes,
      supportEmail,
      locale,
    });

    return this.sendEmail({
      to: params.to,
      subject:
        locale === 'id'
          ? `${params.code} - Kode Reset Password Anda`
          : `${params.code} - Your Password Reset Code`,
      html,
    });
  }

  /**
   * Send welcome email to new staff member
   */
  async sendStaffWelcome(params: {
    to: string;
    name: string;
    email: string;
    password: string;
    merchantName: string;
    merchantCode: string;
    merchantCountry?: string | null;
  }): Promise<boolean> {
    const locale = this.getMerchantEmailLocale(params.merchantCountry);
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/login`;
    const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM_EMAIL || 'support@genfity.com';

    const html = getStaffWelcomeTemplate({
      name: params.name,
      email: params.email,
      password: params.password,
      merchantName: params.merchantName,
      merchantCode: params.merchantCode,
      loginUrl,
      supportEmail,
      locale,
    });

    return this.sendEmail({
      to: params.to,
      subject:
        locale === 'id'
          ? `Selamat datang di ${params.merchantName} - Akun Staff Anda`
          : `Welcome to ${params.merchantName} - Your Staff Account`,
      html,
    });
  }

  /**
   * Send permission update notification to staff
   */
  async sendPermissionUpdateNotification(params: {
    to: string;
    name: string;
    merchantName: string;
    permissions: string[];
    updatedBy: string;
    merchantCountry?: string | null;
  }): Promise<boolean> {
    const locale = this.getMerchantEmailLocale(params.merchantCountry);
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard`
      : 'https://genfity.com/admin/dashboard';

    const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM_EMAIL || 'support@genfity.com';

    const html = getPermissionUpdateTemplate({
      name: params.name,
      merchantName: params.merchantName,
      permissions: params.permissions,
      updatedBy: params.updatedBy,
      dashboardUrl,
      locale,
      supportEmail,
    });

    return this.sendEmail({
      to: params.to,
      subject:
        locale === 'id'
          ? `[${params.merchantName}] Izin Anda Telah Diperbarui`
          : `[${params.merchantName}] Your Permissions Have Been Updated`,
      html,
    });
  }

  /**
   * Send payment verification email to merchant owner
   */
  async sendPaymentVerifiedEmail(params: {
    to: string;
    merchantName: string;
    amount: number;
    currency: string;
    paymentType: 'DEPOSIT' | 'MONTHLY_SUBSCRIPTION';
    newBalance?: number;
    newPeriodEnd?: Date;
    merchantCountry?: string | null;
    merchantTimezone?: string | null;
  }): Promise<boolean> {
    const locale = this.getMerchantEmailLocale(params.merchantCountry);
    const timeZone = this.getMerchantTimeZone(params.merchantTimezone);
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/subscription`;

    const paymentTypeLabel =
      params.paymentType === 'DEPOSIT'
        ? locale === 'id'
          ? 'Top Up Deposit'
          : 'Deposit Top-up'
        : locale === 'id'
          ? 'Langganan Bulanan'
          : 'Monthly Subscription';

    const html = getPaymentVerifiedTemplate({
      merchantName: params.merchantName,
      paymentTypeLabel,
      amountText: formatCurrency(params.amount, params.currency, locale),
      balanceText:
        params.newBalance !== undefined
          ? formatCurrency(params.newBalance, params.currency, locale)
          : null,
      periodEndText: params.newPeriodEnd
        ? this.formatDateTimeForMerchant({
            date: params.newPeriodEnd,
            locale,
            timeZone,
            withTime: false,
          })
        : null,
      dashboardUrl,
      locale,
    });

    const subject =
      locale === 'id'
        ? `Pembayaran Terverifikasi - ${paymentTypeLabel} - Genfity`
        : `Payment Verified - ${paymentTypeLabel} - Genfity`;

    return this.sendEmail({ to: params.to, subject, html });
  }

  /**
   * Send balance adjustment notification email to merchant
   */
  async sendBalanceAdjustmentNotification(params: {
    to: string;
    merchantName: string;
    amount: number;
    description: string;
    newBalance: number;
    currency: string;
    adjustedBy: string;
    adjustedAt: Date;
    merchantCountry?: string | null;
    merchantTimezone?: string | null;
  }): Promise<boolean> {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/subscription`;
    const isPositive = params.amount >= 0;
    const amountSign = isPositive ? '+' : '';

    const locale = this.getMerchantEmailLocale(params.merchantCountry);
    const timeZone = this.getMerchantTimeZone(params.merchantTimezone);
    const formattedAmount = `${amountSign}${formatCurrency(
      Math.abs(params.amount),
      params.currency,
      locale
    )}`;

    const html = getBalanceAdjustmentTemplate({
      merchantName: params.merchantName,
      adjustmentText: formattedAmount,
      newBalanceText: formatCurrency(params.newBalance, params.currency, locale),
      adjustedAtText: this.formatDateTimeForMerchant({
      date: params.adjustedAt,
      locale,
      timeZone,
      withTime: true,
      }),
      reasonText: params.description,
      adjustedByText: params.adjustedBy,
      dashboardUrl,
      locale,
    });

    const subject =
      locale === 'id'
      ? `Penyesuaian Saldo: ${formattedAmount} - Genfity`
      : `Balance Adjustment: ${formattedAmount} - Genfity`;

    return this.sendEmail({ to: params.to, subject, html });
  }

  /**
   * Send subscription extension notification email to merchant
   */
  async sendSubscriptionExtensionNotification(params: {
    to: string;
    merchantName: string;
    daysExtended: number;
    newExpiryDate: Date;
    extendedBy: string;
    merchantCountry?: string | null;
    merchantTimezone?: string | null;
  }): Promise<boolean> {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/subscription`;

    const locale = this.getMerchantEmailLocale(params.merchantCountry);
    const timeZone = this.getMerchantTimeZone(params.merchantTimezone);

    const html = getSubscriptionExtendedTemplate({
      merchantName: params.merchantName,
      daysExtended: params.daysExtended,
      newExpiryText: this.formatDateTimeForMerchant({
      date: params.newExpiryDate,
      locale,
      timeZone,
      withTime: false,
      }),
      extendedByText: params.extendedBy,
      dashboardUrl,
      locale,
    });

    const subject =
      locale === 'id'
      ? `Subscription Diperpanjang - +${params.daysExtended} Hari - Genfity`
      : `Subscription Extended - +${params.daysExtended} Days - Genfity`;

    return this.sendEmail({ to: params.to, subject, html });
  }
}

// Singleton pattern with global caching for Next.js dev mode hot reload
const globalForEmail = globalThis as unknown as {
  emailService: EmailService | undefined;
};

const emailService = globalForEmail.emailService ?? new EmailService();

if (process.env.NODE_ENV !== 'production') {
  globalForEmail.emailService = emailService;
}

export default emailService;
