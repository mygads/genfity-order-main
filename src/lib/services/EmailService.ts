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
    orderType: 'DINE_IN' | 'TAKEAWAY';
    tableNumber?: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    subtotal: number;
    tax: number;
    total: number;
  }): Promise<boolean> {
    const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL}/${params.merchantCode}/order-summary?orderNumber=${params.orderNumber}`;

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
    orderType: 'DINE_IN' | 'TAKEAWAY';
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
    completedAt: Date;
  }): Promise<boolean> {
    const html = getOrderCompletedTemplate({
      customerName: params.customerName,
      orderNumber: params.orderNumber,
      merchantName: params.merchantName,
      orderType: params.orderType === 'DINE_IN' ? 'Dine In' : 'Takeaway',
      items: params.items,
      total: params.total,
      completedAt: new Intl.DateTimeFormat('en-AU', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(params.completedAt),
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
  }): Promise<boolean> {
    const emailLocale = params.currency === 'IDR' ? 'id' : 'en';

    const formattedAmount = formatCurrency(params.amount, params.currency, emailLocale);

    const formattedBalance =
      params.newBalance !== undefined
        ? formatCurrency(params.newBalance, params.currency, emailLocale)
        : null;

    const formattedPeriodEnd = params.newPeriodEnd
      ? params.newPeriodEnd.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
      : null;

    const paymentTypeLabel = params.paymentType === 'DEPOSIT'
      ? 'Top Up Deposit'
      : 'Langganan Bulanan';

    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/subscription`;

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #22c55e, #16a34a); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Pembayaran Terverifikasi!</h1>
        </div>
        <div style="padding: 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Halo <strong>${params.merchantName}</strong>,
            </p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Pembayaran Anda telah berhasil diverifikasi oleh tim kami.
            </p>
            
            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #166534; padding: 8px 0; font-size: 14px;">Tipe Pembayaran:</td>
                        <td style="color: #166534; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${paymentTypeLabel}</td>
                    </tr>
                    <tr>
                        <td style="color: #166534; padding: 8px 0; font-size: 14px;">Jumlah:</td>
                        <td style="color: #166534; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${formattedAmount}</td>
                    </tr>
                    ${formattedBalance ? `
                    <tr>
                        <td style="color: #166534; padding: 8px 0; font-size: 14px;">Saldo Baru:</td>
                        <td style="color: #166534; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${formattedBalance}</td>
                    </tr>
                    ` : ''}
                    ${formattedPeriodEnd ? `
                    <tr>
                        <td style="color: #166534; padding: 8px 0; font-size: 14px;">Berlaku Hingga:</td>
                        <td style="color: #166534; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${formattedPeriodEnd}</td>
                    </tr>
                    ` : ''}
                </table>
            </div>

            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Layanan Anda sekarang aktif kembali. Terima kasih telah menggunakan Genfity!
            </p>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" 
                   style="display: inline-block; background-color: #f97316; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Lihat Dashboard
                </a>
            </div>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Genfity. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;

    return this.sendEmail({
      to: params.to,
      subject: `Pembayaran Terverifikasi - ${paymentTypeLabel} - Genfity`,
      html,
    });
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
  }): Promise<boolean> {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/subscription`;
    const isPositive = params.amount >= 0;
    const amountSign = isPositive ? '+' : '';
    
    const emailLocale = params.currency === 'IDR' ? 'id' : 'en';
    const formattedAmount = `${amountSign}${formatCurrency(Math.abs(params.amount), params.currency, emailLocale)}`;
    const formattedBalance = formatCurrency(params.newBalance, params.currency, emailLocale);
    const formattedDate = new Intl.DateTimeFormat(emailLocale === 'id' ? 'id-ID' : 'en-AU', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(params.adjustedAt);

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Balance Adjustment Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, ${isPositive ? '#10b981' : '#ef4444'} 0%, ${isPositive ? '#059669' : '#dc2626'} 100%); padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                Balance Adjustment
            </h1>
            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Your account balance has been adjusted
            </p>
        </div>
        <div style="padding: 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hello <strong>${params.merchantName}</strong>,
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Your subscription balance has been ${isPositive ? 'increased' : 'decreased'} by an administrator.
            </p>

            <div style="background-color: ${isPositive ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${isPositive ? '#bbf7d0' : '#fecaca'}; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: ${isPositive ? '#166534' : '#dc2626'}; padding: 8px 0; font-size: 14px;">Adjustment Amount:</td>
                        <td style="color: ${isPositive ? '#166534' : '#dc2626'}; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${formattedAmount}</td>
                    </tr>
                    <tr>
                        <td style="color: ${isPositive ? '#166534' : '#dc2626'}; padding: 8px 0; font-size: 14px;">New Balance:</td>
                        <td style="color: ${isPositive ? '#166534' : '#dc2626'}; padding: 8px 0; font-size: 14px; text-align: right; font-weight: 600;">${formattedBalance}</td>
                    </tr>
                    <tr>
                        <td style="color: ${isPositive ? '#166534' : '#dc2626'}; padding: 8px 0; font-size: 14px;">Date:</td>
                        <td style="color: ${isPositive ? '#166534' : '#dc2626'}; padding: 8px 0; font-size: 14px; text-align: right;">${formattedDate}</td>
                    </tr>
                </table>
            </div>

            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="color: #6b7280; font-size: 12px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px;">Reason</p>
                <p style="color: #374151; font-size: 14px; margin: 0;">${params.description}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" 
                   style="display: inline-block; background-color: #f97316; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    View Dashboard
                </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                If you have any questions about this adjustment, please contact support.
            </p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Genfity. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;

    return this.sendEmail({
      to: params.to,
      subject: `Balance ${isPositive ? 'Added' : 'Deducted'}: ${formattedAmount} - Genfity`,
      html,
    });
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
  }): Promise<boolean> {
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/dashboard/subscription`;
    const formattedDate = new Intl.DateTimeFormat('en-AU', {
      dateStyle: 'full',
    }).format(params.newExpiryDate);

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Extended</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                🎉 Subscription Extended!
            </h1>
            <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
                Your subscription has been extended by ${params.daysExtended} days
            </p>
        </div>
        <div style="padding: 30px;">
            <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Hello <strong>${params.merchantName}</strong>,
            </p>
            
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                Great news! Your subscription has been extended by an administrator.
            </p>

            <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="color: #1e40af; font-size: 14px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">New Expiry Date</p>
                <p style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 0;">${formattedDate}</p>
                <p style="color: #3b82f6; font-size: 14px; margin: 8px 0 0;">+${params.daysExtended} days added</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <a href="${dashboardUrl}" 
                   style="display: inline-block; background-color: #f97316; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    View Subscription
                </a>
            </div>

            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                Thank you for using Genfity!
            </p>
        </div>
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Genfity. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>`;

    return this.sendEmail({
      to: params.to,
      subject: `Subscription Extended - +${params.daysExtended} Days - Genfity`,
      html,
    });
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
