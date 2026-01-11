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
  getPermissionUpdateTemplate,
  getPaymentVerifiedTemplate,
  getBalanceAdjustmentTemplate,
  getSubscriptionExtendedTemplate,
} from '@/lib/utils/emailTemplates';
import { formatCurrency } from '@/lib/utils/format';

// Track initialization to prevent duplicate logs
let isInitialized = false;

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
  }): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const info = await this.transporter.sendMail({
          from: options.from || process.env.SMTP_FROM_EMAIL || 'noreply@genfity.com',
          to: options.to,
          subject: options.subject,
          html: options.html,
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
  }): Promise<boolean> {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/login`;
    const supportEmail = process.env.EMAIL_FROM || 'support@genfity.com';

    const html = getPasswordNotificationTemplate({
      name: params.name,
      email: params.email,
      tempPassword: params.tempPassword,
      dashboardUrl,
      supportEmail,
    });

    return this.sendEmail({
      to: params.to,
      subject: 'GENFITY - Your New Account Credentials',
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

    const html = getOrderConfirmationTemplate({
      customerName: params.customerName,
      orderNumber: params.orderNumber,
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

    return this.sendEmail({
      to: params.to,
      subject: `Order Confirmation - ${params.orderNumber}`,
      html,
    });
  }

  /**
   * Send test email (for testing SMTP configuration)
   */
  async sendTestEmail(to: string): Promise<boolean> {
    return this.sendEmail({
      to,
      subject: 'GENFITY - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email from GENFITY</h2>
          <p>This is a test email to verify your SMTP configuration.</p>
          <p>If you received this email, your email service is working correctly! ✅</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Sent from GENFITY Online Ordering System
          </p>
        </div>
      `,
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
    merchantCountry?: string;
    merchantTimezone?: string;
    currency?: string;
    orderType: 'DINE_IN' | 'TAKEAWAY';
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    completedAt: Date;
  }): Promise<boolean> {
    const merchantLocale = this.getMerchantEmailLocale(params.merchantCountry);
    const intlLocale = merchantLocale === 'id' ? 'id-ID' : 'en-AU';
    const timeZone = this.getMerchantTimeZone(params.merchantTimezone);
    const currency = params.currency || 'AUD';

    const html = getOrderCompletedTemplate({
      customerName: params.customerName,
      orderNumber: params.orderNumber,
      merchantName: params.merchantName,
      orderType: params.orderType === 'DINE_IN' ? 'Dine In' : 'Takeaway',
      items: params.items,
      total: params.total,
      completedAt: new Intl.DateTimeFormat(intlLocale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
      }).format(params.completedAt),
      currency,
      locale: merchantLocale,
    });

    return this.sendEmail({
      to: params.to,
      subject: `Order Completed - ${params.orderNumber} | Thank you!`,
      html,
    });
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
  }): Promise<boolean> {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/login`;
    const supportEmail = process.env.EMAIL_FROM || 'support@genfity.com';

    const html = getCustomerWelcomeTemplate({
      name: params.name,
      email: params.email,
      phone: params.phone,
      tempPassword: params.tempPassword,
      loginUrl,
      supportEmail,
    });

    return this.sendEmail({
      to: params.to,
      subject: 'Welcome to GENFITY - Your Account Credentials',
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
  }): Promise<boolean> {
    const { getPasswordResetOTPTemplate } = await import('@/lib/utils/emailTemplates');
    const supportEmail = process.env.EMAIL_FROM || process.env.SMTP_FROM_EMAIL || 'support@genfity.com';

    const html = getPasswordResetOTPTemplate({
      name: params.name,
      code: params.code,
      expiresInMinutes: params.expiresInMinutes,
      supportEmail,
    });

    return this.sendEmail({
      to: params.to,
      subject: `${params.code} - Your Password Reset Code`,
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
  }): Promise<boolean> {
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/login`;
    const supportEmail = process.env.EMAIL_FROM || 'support@genfity.com';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${params.merchantName}</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #f97316 0%, #fb923c 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      Welcome to ${params.merchantName}!
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95;">
                      You've been added as a staff member
                    </p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      Hi <strong>${params.name}</strong>,
                    </p>
                    
                    <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.6;">
                      You have been added as a staff member at <strong>${params.merchantName}</strong>. 
                      You can now access the admin dashboard to manage orders, menu items, and more.
                    </p>

                    <!-- Credentials Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 8px; margin: 30px 0;">
                      <tr>
                        <td style="padding: 25px;">
                          <h3 style="margin: 0 0 15px 0; color: #1e293b; font-size: 18px;">
                            Your Login Credentials
                          </h3>
                          
                          <table width="100%" cellpadding="8" cellspacing="0">
                            <tr>
                              <td style="color: #64748b; font-size: 14px; padding: 8px 0;">
                                <strong>Email:</strong>
                              </td>
                              <td style="color: #1e293b; font-size: 14px; font-family: 'Courier New', monospace; padding: 8px 0;">
                                ${params.email}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-size: 14px; padding: 8px 0;">
                                <strong>Password:</strong>
                              </td>
                              <td style="color: #1e293b; font-size: 14px; font-family: 'Courier New', monospace; padding: 8px 0;">
                                ${params.password}
                              </td>
                            </tr>
                            <tr>
                              <td style="color: #64748b; font-size: 14px; padding: 8px 0;">
                                <strong>Merchant:</strong>
                              </td>
                              <td style="color: #1e293b; font-size: 14px; padding: 8px 0;">
                                ${params.merchantName} (${params.merchantCode})
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <!-- Login Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${loginUrl}" style="display: inline-block; background-color: #f97316; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 8px; font-size: 16px; font-weight: bold; box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3);">
                            Login to Dashboard
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Security Notice -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px; margin: 30px 0;">
                      <tr>
                        <td style="padding: 15px 20px;">
                          <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                            <strong>⚠️ Security Reminder:</strong><br>
                            Please keep your password secure and do not share it with anyone. 
                            We recommend changing your password after your first login.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.6;">
                      If you have any questions or need assistance, please contact support at 
                      <a href="mailto:${supportEmail}" style="color: #f97316; text-decoration: none;">${supportEmail}</a>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                      <strong>GENFITY</strong> - Online Ordering System
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                      This is an automated email. Please do not reply to this message.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    return this.sendEmail({
      to: params.to,
      subject: `Welcome to ${params.merchantName} - Your Staff Account`,
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
  }): Promise<boolean> {
    const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard`
      : 'https://genfity.com/admin/dashboard';

    const html = getPermissionUpdateTemplate({
      name: params.name,
      merchantName: params.merchantName,
      permissions: params.permissions,
      updatedBy: params.updatedBy,
      dashboardUrl,
    });

    return this.sendEmail({
      to: params.to,
      subject: `[${params.merchantName}] Your Permissions Have Been Updated`,
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
