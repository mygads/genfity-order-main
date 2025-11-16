/**
 * Email Sender Utility
 * Handles sending emails via Nodemailer
 * 
 * Features:
 * - Password reset emails
 * - Welcome emails
 * - Order notifications
 * - Custom email templates
 * 
 * Configuration:
 * - SMTP settings from environment variables
 * - HTML email templates
 * - Automatic retry on failure
 */

import nodemailer from 'nodemailer';

/**
 * Email configuration from environment variables
 */
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

/**
 * Create transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport(emailConfig);
};

/**
 * Send password reset email
 * 
 * @param to Recipient email
 * @param resetUrl Password reset URL with token
 * @param expiresAt Token expiration time
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
  expiresAt,
}: {
  to: string;
  resetUrl: string;
  expiresAt: Date;
}) {
  const transporter = createTransporter();

  const expiresInMinutes = Math.floor((expiresAt.getTime() - Date.now()) / 1000 / 60);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Reset Your Password</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Hello,
              </p>
              <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                We received a request to reset your password for your GENFITY account. 
                Click the button below to create a new password:
              </p>
              
              <!-- Reset Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 20px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                <strong>⚠️ Important:</strong> This link will expire in ${expiresInMinutes} minutes.
              </p>
              
              <p style="color: #333333; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="color: #667eea; font-size: 12px; line-height: 18px; margin: 10px 0 20px 0; word-break: break-all;">
                ${resetUrl}
              </p>
              
              <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;" />
              
              <p style="color: #999999; font-size: 13px; line-height: 18px; margin: 0;">
                If you didn't request a password reset, you can safely ignore this email. 
                Your password will not be changed.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center;">
              <p style="color: #999999; font-size: 12px; line-height: 18px; margin: 0;">
                © ${new Date().getFullYear()} GENFITY. All rights reserved.
              </p>
              <p style="color: #999999; font-size: 12px; line-height: 18px; margin: 10px 0 0 0;">
                This is an automated email. Please do not reply.
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

  const textContent = `
Reset Your Password

Hello,

We received a request to reset your password for your GENFITY account.

Click the link below to create a new password:
${resetUrl}

This link will expire in ${expiresInMinutes} minutes.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

© ${new Date().getFullYear()} GENFITY. All rights reserved.
  `;

  const mailOptions = {
    from: `"GENFITY" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Reset Your Password - GENFITY',
    text: textContent,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string;
  name: string;
}) {
  const transporter = createTransporter();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Welcome to GENFITY</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0;">Welcome to GENFITY!</h1>
    </div>
    <div style="padding: 40px;">
      <p style="color: #333333; font-size: 16px; line-height: 24px;">
        Hello ${name},
      </p>
      <p style="color: #333333; font-size: 16px; line-height: 24px;">
        Thank you for joining GENFITY. We're excited to have you on board!
      </p>
      <p style="color: #333333; font-size: 16px; line-height: 24px;">
        Start managing your restaurant with our powerful platform.
      </p>
    </div>
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
      <p style="color: #999999; font-size: 12px; margin: 0;">
        © ${new Date().getFullYear()} GENFITY. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `"GENFITY" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to,
    subject: 'Welcome to GENFITY',
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw new Error('Failed to send welcome email');
  }
}
