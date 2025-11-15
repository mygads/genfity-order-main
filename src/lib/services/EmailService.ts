/**
 * Email Service
 * Handles email sending using SMTP (Nodemailer)
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  getPasswordNotificationTemplate,
  getOrderConfirmationTemplate,
} from '@/lib/utils/emailTemplates';

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
      });

      // Only log once in development to avoid spam
      if (!isInitialized) {
        console.log('✅ Email service initialized with SMTP');
        isInitialized = true;
      }
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error);
    }
  }

  /**
   * Send email
   */
  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }): Promise<boolean> {
    if (!this.transporter) {
      console.error('Email transporter not initialized');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: options.from || process.env.EMAIL_FROM || 'noreply@genfity.com',
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log('✅ Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
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
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/signin`;
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
